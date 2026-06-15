import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { dbExecute, dbTransaction } from "@/lib/db/sqlite";

const CLINIC_ID = "ana-morong-clinic";

export const patientMergeService = {
  async mergePatients(primaryPatientId: string, mergedPatientId: string, reason = "Mesclagem manual de pacientes duplicados"): Promise<void> {
    if (primaryPatientId === mergedPatientId) {
      throw new Error("Selecione dois pacientes diferentes para mesclar.");
    }

    const session = getStoredAuthSession();
    const historyId = crypto.randomUUID();

    await dbTransaction(async () => {
      await dbExecute("UPDATE appointments SET patient_id = ? WHERE patient_id = ?", [primaryPatientId, mergedPatientId]);
      await dbExecute("UPDATE patient_application_plans SET patient_id = ? WHERE patient_id = ?", [primaryPatientId, mergedPatientId]);
      await dbExecute("UPDATE procedures SET patient_id = ? WHERE patient_id = ?", [primaryPatientId, mergedPatientId]);
      await dbExecute("UPDATE patient_report_exports SET patient_id = ? WHERE patient_id = ?", [primaryPatientId, mergedPatientId]);
      await dbExecute("UPDATE checkin_requests SET patient_id = ? WHERE patient_id = ?", [primaryPatientId, mergedPatientId]);

      await dbExecute(
        `
          INSERT INTO patient_merge_history (
            id, clinic_id, primary_patient_id, merged_patient_id,
            merge_reason, created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [historyId, CLINIC_ID, primaryPatientId, mergedPatientId, reason, session?.userId ?? null]
      );

      await dbExecute(
        `
          UPDATE patients
          SET is_active = 0,
              merge_status = 'merged',
              merged_into_patient_id = ?,
              merged_at = datetime('now'),
              merged_by_user_id = ?,
              updated_at = datetime('now')
          WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
        `,
        [primaryPatientId, session?.userId ?? null, mergedPatientId, CLINIC_ID]
      );
    });

    await auditService.log({
      action: "patient_merged",
      entity_type: "patients",
      entity_id: mergedPatientId,
      description: "Paciente duplicado mesclado ao registro principal",
      after_data: { primaryPatientId, mergedPatientId, reason },
      user_id: session?.userId ?? null,
    });
  },
};
