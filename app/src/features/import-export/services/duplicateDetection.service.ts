import type { DuplicateCandidate } from "../types/importExport.types";

function normalizeString(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeNumbers(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function calculateNameSimilarity(left: unknown, right: unknown): number {
  const a = normalizeString(left);
  const b = normalizeString(right);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const aWords = new Set(a.split(" ").filter(word => word.length > 2));
  const bWords = new Set(b.split(" ").filter(word => word.length > 2));
  if (aWords.size === 0 || bWords.size === 0) return 0;

  let matches = 0;
  for (const word of aWords) {
    if (bWords.has(word)) matches++;
  }
  return Math.round((matches / Math.min(aWords.size, bWords.size)) * 100);
}

export const duplicateDetectionService = {
  normalizeString,
  normalizeNumbers,
  calculateNameSimilarity,

  calculatePatientDuplicateScore(importedPatient: Record<string, unknown>, existingPatient: Record<string, unknown>): DuplicateCandidate {
    let score = 0;
    const matchedFields: string[] = [];
    const divergentFields: Record<string, { current: unknown; imported: unknown }> = {};

    const importedEmail = normalizeString(importedPatient.email);
    const existingEmail = normalizeString(existingPatient.email);
    if (importedEmail && existingEmail) {
      if (importedEmail === existingEmail) {
        score += 80;
        matchedFields.push("email");
      } else {
        divergentFields.email = { current: existingPatient.email, imported: importedPatient.email };
      }
    }

    const importedPhone = normalizeNumbers(importedPatient.phone);
    const existingPhone = normalizeNumbers(existingPatient.phone);
    if (importedPhone && existingPhone) {
      if (importedPhone === existingPhone) {
        score += 50;
        matchedFields.push("phone");
      } else {
        divergentFields.phone = { current: existingPatient.phone, imported: importedPatient.phone };
      }
    }

    const importedDocument = normalizeNumbers(importedPatient.document);
    const existingDocument = normalizeNumbers(existingPatient.document);
    if (importedDocument && existingDocument) {
      if (importedDocument === existingDocument) {
        score += 100; // CPF idêntico é duplicidade garantida
        matchedFields.push("document");
      } else {
        divergentFields.document = { current: existingPatient.document, imported: importedPatient.document };
      }
    }

    const importedBirth = String(importedPatient.birth_date ?? "");
    const existingBirth = String(existingPatient.birth_date ?? "");
    if (importedBirth && existingBirth) {
      if (importedBirth === existingBirth) {
        score += 30;
        matchedFields.push("birth_date");
      } else {
        divergentFields.birth_date = { current: existingPatient.birth_date, imported: importedPatient.birth_date };
      }
    }

    const nameSimilarity = calculateNameSimilarity(importedPatient.full_name, existingPatient.full_name);
    if (nameSimilarity === 100) {
      score += 50;
      matchedFields.push("full_name");
    } else if (nameSimilarity >= 50) {
      score += Math.round(nameSimilarity * 0.4);
    } else if (importedPatient.full_name && existingPatient.full_name) {
      divergentFields.full_name = { current: existingPatient.full_name, imported: importedPatient.full_name };
    }

    return {
      entityId: String(existingPatient.id),
      score: Math.min(score, 100),
      matchedFields,
      divergentFields,
      entityData: existingPatient,
    };
  },

  findPatientDuplicates(importedPatient: Record<string, unknown>, existingPatients: Record<string, unknown>[]): DuplicateCandidate[] {
    return existingPatients
      .map(existing => this.calculatePatientDuplicateScore(importedPatient, existing))
      .filter(candidate => candidate.score >= 50)
      .sort((a, b) => b.score - a.score);
  },
};
