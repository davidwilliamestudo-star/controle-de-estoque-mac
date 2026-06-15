/**
 * calendarPollSync.service.ts
 *
 * CORREÇÃO 6: Sincronização Bidirecional Google Calendar → App Local
 *
 * PROBLEMA ORIGINAL:
 *   Se a Dra. Ana editar ou cancelar um agendamento diretamente no Google Calendar,
 *   o app Tauri não tem como saber — o SQLite local continua mostrando o status antigo.
 *
 * SOLUÇÃO (Polling Pull):
 *   - Estratégia de webhook (Google Calendar Push Notifications) foi descartada pois
 *     requereria um endpoint HTTPS público que o Tauri local não possui.
 *   - Em vez disso, o frontend chama o backend Apps Script a cada 30 minutos com a
 *     ação "get_modified_calendar_events" passando o timestamp da última sincronização.
 *   - O Apps Script usa Calendar.Events.list(updatedMin=since) para retornar apenas
 *     eventos criados pelo nosso sistema que foram modificados desde então.
 *   - O frontend reconcilia as diferenças com o SQLite local.
 *
 * USO:
 *   - Chamar calendarPollSyncService.poll() ao abrir o app.
 *   - Configurar um intervalo automático de 30min via useEffect ou hook global.
 *   - O campo `last_calendar_poll_at` nas settings controla a janela de consulta.
 */

import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import { auditRepository } from "@/features/audit/repositories/audit.repository";

interface CalendarModifiedEvent {
  calendar_event_id: string;
  appointment_id: string;
  application_plan_id: string;
  patient_id: string;
  /** "confirmed" | "cancelled" — status retornado pelo Google Calendar */
  status: "confirmed" | "cancelled" | string;
  start: string | null;
  end: string | null;
  updated: string;
  title: string;
}

interface CalendarPollResult {
  checked_at: string;
  events_found: number;
  reconciled: number;
  skipped: number;
  errors: string[];
}

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
const SETTINGS_POLL_KEY = "last_calendar_poll_at";
const CLINIC_ID = "ana-morong-clinic";

export const calendarPollSyncService = {

  /**
   * Executa o ciclo de polling completo:
   * 1. Recupera o timestamp da última poll nas settings
   * 2. Chama o Apps Script para buscar eventos modificados desde então
   * 3. Reconcilia com o SQLite local
   * 4. Atualiza o timestamp da última poll
   */
  async poll(): Promise<CalendarPollResult> {
    const checkedAt = new Date().toISOString();
    const result: CalendarPollResult = {
      checked_at: checkedAt,
      events_found: 0,
      reconciled: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // 1. Buscar timestamp da última poll
      const since = await this.getLastPollTimestamp();

      // 2. Consultar o Apps Script
      const response = await appScriptIntegrationService.sendPayload({
        action: "get_modified_calendar_events",
        request_id: crypto.randomUUID(),
        since,
      });

      const events: CalendarModifiedEvent[] = response.events ?? [];
      result.events_found = events.length;

      if (events.length === 0) {
        await this.saveLastPollTimestamp(checkedAt);
        return result;
      }

      // 3. Reconciliar cada evento com o SQLite local
      for (const event of events) {
        try {
          const reconciled = await this.reconcileEvent(event);
          if (reconciled) {
            result.reconciled++;
          } else {
            result.skipped++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`event ${event.calendar_event_id}: ${msg}`);
        }
      }

      // 4. Salvar timestamp da poll bem-sucedida
      await this.saveLastPollTimestamp(checkedAt);

      // Logar no audit se houve reconciliações
      if (result.reconciled > 0) {
        await auditRepository.log({
          action: "calendar_poll_sync",
          entity_type: "integration",
          entity_id: "google_calendar",
          description: `Sincronização bidirecional: ${result.reconciled} agendamento(s) atualizados a partir do Google Calendar.`,
          after_data: { since, reconciled: result.reconciled, skipped: result.skipped },
        });
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`poll_error: ${msg}`);
    }

    return result;
  },

  /**
   * Reconcilia um evento do Calendar com o appointment correspondente no SQLite.
   * Retorna true se alguma atualização foi feita.
   */
  async reconcileEvent(event: CalendarModifiedEvent): Promise<boolean> {
    if (!event.appointment_id) return false;

    // Buscar o appointment local pelo calendar_event_id ou appointment_id
    const rows = await dbSelect<{
      id: string;
      sync_status: string;
      google_calendar_event_id: string | null;
      scheduled_at: string | null;
      status: string;
    }>(
      `SELECT id, sync_status, google_calendar_event_id, scheduled_at, status
       FROM appointments
       WHERE (google_calendar_event_id = ? OR id = ?) AND clinic_id = ?
       LIMIT 1`,
      [event.calendar_event_id, event.appointment_id, CLINIC_ID]
    );

    if (rows.length === 0) {
      // Evento do Calendar não tem correspondência local — ignorar
      return false;
    }

    const local = rows[0];

    // Evento cancelado no Calendar → marcar appointment como cancelled no SQLite
    if (event.status === "cancelled" && local.status !== "cancelled") {
      await dbExecute(
        `UPDATE appointments SET
           status = 'cancelled',
           sync_status = 'synced',
           appscript_sync_status = 'synced',
           appscript_last_sync_at = datetime('now'),
           updated_at = datetime('now')
         WHERE id = ? AND clinic_id = ?`,
        [local.id, CLINIC_ID]
      );
      return true;
    }

    // Horário alterado no Calendar → atualizar scheduled_at local
    if (event.status === "confirmed" && event.start) {
      const localDate = local.scheduled_at ? new Date(local.scheduled_at).toISOString() : null;
      const remoteDate = new Date(event.start).toISOString();

      // Só atualizar se a diferença for maior que 1 minuto (evitar falsos positivos de timezone)
      const diffMs = Math.abs(
        new Date(remoteDate).getTime() - new Date(localDate ?? 0).getTime()
      );

      if (diffMs > 60_000) {
        await dbExecute(
          `UPDATE appointments SET
             scheduled_at = ?,
             sync_status = 'synced',
             appscript_sync_status = 'synced',
             appscript_last_sync_at = datetime('now'),
             updated_at = datetime('now')
           WHERE id = ? AND clinic_id = ?`,
          [remoteDate, local.id, CLINIC_ID]
        );
        return true;
      }
    }

    return false;
  },

  /** Intervalo automático de polling (chamar no mount de um componente global) */
  startAutoPolling(): () => void {
    // Executar imediatamente ao iniciar
    this.poll().catch(console.error);

    const interval = setInterval(() => {
      this.poll().catch(console.error);
    }, POLL_INTERVAL_MS);

    // Retornar função de cleanup para useEffect
    return () => clearInterval(interval);
  },

  async getLastPollTimestamp(): Promise<string> {
    const rows = await dbSelect<{ value: string }>(
      `SELECT value FROM settings WHERE clinic_id = ? AND key = ? LIMIT 1`,
      [CLINIC_ID, SETTINGS_POLL_KEY]
    );
    if (rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
    // Primeira execução: retornar 24h atrás como janela inicial conservadora
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  },

  async saveLastPollTimestamp(timestamp: string): Promise<void> {
    await dbExecute(
      `INSERT INTO settings (id, clinic_id, key, value, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(clinic_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [crypto.randomUUID(), CLINIC_ID, SETTINGS_POLL_KEY, timestamp]
    );
  },
};
