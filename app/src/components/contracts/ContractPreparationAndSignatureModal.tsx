// src/components/contracts/ContractPreparationAndSignatureModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Eye,
  CheckCircle2,
  X,
  DollarSign,
  User,
  Edit3,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Send,
  TabletSmartphone,
  Copy,
  AlertCircle,
  Stethoscope,
  Calendar,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Check,
  Maximize2,
  Minimize2,
  ChevronRight,
  BadgePercent,
  Clock,
  Layers,
  ArrowLeft,
  SlidersHorizontal,
  FileDown,
  Search,
} from 'lucide-react';
import {
  SAUDE_360_CATALOG,
  Saude360PlanId,
  PricingTierMode,
  PaymentModality,
  OfficialContractTagMap,
  OFFICIAL_CONTRACT_MODEL_3_TEXT,
  numberToExtensoBRL,
  formatMoneyBRL,
  formatDataExtensoBR,
  applyTagsToContractTemplate,
  generateContractPdfBase64,
} from '@/services/contracts/saude360ContractEngine.service';
import { downloadFilledDocx } from '@/services/contracts/docxContractEngine.service';
import {
  WebPdfSignaturePositioner,
  SignatureFieldPosition,
  WebSignerConfig,
} from '@/components/signatures/WebPdfSignaturePositioner';
import {
  SignatureDocumentsService,
  CreatedDocumentSignerResult,
} from '@/services/contracts/signatureDocuments.service';
import { patientPlansRepository } from '@/features/plans/repositories/patientPlans.repository';
import {
  Button,
  Badge,
  FormField,
  Input,
  Select,
  SegmentedControl,
} from '@/components/ui';

export interface PatientRecordInput {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
}

interface ContractPreparationAndSignatureModalProps {
  isOpen: boolean;
  patient: PatientRecordInput;
  defaultCrmDra?: string;
  onClose: () => void;
  onDocumentCreated?: (result: {
    documentId: string;
    verificationCode: string;
    signers: CreatedDocumentSignerResult[];
  }) => void;
}

const PLAN_SHORT_PILLS: Record<Saude360PlanId, { label: string; badge: string }> = {
  MAPA_360: { label: 'Diagnóstico', badge: '90 min + Entrega' },
  RESTART_3M: { label: '3 Meses', badge: 'Ciclo Inicial' },
  EVOLUTION_6M: { label: '6 Meses', badge: 'Mais Escolhido' },
  SIGNATURE_12M: { label: '12 Meses', badge: 'Plano Anual' },
  LIFE_ANUAL: { label: 'Anual', badge: 'Assinatura' },
  PERSONALIZADO: { label: '12 Semanas', badge: 'Sob Medida' },
};

/**
 * Visualizador Executivo e Tipográfico da Minuta Oficial do Contrato
 * Transforma o texto bruto com tags preenchidas em um documento médico formatado e legível
 */
const FormattedContractPreview: React.FC<{
  text: string;
}> = ({ text }) => {
  const lines = useMemo(() => text.split('\n'), [text]);

  return (
    <div className="space-y-3.5 font-sans text-[12.5px] leading-[1.7] text-slate-800">
      {/* Timbrado Oficial no topo da folha */}
      <div className="border-b-2 border-emerald-900/10 pb-6 mb-7 text-center select-none">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-2.5 shadow-2xs">
          <Stethoscope className="w-5 h-5 text-emerald-700" />
        </div>
        <h4 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-emerald-950">
          Dra. Ana Carla Morong
        </h4>
        <p className="text-xs font-semibold text-emerald-800 mt-1">
          Medicina de Precisão & Longevidade Saudável
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5">
          CRM/SC 28412 • CNPJ: 54.811.772/0001-32 • Florianópolis - SC • (48) 98857-2882
        </p>
      </div>

      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();

        if (!line) {
          return <div key={idx} className="h-2.5" />;
        }

        // Título Principal
        if (line === 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS E ACOMPANHAMENTO EM SAÚDE') {
          return (
            <div key={idx} className="text-center py-3 px-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 mb-5">
              <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-emerald-950">
                {line}
              </h3>
            </div>
          );
        }

        // Título de Seção Romana (ex: I – DAS PARTES, II – DO OBJETO..., etc.)
        if (/^[I|V|X]+ – /.test(line)) {
          return (
            <div
              key={idx}
              className="mt-6 mb-3 px-4 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between"
            >
              <span>{line}</span>
            </div>
          );
        }

        // Subtítulos de Parte
        if (line === 'CONTRATADA:' || line === 'CONTRATANTE (PACIENTE):') {
          return (
            <div key={idx} className="mt-4 mb-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>{line}</span>
            </div>
          );
        }

        // Linha com Checkbox Marcado [X]
        if (line.startsWith('[X]')) {
          const content = line.substring(3).trim();
          return (
            <div
              key={idx}
              className="my-2.5 p-3.5 sm:p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 text-[12.5px] font-semibold text-emerald-950 flex items-start gap-3 shadow-2xs"
            >
              <div className="w-4.5 h-4.5 rounded-md bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <div className="flex-1 leading-relaxed">{content}</div>
            </div>
          );
        }

        // Linha com Checkbox Desmarcado [ ]
        if (line.startsWith('[ ]')) {
          const content = line.substring(3).trim();
          return (
            <div
              key={idx}
              className="my-2 p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-[12.5px] text-slate-400 opacity-65 flex items-start gap-3"
            >
              <div className="w-4.5 h-4.5 rounded-md border-2 border-slate-300 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{content}</div>
            </div>
          );
        }

        // Linhas de Assinatura
        if (line.startsWith('____')) {
          return (
            <div key={idx} className="pt-6 text-center">
              <div className="w-72 h-0.5 bg-slate-300 mx-auto mb-2.5" />
            </div>
          );
        }

        // Parágrafos normais
        return (
          <p key={idx} className="text-[12.5px] text-slate-700 leading-[1.7] font-sans">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export const getDefaultIncludedProcedures = (planId: Saude360PlanId): number => {
  switch (planId) {
    case 'RESTART_3M':
      return 6;
    case 'EVOLUTION_6M':
      return 12;
    case 'SIGNATURE_12M':
      return 24;
    case 'LIFE_ANUAL':
      return 12;
    case 'MAPA_360':
      return 0;
    default:
      return 6;
  }
};

export const ContractPreparationAndSignatureModal: React.FC<
  ContractPreparationAndSignatureModalProps
> = ({
  isOpen,
  patient,
  defaultCrmDra = '',
  onClose,
  onDocumentCreated,
}) => {
  // Controle de Passo do Modal: 'prepare_tags' | 'position_signatures' | 'links_generated'
  const [modalStep, setModalStep] = useState<
    'prepare_tags' | 'position_signatures' | 'links_generated'
  >('prepare_tags');

  // Sub-abas lógicas para evitar acúmulo e espremer o conteúdo
  const [activeTab, setActiveTab] = useState<'programs' | 'financial' | 'patient' | 'raw_tags'>('programs');

  // Visibilidade da Prévia Lateral
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // CRM da Dra. Ana (Persistido no localStorage para conveniência)
  const [crmDra, setCrmDra] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dra_ana_crm_default') || defaultCrmDra || '';
    }
    return defaultCrmDra || '';
  });

  // Seleção do Programa Saúde 360® e Tier de Preço do Notebook
  const [selectedPlanId, setSelectedPlanId] = useState<Saude360PlanId>('EVOLUTION_6M');
  const [pricingTier, setPricingTier] = useState<PricingTierMode>('IDEAL_AVISTA');
  const [paymentModality, setPaymentModality] = useState<PaymentModality>('AVISTA');

  // Campos Numéricos Auxiliares para cálculo automático
  const [totalNumericValue, setTotalNumericValue] = useState<number>(11900.0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(12);
  const [installmentNumericValue, setInstallmentNumericValue] = useState<number>(1111.0);
  const [pixDueDay, setPixDueDay] = useState<number>(10);
  const [includedProceduresTotal, setIncludedProceduresTotal] = useState<number>(() =>
    getDefaultIncludedProcedures('EVOLUTION_6M')
  );

  // Formatação inicial de data de nascimento para padrão brasileiro se vier em YYYY-MM-DD
  const formattedInitialBirth = useMemo(() => {
    if (!patient.data_nascimento) return '';
    if (patient.data_nascimento.includes('-')) {
      const [year, month, day] = patient.data_nascimento.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
    }
    return patient.data_nascimento;
  }, [patient.data_nascimento]);

  // Estado Completo das 33 Tags Oficiais (100% editáveis pelo usuário)
  const [tags, setTags] = useState<OfficialContractTagMap>(() => ({
    nome: patient.nome || '',
    cpf: patient.cpf || '',
    data_nascimento: formattedInitialBirth || '',
    endereco: patient.endereco || '',
    bairro_cidade_uf:
      [patient.bairro, patient.cidade, patient.uf].filter(Boolean).join(' / ') ||
      'Florianópolis - SC',
    cep: patient.cep || '88000-000',
    telefone: patient.telefone || '',
    email: patient.email || '',
    chk_mapa: ' ',
    chk_restart: ' ',
    chk_evolution: 'X',
    chk_signature: ' ',
    chk_life: ' ',
    chk_personalizado: ' ',
    semanas_tratamento: '---',
    duracao_personalizada: '---',
    consulta_seg: '---',
    frequencia_procedimentos: '---',
    especificacoes_terapeuticas: '---',
    valor_plano: '11.900,00',
    valor_plano_extenso: numberToExtensoBRL(11900.0),
    chk_avista: 'X',
    valor_avista: '11.900,00',
    chk_cartao: ' ',
    num_parcelas_cartao: '--',
    valor_parcela_cartao: '---',
    chk_pix_parcelado: ' ',
    num_parcelas_pix: '--',
    valor_parcela_pix: '---',
    dia_vencimento_pix: '--',
    vigencia_contrato: '6 (seis) meses corridos',
    data_extenso: formatDataExtensoBR(new Date()),
    crm_dra: crmDra || '____',
  }));

  // Estado do PDF gerado para a Etapa 2 (Posicionador)
  const [generatedPdfBase64, setGeneratedPdfBase64] = useState<string>('');
  const [initialSignatureFields, setInitialSignatureFields] = useState<SignatureFieldPosition[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState<boolean>(false);
  const [isSavingDocument, setIsSavingDocument] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resultado do documento criado (Passo 3)
  const [createdDocInfo, setCreatedDocInfo] = useState<{
    documentId: string;
    verificationCode: string;
    signers: CreatedDocumentSignerResult[];
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  // Signatários Padrão (Paciente + Dra. Ana Carla Morong)
  const signers: WebSignerConfig[] = useMemo(
    () => [
      {
        id: 'signer-patient',
        role: 'PACIENTE',
        fullName: tags.nome || patient.nome,
        cpf: tags.cpf || patient.cpf,
        email: tags.email || patient.email,
        phoneWhatsapp: tags.telefone || patient.telefone,
        colorHex: '#0284c7',
      },
      {
        id: 'signer-dra-ana',
        role: 'DRA_ANA',
        fullName: 'Dra. Ana Carla Morong',
        cpf: '54.811.772/0001-32',
        email: 'financeiro@draanamorong.com.br',
        phoneWhatsapp: '(48) 98857-2882',
        colorHex: '#047857',
      },
    ],
    [tags.nome, tags.cpf, tags.email, tags.telefone, patient]
  );

  // Checagem de discrepância de arredondamento comercial
  const pricingRoundingDifference = useMemo(() => {
    if (paymentModality === 'AVISTA') return 0;
    const computedTotal = Number((installmentsCount * installmentNumericValue).toFixed(2));
    const diff = Number((computedTotal - totalNumericValue).toFixed(2));
    return Math.abs(diff) > 0.05 ? diff : 0;
  }, [paymentModality, installmentsCount, installmentNumericValue, totalNumericValue]);

  // Aplica automaticamente os valores padrões do Notebook quando muda o Plano ou o Tier Comercial
  const applyPlanAndTierDefaults = (
    planId: Saude360PlanId,
    tier: PricingTierMode,
    modalityOverride?: PaymentModality
  ) => {
    const plan = SAUDE_360_CATALOG[planId];
    let nextModality = modalityOverride || paymentModality;
    let nextTotal = totalNumericValue;
    let nextInstallment = installmentNumericValue;
    let nextCount = installmentsCount;

    if (tier === 'IDEAL_AVISTA') {
      nextModality = 'AVISTA';
      nextTotal = plan.pricing.idealCash;
      nextCount = 1;
      nextInstallment = plan.pricing.idealCash;
    } else if (tier === 'IDEAL_12X') {
      nextModality = 'CARTAO';
      nextTotal = plan.pricing.idealTotal12x;
      nextCount = 12;
      nextInstallment = plan.pricing.idealInstallment12x;
    } else if (tier === 'MINIMO_AVISTA') {
      nextModality = 'AVISTA';
      nextTotal = plan.pricing.minCash;
      nextCount = 1;
      nextInstallment = plan.pricing.minCash;
    } else if (tier === 'MINIMO_12X') {
      nextModality = 'CARTAO';
      nextTotal = plan.pricing.minTotal12x;
      nextCount = 12;
      nextInstallment = plan.pricing.minInstallment12x;
    }

    setSelectedPlanId(planId);
    setPricingTier(tier);
    setPaymentModality(nextModality);
    setTotalNumericValue(nextTotal);
    setInstallmentsCount(nextCount);
    setInstallmentNumericValue(nextInstallment);
    if (planId !== selectedPlanId) {
      setIncludedProceduresTotal(getDefaultIncludedProcedures(planId));
    }

    const formattedTotal = formatMoneyBRL(nextTotal);
    const formattedInstallment = formatMoneyBRL(nextInstallment);

    setTags((prev) => ({
      ...prev,
      chk_mapa: planId === 'MAPA_360' ? 'X' : ' ',
      chk_restart: planId === 'RESTART_3M' ? 'X' : ' ',
      chk_evolution: planId === 'EVOLUTION_6M' ? 'X' : ' ',
      chk_signature: planId === 'SIGNATURE_12M' ? 'X' : ' ',
      chk_life: planId === 'LIFE_ANUAL' ? 'X' : ' ',
      chk_personalizado: planId === 'PERSONALIZADO' ? 'X' : ' ',

      semanas_tratamento: planId === 'PERSONALIZADO' ? '12 (doze) semanas' : '---',
      duracao_personalizada:
        planId === 'PERSONALIZADO'
          ? 'a contar da adesão, com reavaliações mensais'
          : '---',
      consulta_seg:
        planId === 'PERSONALIZADO' ? plan.consultationsSchedule : '---',
      frequencia_procedimentos:
        planId === 'PERSONALIZADO' ? plan.includesSummary : '---',
      especificacoes_terapeuticas:
        planId === 'PERSONALIZADO' ? plan.clinicalObjectives : '---',

      vigencia_contrato: plan.durationLabel,
      valor_plano: formattedTotal,
      valor_plano_extenso: numberToExtensoBRL(nextTotal),

      chk_avista: nextModality === 'AVISTA' ? 'X' : ' ',
      valor_avista: nextModality === 'AVISTA' ? formattedTotal : '---',

      chk_cartao: nextModality === 'CARTAO' ? 'X' : ' ',
      num_parcelas_cartao: nextModality === 'CARTAO' ? String(nextCount) : '--',
      valor_parcela_cartao:
        nextModality === 'CARTAO' ? formattedInstallment : '---',

      chk_pix_parcelado: nextModality === 'PIX_PARCELADO' ? 'X' : ' ',
      num_parcelas_pix:
        nextModality === 'PIX_PARCELADO' ? String(nextCount) : '--',
      valor_parcela_pix:
        nextModality === 'PIX_PARCELADO' ? formattedInstallment : '---',
      dia_vencimento_pix:
        nextModality === 'PIX_PARCELADO' ? String(pixDueDay) : '--',
      crm_dra: crmDra || prev.crm_dra,
    }));
  };

  // Atualiza tags financeiras quando o usuário edita valores ou parcelas manualmente
  const handleManualFinancialChange = (params: {
    modality?: PaymentModality;
    total?: number;
    count?: number;
    installment?: number;
    dueDay?: number;
  }) => {
    const mod = params.modality ?? paymentModality;
    const tot = params.total ?? totalNumericValue;
    const cnt = params.count ?? installmentsCount;
    const inst =
      params.installment !== undefined
        ? params.installment
        : cnt > 0
        ? Number((tot / cnt).toFixed(2))
        : tot;
    const day = params.dueDay ?? pixDueDay;

    setPricingTier('CUSTOM');
    setPaymentModality(mod);
    setTotalNumericValue(tot);
    setInstallmentsCount(cnt);
    setInstallmentNumericValue(inst);
    setPixDueDay(day);

    const formattedTotal = formatMoneyBRL(tot);
    const formattedInst = formatMoneyBRL(inst);

    setTags((prev) => ({
      ...prev,
      valor_plano: formattedTotal,
      valor_plano_extenso: numberToExtensoBRL(tot),
      chk_avista: mod === 'AVISTA' ? 'X' : ' ',
      valor_avista: mod === 'AVISTA' ? formattedTotal : '---',
      chk_cartao: mod === 'CARTAO' ? 'X' : ' ',
      num_parcelas_cartao: mod === 'CARTAO' ? String(cnt) : '--',
      valor_parcela_cartao:
        mod === 'CARTAO' ? formattedInst : '---',
      chk_pix_parcelado: mod === 'PIX_PARCELADO' ? 'X' : ' ',
      num_parcelas_pix: mod === 'PIX_PARCELADO' ? String(cnt) : '--',
      valor_parcela_pix: mod === 'PIX_PARCELADO' ? formattedInst : '---',
      dia_vencimento_pix: mod === 'PIX_PARCELADO' ? String(day) : '--',
    }));
  };

  // Atualiza qualquer tag individual diretamente
  const handleDirectTagEdit = (key: keyof OfficialContractTagMap, value: string) => {
    setTags((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Salva CRM da médica
  const handleCrmChange = (val: string) => {
    setCrmDra(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dra_ana_crm_default', val);
    }
    handleDirectTagEdit('crm_dra', val);
  };

  // Texto do contrato renderizado em tempo real
  const renderedContractText = useMemo(
    () => applyTagsToContractTemplate(OFFICIAL_CONTRACT_MODEL_3_TEXT, tags),
    [tags]
  );

  // Avança da Etapa 1 (Preparação de Tags) para a Etapa 2 (Posicionador de Assinaturas no PDF)
  const handleProceedToSignaturePositioner = async () => {
    if (!crmDra || crmDra.trim() === '' || crmDra === '____') {
      setErrorMessage('Por favor, informe o CRM da Dra. Ana Carla Morong antes de prosseguir.');
      setActiveTab('patient');
      return;
    }
    if (!tags.nome || !tags.cpf) {
      setErrorMessage('Nome completo e CPF do paciente são obrigatórios.');
      setActiveTab('patient');
      return;
    }
    setErrorMessage(null);

    try {
      setIsGeneratingPdf(true);
      const { pdfBase64, pageCount, signatureAnchors, initialsBoxes } =
        await generateContractPdfBase64(renderedContractText);
      setGeneratedPdfBase64(pdfBase64);

      // Posicionamento Automático baseado nas posições REAIS medidas pelo gerador:
      // Rubricas nas páginas 1 até pageCount - 1, dentro da faixa segura do timbrado
      const autoFields: SignatureFieldPosition[] = [];
      for (let p = 1; p < pageCount; p++) {
        autoFields.push({
          id: crypto.randomUUID(),
          signer_id: 'signer-patient',
          field_type: 'initials',
          page: p,
          ...initialsBoxes.patient,
        });
        autoFields.push({
          id: crypto.randomUUID(),
          signer_id: 'signer-dra-ana',
          field_type: 'initials',
          page: p,
          ...initialsBoxes.dra,
        });
      }

      // Assinaturas sobre as linhas "____" do bloco final (posição real, mesma página do bloco)
      const draAnchor = signatureAnchors.dra;
      const patientAnchor = signatureAnchors.patient;

      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-dra-ana',
        field_type: 'signature',
        page: draAnchor?.page ?? pageCount,
        x_percent: draAnchor?.x_percent ?? 28,
        y_percent: draAnchor?.y_percent ?? 38,
        width_percent: draAnchor?.width_percent ?? 44,
        height_percent: draAnchor?.height_percent ?? 6.8,
      });

      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-patient',
        field_type: 'signature',
        page: patientAnchor?.page ?? pageCount,
        x_percent: patientAnchor?.x_percent ?? 28,
        y_percent: patientAnchor?.y_percent ?? 54,
        width_percent: patientAnchor?.width_percent ?? 44,
        height_percent: patientAnchor?.height_percent ?? 6.8,
      });

      setInitialSignatureFields(autoFields);
      setModalStep('position_signatures');
    } catch (err: any) {
      setErrorMessage(`Erro ao gerar PDF do contrato: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dispara o preenchimento das chaves no modelo oficial DOCX e inicia o download
  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    setErrorMessage(null);
    try {
      const cleanName = (tags.nome || 'Paciente').trim().replace(/[^a-zA-Z0-9]/g, '_');
      await downloadFilledDocx(
        tags,
        `Contrato_Dra_Ana_Morong_${cleanName}.docx`
      );
    } catch (err: any) {
      setErrorMessage(`Erro ao gerar Word (.docx): ${err.message}`);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Grava o documento no Cloudflare D1 e abre tela de links (Passo 3)
  const handleSaveAndDispatch = async (
    positionedFields: SignatureFieldPosition[],
    mode: 'in_person' | 'remote'
  ) => {
    try {
      setIsSavingDocument(true);
      setErrorMessage(null);

      const result = await SignatureDocumentsService.createDocument({
        title: `Contrato ${currentPlanMeta.name} — ${tags.nome}`,
        category: 'CONTRATO',
        signing_mode: mode,
        patient_id: patient.id,
        patient_name: tags.nome,
        patient_cpf: tags.cpf,
        patient_email: tags.email,
        patient_phone: tags.telefone,
        original_pdf_base64: generatedPdfBase64,
        signers,
        fields: positionedFields,
      });

      setCreatedDocInfo({
        documentId: result.document_id,
        verificationCode: result.verification_code,
        signers: result.signers,
      });

      // Cria a proposta de Plano de Paciente (patient_plans) vinculada a este contrato
      try {
        const durationMonths =
          selectedPlanId === 'RESTART_3M'
            ? 3
            : selectedPlanId === 'EVOLUTION_6M'
            ? 6
            : selectedPlanId === 'SIGNATURE_12M'
            ? 12
            : selectedPlanId === 'LIFE_ANUAL'
            ? 12
            : selectedPlanId === 'MAPA_360'
            ? 1
            : 6;

        await patientPlansRepository.createProposal({
          patientId: patient.id,
          planKey: selectedPlanId,
          planName: currentPlanMeta.name,
          durationMonths,
          totalValue: totalNumericValue,
          paymentModality,
          includedProceduresTotal,
          documentId: result.document_id,
          notes: `Proposta gerada via Estúdio de Contratos (${mode === 'in_person' ? 'Assinatura Presencial' : 'Link Remoto'})`,
        });
      } catch (planErr) {
        console.warn('[handleSaveAndDispatch] Não foi possível vincular proposta de plano:', planErr);
      }

      if (onDocumentCreated) {
        onDocumentCreated({
          documentId: result.document_id,
          verificationCode: result.verification_code,
          signers: result.signers,
        });
      }

      setModalStep('links_generated');
    } catch (err: any) {
      setErrorMessage(`Erro ao gravar documento: ${err.message}`);
    } finally {
      setIsSavingDocument(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (!isOpen) return null;

  const currentPlanMeta = SAUDE_360_CATALOG[selectedPlanId];
  const totalTagsCount = Object.keys(tags).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 lg:p-6 transition-all">
      <div
        className="bg-white rounded-3xl w-full max-w-[1640px] h-[95vh] max-h-[1040px] flex flex-col overflow-hidden shadow-2xl border border-slate-200/90 ring-1 ring-black/5"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        {/* ==================================================================== */}
        {/* TOPBAR ELEGANTE E ESPAÇOSA (DESIGN SYSTEM OFICIAL DRA. ANA MORONG) */}
        {/* ==================================================================== */}
        <header className="min-h-[88px] py-4 bg-white border-b border-slate-200/80 px-7 sm:px-9 flex items-center justify-between gap-5 shrink-0 shadow-2xs">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Estúdio de Contratos — Jornada Saúde 360®
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Modelo Oficial Dra. Ana Morong
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 flex items-center gap-2.5 flex-wrap">
                <span>Paciente:</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                  {tags.nome || 'Não informado'}
                </span>
                {tags.cpf && (
                  <span className="text-slate-400 font-mono text-xs">
                    CPF: <strong className="text-slate-700">{tags.cpf}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 shrink-0">
            {/* ETAPAS STEPPER INTERATIVO */}
            <nav className="hidden xl:flex items-center gap-2 bg-slate-100/90 p-2 rounded-2xl border border-slate-200/80 text-xs sm:text-[13px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (modalStep === 'position_signatures') setModalStep('prepare_tags');
                }}
                disabled={modalStep === 'prepare_tags' || modalStep === 'links_generated'}
                className={`min-h-[42px] px-4 py-2 rounded-xl transition-all flex items-center gap-2.5 ${
                  modalStep === 'prepare_tags'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/80'
                    : modalStep === 'position_signatures'
                    ? 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60 cursor-pointer'
                    : 'text-slate-400 opacity-60 cursor-default'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                    modalStep === 'prepare_tags'
                      ? 'bg-emerald-700 text-white'
                      : modalStep === 'position_signatures' || modalStep === 'links_generated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {modalStep !== 'prepare_tags' ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    '1'
                  )}
                </span>
                <span>1. Parâmetros & Escopo</span>
              </button>

              <div className="w-3.5 h-0.5 bg-slate-300 rounded-full" />

              <button
                type="button"
                disabled={!generatedPdfBase64 || modalStep === 'links_generated'}
                onClick={() => {
                  if (generatedPdfBase64 && modalStep === 'prepare_tags') {
                    setModalStep('position_signatures');
                  }
                }}
                className={`min-h-[42px] px-4 py-2 rounded-xl transition-all flex items-center gap-2.5 ${
                  modalStep === 'position_signatures'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/80'
                    : generatedPdfBase64 && modalStep !== 'links_generated'
                    ? 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60 cursor-pointer'
                    : 'text-slate-400 opacity-60 cursor-default'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                    modalStep === 'position_signatures'
                      ? 'bg-emerald-700 text-white'
                      : modalStep === 'links_generated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {modalStep === 'links_generated' ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    '2'
                  )}
                </span>
                <span>2. Assinaturas no PDF</span>
              </button>

              <div className="w-3.5 h-0.5 bg-slate-300 rounded-full" />

              <div
                className={`min-h-[42px] px-4 py-2 rounded-xl transition-all flex items-center gap-2.5 ${
                  modalStep === 'links_generated'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/80'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    modalStep === 'links_generated'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  3
                </span>
                <span>3. Finalização</span>
              </div>
            </nav>

            {/* TOGGLE DA PRÉVIA LATERAL */}
            {modalStep === 'prepare_tags' && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="hidden lg:flex items-center gap-2.5 h-11 px-4.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs sm:text-[13px] font-bold text-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
              >
                {showPreview ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-slate-500" />
                    <span>Ocultar Prévia</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-emerald-700" />
                    <span>Exibir Prévia</span>
                  </>
                )}
              </button>
            )}

            {modalStep === 'position_signatures' && (
              <button
                type="button"
                onClick={() => setModalStep('prepare_tags')}
                className="h-11 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 text-xs sm:text-sm font-bold text-slate-700 transition shadow-2xs cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Edição</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl border border-slate-200/80 bg-slate-50/70 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-90 transition cursor-pointer flex items-center justify-center"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ALERTA DE ERRO */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-8 py-3.5 text-xs sm:text-sm text-rose-800 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2.5 font-semibold">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="px-3 py-1 rounded-lg text-rose-700 font-bold hover:bg-rose-100 transition text-xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PASSO 1: CONFIGURAÇÃO DO PLANO + EDIÇÃO DE TAGS + PREVIEW AO VIVO */}
        {/* ==================================================================== */}
        {modalStep === 'prepare_tags' && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            
            {/* -------------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: FORMULÁRIO COM NAVEGAÇÃO ESPAÇOSA E FLUÍDA */}
            {/* -------------------------------------------------------------- */}
            <div
              className="flex flex-col min-h-0 h-full border-r border-slate-200 bg-white transition-all duration-300"
              style={{
                width: showPreview ? '55%' : '100%',
                flexShrink: 0,
              }}
            >
              {/* SUB-ABAS MODERNAS EM GRADE ESPAÇOSA (SEM APERTO E SEM CORTE) */}
              <div className="px-7 sm:px-9 py-4 border-b border-slate-200/80 bg-slate-50/90 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2 bg-slate-200/65 rounded-2xl border border-slate-200/90">
                  <button
                    type="button"
                    onClick={() => setActiveTab('programs')}
                    className={`min-h-[60px] px-4 py-2.5 rounded-xl transition-all flex flex-col items-start justify-between gap-1.5 text-left cursor-pointer ${
                      activeTab === 'programs'
                        ? 'bg-white text-emerald-950 shadow-sm font-bold border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-[13px] leading-tight">
                      <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'programs' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span>1. Programa 360®</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      {PLAN_SHORT_PILLS[selectedPlanId]?.label || currentPlanMeta.name.split(' ')[0]}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('financial')}
                    className={`min-h-[60px] px-4 py-2.5 rounded-xl transition-all flex flex-col items-start justify-between gap-1.5 text-left cursor-pointer ${
                      activeTab === 'financial'
                        ? 'bg-white text-emerald-950 shadow-sm font-bold border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-[13px] leading-tight">
                      <DollarSign className={`w-4 h-4 shrink-0 ${activeTab === 'financial' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span>2. Escada & Valores</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
                      R$ {tags.valor_plano}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('patient')}
                    className={`min-h-[60px] px-4 py-2.5 rounded-xl transition-all flex flex-col items-start justify-between gap-1.5 text-left cursor-pointer ${
                      activeTab === 'patient'
                        ? 'bg-white text-emerald-950 shadow-sm font-bold border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-[13px] leading-tight">
                      <User className={`w-4 h-4 shrink-0 ${activeTab === 'patient' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span>3. Paciente & Médica</span>
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      !tags.cpf || !tags.nome
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    }`}>
                      {!tags.cpf || !tags.nome ? 'Pendente' : 'Dados OK ✓'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('raw_tags')}
                    className={`min-h-[60px] px-4 py-2.5 rounded-xl transition-all flex flex-col items-start justify-between gap-1.5 text-left cursor-pointer ${
                      activeTab === 'raw_tags'
                        ? 'bg-white text-emerald-950 shadow-sm font-bold border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-[13px] leading-tight">
                      <SlidersHorizontal className={`w-4 h-4 shrink-0 ${activeTab === 'raw_tags' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span>4. Tags</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                      {totalTagsCount} variáveis
                    </span>
                  </button>
                </div>
              </div>

              {/* CONTEÚDO ROLÁVEL COM ESPAÇAMENTO RESPIRÁVEL E AMPLO */}
              <div className="flex-1 overflow-y-auto px-7 sm:px-9 py-7 sm:py-8 space-y-8 bg-slate-50/40">
                
                {/* ---------------------------------------------------------- */}
                {/* ABA 1: PROGRAMA & ESCADA DE VALOR */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'programs' && (
                  <div className="space-y-7">
                    {/* SELEÇÃO DO PROGRAMA SAÚDE 360® */}
                    <section className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>Escolha do Programa (Cláusula II)</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                          Selecione o plano da Jornada Saúde 360®
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                          Ao selecionar, todos os prazos, valores, escopos e cláusulas contratuais são preenchidos automaticamente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {(Object.keys(SAUDE_360_CATALOG) as Saude360PlanId[]).map((planKey) => {
                          const item = SAUDE_360_CATALOG[planKey];
                          const isSelected = selectedPlanId === planKey;
                          const shortPill = PLAN_SHORT_PILLS[planKey];
                          return (
                            <div
                              key={planKey}
                              onClick={() => applyPlanAndTierDefaults(planKey, 'IDEAL_AVISTA')}
                              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group min-h-[180px] ${
                                isSelected
                                  ? 'bg-emerald-50/65 border-emerald-600 shadow-sm ring-4 ring-emerald-600/10'
                                  : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99]'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3.5 mb-2">
                                  <div>
                                    <span
                                      className={`text-[15px] sm:text-base font-extrabold tracking-tight block leading-snug ${
                                        isSelected ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                                        {shortPill?.label || item.durationLabel}
                                      </span>
                                      {shortPill?.badge && (
                                        <span className="text-xs font-semibold text-slate-500">
                                          • {shortPill.badge}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'border-2 border-slate-300 bg-white group-hover:border-emerald-400'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                  </div>
                                </div>
                                <p className="text-[13px] text-slate-600 leading-relaxed mt-3 line-clamp-2">
                                  {item.subtitle}
                                </p>
                              </div>

                              <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 font-semibold">Ideal À Vista:</span>
                                <span className="font-extrabold text-emerald-800 font-mono text-base sm:text-lg">
                                  R$ {formatMoneyBRL(item.pricing.idealCash)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Resumo da Estrutura Clínica */}
                      <div className="bg-gradient-to-br from-emerald-50/75 to-teal-50/45 border border-emerald-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 shrink-0" />
                            <span>Estrutura Clínica Prevista — <strong>{currentPlanMeta.name}</strong></span>
                          </p>
                          <span className="text-xs font-bold text-emerald-800 bg-white px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-2xs self-start sm:self-auto">
                            Vigência: {currentPlanMeta.durationLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          {currentPlanMeta.stagesSummary.map((st, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs sm:text-[13px] text-slate-700 font-medium leading-relaxed bg-white/90 border border-emerald-100 p-4 rounded-xl shadow-2xs">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="line-clamp-3">{st}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 text-xs sm:text-[13px] text-slate-600 border-t border-emerald-200/60 flex flex-wrap gap-x-6 gap-y-2.5 font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span><strong>Cronograma:</strong> {currentPlanMeta.consultationsSchedule}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Medicina Integrativa individualizada</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 2: ESCADA DE VALOR & CONDIÇÕES COMERCIAIS */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'financial' && (
                  <div className="space-y-7">
                    {/* SELEÇÃO DO TIER COMERCIAL */}
                    <section className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-700" />
                          Tabela Comercial Oficial (Escada de Valor Dra. Ana)
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Selecione a condição comercial para preencher parcelamento e valor por extenso automaticamente:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* IDEAL À VISTA */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_AVISTA')}
                          className={`p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[132px] ${
                            pricingTier === 'IDEAL_AVISTA'
                              ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-700 shadow-md ring-4 ring-emerald-600/20'
                              : 'bg-white hover:bg-emerald-50/20 hover:border-emerald-300 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block ${
                                pricingTier === 'IDEAL_AVISTA'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Ideal À Vista
                            </span>
                            {pricingTier === 'IDEAL_AVISTA' && <Check className="w-5 h-5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-lg sm:text-xl font-black block mt-3 font-mono">
                              R$ {formatMoneyBRL(currentPlanMeta.pricing.idealCash)}
                            </span>
                            <span
                              className={`text-xs sm:text-[13px] block mt-1 font-medium ${
                                pricingTier === 'IDEAL_AVISTA' ? 'text-emerald-100' : 'text-slate-500'
                              }`}
                            >
                              PIX / TED (Recomendado)
                            </span>
                          </div>
                        </button>

                        {/* IDEAL 12X */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_12X')}
                          className={`p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[132px] ${
                            pricingTier === 'IDEAL_12X'
                              ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-700 shadow-md ring-4 ring-emerald-600/20'
                              : 'bg-white hover:bg-emerald-50/20 hover:border-emerald-300 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block ${
                                pricingTier === 'IDEAL_12X'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Ideal 12x Cartão
                            </span>
                            {pricingTier === 'IDEAL_12X' && <Check className="w-5 h-5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-lg sm:text-xl font-black block mt-3 font-mono">
                              12x R$ {formatMoneyBRL(currentPlanMeta.pricing.idealInstallment12x)}
                            </span>
                            <span
                              className={`text-xs sm:text-[13px] block mt-1 font-medium ${
                                pricingTier === 'IDEAL_12X' ? 'text-emerald-100' : 'text-slate-500'
                              }`}
                            >
                              Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.idealTotal12x)}
                            </span>
                          </div>
                        </button>

                        {/* MÍNIMO À VISTA */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_AVISTA')}
                          className={`p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[132px] ${
                            pricingTier === 'MINIMO_AVISTA'
                              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-md ring-4 ring-slate-800/20'
                              : 'bg-white hover:bg-slate-100 hover:border-slate-300 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block ${
                                pricingTier === 'MINIMO_AVISTA'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              Mínimo À Vista
                            </span>
                            {pricingTier === 'MINIMO_AVISTA' && <Check className="w-5 h-5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-lg sm:text-xl font-black block mt-3 font-mono">
                              R$ {formatMoneyBRL(currentPlanMeta.pricing.minCash)}
                            </span>
                            <span
                              className={`text-xs sm:text-[13px] block mt-1 font-medium ${
                                pricingTier === 'MINIMO_AVISTA' ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              Piso Negociado
                            </span>
                          </div>
                        </button>

                        {/* MÍNIMO 12X */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_12X')}
                          className={`p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[132px] ${
                            pricingTier === 'MINIMO_12X'
                              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-md ring-4 ring-slate-800/20'
                              : 'bg-white hover:bg-slate-100 hover:border-slate-300 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block ${
                                pricingTier === 'MINIMO_12X'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              Mínimo 12x
                            </span>
                            {pricingTier === 'MINIMO_12X' && <Check className="w-5 h-5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-lg sm:text-xl font-black block mt-3 font-mono">
                              12x R$ {formatMoneyBRL(currentPlanMeta.pricing.minInstallment12x)}
                            </span>
                            <span
                              className={`text-xs sm:text-[13px] block mt-1 font-medium ${
                                pricingTier === 'MINIMO_12X' ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.minTotal12x)}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Notificação amigável de arredondamento comercial */}
                      {pricingRoundingDifference !== 0 && (
                        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 text-xs sm:text-[13px] text-amber-900 flex items-center gap-3">
                          <AlertCircle className="w-4.5 h-4.5 text-amber-700 shrink-0" />
                          <span>
                            Arredondamento do plano: {installmentsCount}x de R${' '}
                            {formatMoneyBRL(installmentNumericValue)} = R${' '}
                            {formatMoneyBRL(installmentsCount * installmentNumericValue)} (Total nominal: R${' '}
                            {formatMoneyBRL(totalNumericValue)}).
                          </span>
                        </div>
                      )}
                    </section>

                    {/* CONFIGURAÇÃO DETALHADA DE PAGAMENTO */}
                    <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
                      <h4 className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-emerald-700" />
                        Condições de Pagamento e Faturamento
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField label="Forma de Pagamento">
                          <Select
                            value={paymentModality}
                            onChange={(e) =>
                              handleManualFinancialChange({
                                modality: e.target.value as PaymentModality,
                              })
                            }
                          >
                            <option value="AVISTA">À Vista (PIX / Transferência)</option>
                            <option value="CARTAO">Cartão de Crédito Parcelado</option>
                            <option value="PIX_PARCELADO">PIX Parcelado / Recorrência</option>
                          </Select>
                        </FormField>

                        <FormField label="Valor Total do Contrato" badge="R$">
                          <Input
                            type="number"
                            step="0.01"
                            value={totalNumericValue}
                            onChange={(e) =>
                              handleManualFinancialChange({
                                total: parseFloat(e.target.value) || 0,
                              })
                            }
                            mono
                          />
                        </FormField>

                        {paymentModality !== 'AVISTA' && (
                          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                            <FormField label="Número de Parcelas">
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={installmentsCount}
                                onChange={(e) =>
                                  handleManualFinancialChange({
                                    count: parseInt(e.target.value, 10) || 1,
                                  })
                                }
                              />
                            </FormField>
                            <FormField label="Valor de Cada Parcela" badge="R$">
                              <Input
                                type="number"
                                step="0.01"
                                value={installmentNumericValue}
                                onChange={(e) =>
                                  handleManualFinancialChange({
                                    installment: parseFloat(e.target.value) || 0,
                                  })
                                }
                                mono
                              />
                            </FormField>
                          </div>
                        )}

                        {paymentModality === 'PIX_PARCELADO' && (
                          <div className="sm:col-span-2">
                            <FormField label="Dia de Vencimento Mensal" badge="{{dia_vencimento_pix}}">
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                value={pixDueDay}
                                onChange={(e) =>
                                  handleManualFinancialChange({
                                    dueDay: parseInt(e.target.value, 10) || 10,
                                  })
                                }
                              />
                            </FormField>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <FormField label="Valor por Extenso Automático" badge="{{valor_plano_extenso}}">
                          <Input
                            type="text"
                            value={tags.valor_plano_extenso}
                            onChange={(e) =>
                              handleDirectTagEdit('valor_plano_extenso', e.target.value)
                            }
                          />
                        </FormField>
                      </div>

                      {/* PACOTE DE APLICAÇÕES / SESSÕES INCLUSAS */}
                      <div className="pt-4 border-t border-slate-100">
                        <FormField
                          label="Sessões de Aplicações / Injetáveis Inclusas no Plano"
                          badge="Editável"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={includedProceduresTotal}
                                onChange={(e) =>
                                  setIncludedProceduresTotal(
                                    Math.max(0, parseInt(e.target.value, 10) || 0)
                                  )
                                }
                                className="max-w-[130px] font-bold text-emerald-950"
                                mono
                              />
                              <span className="text-xs text-slate-600 font-medium">
                                sessões inclusas contratadas (recomendado no catálogo: {getDefaultIncludedProcedures(selectedPlanId)} sessões)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Define a franquia do plano para controle automático na sala de aplicação. É possível ajustar individualmente conforme o caso clínico.
                            </p>
                          </div>
                        </FormField>
                      </div>
                    </section>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 3: DADOS DO PACIENTE & MÉDICA */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'patient' && (
                  <div className="space-y-7">
                    {/* DADOS DA MÉDICA */}
                    <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Médica Contratada
                          </p>
                          <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                            Dra. Ana Carla Morong
                          </h3>
                          <p className="text-xs sm:text-[13px] text-emerald-800 font-medium mt-0.5">
                            CNPJ: 54.811.772/0001-32 • Florianópolis - SC
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white px-4.5 py-3 rounded-xl border border-emerald-200 shadow-2xs">
                        <label className="text-xs sm:text-[13px] font-bold text-slate-700 whitespace-nowrap">
                          CRM/SC:
                        </label>
                        <Input
                          value={crmDra}
                          onChange={(e) => handleCrmChange(e.target.value)}
                          placeholder="Ex: 28412"
                          mono
                          inputSize="md"
                          className="w-32"
                        />
                      </div>
                    </div>

                    {/* DADOS CADASTRAIS DO PACIENTE */}
                    <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-7">
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-700" />
                          Dados Pessoais do Contratante (Paciente)
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500">
                          As informações abaixo preenchem a qualificação das partes (Cláusula I do Contrato):
                        </p>
                      </div>

                      {/* BLOCO 1: IDENTIFICAÇÃO */}
                      <div className="space-y-5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          1. Identificação Civil
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <div className="sm:col-span-2">
                            <FormField label="Nome Completo" badge="{{nome}}" required>
                              <Input
                                type="text"
                                value={tags.nome}
                                onChange={(e) => handleDirectTagEdit('nome', e.target.value)}
                                placeholder="Nome do paciente"
                              />
                            </FormField>
                          </div>
                          <div>
                            <FormField label="CPF" badge="{{cpf}}" required>
                              <Input
                                type="text"
                                value={tags.cpf}
                                onChange={(e) => handleDirectTagEdit('cpf', e.target.value)}
                                placeholder="000.000.000-00"
                                mono
                              />
                            </FormField>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <div>
                            <FormField label="Data de Nascimento" badge="{{data_nascimento}}">
                              <Input
                                type="text"
                                value={tags.data_nascimento}
                                onChange={(e) => handleDirectTagEdit('data_nascimento', e.target.value)}
                                placeholder="DD/MM/AAAA"
                              />
                            </FormField>
                          </div>
                          <div>
                            <FormField label="Telefone / WhatsApp" badge="{{telefone}}">
                              <Input
                                type="text"
                                value={tags.telefone}
                                onChange={(e) => handleDirectTagEdit('telefone', e.target.value)}
                                placeholder="(48) 99999-9999"
                              />
                            </FormField>
                          </div>
                          <div>
                            <FormField label="E-mail" badge="{{email}}">
                              <Input
                                type="email"
                                value={tags.email}
                                onChange={(e) => handleDirectTagEdit('email', e.target.value)}
                                placeholder="paciente@exemplo.com.br"
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO 2: ENDEREÇO */}
                      <div className="space-y-5 pt-6 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          2. Endereço Residencial
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                          <div className="sm:col-span-3">
                            <FormField label="Endereço Residencial (Logradouro e Número)" badge="{{endereco}}">
                              <Input
                                type="text"
                                value={tags.endereco}
                                onChange={(e) => handleDirectTagEdit('endereco', e.target.value)}
                                placeholder="Rua, número e complemento"
                              />
                            </FormField>
                          </div>
                          <div>
                            <FormField label="CEP" badge="{{cep}}">
                              <Input
                                type="text"
                                value={tags.cep}
                                onChange={(e) => handleDirectTagEdit('cep', e.target.value)}
                                placeholder="88000-000"
                                mono
                              />
                            </FormField>
                          </div>
                        </div>

                        <div>
                          <FormField label="Bairro / Cidade / UF" badge="{{bairro_cidade_uf}}">
                            <Input
                              type="text"
                              value={tags.bairro_cidade_uf}
                              onChange={(e) => handleDirectTagEdit('bairro_cidade_uf', e.target.value)}
                              placeholder="Centro / Florianópolis - SC"
                            />
                          </FormField>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 4: TODAS AS TAGS (EDIÇÃO LIVRE COM BUSCA) */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'raw_tags' && (
                  <section className="space-y-6">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">
                          Edição Direta de Variáveis Oficiais
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Altere qualquer uma das <strong>{totalTagsCount} tags</strong> livremente. A minuta atualiza em tempo real:
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => applyPlanAndTierDefaults(selectedPlanId, pricingTier)}
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                      >
                        Restaurar Padrões
                      </Button>
                    </div>

                    {/* BARRA DE PESQUISA DAS TAGS */}
                    <Input
                      inputSize="lg"
                      leftIcon={<Search className="w-4.5 h-4.5 text-slate-400" />}
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Filtrar por nome da tag ou valor (ex: nome, valor, cpf, crm, cartao)..."
                      clearable
                      onClear={() => setTagSearch('')}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(Object.keys(tags) as Array<keyof OfficialContractTagMap>)
                        .filter((tagKey) => {
                          if (!tagSearch.trim()) return true;
                          const q = tagSearch.toLowerCase();
                          return (
                            tagKey.toLowerCase().includes(q) ||
                            String(tags[tagKey]).toLowerCase().includes(q)
                          );
                        })
                        .map((tagKey) => (
                          <div
                            key={tagKey}
                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-emerald-300 transition"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                {`{{${tagKey}}}`}
                              </span>
                            </div>
                            <Input
                              value={tags[tagKey]}
                              onChange={(e) => handleDirectTagEdit(tagKey, e.target.value)}
                              inputSize="md"
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                )}

              </div>

              {/* RODAPÉ FIXO DO FORMULÁRIO COM BOTÕES AMPLOS E DESTACADOS */}
              <footer className="min-h-[96px] py-4 bg-white border-t border-slate-200 px-7 sm:px-9 flex flex-wrap items-center justify-between gap-5 shrink-0 shadow-lg z-10">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                    Total Selecionado:
                  </span>
                  <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                    <strong className="text-2xl sm:text-[26px] font-black text-emerald-800 font-mono tracking-tight">
                      R$ {tags.valor_plano}
                    </strong>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {tags.vigencia_contrato}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 flex-wrap">
                  {/* BOTÃO PARA BAIXAR O ARQUIVO WORD ORIGINAL (.DOCX) PREENCHIDO */}
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isDownloadingDocx}
                    onClick={handleDownloadDocx}
                    leftIcon={<FileDown className="w-4.5 h-4.5 text-emerald-700" />}
                    title="Baixar arquivo oficial em Word (.docx) com papel timbrado e todas as tags preenchidas"
                    className="hidden sm:inline-flex"
                  >
                    {isDownloadingDocx ? 'Gerando Word...' : 'Baixar .DOCX Oficial'}
                  </Button>

                  {(!tags.cpf || !tags.nome) && (
                    <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{!tags.nome ? 'Nome pendente' : 'CPF pendente'} na Aba 3</span>
                    </div>
                  )}

                  {activeTab === 'programs' && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={() => setActiveTab('financial')}
                      rightIcon={<ArrowRight className="w-4.5 h-4.5" />}
                    >
                      Avançar para Valores
                    </Button>
                  )}

                  {activeTab === 'financial' && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => setActiveTab('programs')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={() => setActiveTab('patient')}
                        rightIcon={<ArrowRight className="w-4.5 h-4.5" />}
                      >
                        Avançar para Paciente
                      </Button>
                    </>
                  )}

                  {(activeTab === 'patient' || activeTab === 'raw_tags') && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => setActiveTab(activeTab === 'patient' ? 'financial' : 'patient')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={isGeneratingPdf}
                        isLoading={isGeneratingPdf}
                        onClick={handleProceedToSignaturePositioner}
                        rightIcon={<ArrowRight className="w-4.5 h-4.5" />}
                      >
                        {isGeneratingPdf
                          ? 'Gerando PDF do Contrato...'
                          : 'Confirmar Dados e Posicionar Assinaturas'}
                      </Button>
                    </>
                  )}
                </div>
              </footer>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* COLUNA DIREITA: VISUALIZADOR DO CONTRATO ESTILO FOLHA OFICIAL */}
            {/* -------------------------------------------------------------- */}
            {showPreview && (
              <div
                className="flex flex-col min-h-0 h-full bg-slate-100/80 border-l border-slate-200"
                style={{
                  width: '45%',
                  flexShrink: 0,
                }}
              >
                {/* TOOLBAR DA PRÉVIA */}
                <div className="min-h-[76px] py-3.5 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Minuta Oficial do Contrato
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Visualização em tempo real sincronizada
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Toggle formatado vs raw */}
                    <button
                      type="button"
                      onClick={() => setPreviewMode(previewMode === 'formatted' ? 'raw' : 'formatted')}
                      className="h-10 flex items-center gap-2 px-4 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition cursor-pointer active:scale-95"
                      title="Alternar entre visualização formatada e texto simples"
                    >
                      {previewMode === 'formatted' ? (
                        <>
                          <Eye className="w-4 h-4 text-slate-500" />
                          <span>Texto Puro</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>Formatado</span>
                        </>
                      )}
                    </button>

                    {/* Copiar texto */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(renderedContractText);
                        setCopiedContract(true);
                        setTimeout(() => setCopiedContract(false), 2000);
                      }}
                      className="h-10 flex items-center gap-2 px-4 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Copiar texto da minuta para a área de transferência"
                    >
                      {copiedContract ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Baixar docx */}
                    <button
                      type="button"
                      disabled={isDownloadingDocx}
                      onClick={handleDownloadDocx}
                      className="h-10 flex items-center gap-2 px-4 rounded-xl text-xs sm:text-[13px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Baixar arquivo Word com papel timbrado oficial preenchido"
                    >
                      <FileDown className="w-4 h-4 text-emerald-700" />
                      <span>{isDownloadingDocx ? 'Baixando...' : '.DOCX'}</span>
                    </button>

                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                      {totalTagsCount} Tags
                    </span>
                  </div>
                </div>

                {/* FOLHA DO CONTRATO ESTILO A4 EXECUTIVO */}
                <div className="flex-1 overflow-y-auto p-7 sm:p-10 flex justify-center items-start bg-slate-100/70">
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl p-9 sm:p-12 max-w-2xl w-full text-slate-900 select-text my-2 relative"
                    style={{
                      boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    {previewMode === 'formatted' ? (
                      <FormattedContractPreview text={renderedContractText} />
                    ) : (
                      <div className="text-xs leading-[1.75] font-serif whitespace-pre-wrap">
                        <div className="border-b border-slate-200 pb-5 mb-7 text-center font-sans">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-900">
                            Dra. Ana Carla Morong
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Medicina de Precisão & Longevidade Saudável • Florianópolis / SC
                          </p>
                        </div>
                        {renderedContractText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* PASSO 2: POSICIONADOR DE ASSINATURAS NO PDF */}
        {/* ==================================================================== */}
        {modalStep === 'position_signatures' && generatedPdfBase64 && (
          <div className="flex-1 overflow-hidden relative bg-slate-100 flex flex-col min-h-0 h-full">
            {isSavingDocument && (
              <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-base font-bold text-white">
                  Gravando contrato e gerando trilha de auditoria inviolável...
                </p>
                <p className="text-xs text-emerald-200 mt-1">
                  Integrando signatários no Cloudflare D1
                </p>
              </div>
            )}
            <WebPdfSignaturePositioner
              pdfUrlOrBase64={generatedPdfBase64}
              documentTitle={`Contrato ${currentPlanMeta.name} — ${tags.nome}`}
              signers={signers}
              initialFields={initialSignatureFields}
              onLaunchInPersonMode={async (positionedFields) => {
                await handleSaveAndDispatch(positionedFields, 'in_person');
              }}
              onDispatchRemoteLinks={async (positionedFields) => {
                await handleSaveAndDispatch(positionedFields, 'remote');
              }}
            />
          </div>
        )}

        {/* ==================================================================== */}
        {/* PASSO 3: SUCESSO E DISPARO DE LINKS DE ASSINATURA */}
        {/* ==================================================================== */}
        {modalStep === 'links_generated' && createdDocInfo && (
          <div className="flex-1 overflow-y-auto p-8 sm:p-12 flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2.5">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Contrato Criado e Pronto para Assinatura!
              </h3>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm text-slate-500">Código de Autenticação Pública:</span>
                <Badge variant="emerald" size="lg">
                  {createdDocInfo.verificationCode}
                </Badge>
              </div>
            </div>

            {/* CARDS DOS SIGNATÁRIOS */}
            <div className="w-full space-y-5 text-left">
              {createdDocInfo.signers.map((signer) => {
                const isPatient = signer.role === 'PACIENTE';
                return (
                  <div
                    key={signer.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3.5 h-3.5 rounded-full ${
                            isPatient ? 'bg-sky-500' : 'bg-emerald-600'
                          }`}
                        />
                        <span className="text-base font-bold text-slate-900">
                          {signer.fullName}
                        </span>
                        <Badge variant={isPatient ? 'sky' : 'emerald'} size="md">
                          {signer.role}
                        </Badge>
                      </div>
                      <Badge variant="amber" size="md" dot>
                        Aguardando Assinatura
                      </Badge>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs sm:text-[13px] font-mono text-slate-700">
                      <span className="truncate pr-2 font-medium">{signer.signUrl}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(signer.signUrl, signer.id)}
                        leftIcon={
                          copiedToken === signer.id ? (
                            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedToken === signer.id ? 'Copiado!' : 'Copiar Link'}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-3.5 pt-1">
                      <a
                        href={signer.signUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button
                          type="button"
                          variant={isPatient ? 'primary' : 'success'}
                          size="md"
                          leftIcon={<TabletSmartphone className="w-4.5 h-4.5" />}
                        >
                          {isPatient
                            ? 'Assinar no Tablet / Consultório Agora'
                            : 'Assinar como Médica Agora'}
                        </Button>
                      </a>

                      {isPatient && tags.telefone && (
                        <a
                          href={`https://wa.me/55${tags.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${tags.nome}, segue o link seguro para assinatura eletrônica do seu Contrato de Acompanhamento Saúde 360® com a Dra. Ana Carla Morong: ${signer.signUrl}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="md"
                            leftIcon={<Send className="w-4.5 h-4.5 text-emerald-600" />}
                          >
                            Enviar para WhatsApp do Paciente
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onClose}
              >
                Concluir e Retornar ao Prontuário
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
