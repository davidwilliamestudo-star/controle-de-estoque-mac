import type { MaterialKind } from "../types";

/**
 * Classifica um item de estoque na linguagem da doutora
 * (seringas 3/5/10 ml, agulhas, algodão, álcool).
 */
export function classifyMaterial(
  name: string,
  categoryName?: string | null,
  itemType?: string | null,
): MaterialKind {
  const strip = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const n = strip(name || "");
  const c = strip(categoryName || "");

  if (itemType === "medication") return "medication";

  const isSyringe =
    n.includes("seringa") ||
    c.includes("seringa") ||
    n.includes("syringe");

  if (isSyringe) {
    // 10ml antes de 3/5 para evitar falsos positivos em nomes compostos
    if (/\b10\s*ml\b/.test(n) || /\b10ml\b/.test(n)) return "syringe_10ml";
    if (/\b5\s*ml\b/.test(n) || /\b5ml\b/.test(n)) return "syringe_5ml";
    if (/\b3\s*ml\b/.test(n) || /\b3ml\b/.test(n)) return "syringe_3ml";
    return "syringe_other";
  }

  if (n.includes("agulha") || c.includes("agulha") || n.includes("needle")) {
    return "needle";
  }

  if (n.includes("algod")) return "cotton";

  if (n.includes("alcool") || n.includes("alcohol") || n.includes("etanol")) {
    return "alcohol";
  }

  if (itemType === "material" || itemType === "equipment" || itemType === "other") {
    return "other_material";
  }

  // fallback: se não for medication tipado, trata como material genérico
  return "other_material";
}

export function isSyringeKind(kind: MaterialKind): boolean {
  return (
    kind === "syringe_3ml" ||
    kind === "syringe_5ml" ||
    kind === "syringe_10ml" ||
    kind === "syringe_other"
  );
}

export function kindLabel(kind: MaterialKind): string {
  switch (kind) {
    case "syringe_3ml":
      return "Seringa 3 ml";
    case "syringe_5ml":
      return "Seringa 5 ml";
    case "syringe_10ml":
      return "Seringa 10 ml";
    case "syringe_other":
      return "Seringa (outro volume)";
    case "needle":
      return "Agulha";
    case "cotton":
      return "Algodão";
    case "alcohol":
      return "Álcool";
    case "medication":
      return "Substância / Medicamento";
    case "other_material":
      return "Outro material";
    default:
      return kind;
  }
}

/** Extrai mês/ano e retorna primeiro e último dia (YYYY-MM-DD). */
export function monthBounds(year: number, month: number): { startDate: string; endDate: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: iso(start), endDate: iso(end) };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
