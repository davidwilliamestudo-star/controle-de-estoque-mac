import { downloadFile } from "@/lib/utils/download";
import Papa from "papaparse";
import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { dbSelect } from "@/lib/db/sqlite";
import type { ImportType } from "../types/importExport.types";

const CLINIC_ID = "ana-morong-clinic";

const EXPORT_LABELS: Record<ImportType, string> = {
  patients: "pacientes",
  medications: "medicamentos",
  materials: "materiais",
  suppliers: "fornecedores",
  inventory: "estoque_lotes",
  protocols: "protocolos",
};

const TEMPLATES: Record<ImportType, Record<string, string>[]> = {
  patients: [{ nome: "", telefone: "", email: "", nascimento: "", observacoes: "", alerta: "" }],
  medications: [{ nome: "", categoria: "", unidade: "un", estoque_minimo: "0", observacoes: "" }],
  materials: [{ nome: "", categoria: "", unidade: "un", estoque_minimo: "0", observacoes: "" }],
  suppliers: [{ nome: "", cnpj: "", telefone: "", email: "", observacoes: "" }],
  inventory: [{ nome: "", tipo: "material", lote: "", validade: "", quantidade: "", unidade: "un", fornecedor: "", nf: "" }],
  protocols: [{ nome: "", descricao: "", observacoes: "" }],
};

function generateCsv(data: Record<string, unknown>[]): string {
  return Papa.unparse(data, {
    quotes: true,
    delimiter: ";",
    header: true,
    newline: "\r\n",
  });
}

async function saveCsv(defaultPath: string, csvContent: string): Promise<string | null> {
  return downloadFile({
    filename: defaultPath,
    content: csvContent,
    mimeType: "text/csv;charset=utf-8",
    filters: [{ name: "CSV separado por ponto e virgula", extensions: ["csv"] }],
  });
}

export const dataExportService = {
  generateCsv,

  async fetchRows(entity: ImportType): Promise<Record<string, unknown>[]> {
    if (entity === "patients") {
      return dbSelect(
        `
          SELECT full_name AS nome, phone AS telefone, email, birth_date AS nascimento,
                 notes AS observacoes, alert_notes AS alerta, is_active AS ativo, created_at AS criado_em
          FROM patients
          WHERE clinic_id = ? AND deleted_at IS NULL AND COALESCE(merge_status, 'active') != 'merged'
          ORDER BY full_name ASC
        `,
        [CLINIC_ID]
      );
    }

    if (entity === "medications" || entity === "materials") {
      const itemType = entity === "medications" ? "medication" : "material";
      return dbSelect(
        `
          SELECT i.name AS nome, c.name AS categoria, i.unit AS unidade,
                 i.current_stock AS estoque_atual, i.minimum_stock AS estoque_minimo,
                 i.notes AS observacoes, i.is_active AS ativo
          FROM inventory_items i
          LEFT JOIN inventory_categories c ON c.id = i.category_id
          WHERE i.clinic_id = ? AND i.deleted_at IS NULL AND i.item_type = ?
          ORDER BY i.name ASC
        `,
        [CLINIC_ID, itemType]
      );
    }

    if (entity === "suppliers") {
      return dbSelect(
        `
          SELECT name AS nome, document AS documento, phone AS telefone,
                 email, notes AS observacoes, is_active AS ativo
          FROM suppliers
          WHERE clinic_id = ? AND deleted_at IS NULL
          ORDER BY name ASC
        `,
        [CLINIC_ID]
      );
    }

    if (entity === "inventory") {
      return dbSelect(
        `
          SELECT i.name AS item, i.item_type AS tipo_item, b.batch_number AS lote,
                 b.expiration_date AS validade, b.initial_quantity AS quantidade_inicial,
                 b.current_quantity AS quantidade_atual, i.unit AS unidade,
                 s.name AS fornecedor, b.invoice_number AS nota_fiscal,
                 b.entry_date AS data_entrada
          FROM inventory_batches b
          JOIN inventory_items i ON i.id = b.inventory_item_id
          LEFT JOIN suppliers s ON s.id = b.supplier_id
          WHERE b.clinic_id = ? AND b.deleted_at IS NULL
          ORDER BY i.name ASC, b.expiration_date ASC
        `,
        [CLINIC_ID]
      );
    }

    return dbSelect(
      `
        SELECT name AS nome, description AS descricao, internal_notes AS observacoes, is_active AS ativo
        FROM protocols
        WHERE clinic_id = ? AND deleted_at IS NULL
        ORDER BY name ASC
      `,
      [CLINIC_ID]
    );
  },

  async exportEntity(entity: ImportType): Promise<string | null> {
    const session = getStoredAuthSession();
    const rows = await this.fetchRows(entity);
    if (rows.length === 0) {
      throw new Error("Nao ha dados cadastrados para exportar este modulo.");
    }

    const filePath = await saveCsv(
      `${EXPORT_LABELS[entity]}_${new Date().toISOString().slice(0, 10)}.csv`,
      generateCsv(rows)
    );

    if (filePath) {
      await auditService.log({
        action: "data_exported",
        entity_type: "data_export",
        entity_id: entity,
        description: `Exportacao CSV de ${EXPORT_LABELS[entity]}`,
        after_data: { rows: rows.length, filePath },
        user_id: session?.userId ?? null,
      });
    }

    return filePath;
  },

  async downloadTemplate(entity: ImportType): Promise<string | null> {
    return saveCsv(`modelo_${EXPORT_LABELS[entity]}.csv`, generateCsv(TEMPLATES[entity]));
  },
};
