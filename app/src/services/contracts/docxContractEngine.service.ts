// src/services/contracts/docxContractEngine.service.ts
import JSZip from 'jszip';

export type DocxTagMap = Record<string, any>;

/**
 * Carrega o modelo oficial MODELO CONTRATO FINANCEIRO DRA ANA (3).docx,
 * substitui todas as chaves {{tag}} no XML do documento e retorna o arquivo .docx preenchido como Blob.
 */
export async function fillDocxContract(
  tags: DocxTagMap,
  docxSource?: ArrayBuffer | Blob | string
): Promise<Blob> {
  let docxArrayBuffer: ArrayBuffer;

  if (docxSource instanceof ArrayBuffer) {
    docxArrayBuffer = docxSource;
  } else if (docxSource instanceof Blob) {
    docxArrayBuffer = await docxSource.arrayBuffer();
  } else if (typeof docxSource === 'string' && docxSource.length > 0) {
    const response = await fetch(docxSource);
    if (!response.ok) {
      throw new Error(`Falha ao carregar modelo DOCX de ${docxSource}: ${response.statusText}`);
    }
    docxArrayBuffer = await response.arrayBuffer();
  } else {
    // Carrega o modelo padrão oficial embutido em /templates/contract_template_dra_ana.docx
    const response = await fetch('/templates/contract_template_dra_ana.docx');
    if (!response.ok) {
      throw new Error(`Falha ao carregar modelo padrão DOCX: ${response.statusText}`);
    }
    docxArrayBuffer = await response.arrayBuffer();
  }

  const zip = await JSZip.loadAsync(docxArrayBuffer);
  const docFile = zip.file('word/document.xml');

  if (!docFile) {
    throw new Error('Arquivo word/document.xml não encontrado dentro do arquivo .docx.');
  }

  let xml = await docFile.async('string');

  // Função para sanitizar caracteres especiais XML e evitar corrupção do documento Word
  const escapeXml = (unsafe: any): string => {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Normaliza o caractere dentro do colchete do DOCX: 'X' para marcado ou ' ' (espaço) para desmarcado
  const formatCheckbox = (val: any): string => {
    if (!val) return ' ';
    const s = String(val).trim().toUpperCase();
    if (s === 'X' || s === '[X]' || s === 'TRUE' || s === '1') {
      return 'X';
    }
    return ' ';
  };

  // Mapeamento normalizado e sanitizado de todas as chaves do contrato oficial
  const replacements: Record<string, string> = {
    '{{nome}}': escapeXml(tags.nome || ''),
    '{{cpf}}': escapeXml(tags.cpf || ''),
    '{{data_nascimento}}': escapeXml(tags.data_nascimento || ''),
    '{{endereco}}': escapeXml(tags.endereco || ''),
    '{{bairro_cidade_uf}}': escapeXml(tags.bairro_cidade_uf || ''),
    '{{cep}}': escapeXml(tags.cep || ''),
    '{{telefone}}': escapeXml(tags.telefone || ''),
    '{{email}}': escapeXml(tags.email || ''),

    // Checkboxes dos programas (no XML do DOCX já existe [{{tag}}], portanto substituímos por 'X' ou ' ')
    '{{chk_mapa}}': formatCheckbox(tags.chk_mapa),
    '{{chk_restart}}': formatCheckbox(tags.chk_restart),
    '{{chk_evolution}}': formatCheckbox(tags.chk_evolution),
    '{{chk_signature}}': formatCheckbox(tags.chk_signature),
    '{{chk_life}}': formatCheckbox(tags.chk_life),
    '{{chk_personalizado}}': formatCheckbox(tags.chk_personalizado),

    // Especificações clínicas
    '{{semanas_tratamento}}': escapeXml(tags.semanas_tratamento || ''),
    '{{duracao_personalizada}}': escapeXml(tags.duracao_personalizada || ''),
    '{{consulta_seg}}': escapeXml(tags.consulta_seg || ''),
    '{{frequencia_procedimentos}}': escapeXml(tags.frequencia_procedimentos || ''),
    '{{especificacoes_terapeuticas}}': escapeXml(tags.especificacoes_terapeuticas || ''),

    // Financeiro
    '{{valor_plano}}': escapeXml(tags.valor_plano || ''),
    '{{valor_plano_extenso}}': escapeXml(tags.valor_plano_extenso || ''),
    '{{chk_avista}}': formatCheckbox(tags.chk_avista),
    '{{valor_avista}}': escapeXml(tags.valor_avista || ''),
    '{{chk_cartao}}': formatCheckbox(tags.chk_cartao),
    '{{num_parcelas_cartao}}': escapeXml(tags.num_parcelas_cartao || ''),
    '{{valor_parcela_cartao}}': escapeXml(tags.valor_parcela_cartao || ''),
    '{{chk_pix_parcelado}}': formatCheckbox(tags.chk_pix_parcelado),
    '{{num_parcelas_pix}}': escapeXml(tags.num_parcelas_pix || ''),
    '{{valor_parcela_pix}}': escapeXml(tags.valor_parcela_pix || ''),
    '{{dia_vencimento_pix}}': escapeXml(tags.dia_vencimento_pix || ''),

    // Disposições gerais e assinaturas
    '{{vigencia_contrato}}': escapeXml(tags.vigencia_contrato || ''),
    '{{data_extenso}}': escapeXml(tags.data_extenso || ''),
    '{{crm_dra}}': escapeXml(tags.crm_dra || '54.811.772/0001-32'),
  };

  // Aplica todas as substituições de chaves
  for (const [tag, value] of Object.entries(replacements)) {
    const parts = xml.split(tag);
    if (parts.length > 1) {
      xml = parts.join(value);
    }
  }

  // Atualiza o XML dentro do ZIP
  zip.file('word/document.xml', xml);

  // Gera o Blob final do DOCX com MIME type oficial
  return await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Dispara o download automático do contrato .docx preenchido com papel timbrado original
 */
export async function downloadFilledDocx(
  tags: DocxTagMap,
  filename = 'Contrato_Dra_Ana_Morong_Preenchido.docx'
): Promise<void> {
  const blob = await fillDocxContract(tags);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
