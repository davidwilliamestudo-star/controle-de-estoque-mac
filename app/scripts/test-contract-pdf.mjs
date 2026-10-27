// Teste de regressão geométrica do PDF do contrato.
// Uso (na pasta app/): node ../scratch/test_contract_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const appDir = process.cwd();
const outFile = path.resolve(appDir, '../scratch/.bundle_contract_engine.mjs');

await build({
  entryPoints: [path.resolve(appDir, 'src/services/contracts/saude360ContractEngine.service.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: outFile,
  alias: { '@': path.resolve(appDir, 'src') },
  logLevel: 'error',
});

// fetch('/fonts/...') -> lê de public/ (usa as fontes reais EB Garamond / Poppins)
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (typeof url === 'string' && url.startsWith('/')) {
    const p = path.resolve(appDir, 'public' + url);
    if (!fs.existsSync(p)) return { ok: false };
    const buf = fs.readFileSync(p);
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  }
  return realFetch(url);
};

const engine = await import(pathToUrl(outFile));
function pathToUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

const L = engine.CONTRACT_PDF_LAYOUT;
const H = L.pageHeight;
const W = L.pageWidth;

const baseText = engine.OFFICIAL_CONTRACT_MODEL_3_TEXT.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, 'Valor Exemplo Longo');

// Insere N parágrafos extras antes de "X – DO FORO" para varrer posições do bloco final
function variant(n) {
  const filler = Array.from({ length: n }, (_, i) =>
    `Cláusula adicional ${i + 1}: texto de preenchimento para variar a posição do bloco final de assinaturas dentro da página do contrato.`
  ).join('\n');
  return baseText.replace('X – DO FORO', `${filler}\n\nX – DO FORO`);
}

const failures = [];
const stats = { cases: 0, pages: 0 };

for (const useFallbackFont of [false]) {
  for (let n = 0; n <= 42; n++) {
    const text = variant(n);
    const res = await engine.generateContractPdfBase64(text);
    stats.cases++;
    stats.pages += res.pageCount;
    const bytes = Uint8Array.from(Buffer.from(res.pdfBase64, 'base64'));
    const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: false, verbosity: 0 }).promise;
    const tag = `variação +${n} parágrafos (${res.pageCount} págs)`;

    let sigStartPage = null;
    let sigEndPage = null;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const lim = p === 1 ? L.page1 : L.otherPages;
      for (const it of tc.items) {
        if (!it.str.trim()) continue;
        const x = it.transform[4];
        const y = it.transform[5]; // baseline, origem embaixo
        const w = it.width;
        const isPageNum = it.str.includes('Página') && it.str.includes('Clínica');
        if (it.str.includes('E, por estarem')) sigStartPage = p;
        if (it.str.trim().startsWith('CPF:') && sigStartPage !== null) sigEndPage = p;

        if (isPageNum) {
          if (p === 1) failures.push(`${tag}: número de página aparece na pág. 1`);
          // fora da arte: x 230..410, y ~28
          if (x < 225 || x + w > 415) failures.push(`${tag}: nº de página fora da faixa livre (x=${x.toFixed(0)}..${(x + w).toFixed(0)}) pág ${p}`);
          continue;
        }
        if (y < lim.bottom - 0.5) failures.push(`${tag}: texto abaixo da base (y=${y.toFixed(1)} < ${lim.bottom}) pág ${p}: "${it.str.slice(0, 40)}"`);
        if (y > H - lim.top + 0.5) failures.push(`${tag}: texto acima do topo (y=${y.toFixed(1)}) pág ${p}: "${it.str.slice(0, 40)}"`);
        if (x < L.marginX - 1 || x + w > W - L.marginX + 2) failures.push(`${tag}: texto fora das laterais x=${x.toFixed(1)}..${(x + w).toFixed(1)} pág ${p}: "${it.str.slice(0, 40)}"`);
      }
    }
    if (sigStartPage !== sigEndPage) failures.push(`${tag}: bloco de assinatura PARTIDO (início pág ${sigStartPage}, fim pág ${sigEndPage})`);

    // Âncoras
    const { dra, patient } = res.signatureAnchors;
    if (!dra || !patient) {
      failures.push(`${tag}: âncoras de assinatura ausentes`);
    } else {
      for (const [nome, a] of [['Dra', dra], ['Paciente', patient]]) {
        if (a.page !== sigEndPage) failures.push(`${tag}: âncora ${nome} na pág ${a.page}, bloco na pág ${sigEndPage}`);
        const bx = (a.x_percent / 100) * W, bw = (a.width_percent / 100) * W;
        const btop = H - (a.y_percent / 100) * H, bh = (a.height_percent / 100) * H, bbot = btop - bh;
        const page = await doc.getPage(a.page);
        const tc = await page.getTextContent();
        for (const it of tc.items) {
          const s = it.str.trim();
          if (!s || s.startsWith('____')) continue;
          const ix = it.transform[4], iy = it.transform[5], iw = it.width, ih = Math.max(it.height, 8);
          const overlapX = ix < bx + bw && ix + iw > bx;
          const overlapY = iy + ih * 0.8 > bbot && iy < btop;
          if (overlapX && overlapY) failures.push(`${tag}: campo ${nome} sobrepõe texto "${s.slice(0, 40)}"`);
        }
      }
      if (!(dra.y_percent < patient.y_percent)) failures.push(`${tag}: ordem das assinaturas invertida`);
    }

    // Rubricas dentro da zona segura
    for (const [nome, b] of Object.entries(res.initialsBoxes)) {
      const right = ((b.x_percent + b.width_percent) / 100) * W;
      const bottom = H - ((b.y_percent + b.height_percent) / 100) * H;
      const top = H - (b.y_percent / 100) * H;
      if (right > 566.5) failures.push(`${tag}: rubrica ${nome} passa do limite direito do timbrado (${right.toFixed(1)})`);
      if (bottom < 102) failures.push(`${tag}: rubrica ${nome} dentro da mancha direita (bottom=${bottom.toFixed(1)})`);
      if (top > L.otherPages.bottom) failures.push(`${tag}: rubrica ${nome} sobe sobre a área de texto (top=${top.toFixed(1)} > ${L.otherPages.bottom})`);
    }
    if (n % 14 === 0) console.log(`ok: ${tag}; assinatura na pág ${sigEndPage}; Dra y=${dra?.y_percent}% Pac y=${patient?.y_percent}%`);
  }
}

fs.rmSync(outFile, { force: true });
console.log(`\nCasos: ${stats.cases}, páginas geradas: ${stats.pages}`);
if (failures.length) {
  console.log(`FALHAS (${failures.length}):`);
  [...new Set(failures)].slice(0, 40).forEach((f) => console.log(' -', f));
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
