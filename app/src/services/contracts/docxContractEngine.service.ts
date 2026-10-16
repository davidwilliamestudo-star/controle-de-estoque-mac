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

  // Mapeamento normalizado de todas as chaves do contrato
  const replacements: Record<string, string> = {
    '{{nome}}': tags.nome || '',
    '{{cpf}}': tags.cpf || '',
    '{{data_nascimento}}': tags.data_nascimento || '',
    '{{endereco}}': tags.endereco || '',
    '{{bairro_cidade_uf}}': tags.bairro_cidade_uf || '',
    '{{cep}}': tags.cep || '',
    '{{telefone}}': tags.telefone || '',
    '{{email}}': tags.email || '',

    // Checkboxes dos programas
    '{{chk_mapa}}': tags.chk_mapa || '[ ]',
    '{{chk_restart}}': tags.chk_restart || '[ ]',
    '{{chk_evolution}}': tags.chk_evolution || '[ ]',
    '{{chk_signature}}': tags.chk_signature || '[ ]',
    '{{chk_life}}': tags.chk_life || '[ ]',
    '{{chk_personalizado}}': tags.chk_personalizado || '[ ]',

    // Especificações clínicas
    '{{semanas_tratamento}}': tags.semanas_tratamento || '',
    '{{duracao_personalizada}}': tags.duracao_personalizada || '',
    '{{consulta_seg}}': tags.consulta_seg || '',
    '{{frequencia_procedimentos}}': tags.frequencia_procedimentos || '',
    '{{especificacoes_terapeuticas}}': tags.especificacoes_terapeuticas || '',

    // Financeiro
    '{{valor_plano}}': tags.valor_plano || '',
    '{{valor_plano_extenso}}': tags.valor_plano_extenso || '',
    '{{chk_avista}}': tags.chk_avista || '[ ]',
    '{{valor_avista}}': tags.valor_avista || '',
    '{{chk_cartao}}': tags.chk_cartao || '[ ]',
    '{{num_parcelas_cartao}}': tags.num_parcelas_cartao || '',
    '{{valor_parcela_cartao}}': tags.valor_parcela_cartao || '',
    '{{chk_pix_parcelado}}': tags.chk_pix_parcelado || '[ ]',
    '{{num_parcelas_pix}}': tags.num_parcelas_pix || '',
    '{{valor_parcela_pix}}': tags.valor_parcela_pix || '',
    '{{dia_vencimento_pix}}': tags.dia_vencimento_pix || '',

    // Disposições gerais e assinaturas
    '{{vigencia_contrato}}': tags.vigencia_contrato || '',
    '{{data_extenso}}': tags.data_extenso || '',
    '{{crm_dra}}': tags.crm_dra || '54.811.772/0001-32',
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
