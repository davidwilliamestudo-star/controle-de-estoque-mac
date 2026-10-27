import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const appDir = process.cwd();
const workspaceDir = path.resolve(appDir, '..');
const outDir = path.resolve(workspaceDir, 'scratch/validation_pdfs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outBundle = path.resolve(workspaceDir, 'scratch/.bundle_val_all.mjs');

// 1. Empacota serviços via esbuild em bundle único
await build({
  stdin: {
    contents: `
      export * from './src/services/contracts/saude360ContractEngine.service.ts';
      export * from './src/services/signatures/pdfStampingEngine.service.ts';
    `,
    resolveDir: appDir,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: outBundle,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  alias: { '@': path.resolve(appDir, 'src') },
  logLevel: 'error',
});

// Mock fetch para as fontes locais EB Garamond e Poppins
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

function pathToUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

const mod = await import(pathToUrl(outBundle));
const { generateContractPdfBase64, OFFICIAL_CONTRACT_MODEL_3_TEXT, applyTagsToContractTemplate, PdfStampingEngineService } = mod;

console.log('--- INICIANDO GERAÇÃO DOS 6 CASOS DE VALIDAÇÃO ---');

// Imagem PNG fictícia de assinatura manual (1x1 transparente ou linha)
const dummySigPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAA8CAYAAAAjW/WRAAACQ0lEQVR4nO3c4U3DMBCG4YYdPAnTMQHTdZIMEcSPSBVKj8Sx786f3+cPEkLEZ/urubRk2bbtAeDYx5vvAyAggI0TBDAQEMBAQAADAQEMBAQwEBDAQEAAAwEBDAQEMBAQwEBAAAMBAQwEJJHy+bW9fkW8hf8HyeEoFOvze4kZDXYEJFk49lAcfQ/+CEiiU+NvEAhJPAIS5MrmJyhxUjfpqk3r1Q3/+jNqc5Fd2hNEtWm9expwmvhKGRDVprVVDQpzMYpUAVFtWv+rq8XvHWk+RpImIKpNa++xjjQXI0oRkJpFHmFjeI5xhPloUZ93beEBUW1aI8aVdS5qWHfrPGsLDYhq0xo9nujr97prGVFXSEBUm9ZedSmGpFTexveuyz0gqk1r1g2ZZVyl4ftanjW5BkS1ac2yCbP2Qz2u7VWTW0CiF6nXNbOHw2usJeCTDx5z7xKQ6E3U6/rRdWW5MaK4ti4BUW1aM9XlNR8lSSC8Q9ItIFlfXVXfd6lh1ZI5EJ7r0iUg2TdR7fiy19X6Tbl1sBp7rE/zgIy0iVQ//1Xjtz6FukrjdWoakBE30Zkxj1jXzErD9WoSENWmVaGuWZVGIbkdEKVXV5W/xdFub94KiFI4ZqhrRuXmWlY/tEF5E+31qNU1o/XmAy+qThDlcEBTqdyzlwJC04rZQnI6IJwaUHB1H5/qQQgHZu1JTgWEphVKruzn8Ic2AJmlfjYvEI2AAAYCAhgICGAgIICBgAAGAgIYCAhgICCAgYAABgICGAgI8HjvBxs7O6PsGrpoAAAAAElFTkSuQmCC';

// Dados base de tags
const baseTags = {
  NOME_PACIENTE: 'MARIANA DA SILVA ALMEIDA',
  CPF_PACIENTE: '045.892.119-04',
  RG_PACIENTE: '5.823.119 SSP/SC',
  ENDERECO_PACIENTE: 'Rua das Gaivotas, 450, Apto 302, Ingleses, Florianópolis/SC, CEP 88058-500',
  TELEFONE_PACIENTE: '(48) 99876-5432',
  EMAIL_PACIENTE: 'mariana.almeida@exemplo.com.br',
  DATA_NASCIMENTO_PACIENTE: '14/05/1988',
  NOME_PROGRAMA: 'Programa Integrativo Saúde 360° Avançado',
  DURACAO_PROGRAMA: '6 (seis) meses',
  VALOR_TOTAL_NUMERO: 'R$ 7.800,00',
  VALOR_TOTAL_EXTENSO: 'sete mil e oitocentos reais',
  FORMA_PAGAMENTO_CONDICOES: 'Entrada de R$ 1.300,00 via PIX e 5 parcelas de R$ 1.300,00 no cartão de crédito',
  CIDADE_CONTRATO: 'Florianópolis',
  DATA_EXTENSO_CONTRATO: '27 de outubro de 2026',
};

const fullFilledText = applyTagsToContractTemplate(OFFICIAL_CONTRACT_MODEL_3_TEXT, baseTags);

// CASO 1: Contrato Curto (1 a 2 páginas)
console.log('Gerando Caso 1: Contrato Curto...');
const shortContractText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS - PLANO EXPRESSO

CONTRATADA: DRA. ANA CARLA MORONG, médica, inscrita no CRM/SC sob o nº 18.234 e RQE nº 14.567, com consultório na Rodovia José Carlos Daux, 5500, Sala 212, Saco Grande, Florianópolis/SC, CNPJ nº 54.811.772/0001-32.

CONTRATANTE (PACIENTE): ${baseTags.NOME_PACIENTE}, brasileira, inscrita no CPF sob o nº ${baseTags.CPF_PACIENTE}, residente em ${baseTags.ENDERECO_PACIENTE}.

CLÁUSULA PRIMEIRA – DO OBJETO
O presente instrumento tem por objeto a prestação de serviços médicos especializados em consulta e plano de acompanhamento em Medicina Integrativa e Longevidade Saudável.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS E CONDIÇÕES DE PAGAMENTO
Pelos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor total de ${baseTags.VALOR_TOTAL_NUMERO} (${baseTags.VALOR_TOTAL_EXTENSO}), a ser quitado nas seguintes condições: ${baseTags.FORMA_PAGAMENTO_CONDICOES}.

CLÁUSULA TERCEIRA – DO FORO
Para dirimir quaisquer controvérsias oriundas do presente instrumento, as partes elegem o foro da Comarca de Florianópolis/SC, com renúncia expressa a qualquer outro.

E, por estarem plenamente esclarecidas e de acordo com todas as disposições deste instrumento, as partes assinam o presente contrato eletronicamente em 2 (duas) vias de igual teor e forma.

${baseTags.CIDADE_CONTRATO}/SC, ${baseTags.DATA_EXTENSO_CONTRATO}.

_________________________________________________
DRA. ANA CARLA MORONG
Médica CONTRATADA – CRM/SC 18.234
CNPJ: 54.811.772/0001-32

_________________________________________________
CONTRATANTE / PACIENTE
Nome: ${baseTags.NOME_PACIENTE}
CPF: ${baseTags.CPF_PACIENTE}`;

const res1 = await generateContractPdfBase64(shortContractText);
fs.writeFileSync(path.resolve(outDir, '01_contrato_curto.pdf'), Buffer.from(res1.pdfBase64, 'base64'));
console.log(`Caso 1 gerado: ${res1.pageCount} páginas.`);

// CASO 2: Contrato Extenso de Referência (~5 páginas)
console.log('Gerando Caso 2: Contrato Extenso de Referência...');
const res2 = await generateContractPdfBase64(fullFilledText);
fs.writeFileSync(path.resolve(outDir, '02_contrato_extenso_referencia.pdf'), Buffer.from(res2.pdfBase64, 'base64'));
console.log(`Caso 2 gerado: ${res2.pageCount} páginas.`);

// CASO 3: Transição no limite inferior da página (proximidade da margem inferior)
console.log('Gerando Caso 3: Limite Inferior / Transição Crítica...');
const fillerC3 = Array.from({ length: 11 }, (_, i) => 
  `Parágrafo Adicional Regulamentar ${i + 1}: O paciente declara ter ciência expressa de que o plano terapêutico integrativo exige cumprimento estrito das orientações nutricionais e suplementares descritas no prontuário médico individualizado.`
).join('\n\n');
const textC3 = fullFilledText.replace('X – DO FORO', `${fillerC3}\n\nX – DO FORO`);
const res3 = await generateContractPdfBase64(textC3);
fs.writeFileSync(path.resolve(outDir, '03_contrato_limite_inferior.pdf'), Buffer.from(res3.pdfBase64, 'base64'));
console.log(`Caso 3 gerado: ${res3.pageCount} páginas.`);

// CASO 4: Nomes e Dados de Comprimento Extremo
console.log('Gerando Caso 4: Signatários com Dados Longos...');
const extremeTags = {
  ...baseTags,
  NOME_PACIENTE: 'DONA MARIA LEOPOLDINA JOSEFA CAROLINA MIGUELA GABRIELA RAFAELA GONZAGA DE BRAGANÇA E BOURBON',
  CPF_PACIENTE: '001.234.567-89',
  RG_PACIENTE: '99.888.777-6 SSP/SC / OAB/SC 123.456-B',
  ENDERECO_PACIENTE: 'Condomínio Residencial Parque Imperial das Águas Claras, Bloco Imperial Palace B, Apartamento Cobertura Duplex 1402, Avenida Jornalista Maurício Sirotsky Sobrinho, Bairro Jurerê Internacional, Florianópolis/SC, CEP 88053-700',
  NOME_PROGRAMA: 'Programa Integrativo e Metabólico Avançado Saúde 360° Plus com Terapia Hormonal Bioidêntica e Acompanhamento Nutricional Semanal Intensivo',
};
const extremeText = applyTagsToContractTemplate(OFFICIAL_CONTRACT_MODEL_3_TEXT, extremeTags);
const res4 = await generateContractPdfBase64(extremeText);
fs.writeFileSync(path.resolve(outDir, '04_contrato_nomes_extremos.pdf'), Buffer.from(res4.pdfBase64, 'base64'));
console.log(`Caso 4 gerado: ${res4.pageCount} páginas.`);

// CASO 5: Documento com Múltiplas Quebras de Página e Seção Final
console.log('Gerando Caso 5: Documento Longo com Múltiplas Quebras...');
const fillerC5 = Array.from({ length: 26 }, (_, i) => 
  `Cláusula Especial Suplementar ${i + 1}: Diretrizes clínicas complementares para monitoramento laboratorial trimestral, contemplando hemograma completo, perfil lipídico, função tireoidiana, marcadores inflamatórios e curvas hormonais detalhadas em anexo técnico.`
).join('\n\n');
const textC5 = fullFilledText.replace('X – DO FORO', `${fillerC5}\n\nX – DO FORO`);
const res5 = await generateContractPdfBase64(textC5);
fs.writeFileSync(path.resolve(outDir, '05_contrato_multiplas_quebras.pdf'), Buffer.from(res5.pdfBase64, 'base64'));
console.log(`Caso 5 gerado: ${res5.pageCount} páginas.`);

// CASO 6: Documento Completo com Assinatura Eletrônica, Rubricas e Folha de Manifesto de Auditoria
console.log('Gerando Caso 6: Documento Completo Assinado com Folha de Manifesto...');
const res6 = await generateContractPdfBase64(fullFilledText);
const rawBytes6 = Buffer.from(res6.pdfBase64, 'base64');

// Constrói os campos exatos de assinatura baseados nas âncoras reais retornadas pelo gerador
const fields6 = [];
const totalP = res6.pageCount;

// Rubricas em todas as páginas anteriores
for (let p = 1; p < totalP; p++) {
  fields6.push({
    id: `rubric-pat-${p}`,
    signer_id: 'signer-patient-1',
    field_type: 'initials',
    page: p,
    ...res6.initialsBoxes.patient,
  });
  fields6.push({
    id: `rubric-dra-${p}`,
    signer_id: 'signer-dra-1',
    field_type: 'initials',
    page: p,
    ...res6.initialsBoxes.dra,
  });
}

// Assinaturas no bloco final
const draAnchor = res6.signatureAnchors.dra;
const patientAnchor = res6.signatureAnchors.patient;

fields6.push({
  id: 'sig-dra-final',
  signer_id: 'signer-dra-1',
  field_type: 'icp_seal',
  page: draAnchor.page,
  x_percent: draAnchor.x_percent,
  y_percent: draAnchor.y_percent,
  width_percent: draAnchor.width_percent,
  height_percent: draAnchor.height_percent,
});

fields6.push({
  id: 'sig-patient-final',
  signer_id: 'signer-patient-1',
  field_type: 'signature',
  page: patientAnchor.page,
  x_percent: patientAnchor.x_percent,
  y_percent: patientAnchor.y_percent,
  width_percent: patientAnchor.width_percent,
  height_percent: patientAnchor.height_percent,
});

const signers6 = [
  {
    id: 'signer-dra-1',
    role: 'DRA_ANA',
    full_name: 'DRA. ANA CARLA MORONG',
    cpf_cnpj: '54.811.772/0001-32',
    council_register: 'CRM/SC 18.234 | RQE 14.567',
    auth_method: 'CERTIFICADO_DIGITAL_ICP_BRASIL_A3',
    legal_level: 'QUALIFIED_ICP',
    signature_png_base64: dummySigPng,
    icp_subject_cn: 'ANA CARLA MORONG:03489123901',
    icp_issuer_cn: 'AC SERPRO Brasil v5',
    icp_serial_hex: '7A8B9C0D1E2F3A4B5C6D',
    icp_thumbprint_sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    signer_ip: '177.136.240.55',
    signer_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
    signer_lat: -27.5954,
    signer_lng: -48.5480,
    signed_at_brt: '27/10/2026 às 14:15:32 BRT',
  },
  {
    id: 'signer-patient-1',
    role: 'PACIENTE',
    full_name: 'MARIANA DA SILVA ALMEIDA',
    cpf_cnpj: '045.892.119-04',
    auth_method: 'TOKEN_SMS_E_BIOMETRIA_MANUAL',
    legal_level: 'ADVANCED',
    signature_png_base64: dummySigPng,
    signer_ip: '189.102.45.12',
    signer_user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    signer_lat: -27.5980,
    signer_lng: -48.5510,
    signed_at_brt: '27/10/2026 às 14:28:45 BRT',
  },
];

const auditTrails6 = [
  {
    event_type: 'DOCUMENT_CREATED',
    event_description: 'Contrato de Prestação de Serviços Médicos Saúde 360° gerado e registrado no cofre criptográfico.',
    actor_name: 'Sistema Saúde 360° (Dra. Ana Morong)',
    ip_address: '127.0.0.1 (Backend D1/Cloudflare)',
    occurred_at_brt: '27/10/2026 14:05:10 BRT',
    current_trail_hash: '3f7b8c2d1e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c',
  },
  {
    event_type: 'SIGNATURE_REQUEST_SENT',
    event_description: 'Notificação de assinatura enviada ao paciente via WhatsApp e E-mail com link de acesso seguro.',
    actor_name: 'Robô de Notificações Dra. Ana Morong',
    ip_address: '108.162.245.89',
    occurred_at_brt: '27/10/2026 14:06:00 BRT',
    current_trail_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
  },
  {
    event_type: 'SIGNER_SIGNED_QUALIFIED',
    event_description: 'Assinatura digital padrão ICP-Brasil realizada com sucesso por Dra. Ana Carla Morong (CRM/SC 18.234).',
    actor_name: 'Dra. Ana Carla Morong',
    ip_address: '177.136.240.55',
    occurred_at_brt: '27/10/2026 14:15:32 BRT',
    current_trail_hash: 'c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3',
  },
  {
    event_type: 'SIGNER_SIGNED_ADVANCED',
    event_description: 'Assinatura eletrônica avançada realizada com sucesso pelo paciente Mariana da Silva Almeida com validação de selfie e firma.',
    actor_name: 'Mariana da Silva Almeida',
    ip_address: '189.102.45.12',
    occurred_at_brt: '27/10/2026 14:28:45 BRT',
    current_trail_hash: '7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
  },
  {
    event_type: 'DOCUMENT_SEALED',
    event_description: 'Documento integralmente assinado, carimbado e selado com hash de integridade final.',
    actor_name: 'Cofre Digital Dra. Ana Morong',
    ip_address: '127.0.0.1 (Backend D1)',
    occurred_at_brt: '27/10/2026 14:28:46 BRT',
    current_trail_hash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
  },
];

const stampedBytes6 = await PdfStampingEngineService.renderStampsAndManifestPage({
  originalPdfBytes: rawBytes6,
  documentId: 'doc-val-2026-1027-001',
  documentTitle: 'Contrato de Prestação de Serviços Médicos - Mariana da Silva Almeida',
  verificationCode: 'VERIF-7A8B9C0D-2026',
  originalPdfSha256: await PdfStampingEngineService.computeSha256Hex(rawBytes6),
  publicVerificationBaseUrl: 'https://anamorong.med.br/verificar',
  fields: fields6,
  signers: signers6,
  auditTrails: auditTrails6,
});

fs.writeFileSync(path.resolve(outDir, '06_contrato_completo_assinado_com_manifesto.pdf'), stampedBytes6);
console.log(`Caso 6 gerado com sucesso! Arquivo gravado em: scratch/validation_pdfs/06_contrato_completo_assinado_com_manifesto.pdf`);

console.log('--- TODOS OS 6 CASOS DE PDF FORAM GERADOS COM SUCESSO ---');
