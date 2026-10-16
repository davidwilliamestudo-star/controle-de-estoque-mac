const fs = require('fs');
const JSZip = require('../app/node_modules/jszip');

async function testDocxEngine() {
  const docxBuffer = fs.readFileSync('public/templates/contract_template_dra_ana.docx');
  const zip = await JSZip.loadAsync(docxBuffer);
  
  let xml = await zip.file('word/document.xml').async('string');
  console.log('Original word/document.xml length:', xml.length);
  
  const tagsToReplace = {
    '{{nome}}': 'DAVID WILLIAM DA SILVA',
    '{{cpf}}': '123.456.789-00',
    '{{data_nascimento}}': '19/02/2004',
    '{{endereco}}': 'Rua das Flores, 100, Apto 201',
    '{{bairro_cidade_uf}}': 'Canto, Florianópolis - SC',
    '{{cep}}': '88075-550',
    '{{telefone}}': '(48) 99887-2882',
    '{{email}}': 'david@exemplo.com',
    '{{chk_evolution}}': '[X]',
    '{{chk_mapa}}': '[ ]',
    '{{chk_restart}}': '[ ]',
    '{{chk_signature}}': '[ ]',
    '{{chk_life}}': '[ ]',
    '{{chk_personalizado}}': '[ ]',
    '{{valor_plano}}': '15.000,00',
    '{{valor_plano_extenso}}': 'quinze mil reais',
    '{{chk_cartao}}': '[X]',
    '{{num_parcelas_cartao}}': '12',
    '{{valor_parcela_cartao}}': '1.500,00',
    '{{chk_avista}}': '[ ]',
    '{{valor_avista}}': '15.000,00',
    '{{chk_pix_parcelado}}': '[ ]',
    '{{num_parcelas_pix}}': '1',
    '{{valor_parcela_pix}}': '0,00',
    '{{dia_vencimento_pix}}': '10',
    '{{semanas_tratamento}}': '24 semanas',
    '{{duracao_personalizada}}': '6 meses',
    '{{consulta_seg}}': '3 (três) consultas médicas',
    '{{frequencia_procedimentos}}': 'a cada 30 dias',
    '{{especificacoes_terapeuticas}}': 'Acompanhamento metabólico integrativo',
    '{{vigencia_contrato}}': '6 (seis) meses',
    '{{data_extenso}}': 'Florianópolis/SC, 15 de Outubro de 2026',
    '{{crm_dra}}': '54.811.772/0001-32'
  };
  
  let count = 0;
  for (const [tag, value] of Object.entries(tagsToReplace)) {
    const parts = xml.split(tag);
    if (parts.length > 1) {
      count += (parts.length - 1);
      xml = parts.join(value);
    }
  }
  
  console.log('Total placeholders replaced in DOCX:', count);
  
  zip.file('word/document.xml', xml);
  const updatedDocx = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('../scratch/test_output_preenchido.docx', updatedDocx);
  console.log('Successfully wrote scratch/test_output_preenchido.docx! Size:', updatedDocx.length);
}

testDocxEngine().catch(console.error);
