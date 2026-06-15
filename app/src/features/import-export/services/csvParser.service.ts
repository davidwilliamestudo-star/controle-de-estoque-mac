import Papa from "papaparse";
import type { ParsedCsv } from "../types/importExport.types";

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim().length > 0) || "";
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function normalizeHeader(header: string) {
  return header.trim().replace(/^\uFEFF/, "").toLowerCase();
}

export const csvParserService = {
  async readFileAsText(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    if (!utf8.includes("�")) return utf8;
    return new TextDecoder("windows-1252", { fatal: false }).decode(buffer);
  },

  parseCsvString(csvContent: string): ParsedCsv {
    const delimiter = detectDelimiter(csvContent);
    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      delimiter,
      dynamicTyping: false,
      transformHeader: normalizeHeader,
      transform: value => (typeof value === "string" ? value.trim() : value),
    });

    const rows = parsed.data.filter(row => Object.values(row).some(value => String(value ?? "").trim() !== ""));
    const headers = parsed.meta.fields ?? [];

    return {
      headers,
      rows,
      delimiter,
      errors: parsed.errors.map(error => `Linha ${error.row ?? "-"}: ${error.message}`),
    };
  },
};
