const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require(path.join(__dirname, '../app/node_modules/pdf-lib'));
const fontkit = require(path.join(__dirname, '../app/node_modules/@pdf-lib/fontkit'));
const JSZip = require(path.join(__dirname, '../app/node_modules/jszip'));

function sanitizeTextForPdf(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFC');
}

async function renderFaithfulContractPdf(filledContractText) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load EB Garamond & Poppins fonts
  let fontRegular, fontBold, fontFooter;
  try {
    const regularBytes = fs.readFileSync('tmp/docx_inspect/word/fonts/EBGaramond-regular.ttf');
    const boldBytes = fs.readFileSync('tmp/docx_inspect/word/fonts/EBGaramond-bold.ttf');
    const poppinsBytes = fs.readFileSync('tmp/docx_inspect/word/fonts/Poppins-regular.ttf');
    fontRegular = await doc.embedFont(regularBytes);
    fontBold = await doc.embedFont(boldBytes);
    fontFooter = await doc.embedFont(poppinsBytes);
  } catch (err) {
    console.warn('Falling back to StandardFonts:', err);
    fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    fontFooter = fontRegular;
  }

  // Load Letterhead
  const img1Bytes = fs.readFileSync('app/public/templates/letterhead_page1.png');
  const img2Bytes = fs.readFileSync('app/public/templates/letterhead_page2.png');
  const bgImg1 = await doc.embedPng(img1Bytes);
  const bgImg2 = await doc.embedPng(img2Bytes);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 56.7; // 2 cm
  const maxTextWidth = pageWidth - marginX * 2;
  const bottomMargin = 72; // Space for Poppins footer at y=30

  let pageIndex = 1;
  let page = doc.addPage([pageWidth, pageHeight]);
  page.drawImage(bgImg1, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  // Starting Y coordinate
  let y = pageHeight - 142; // Below page 1 header

  const addPageBreak = () => {
    pageIndex++;
    page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(bgImg2, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    y = pageHeight - 56; // Below top bar
  };

  const sanitized = sanitizeTextForPdf(filledContractText);
  const lines = sanitized.split('\n');

  // Identify centered and special lines
  const isCenteredText = (str) => {
    return (
      str.startsWith('CONTRATO DE PRESTAÇÃO') ||
      str.startsWith('___________________') ||
      str.startsWith('DRA. ANA CARLA MORONG') ||
      str.startsWith('Médica CONTRATADA') ||
      str.startsWith('CNPJ: 54.811.772/0001-32') ||
      str.startsWith('CONTRATANTE / PACIENTE') ||
      (str.startsWith('Nome: ') && lines.indexOf(str) > lines.length - 10) ||
      (str.startsWith('CPF: ') && lines.indexOf(str) > lines.length - 10)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      y -= 6.5;
      if (y < bottomMargin) {
        addPageBreak();
      }
      continue;
    }

    const isMainTitle = trimmed.startsWith('CONTRATO DE PRESTAÇÃO');
    const isSectionHeader =
      /^[IVX]+\s*[-–—]\s*/.test(trimmed) ||
      trimmed.startsWith('CONTRATADA:') ||
      trimmed.startsWith('CONTRATANTE (PACIENTE):') ||
      trimmed.startsWith('2.2. Diretrizes Técnicas') ||
      trimmed.startsWith('Parágrafo');

    const isProgramItem = /^\[[X\s]\]\s+/i.test(trimmed);
    const isIndentedItem = /^[a-z]\)\s+/i.test(trimmed) || /^[-–]\s+/i.test(trimmed);

    const font = isMainTitle || isSectionHeader || isProgramItem ? fontBold : fontRegular;
    const size = isMainTitle ? 11.5 : isSectionHeader ? 10.5 : 10;
    const lineHeight = size + 4.2;

    // Extra spacing before section headers
    if (isSectionHeader && !isMainTitle) {
      y -= 4;
      if (y < bottomMargin) {
        addPageBreak();
      }
    }

    // Protect final signature block from orphan break
    if (trimmed.startsWith('E, por estarem plenamente esclarecidas') && y < 260) {
      addPageBreak();
    }

    const centered = isCenteredText(trimmed);
    const indent = isIndentedItem ? 14 : 0;
    const currentMaxW = maxTextWidth - indent;

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

      if (candidateWidth > currentMaxW && currentLine) {
        if (y < bottomMargin) {
          addPageBreak();
        }
        let drawX = marginX + indent;
        if (centered) {
          const w = font.widthOfTextAtSize(currentLine, size);
          drawX = (pageWidth - w) / 2;
        }

        try {
          page.drawText(currentLine, {
            x: drawX,
            y,
            size,
            font,
            color: rgb(0.12, 0.14, 0.17),
          });
        } catch {
          page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
            x: drawX,
            y,
            size,
            font,
            color: rgb(0.12, 0.14, 0.17),
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
      let drawX = marginX + indent;
      if (centered) {
        let w = 0;
        try {
          w = font.widthOfTextAtSize(currentLine, size);
        } catch {
          w = font.widthOfTextAtSize(currentLine.replace(/[^\x00-\x7F]/g, ''), size);
        }
        drawX = (pageWidth - w) / 2;
        console.log(`[Page ${pageIndex}] Centered: "${currentLine}" at y=${y.toFixed(1)} (y%=${((pageHeight - y)/pageHeight*100).toFixed(1)}%)`);
      }

      try {
        page.drawText(currentLine, {
          x: drawX,
          y,
          size,
          font,
          color: rgb(0.12, 0.14, 0.17),
        });
      } catch {
        page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
          x: drawX,
          y,
          size,
          font,
          color: rgb(0.12, 0.14, 0.17),
        });
      }
      y -= lineHeight;
    }
  }

  // Draw Official Footer: "Clínica Dra. Ana Morong | Página X de Y."
  const totalPages = doc.getPageCount();
  const allPages = doc.getPages();
  for (let p = 0; p < totalPages; p++) {
    const footerText = `Clínica Dra. Ana Morong | Página ${p + 1} de ${totalPages}.`;
    const fSize = 8.5;
    let fWidth = 0;
    try {
      fWidth = fontFooter.widthOfTextAtSize(footerText, fSize);
    } catch {
      fWidth = fontRegular.widthOfTextAtSize(footerText, fSize);
    }
    allPages[p].drawText(footerText, {
      x: pageWidth - marginX - fWidth,
      y: 28,
      size: fSize,
      font: fontFooter,
      color: rgb(0.25, 0.33, 0.29), // #405549 exactly as in DOCX!
    });
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/contrato_fiel_dra_ana.pdf', pdfBytes);
  console.log('PDF rendered faithfully! Total pages:', totalPages, 'Bytes:', pdfBytes.length);
}

// Read sample contract from scratch/test_output_preenchido.docx
(async () => {
  const docxZip = await JSZip.loadAsync(fs.readFileSync('scratch/test_output_preenchido.docx'));
  const xml = await docxZip.file('word/document.xml').async('string');
  const paragraphs = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const textLines = paragraphs.map(p => {
    return (p.match(/<w:t[\s>][\s\S]*?<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('');
  });
  await renderFaithfulContractPdf(textLines.join('\n'));
})();
