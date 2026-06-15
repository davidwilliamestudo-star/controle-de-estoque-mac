import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import { externalSyncQueueService } from "./externalSyncQueue.service";
import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { notificationsRepository } from "@/features/notifications/repositories/notifications.repository";
import { generateReportEmailHtml, generateReportEmailText } from "../utils/reportEmailTemplates";
import type { ReportData, ReportApplication, ReportItem } from "../utils/reportEmailTemplates";

export interface SendReportInput {
  patientId: string;
  applicationPlanIds: string[]; // Or procedureIds directly. Let's assume we pass procedureIds
  includeEvolution: boolean;
  includeIntercurrence: boolean;
  includeItems: boolean;
  includeBatches: boolean;
  customMessage?: string;
}

export const patientReportEmailService = {
  async sendReport(input: SendReportInput, userId: string = "system"): Promise<void> {
    const config = await appScriptIntegrationService.getSettings();
    if (!config.enabled || !config.emailEnabled) {
      throw new Error("A integração de e-mail não está ativa nas configurações.");
    }

    if (!input.applicationPlanIds || input.applicationPlanIds.length === 0) {
      throw new Error("Nenhuma aplicação selecionada.");
    }

    // 1. Fetch Patient
    const patients = await dbSelect<{ id: string; full_name: string; email: string }>(
      `SELECT id, full_name, email FROM patients WHERE id = ?`,
      [input.patientId]
    );
    const patient = patients[0];
    if (!patient) throw new Error("Paciente não encontrado.");
    if (!patient.email) throw new Error("O paciente não possui e-mail cadastrado.");

    // 2. Fetch Procedures / Applications
    // The UI will pass application_plan_id list. 
    // We need to find the related procedure for each plan.
    const inClause = input.applicationPlanIds.map(() => '?').join(',');
    
    const procedures = await dbSelect<{
      procedure_id: string;
      application_plan_id: string;
      finalized_at: string;
      final_evolution: string;
      intercurrence_description: string;
      protocol_name: string;
      route_name: string;
      body_area_name: string;
      professional_name: string;
    }>(`
      SELECT 
        p.id as procedure_id,
        pap.id as application_plan_id,
        p.finalized_at,
        p.evolution_text as final_evolution,
        p.intercurrence_description,
        pr.name as protocol_name,
        r.name as route_name,
        ba.name as body_area_name,
        prof.name as professional_name
      FROM procedures p
      INNER JOIN patient_application_plans pap ON pap.id = p.application_plan_id
      LEFT JOIN protocols pr ON pr.id = pap.protocol_id
      LEFT JOIN administration_routes r ON r.id = pap.route_id
      LEFT JOIN body_areas ba ON ba.id = p.body_area_id
      LEFT JOIN users prof ON prof.id = p.responsible_user_id
      WHERE pap.id IN (${inClause}) AND p.status = 'finalized'
      ORDER BY p.finalized_at DESC
    `, [...input.applicationPlanIds]);

    if (procedures.length === 0) {
      throw new Error("Nenhuma aplicação finalizada encontrada para a seleção.");
    }

    const applications: ReportApplication[] = [];

    // 3. For each procedure, fetch items
    for (const proc of procedures) {
      const itemsDb = await dbSelect<{
        id: string;
        item_name: string;
        item_type: string;
        quantity_used: number;
        unit: string;
        batch_number_snapshot: string;
        expiration_date: string;
      }>(`
        SELECT 
          pi.id,
          ii.name as item_name,
          ii.item_type as item_type,
          pi.quantity_used,
          pi.unit,
          pi.batch_number_snapshot,
          ib.expiration_date
        FROM procedure_items_used pi
        INNER JOIN inventory_items ii ON ii.id = pi.inventory_item_id
        LEFT JOIN inventory_batches ib ON ib.id = pi.inventory_batch_id
        WHERE pi.procedure_id = ?
      `, [proc.procedure_id]);

      const items: ReportItem[] = itemsDb.map(i => ({
        id: i.id,
        name: i.item_name,
        type: i.item_type,
        quantity: i.quantity_used,
        unit: i.unit || 'un',
        batchNumber: i.batch_number_snapshot || '',
        expirationDate: i.expiration_date || null,
      }));

      applications.push({
        id: proc.procedure_id,
        date: proc.finalized_at,
        protocolName: proc.protocol_name || "Não informado",
        routeName: proc.route_name || "Não informada",
        bodyAreaName: proc.body_area_name || "Não informada",
        professionalName: proc.professional_name || "-",
        finalEvolution: proc.final_evolution || "",
        intercurrence: proc.intercurrence_description || "",
        items,
      });
    }

    // 4. Generate Report
    const reportData: ReportData = {
      patientName: patient.full_name,
      patientEmail: patient.email,
      clinicName: "Dra. Ana Morong",
      applications,
      includeEvolution: input.includeEvolution,
      includeIntercurrence: input.includeIntercurrence,
      includeItems: input.includeItems,
      includeBatches: input.includeBatches,
      customMessage: input.customMessage,
    };

    const htmlBody = generateReportEmailHtml(reportData);
    const textBody = generateReportEmailText(reportData);

    // 5. Enqueue Action
    const payload = {
      patient: {
        id: patient.id,
        name: patient.full_name,
        email: patient.email,
      },
      email_options: {
        send_email: true,
        subject: "Seu Relatório de Aplicações — Dra. Ana Morong",
        html_body: htmlBody,
        text_body: textBody,
      }
    };

    const exportId = crypto.randomUUID();

    // The Apps Script expects an action `send_patient_application_report`
    // It basically just sends an email using the provided `email_options`.
    await externalSyncQueueService.enqueue(
      "send_patient_application_report",
      "patient_report",
      exportId,
      payload
    );

    // 6. Register Export
    const procIds = procedures.map(p => p.procedure_id);
    await dbExecute(`
      INSERT INTO patient_report_exports (
        id, clinic_id, patient_id, report_type, selected_procedure_ids_json,
        text_body, sent_to_email, status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      exportId,
      "ana-morong-clinic",
      patient.id,
      "application_report",
      JSON.stringify(procIds),
      // html_body omitted to save space, but could be stored
      textBody.substring(0, 5000), 
      patient.email,
      "pending_send",
      userId
    ]);

    await auditRepository.log({
      action: "patient_report_enqueued",
      entity_type: "patient_report",
      entity_id: exportId,
      description: `Relatório de aplicação enfileirado para o paciente ${patient.full_name} (${procIds.length} procedimentos).`,
    });
    
    await notificationsRepository.upsertActiveNotification({
      type: "patient_report_enqueued",
      title: "Envio de Relatório",
      message: `O envio do relatório do paciente ${patient.full_name} foi agendado e será sincronizado.`,
      severity: "low",
      entityType: "patient_report",
      entityId: exportId,
    });
  }
};
