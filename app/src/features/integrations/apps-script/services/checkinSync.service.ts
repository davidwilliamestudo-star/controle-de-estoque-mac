import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { notificationsRepository } from "@/features/notifications/repositories/notifications.repository";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { dbExecute, dbSelect } from "@/lib/db/sqlite";

function isYes(value: unknown): boolean {
  if (value === true) return true;
  return String(value || "").trim().toLowerCase() === "sim";
}

export const checkinSyncService = {
  async syncCheckinResponses(): Promise<void> {
    const config = await appScriptIntegrationService.getSettings();
    if (!config.enabled || !config.checkinEnabled) return;

    try {
      const response = await appScriptIntegrationService.sendPayload({
        action: "get_checkin_responses",
        request_id: crypto.randomUUID(),
        filters: {
          only_unsynced: true,
        },
      });

      if (!response.responses || !Array.isArray(response.responses)) return;

      const syncedResponseIds: string[] = [];

      for (const checkin of response.responses) {
        const checkinRequestId = checkin.checkin_request_id;
        if (!checkinRequestId) continue;

        const existing = await dbSelect<{ id: string; patient_id: string }>(
          "SELECT id, patient_id FROM checkin_requests WHERE id = ? AND status != 'responded'",
          [checkinRequestId]
        );

        if (existing.length === 0) continue;

        const responseData = {
          response_id: checkin.response_id || "",
          feeling: checkin.feeling || "",
          had_intercurrence: checkin.had_intercurrence || "",
          local_discomfort: checkin.local_discomfort || "",
          unexpected_symptoms: checkin.unexpected_symptoms || "",
          wants_contact: checkin.wants_contact || "",
          notes: checkin.notes || "",
        };

        await dbExecute(
          `
            UPDATE checkin_requests SET
              status = 'responded',
              response_json = ?,
              response_received_at = ?,
              external_response_id = COALESCE(?, external_response_id),
              updated_at = datetime('now')
            WHERE id = ?
          `,
          [
            JSON.stringify(responseData),
            checkin.submitted_at || new Date().toISOString(),
            checkin.response_id || null,
            checkinRequestId,
          ]
        );

        if (isYes(checkin.had_intercurrence) || isYes(checkin.wants_contact)) {
          const patientRow = await dbSelect<{ full_name: string }>(
            "SELECT full_name FROM patients WHERE id = ?",
            [existing[0].patient_id]
          );
          const patientName = patientRow[0]?.full_name || "Paciente desconhecido";

          await notificationsRepository.upsertActiveNotification({
            type: "checkin_intercurrence",
            title: "Atencao: check-in com intercorrencia",
            message: `O paciente ${patientName} reportou sintomas inesperados ou solicitou contato apos a aplicacao.`,
            severity: "high",
            entityType: "checkin_request",
            entityId: checkinRequestId,
          });
        }

        if (checkin.response_id) {
          syncedResponseIds.push(checkin.response_id);
        }
      }

      if (syncedResponseIds.length > 0) {
        await appScriptIntegrationService.sendPayload({
          action: "mark_checkin_synced",
          request_id: crypto.randomUUID(),
          response_ids: syncedResponseIds,
        }).catch(error => console.error("Falha ao marcar check-ins como sincronizados no Google:", error));
      }

      await auditRepository.log({
        action: "checkin_responses_synced",
        entity_type: "system",
        entity_id: "apps-script",
        description: `Sincronizou ${syncedResponseIds.length} respostas de check-in.`,
      });
    } catch (error) {
      console.error("Erro ao sincronizar check-ins:", error);
      throw error;
    }
  },
};
