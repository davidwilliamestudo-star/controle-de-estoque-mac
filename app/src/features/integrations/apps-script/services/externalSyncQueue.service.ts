import { externalSyncQueueRepository, type ExternalSyncQueueItem } from "../repositories/externalSyncQueue.repository";
import { externalSyncLogsRepository } from "../repositories/externalSyncLogs.repository";
import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { dbExecute } from "@/lib/db/sqlite";

function parsePayload(item: ExternalSyncQueueItem): Record<string, any> {
  try {
    return JSON.parse(item.payload_json);
  } catch {
    return {};
  }
}

export const externalSyncQueueService = {
  async enqueue(
    action: string,
    entityType: string | null,
    entityId: string | null,
    payload: Record<string, any>,
    options?: { requestId?: string; nextAttemptAt?: string }
  ): Promise<string> {
    const requestId = options?.requestId ?? crypto.randomUUID();
    const payloadWithId = {
      ...payload,
      action,
      request_id: requestId,
    };

    const id = await externalSyncQueueRepository.enqueue({
      provider: "apps_script",
      action,
      entity_type: entityType,
      entity_id: entityId,
      request_id: requestId,
      payload_json: JSON.stringify(payloadWithId),
      next_attempt_at: options?.nextAttemptAt || null,
    });

    if (!options?.nextAttemptAt || new Date(options.nextAttemptAt) <= new Date()) {
      this.processPending().catch(console.error);
    }
    return id;
  },

  async cancelPendingForEntity(entityType: string, entityId: string, actions?: string[]): Promise<void> {
    await externalSyncQueueRepository.cancelPendingForEntity(entityType, entityId, actions);
  },

  async processPending(): Promise<void> {
    const pendingItems = await externalSyncQueueRepository.getPending();

    for (const item of pendingItems) {
      await this.processItem(item);
    }
  },

  async processItem(item: ExternalSyncQueueItem): Promise<void> {
    try {
      await externalSyncQueueRepository.markProcessing(item.id);

      const payload = parsePayload(item);
      const response = await appScriptIntegrationService.sendPayload(payload);

      await this.applySuccessfulResponse(item, response);
      await externalSyncQueueRepository.markSynced(item.id, JSON.stringify(response));

      await externalSyncLogsRepository.log({
        provider: "apps_script",
        action: item.action,
        request_id: item.request_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        status: "success",
        response_json: JSON.stringify(response),
        error_message: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const attempts = item.attempts + 1;

      // --- CORREÇÃO 4: Backoff exponencial de 4 níveis ---
      // Anteriormente só havia 2 níveis (5min e 30min), após o 2º attempt a tarefa
      // ficava em 'failed' permanente. Agora escala progressivamente e respeita HTTP 429.
      //
      // Lógica:
      //   attempt 1 → espera  1 min  (erro transitório, rede instável)
      //   attempt 2 → espera  5 min  (possível sobrecarga do Apps Script)
      //   attempt 3 → espera 15 min  (quota ou rate limit)
      //   attempt 4 → espera 60 min  (problema mais sério, espera longa)
      //   attempt 5 → failed permanente (auditoria gerada)
      const isRateLimit = errorMessage.includes("429") || errorMessage.includes("Too Many Requests");
      const BACKOFF_MINUTES = [1, 5, 15, 60];

      let nextAttemptAt: string | null = null;
      if (attempts <= 4) {
        // Se for rate limit, dobrar o delay para respeitar as quotas da API do Google
        const baseMinutes = BACKOFF_MINUTES[attempts - 1] ?? 60;
        const delayMinutes = isRateLimit ? baseMinutes * 2 : baseMinutes;
        nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
      }
      // attempts >= 5: nextAttemptAt fica null → falha permanente

      await externalSyncQueueRepository.markFailed(item.id, errorMessage, nextAttemptAt, attempts);
      await this.applyFailedResponse(item, errorMessage);

      await externalSyncLogsRepository.log({
        provider: "apps_script",
        action: item.action,
        request_id: item.request_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        status: "error",
        response_json: null,
        error_message: errorMessage,
      });

      // Gerar auditoria apenas em falha permanente (sem mais retentativas)
      if (!nextAttemptAt) {
        await auditRepository.log({
          action: "appscript_sync_failed",
          entity_type: item.entity_type || "integration",
          entity_id: item.entity_id || item.id,
          description: `Falha permanente ao sincronizar ${item.action} após ${attempts} tentativas.`,
          after_data: { error: errorMessage },
        });
      }
    }

  },

  async retryManual(id: string): Promise<void> {
    await externalSyncQueueRepository.forceRetry(id);
    this.processPending().catch(console.error);
  },

  async applySuccessfulResponse(item: ExternalSyncQueueItem, response: Record<string, any>): Promise<void> {
    if (item.entity_type !== "appointment" || !item.entity_id) return;

    const payload = parsePayload(item);
    const calendar = response.calendar || {};
    const email = response.email || {};
    const checkin = response.checkin || {};
    const eventId = calendar.event_id || null;
    const eventUrl = calendar.event_url || calendar.html_link || calendar.add_to_calendar_url || null;

    await dbExecute(
      `
        UPDATE appointments SET
          sync_status = 'synced',
          google_calendar_event_id = COALESCE(?, google_calendar_event_id),
          google_calendar_event_url = COALESCE(?, google_calendar_event_url),
          appscript_sync_status = 'synced',
          appscript_request_id = ?,
          appscript_last_error = NULL,
          appscript_last_sync_at = ?,
          email_sent_at = COALESCE(?, email_sent_at),
          checkin_scheduled_for = COALESCE(?, checkin_scheduled_for),
          updated_at = datetime('now')
        WHERE id = ? AND clinic_id = ?
      `,
      [
        eventId,
        eventUrl,
        item.request_id,
        new Date().toISOString(),
        email.sent_at || null,
        checkin.scheduled_for || null,
        item.entity_id,
        item.clinic_id,
      ]
    );

    if (checkin.checkin_request_id) {
      await dbExecute(
        `
          INSERT INTO checkin_requests (
            id,
            clinic_id,
            patient_id,
            application_plan_id,
            procedure_id,
            appointment_id,
            patient_email,
            scheduled_for,
            status,
            form_url,
            external_response_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            patient_id = excluded.patient_id,
            application_plan_id = excluded.application_plan_id,
            procedure_id = excluded.procedure_id,
            appointment_id = excluded.appointment_id,
            patient_email = excluded.patient_email,
            scheduled_for = excluded.scheduled_for,
            status = CASE
              WHEN checkin_requests.status = 'responded' THEN checkin_requests.status
              ELSE excluded.status
            END,
            form_url = excluded.form_url,
            external_response_id = excluded.external_response_id,
            updated_at = datetime('now')
        `,
        [
          checkin.checkin_request_id,
          item.clinic_id,
          payload.patient?.id || null,
          payload.application_plan_id || null,
          payload.procedure_id || null,
          item.entity_id,
          payload.patient?.email || null,
          checkin.scheduled_for || null,
          checkin.form_url || null,
          checkin.checkin_request_id,
        ]
      );
    }
  },

  async applyFailedResponse(item: ExternalSyncQueueItem, errorMessage: string): Promise<void> {
    if (item.entity_type !== "appointment" || !item.entity_id) return;

    await dbExecute(
      `
        UPDATE appointments SET
          sync_status = 'failed',
          appscript_sync_status = 'failed',
          appscript_request_id = ?,
          appscript_last_error = ?,
          appscript_last_sync_at = ?,
          updated_at = datetime('now')
        WHERE id = ? AND clinic_id = ?
      `,
      [item.request_id, errorMessage, new Date().toISOString(), item.entity_id, item.clinic_id]
    );
  },
};
