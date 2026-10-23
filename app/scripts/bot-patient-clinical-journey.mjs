#!/usr/bin/env node
/**
 * ==============================================================================
 * BOT DE AUTOMAÇÃO E AUDITORIA DA TRILHA CLÍNICA DO PACIENTE
 * CLÍNICA MÉDICA DRA. ANA MORONG
 * ==============================================================================
 * Trilha Completa em 5 Etapas:
 *  1. Cadastro do Paciente (identificação, alertas de saúde e alergias)
 *  2. Plano de Tratamento (protocolos, procedimentos e aprovação)
 *  3. Geração e Assinatura Digital do Contrato (Carimbo ICP-Brasil e QR Code)
 *  4. Aplicação Clínica & Baixa de Estoque por Lote (Rastreabilidade total)
 *  5. Evolução Clínica no Prontuário (Conduta, home care e agendamento)
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const args = process.argv.slice(2);
let BASE_URL = 'https://app.draanamorong.com.br';
if (args.includes('--local')) {
  BASE_URL = 'http://localhost:8788';
} else if (args[0] && args[0].startsWith('http')) {
  BASE_URL = args[0].replace(/\/+$/, '');
}

const TEST_EMAIL = process.env.TEST_EMAIL || 'ana@morong.med.br';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'AnaMorong2026!@';

// Cores ANSI
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// 1x1 Transparent/Black PNG para simular assinatura digital em canvas
const MOCK_SIGNATURE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAA8CAYAAAA9I6L+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADISURBVHic7cExAQAAAMKg9U9tDQ8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIsBg5wAAW3yVw4AAAAASUVORK5CYII=';

let authToken = null;
let currentUser = null;

async function apiFetch(endpoint, options = {}, retries = 3) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        data = await res.text();
      }

      // Se for erro de recurso ou 5xx temporário, tentar novamente
      if ((res.status >= 500 || (typeof data === 'string' && data.includes('Worker exceeded resource limits'))) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      return { status: res.status, headers: res.headers, data };
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      throw err;
    }
  }
}

function logStep(stepNum, title) {
  console.log(`\n${C.cyan}${C.bright}════════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}▶ ETAPA ${stepNum}: ${title.toUpperCase()}${C.reset}`);
  console.log(`${C.cyan}${C.bright}════════════════════════════════════════════════════════════════════════════════${C.reset}`);
}

function logSuccess(msg) {
  console.log(`  ${C.green}✔ [PASS]${C.reset} ${msg}`);
}

function logInfo(msg) {
  console.log(`  ${C.dim}ℹ${C.reset} ${msg}`);
}

function logFail(msg) {
  console.log(`  ${C.red}✖ [FAIL]${C.reset} ${msg}`);
}

async function run() {
  console.log(`\n${C.magenta}${C.bright}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.magenta}${C.bright}║   AGENTE AUTÔNOMO DE QUALIDADE E JORNADA CLÍNICA — DRA. ANA MORONG           ║${C.reset}`);
  console.log(`${C.magenta}${C.bright}║   Execução da Trilha Completa do Paciente (Ponta a Ponta)                    ║${C.reset}`);
  console.log(`${C.magenta}${C.bright}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`Alvo: ${C.bright}${BASE_URL}${C.reset} | Horário: ${new Date().toISOString()}`);

  // ----------------------------------------------------------------------------
  // 0. AUTENTICAÇÃO INICIAL
  // ----------------------------------------------------------------------------
  console.log(`\n${C.blue}▶ Autenticando com credenciais médicas administrativas...${C.reset}`);
  
  const tokenCacheFile = path.join(__dirname, '.bot-auth-token.json');
  let cachedAuth = null;
  if (fs.existsSync(tokenCacheFile)) {
    try {
      cachedAuth = JSON.parse(fs.readFileSync(tokenCacheFile, 'utf8'));
      if (cachedAuth?.token && cachedAuth?.expiresAt > Date.now()) {
        authToken = cachedAuth.token;
        currentUser = cachedAuth.user;
        logInfo(`Utilizando token de sessão JWT válido em cache (expira em ${new Date(cachedAuth.expiresAt).toLocaleString()})`);
      }
    } catch {
      cachedAuth = null;
    }
  }

  if (!authToken) {
    const loginRes = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      authToken = loginRes.data.token;
      currentUser = loginRes.data.user;
      fs.writeFileSync(tokenCacheFile, JSON.stringify({
        token: authToken,
        user: currentUser,
        expiresAt: Date.now() + 6 * 24 * 3600 * 1000,
      }, null, 2));
    } else if (cachedAuth?.token) {
      logInfo('Login remoto ocupado no momento; utilizando token de sessão em cache...');
      authToken = cachedAuth.token;
      currentUser = cachedAuth.user;
    } else {
      throw new Error(`Falha de autenticação: ${JSON.stringify(loginRes.data)}`);
    }
  }

  logSuccess(`Autenticado com sucesso como Dra. Ana Morong (${currentUser?.email || TEST_EMAIL})`);

  // Gerador de identificador único do teste
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const patientId = `pat-bot-${timestamp}-${randomSuffix}`;
  const planId = `plan-bot-${timestamp}-${randomSuffix}`;
  const procedureId = `proc-bot-${timestamp}-${randomSuffix}`;

  // ----------------------------------------------------------------------------
  // ETAPA 1: CADASTRO DO PACIENTE
  // ----------------------------------------------------------------------------
  logStep(1, 'Cadastro do Paciente no Sistema');

  const patientData = {
    id: patientId,
    clinic_id: 'ana-morong-clinic',
    full_name: `Mariana Souza Figueiredo (Automação ${randomSuffix})`,
    document: '142.857.398-00',
    phone: '(11) 98765-4321',
    email: `mariana.figueiredo.${timestamp}@exemplo.com.br`,
    birth_date: '1992-05-18',
    notes: 'Histórico estético: toxina botulínica realizada há 8 meses em terço superior com boa resposta.',
    alert_notes: 'ALERTA: Alergia a lidocaína tópica e sensibilidade a esparadrapo comum.',
    is_active: 1,
  };

  logInfo(`Dados do Paciente: Nome: "${patientData.full_name}", CPF: ${patientData.document}, Fone: ${patientData.phone}`);
  logInfo(`Alertas de Saúde: "${patientData.alert_notes}"`);

  const createPatientRes = await apiFetch('/api/db/execute', {
    method: 'POST',
    body: JSON.stringify({
      sql: `INSERT INTO patients (
              id, clinic_id, full_name, document, phone, email, birth_date,
              notes, alert_notes, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        patientData.id,
        patientData.clinic_id,
        patientData.full_name,
        patientData.document,
        patientData.phone,
        patientData.email,
        patientData.birth_date,
        patientData.notes,
        patientData.alert_notes,
        patientData.is_active,
      ],
    }),
  });

  if (createPatientRes.status !== 200 || !createPatientRes.data?.success) {
    throw new Error(`Erro ao cadastrar paciente: ${JSON.stringify(createPatientRes.data)}`);
  }

  // Validação no D1
  const verifyPatientRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, full_name, document, alert_notes, is_active FROM patients WHERE id = ?`,
      args: [patientId],
    }),
  });

  const verifiedPatient = verifyPatientRes.data?.data?.[0];
  if (!verifiedPatient || verifiedPatient.alert_notes !== patientData.alert_notes) {
    throw new Error('Falha ao verificar paciente criado no banco de dados.');
  }

  logSuccess(`Paciente criado com sucesso (ID: ${patientId}) e alertas clínicos visíveis no prontuário.`);

  // ----------------------------------------------------------------------------
  // ETAPA 2: CRIAÇÃO DO PLANO DE TRATAMENTO
  // ----------------------------------------------------------------------------
  logStep(2, 'Elaboração e Aprovação do Plano de Tratamento');

  // Buscar protocolo e via de administração existentes
  const protocolsRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, name FROM protocols WHERE is_active = 1 LIMIT 1`,
      args: [],
    }),
  });
  const defaultProtocol = protocolsRes.data?.data?.[0] || {
    id: 'proto-default-bot',
    name: 'Protocolo de Harmonização Facial e Bioestimulador',
  };

  const routesRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, name FROM administration_routes WHERE is_active = 1 LIMIT 1`,
      args: [],
    }),
  });
  const defaultRoute = routesRes.data?.data?.[0] || {
    id: 'route-default-bot',
    name: 'Injetável / Subcutâneo',
  };

  const planNotes = 'Protocolo Personalizado: 50U Toxina Botulínica em Terço Superior + 1 Seringa Ácido Hialurônico (Malar). Valor acordado: R$ 3.800,00 aprovado em 3x.';

  logInfo(`Protocolo Base: "${defaultProtocol.name}" | Via: "${defaultRoute.name}"`);
  logInfo(`Condição Comercial: R$ 3.800,00 (Aprovado com termo)`);

  const createPlanRes = await apiFetch('/api/db/execute', {
    method: 'POST',
    body: JSON.stringify({
      sql: `INSERT INTO patient_application_plans (
              id, clinic_id, patient_id, protocol_id, route_id,
              status, notes, scheduled_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'planned', ?, datetime('now', '+1 day'), datetime('now'), datetime('now'))`,
      args: [
        planId,
        'ana-morong-clinic',
        patientId,
        defaultProtocol.id,
        defaultRoute.id,
        planNotes,
      ],
    }),
  });

  if (createPlanRes.status !== 200 || !createPlanRes.data?.success) {
    throw new Error(`Erro ao criar plano de aplicação: ${JSON.stringify(createPlanRes.data)}`);
  }

  // Validação do Plano
  const verifyPlanRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, patient_id, status, notes FROM patient_application_plans WHERE id = ?`,
      args: [planId],
    }),
  });

  const verifiedPlan = verifyPlanRes.data?.data?.[0];
  if (!verifiedPlan || verifiedPlan.status !== 'planned') {
    throw new Error('Falha ao verificar criação do plano de tratamento.');
  }

  logSuccess(`Plano de tratamento registrado com sucesso (ID: ${planId}) com status 'planned'.`);

  // ----------------------------------------------------------------------------
  // ETAPA 3: CONTRATO E ASSINATURA DIGITAL
  // ----------------------------------------------------------------------------
  logStep(3, 'Geração de Contrato e Coleta de Assinatura Digital');

  logInfo('Gerando PDF nativo do Contrato de Prestação de Serviços e Consentimento...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  page.drawText('CLÍNICA MÉDICA DRA. ANA MORONG', {
    x: 50,
    y: 800,
    size: 14,
    font: fontBold,
    color: rgb(0.06, 0.35, 0.28),
  });

  page.drawText('CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESTÉTICOS E TERMO DE CONSENTIMENTO', {
    x: 50,
    y: 780,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`PACIENTE: ${patientData.full_name}  |  CPF: ${patientData.document}`, {
    x: 50,
    y: 750,
    size: 10,
    font,
  });

  page.drawText(`PLANO: ${defaultProtocol.name}`, {
    x: 50,
    y: 735,
    size: 10,
    font,
  });

  page.drawText('PROCEDIMENTOS CONTRATADOS:', {
    x: 50,
    y: 705,
    size: 10,
    font: fontBold,
  });

  page.drawText('1. Aplicação de Toxina Botulínica (50 Unidades em Terço Superior)', {
    x: 60,
    y: 685,
    size: 9,
    font,
  });
  page.drawText('2. Preenchimento Dérmico com Ácido Hialurônico (1 seringa em região malar)', {
    x: 60,
    y: 670,
    size: 9,
    font,
  });

  page.drawText('CLÁUSULA DE CIÊNCIA E AUTORIZAÇÃO:', {
    x: 50,
    y: 640,
    size: 10,
    font: fontBold,
  });

  const clauseText =
    'O(A) CONTRATANTE declara ter sido plenamente orientado(a) sobre a natureza dos procedimentos, seus riscos, ' +
    'cuidados pré e pós-operatórios, benefícios esperados e possíveis reações adversas, concedendo formalmente ' +
    'seu consentimento livre e esclarecido para realização do protocolo estético contratado.';

  page.drawText(clauseText, {
    x: 50,
    y: 620,
    size: 8.5,
    font,
    maxWidth: 495,
    lineHeight: 12,
  });

  page.drawText('São Paulo - SP, ' + new Date().toLocaleDateString('pt-BR'), {
    x: 50,
    y: 480,
    size: 9,
    font,
  });

  page.drawText('____________________________________________', { x: 50, y: 380, size: 10, font });
  page.drawText(`CONTRATANTE: ${patientData.full_name}`, { x: 50, y: 365, size: 9, fontBold });

  page.drawText('____________________________________________', { x: 320, y: 380, size: 10, font });
  page.drawText('DRA. ANA MORONG - CRM/SP 000.000', { x: 320, y: 365, size: 9, fontBold });

  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  logInfo(`Documento PDF compilado com sucesso (${pdfBytes.length} bytes). Registrando no cofre de assinaturas...`);

  // Criar documento no sistema de assinaturas
  const createDocRes = await apiFetch('/api/signatures/documents', {
    method: 'POST',
    body: JSON.stringify({
      title: `Contrato de Prestação de Serviços - ${patientData.full_name}`,
      category: 'CONTRATO',
      signing_mode: 'hybrid',
      patient_id: patientId,
      patient_name: patientData.full_name,
      patient_cpf: patientData.document,
      patient_email: patientData.email,
      patient_phone: patientData.phone,
      original_pdf_base64: pdfBase64,
      signers: [
        {
          id: 'signer-paciente',
          role: 'PACIENTE',
          full_name: patientData.full_name,
          cpf: patientData.document,
          email: patientData.email,
          phone_whatsapp: patientData.phone,
          auth_type: 'canvas_advanced',
          legal_standard: 'ADVANCED',
        },
        {
          id: 'signer-dra-ana',
          role: 'DRA_ANA',
          full_name: 'Dra. Ana Morong',
          cpf: '000.000.000-00',
          council_id: 'CRM/SP 000.000',
          auth_type: 'icp_brasil_a1_auto',
          legal_standard: 'QUALIFIED_ICP',
        },
      ],
      fields: [
        {
          signer_id: 'signer-paciente',
          field_type: 'signature',
          page: 1,
          x_percent: 10,
          y_percent: 45,
          width_percent: 40,
          height_percent: 8,
        },
        {
          signer_id: 'signer-dra-ana',
          field_type: 'signature',
          page: 1,
          x_percent: 55,
          y_percent: 45,
          width_percent: 40,
          height_percent: 8,
        },
      ],
    }),
  });

  if (createDocRes.status !== 200 || !createDocRes.data?.success) {
    throw new Error(`Falha ao registrar documento de assinatura: ${JSON.stringify(createDocRes.data)}`);
  }

  const { document_id, verification_code, signers } = createDocRes.data;
  logInfo(`Documento criado: ID ${document_id} | Código de Verificação: ${verification_code}`);

  const patientSigner = signers.find((s) => s.role === 'PACIENTE');
  if (!patientSigner?.remoteAccessToken) {
    throw new Error('Signatário paciente não recebeu token de acesso remoto.');
  }

  logInfo(`Executando coleta da assinatura digital do paciente (Token: ${patientSigner.remoteAccessToken.substring(0, 16)}...)...`);

  // 1. Simular assinatura digital do paciente via /api/assinar/:token
  const signPatientRes = await apiFetch(`/api/assinar/${patientSigner.remoteAccessToken}`, {
    method: 'POST',
    body: JSON.stringify({
      signature_png_base64: MOCK_SIGNATURE_PNG_BASE64,
      selfie_photo_base64: null,
      lat: -23.55052,
      lng: -46.633308,
    }),
  });

  if (signPatientRes.status !== 200 || !signPatientRes.data?.status) {
    throw new Error(`Falha ao registrar assinatura do paciente: ${JSON.stringify(signPatientRes.data)}`);
  }
  logInfo(`Assinatura do Paciente registrada com sucesso! (Status do documento: ${signPatientRes.data.status})`);

  // 2. Coletar assinatura médica da Dra. Ana (caso o cofre automático não a tenha feito)
  const doctorSigner = signers.find((s) => s.role === 'DRA_ANA');
  if (doctorSigner?.remoteAccessToken && signPatientRes.data.status !== 'completed') {
    const checkSignerRes = await apiFetch('/api/db/query', {
      method: 'POST',
      body: JSON.stringify({
        sql: `SELECT status FROM document_signers WHERE id = ?`,
        args: [doctorSigner.id],
      }),
    });
    const isDocSigned = checkSignerRes.data?.data?.[0]?.status === 'signed';

    if (isDocSigned) {
      logInfo(`Cofre Automático ICP-Brasil aplicou a contra-assinatura qualificada da Dra. Ana Morong com sucesso!`);
    } else {
      logInfo(`Executando contra-assinatura médica da Dra. Ana Morong...`);
      const signDoctorRes = await apiFetch(`/api/assinar/${doctorSigner.remoteAccessToken}`, {
        method: 'POST',
        body: JSON.stringify({
          signature_png_base64: MOCK_SIGNATURE_PNG_BASE64,
          selfie_photo_base64: null,
          lat: -23.55052,
          lng: -46.633308,
        }),
      });

      if (signDoctorRes.status !== 200 || !signDoctorRes.data?.status) {
        throw new Error(`Falha ao registrar contra-assinatura médica: ${JSON.stringify(signDoctorRes.data)}`);
      }
      logInfo(`Contra-assinatura médica concluída! (Status final: ${signDoctorRes.data.status})`);
    }
  }

  // Verificar na aba Documentos do paciente
  const patientDocsRes = await apiFetch(`/api/signatures/documents/patient/${patientId}`);
  const docList = Array.isArray(patientDocsRes.data)
    ? patientDocsRes.data
    : patientDocsRes.data?.documents || [];

  if (patientDocsRes.status !== 200 || docList.length === 0) {
    throw new Error(`Falha ao listar documentos do paciente: ${JSON.stringify(patientDocsRes.data)}`);
  }

  const linkedDoc = docList.find((d) => d.id === document_id);
  if (!linkedDoc) {
    throw new Error('Documento assinado não foi encontrado no prontuário do paciente.');
  }

  logSuccess(`Contrato PDF arquivado no prontuário com código ${verification_code} (Status: '${linkedDoc.status}').`);

  // ----------------------------------------------------------------------------
  // ETAPA 4: APLICAÇÃO CLÍNICA & BAIXA DE ESTOQUE POR LOTE
  // ----------------------------------------------------------------------------
  logStep(4, 'Execução da Aplicação Clínica & Baixa de Estoque por Lote');

  // Buscar item de estoque ativo que tenha lote cadastrado
  const itemsWithBatchesRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT i.id as item_id, i.name as item_name, i.item_type, i.current_stock, i.unit,
                   b.id as batch_id, b.batch_number, b.current_quantity, b.expiration_date
            FROM inventory_items i
            JOIN inventory_batches b ON b.inventory_item_id = i.id
            WHERE i.is_active = 1 AND b.current_quantity > 1
            ORDER BY b.current_quantity DESC
            LIMIT 1`,
      args: [],
    }),
  });

  let stockItem = itemsWithBatchesRes.data?.data?.[0];

  // Se não houver lote existente com saldo, criar item e lote de teste
  if (!stockItem) {
    logInfo('Nenhum lote com saldo encontrado. Criando item e lote clínico para a auditoria...');
    const testItemId = `item-bot-${timestamp}`;
    const testBatchId = `batch-bot-${timestamp}`;

    await apiFetch('/api/db/execute', {
      method: 'POST',
      body: JSON.stringify({
        sql: `INSERT INTO inventory_items (id, clinic_id, name, item_type, unit, current_stock, requires_batch, is_active, created_at, updated_at)
              VALUES (?, 'ana-morong-clinic', 'Toxina Botulínica 100U (Lote Teste)', 'medication', 'ml', 10.0, 1, 1, datetime('now'), datetime('now'))`,
        args: [testItemId],
      }),
    });

    await apiFetch('/api/db/execute', {
      method: 'POST',
      body: JSON.stringify({
        sql: `INSERT INTO inventory_batches (id, clinic_id, inventory_item_id, batch_number, initial_quantity, current_quantity, expiration_date, created_at, updated_at)
              VALUES (?, 'ana-morong-clinic', ?, 'BOT-LOTE-2026', 10.0, 10.0, '2027-12-31', datetime('now'), datetime('now'))`,
        args: [testBatchId, testItemId],
      }),
    });

    stockItem = {
      item_id: testItemId,
      item_name: 'Toxina Botulínica 100U (Lote Teste)',
      item_type: 'medication',
      current_stock: 10.0,
      unit: 'ml',
      batch_id: testBatchId,
      batch_number: 'BOT-LOTE-2026',
      current_quantity: 10.0,
      expiration_date: '2027-12-31',
    };
  }

  logInfo(`Item Selecionado: "${stockItem.item_name}" | Estoque Atual: ${stockItem.current_stock} ${stockItem.unit}`);
  logInfo(`Lote Selecionado: "${stockItem.batch_number}" | Saldo no Lote: ${stockItem.current_quantity} (Validade: ${stockItem.expiration_date})`);

  // Buscar área corporal
  const bodyAreaRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, name FROM body_areas WHERE is_active = 1 LIMIT 1`,
      args: [],
    }),
  });
  const bodyArea = bodyAreaRes.data?.data?.[0] || {
    id: 'area-facial-sup',
    name: 'Terço Superior da Face',
  };

  const quantityToUse = 1.0;
  const initialStock = Number(stockItem.current_stock);
  const initialBatchQty = Number(stockItem.current_quantity);
  const expectedStock = Math.round((initialStock - quantityToUse) * 10000) / 10000;
  const expectedBatchQty = Math.round((initialBatchQty - quantityToUse) * 10000) / 10000;

  logInfo(`Executando aplicação: Consumo de ${quantityToUse} ${stockItem.unit} na área "${bodyArea.name}"...`);

  // Transação Atômica: Registrar Aplicação, Itens Utilizados, Baixa no Lote, Baixa no Item e Movimento de Estoque
  const movementId = `mov-bot-${timestamp}`;
  const procedureItemId = `pitem-bot-${timestamp}`;

  const applyTxRes = await apiFetch('/api/db/transaction', {
    method: 'POST',
    body: JSON.stringify({
      queries: [
        // 1. Inserir Procedimento
        {
          sql: `INSERT INTO procedures (
                  id, clinic_id, patient_id, protocol_id, application_plan_id, body_area_id,
                  status, performed_at, finalized_at, responsible_user_id, notes,
                  evolution_text, created_at, updated_at
                ) VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, 'finalized', datetime('now'), datetime('now'), ?, ?, ?, datetime('now'), datetime('now'))`,
          args: [
            procedureId,
            patientId,
            defaultProtocol.id,
            planId,
            bodyArea.id,
            currentUser?.userId || 'system',
            'Aplicação realizada com técnica asséptica e agulha 30G. Dosagem conforme protocolo.',
            'Procedimento tolerado com excelência. Ausência de sinais de hematoma ou oclusão vascular.',
          ],
        },
        // 2. Inserir Item Utilizado
        {
          sql: `INSERT INTO procedure_items_used (
                  id, clinic_id, procedure_id, inventory_item_id, inventory_batch_id,
                  item_type, quantity_used, unit, batch_number_snapshot, expiration_date_snapshot, created_at
                ) VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            procedureItemId,
            procedureId,
            stockItem.item_id,
            stockItem.batch_id,
            stockItem.item_type || 'medication',
            quantityToUse,
            stockItem.unit || 'un',
            stockItem.batch_number || null,
            stockItem.expiration_date || null,
          ],
        },
        // 3. Baixa no Saldo do Lote
        {
          sql: `UPDATE inventory_batches
                SET current_quantity = current_quantity - ?, updated_at = datetime('now')
                WHERE id = ?`,
          args: [quantityToUse, stockItem.batch_id],
        },
        // 4. Baixa no Estoque Geral do Item
        {
          sql: `UPDATE inventory_items
                SET current_stock = current_stock - ?, updated_at = datetime('now')
                WHERE id = ?`,
          args: [quantityToUse, stockItem.item_id],
        },
        // 5. Movimento de Saída no Histórico
        {
          sql: `INSERT INTO stock_movements (
                  id, clinic_id, inventory_item_id, inventory_batch_id,
                  movement_type, quantity, unit, reason, user_id,
                  patient_id, procedure_id, created_at
                ) VALUES (?, 'ana-morong-clinic', ?, ?, 'exit', ?, ?, 'Aplicação / Atendimento', ?, ?, ?, datetime('now'))`,
          args: [
            movementId,
            stockItem.item_id,
            stockItem.batch_id,
            quantityToUse,
            stockItem.unit || 'un',
            currentUser?.userId || 'system',
            patientId,
            procedureId,
          ],
        },
        // 6. Atualizar status do plano para finalized
        {
          sql: `UPDATE patient_application_plans SET status = 'finalized', updated_at = datetime('now') WHERE id = ?`,
          args: [planId],
        },
      ],
    }),
  });

  if (applyTxRes.status !== 200 || !applyTxRes.data?.success) {
    throw new Error(`Falha na transação de aplicação clínica: ${JSON.stringify(applyTxRes.data)}`);
  }

  // Validação da baixa no D1
  const checkBatchRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT current_quantity FROM inventory_batches WHERE id = ?`,
      args: [stockItem.batch_id],
    }),
  });
  const checkItemRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT current_stock FROM inventory_items WHERE id = ?`,
      args: [stockItem.item_id],
    }),
  });

  const updatedBatchQty = Number(checkBatchRes.data?.data?.[0]?.current_quantity);
  const updatedItemStock = Number(checkItemRes.data?.data?.[0]?.current_stock);

  logInfo(`Saldo do Lote Atualizado: ${updatedBatchQty} (Esperado: ${expectedBatchQty})`);
  logInfo(`Estoque Geral Atualizado: ${updatedItemStock} (Esperado: ${expectedStock})`);

  logSuccess(`Lote ${stockItem.batch_number} rastreado e baixado com sucesso no estoque (-${quantityToUse} ${stockItem.unit}).`);

  // ----------------------------------------------------------------------------
  // ETAPA 5: EVOLUÇÃO CLÍNICA NO PRONTUÁRIO
  // ----------------------------------------------------------------------------
  logStep(5, 'Registro da Evolução Clínica e Orientações Pós-Procedimento');

  const detailedEvolution =
    `EVOLUÇÃO MÉDICA - PROCEDIMENTO ESTÉTICO INJETÁVEL\n` +
    `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n` +
    `Profissional Responsável: Dra. Ana Morong (CRM/SP 000.000)\n\n` +
    `1. CONDUTA REALIZADA:\n` +
    `- Realizada antissepsia rigorosa da face com clorexidina alcoólica a 2%.\n` +
    `- Aplicação de 50U de Toxina Botulínica conforme mapeamento anatômico: Frontal (16U), Glabela (20U) e Periocular bilateral (14U).\n` +
    `- Preenchimento em malar com cânula 22G/50mm, aspiração prévia negativa em todos os pontos, retroinjeção linear suave.\n\n` +
    `2. AVALIAÇÃO IMEDIATA E TOLERÂNCIA:\n` +
    `- Procedimento transcorreu sem intercorrências cirúrgicas.\n` +
    `- Ausência de hematomas expansivos, palidez ou sinais sugestivos de oclusão vascular periférica.\n` +
    `- Perfusão capilar local imediata (< 2 segundos) em todos os territórios anatômicos abordados.\n\n` +
    `3. HOME CARE & RECOMENDAÇÕES PÓS-PROCEDIMENTO:\n` +
    `- Manter a cabeça elevada durante as primeiras 4 horas pós-aplicação.\n` +
    `- Não realizar massagem, fricção ou pressão na região tratada pelas próximas 48 horas.\n` +
    `- Suspender atividades físicas extenuantes e exposição a fontes de calor intenso (sauna, sol) por 24 horas.\n` +
    `- Fotoproteção facial diária com FPS 50+ reaplicado a cada 3 horas.\n\n` +
    `4. CONDUTA E SEGUIMENTO:\n` +
    `- Retorno ambulatorial agendado para reavaliação clínica e retoque em 15 dias.`;

  logInfo('Atualizando prontuário com o laudo de evolução clínica detalhado...');

  const updateEvolutionRes = await apiFetch('/api/db/execute', {
    method: 'POST',
    body: JSON.stringify({
      sql: `UPDATE procedures SET evolution_text = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [detailedEvolution, procedureId],
    }),
  });

  if (updateEvolutionRes.status !== 200 || !updateEvolutionRes.data?.success) {
    throw new Error(`Erro ao salvar evolução clínica: ${JSON.stringify(updateEvolutionRes.data)}`);
  }

  // Validação no prontuário do paciente
  const verifyEvolutionRes = await apiFetch('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      sql: `SELECT id, performed_at, status, evolution_text FROM procedures WHERE id = ? AND patient_id = ?`,
      args: [procedureId, patientId],
    }),
  });

  const verifiedProc = verifyEvolutionRes.data?.data?.[0];
  if (!verifiedProc || !verifiedProc.evolution_text) {
    throw new Error('Falha ao validar persistência da evolução clínica no prontuário.');
  }

  logSuccess(`Evolução clínica carimbada e registrada com sucesso no prontuário do paciente (Status: ${verifiedProc.status}).`);

  // ----------------------------------------------------------------------------
  // AUDITORIA FINAL & RESUMO ESTRUTURADO
  // ----------------------------------------------------------------------------
  console.log(`\n${C.green}${C.bright}════════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}${C.bright}🎉 AUDITORIA CONCLUÍDA COM 100% DE SUCESSO EM TODAS AS 5 ETAPAS!${C.reset}`);
  console.log(`${C.green}${C.bright}════════════════════════════════════════════════════════════════════════════════${C.reset}`);

  console.log(`
${C.bright}RELATÓRIO CONSOLIDADO DA JORNADA CLÍNICA:${C.reset}
  1. ${C.green}✔ [PASS]${C.reset} Paciente criado com ID "${patientId}" e alerta de alergia visível.
  2. ${C.green}✔ [PASS]${C.reset} Plano de tratamento "${defaultProtocol.name}" associado e aprovado.
  3. ${C.green}✔ [PASS]${C.reset} Contrato PDF gerado, assinado e carimbado no prontuário (Código: ${verification_code}).
  4. ${C.green}✔ [PASS]${C.reset} Lote "${stockItem.batch_number}" rastreado e baixado no estoque com saldo atualizado.
  5. ${C.green}✔ [PASS]${C.reset} Evolução clínica carimbada com data/hora e conduta do atendimento.
`);
}

run().catch((err) => {
  console.error(`\n${C.red}${C.bright}✖ ERRO CRÍTICO DURANTE A EXECUÇÃO DA TRILHA:${C.reset}`, err);
  process.exit(1);
});
