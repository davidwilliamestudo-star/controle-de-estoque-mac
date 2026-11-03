// src/services/signatures/pdfTextNormalizer.ts
// Utilitários de normalização de texto para renderização em PDF (pdf-lib).

/**
 * Ligaduras tipográficas Unicode (U+FB00..U+FB06) expandidas para letras comuns.
 * Fonte única da verdade: evita glifos de ligadura (fi, fl...) que, com fontes
 * customizadas embutidas, geram espaçamento indevido ("Profi ssional").
 */
const LIGATURE_MAP: Record<string, string> = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'st',
  '\uFB06': 'st',
};

/**
 * Normaliza texto antes de desenhar no PDF:
 *  - expande ligaduras Unicode (ﬁ, ﬂ, ﬀ, ﬃ, ﬄ ...);
 *  - remove caracteres de largura zero e BOM;
 *  - converte NBSP em espaço comum;
 *  - aplica NFC (compõe acentos).
 *
 * Observação: não usa NFKC puro porque ele converte "º"/"ª" em "o"/"a"
 * (ex.: "nº 14.063" viraria "no 14.063") e "²" em "2".
 */
export function normalizePdfText(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .replace(/[\uFB00-\uFB06]/g, (c) => LIGATURE_MAP[c] || c)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .normalize('NFC');
}

/**
 * Opções de features OpenType para embedFont (pdf-lib + fontkit):
 * desliga ligaduras para que "fi"/"fl" sejam desenhados como duas letras,
 * mantendo a largura medida (widthOfTextAtSize) idêntica à desenhada.
 */
export const NO_LIGATURE_FONT_FEATURES = {
  liga: false,
  clig: false,
  dlig: false,
  hlig: false,
  calt: false,
} as const;

/**
 * Quebra um texto em linhas que caibam em maxWidth, sem inserir espaços dentro de palavras.
 * Palavras maiores que maxWidth (ex.: User-Agent, hashes) são quebradas por caractere.
 */
export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  maxLines = Number.POSITIVE_INFINITY
): string[] {
  const clean = normalizePdfText(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = '';
  };

  for (const word of clean.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }
    // palavra única maior que a largura: quebra por caractere
    let chunk = '';
    for (const ch of word) {
      if (measure(chunk + ch) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    current = chunk;
  }
  pushCurrent();

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && measure(`${last}...`) > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last.trimEnd()}...`;
    return kept;
  }
  return lines;
}

/**
 * Formata o registro do conselho: "CRM/SC 28412". Aceita "CRM/SC", "28412", "CRM/SC 28412".
 */
export function formatCouncilRegister(raw?: string | null, fallbackNumber = '28412'): string {
  const text = String(raw || '').trim();
  const number = text.match(/\d{3,}/)?.[0] || fallbackNumber;
  const prefix = text.match(/^[A-Za-z]{2,5}\/[A-Za-z]{2}/)?.[0]?.toUpperCase() || 'CRM/SC';
  return `${prefix} ${number}`;
}

const EVENT_TYPE_ALIASES: Record<string, string> = {
  'document.created': 'DOCUMENT_CREATED',
  'document.viewed': 'DOCUMENT_VIEWED',
  'document.signed': 'DOCUMENT_SIGNED',
  'document.rejected': 'DOCUMENT_REJECTED',
  'document.completed': 'DOCUMENT_COMPLETED',
};

/** Padroniza nomes legados de evento (document.created -> DOCUMENT_CREATED). */
export function normalizeAuditEventType(raw?: string | null): string {
  const text = String(raw || '').trim();
  if (!text) return 'EVENT';
  return EVENT_TYPE_ALIASES[text.toLowerCase()] || text;
}

