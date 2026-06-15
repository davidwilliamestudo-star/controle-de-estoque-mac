import type { ColumnMappingSuggestion, ImportType } from "../types/importExport.types";

const dictionaries: Record<ImportType, Record<string, string[]>> = {
  patients: {
    full_name: ["nome", "paciente", "nome completo", "cliente", "client_name", "patient_name"],
    email: ["email", "e-mail", "mail"],
    phone: ["telefone", "celular", "whatsapp", "phone", "mobile"],
    document: ["cpf", "documento", "doc", "rg"],
    birth_date: ["nascimento", "data nascimento", "data de nascimento", "birth_date", "birthday"],
    notes: ["observacao", "observacoes", "notes", "anotacoes"],
    alert_notes: ["alerta", "alertas", "observacao alerta", "alert_notes"],
  },
  medications: {
    name: ["nome", "medicamento", "produto", "item"],
    category: ["categoria", "category"],
    unit: ["unidade", "unidade controle", "unit", "unidade_controle"],
    minimum_stock: ["estoque minimo", "minimo", "minimum_stock"],
    notes: ["observacao", "observacoes", "notes", "principio ativo", "concentracao"],
  },
  materials: {
    name: ["nome", "material", "produto", "item"],
    category: ["categoria", "category"],
    unit: ["unidade", "unidade controle", "unit", "unidade_controle"],
    minimum_stock: ["estoque minimo", "minimo", "minimum_stock"],
    notes: ["observacao", "observacoes", "notes"],
  },
  suppliers: {
    name: ["nome", "fornecedor", "empresa", "razao social"],
    document: ["cnpj", "cpf", "documento", "doc"],
    email: ["email", "e-mail"],
    phone: ["telefone", "celular", "whatsapp"],
    notes: ["observacao", "observacoes", "notes"],
  },
  inventory: {
    item_name: ["item_nome", "nome do item", "produto", "item", "nome"],
    item_type: ["tipo_item", "tipo do item", "tipo"],
    batch_number: ["lote", "batch", "batch_number"],
    expiration_date: ["validade", "vencimento", "expiration", "expiration_date"],
    manufacturing_date: ["fabricacao", "manufacture_date"],
    quantity: ["quantidade", "qtd", "quantity"],
    unit: ["unidade", "unit", "unidade_controle"],
    supplier_name: ["fornecedor", "supplier"],
    invoice_number: ["nota fiscal", "nf", "invoice"],
  },
  protocols: {
    name: ["nome", "protocolo", "protocol"],
    description: ["descricao", "description"],
    notes: ["observacao", "notes"],
  },
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

export const importMappingService = {
  fieldsFor(importType: ImportType) {
    return Object.keys(dictionaries[importType]);
  },

  suggestMapping(importType: ImportType, csvHeaders: string[]): ColumnMappingSuggestion[] {
    const dictionary = dictionaries[importType];
    return csvHeaders.map(header => {
      const normalizedHeader = normalize(header);

      for (const [field, aliases] of Object.entries(dictionary)) {
        const normalizedAliases = [field, ...aliases].map(normalize);
        if (normalizedAliases.includes(normalizedHeader)) {
          return { csvHeader: header, suggestedField: field, confidence: 100 };
        }
      }

      let best: ColumnMappingSuggestion = { csvHeader: header, suggestedField: null, confidence: 0 };
      for (const [field, aliases] of Object.entries(dictionary)) {
        for (const alias of aliases.map(normalize)) {
          if (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)) {
            best = { csvHeader: header, suggestedField: field, confidence: 75 };
          }
        }
      }
      return best;
    });
  },

  buildMapping(importType: ImportType, csvHeaders: string[]) {
    const mapping: Record<string, string> = {};
    for (const suggestion of this.suggestMapping(importType, csvHeaders)) {
      if (suggestion.suggestedField) {
        mapping[suggestion.csvHeader] = suggestion.suggestedField;
      }
    }
    return mapping;
  },

  applyMapping(rawRow: Record<string, string>, mapping: Record<string, string>): Record<string, string | number | null> {
    const mapped: Record<string, string | number | null> = {};
    for (const [csvColumn, field] of Object.entries(mapping)) {
      if (!field) continue;
      mapped[field] = rawRow[csvColumn] ?? "";
    }
    return mapped;
  },
};
