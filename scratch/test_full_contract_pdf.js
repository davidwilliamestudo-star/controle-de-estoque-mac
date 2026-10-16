const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('../app/node_modules/pdf-lib');

function sanitizeTextForHelvetica(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFC');
}

async function generatePdfWithLetterhead() {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const img1Bytes = fs.readFileSync('app/public/templates/letterhead_page1.png');
  const img2Bytes = fs.readFileSync('app/public/templates/letterhead_page2.png');
  const bgImg1 = await doc.embedPng(img1Bytes);
  const bgImg2 = await doc.embedPng(img2Bytes);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 48;
  const maxTextWidth = pageWidth - marginX * 2;
  const bottomMargin = 85;

  let pageIndex = 1;
  let page = doc.addPage([pageWidth, pageHeight]);
  page.drawImage(bgImg1, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  let y = pageHeight - 148; // Below header on page 1

  const addPageBreak = () => {
    pageIndex++;
    page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(bgImg2, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    y = pageHeight - 48; // Below top bar on subsequent pages
  };

  // Read the text from our filled docx
  const JSZip = require('../app/node_modules/jszip');
  const docxZip = await JSZip.loadAsync(fs.readFileSync('scratch/test_output_preenchido.docx'));
  const xml = await docxZip.file('word/document.xml').async('string');
  const paragraphs = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const textLines = paragraphs.map(p => {
    return (p.match(/<w:t[\s>][\s\S]*?<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('');
  });
  const sampleText = textLines.join('\n');
  const sanitized = sanitizeTextForHelvetica(sampleText);
  const lines = sanitized.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      y -= 7;
      if (y < bottomMargin) {
        addPageBreak();
      }
      continue;
    }

    const isMainTitle = trimmed.startsWith('CONTRATO DE PRESTAÇÃO');
    const isSectionHeader =
      /^[IVX]+\s*-\s*/.test(trimmed) ||
      trimmed.startsWith('CONTRATADA:') ||
      trimmed.startsWith('CONTRATANTE (PACIENTE):') ||
      trimmed.startsWith('[X]') ||
      trimmed.startsWith('Parágrafo');

    const font = isMainTitle || isSectionHeader ? fontBold : fontRegular;
    const size = isMainTitle ? 10.5 : isSectionHeader ? 8.8 : 8.2;
    const lineHeight = size + 3.8;

    if (trimmed.startsWith('E, por estarem plenamente esclarecidas') && y < 220) {
      addPageBreak();
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      let candidateWidth = 0;
      try {
        candidateWidth = font.widthOfTextAtSize(candidate, size);
      } catch {
        candidateWidth = font.widthOfTextAtSize(candidate.replace(/[^\x00-\x7F]/g, ''), size);
      }

      if (candidateWidth > maxTextWidth && currentLine) {
        if (y < bottomMargin) {
          addPageBreak();
        }
        try {
          page.drawText(currentLine, {
            x: marginX,
            y,
            size,
            font,
            color: rgb(0.08, 0.1, 0.14),
          });
        } catch {
          page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
            x: marginX,
            y,
            size,
            font,
            color: rgb(0.08, 0.1, 0.14),
          });
        }
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      if (y < bottomMargin) {
        addPageBreak();
      }
      try {
        page.drawText(currentLine, {
          x: marginX,
          y,
          size,
          font,
          color: rgb(0.08, 0.1, 0.14),
        });
      } catch {
        page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
          x: marginX,
          y,
          size,
          font,
          color: rgb(0.08, 0.1, 0.14),
        });
      }
      y -= lineHeight;
    }
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/contrato_com_papel_timbrado.pdf', pdfBytes);
  console.log('Finished rendering! Page count:', pageIndex, 'Bytes:', pdfBytes.length);
}

generatePdfWithLetterhead().catch(console.error);
