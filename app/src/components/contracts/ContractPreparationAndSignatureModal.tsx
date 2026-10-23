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
      const { pdfBase64, pageCount } = await generateContractPdfBase64(renderedContractText);
      setGeneratedPdfBase64(pdfBase64);

      // Posicionamento Automático:
      // Rubricas nas páginas 1 até pageCount - 1 (no rodapé inferior)
      const autoFields: SignatureFieldPosition[] = [];
      for (let p = 1; p < pageCount; p++) {
        autoFields.push({
          id: crypto.randomUUID(),
          signer_id: 'signer-patient',
          field_type: 'initials',
          page: p,
          x_percent: 68,
          y_percent: 91,
          width_percent: 13,
          height_percent: 5,
        });
        autoFields.push({
          id: crypto.randomUUID(),
          signer_id: 'signer-dra-ana',
          field_type: 'initials',
          page: p,
          x_percent: 83,
          y_percent: 91,
          width_percent: 13,
          height_percent: 5,
        });
      }

      // Assinatura da Médica e do Paciente na última página (sobre as linhas de assinatura centralizadas)
      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-dra-ana',
        field_type: 'signature',
        page: pageCount,
        x_percent: 28,
        y_percent: 12,
        width_percent: 44,
        height_percent: 7,
      });

      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-patient',
        field_type: 'signature',
        page: pageCount,
        x_percent: 28,
        y_percent: 27,
        width_percent: 44,
        height_percent: 7,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="bg-white rounded-2xl w-full max-w-[1520px] h-[92vh] max-h-[960px] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        {/* ==================================================================== */}
        {/* TOPBAR ELEGANTE (DESIGN SYSTEM OFICIAL DRA. ANA MORONG) */}
        {/* ==================================================================== */}
        <header className="h-18 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-xs">
              <FileText className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Estúdio de Contratos — Jornada Saúde 360®
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Modelo Oficial Dra. Ana Morong
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Paciente: <strong className="text-slate-800 font-bold">{tags.nome || 'Não informado'}</strong>
                {tags.cpf ? ` • CPF: ${tags.cpf}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ETAPAS STEPPER INTERATIVO */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (modalStep === 'position_signatures') setModalStep('prepare_tags');
                }}
                disabled={modalStep === 'prepare_tags' || modalStep === 'links_generated'}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  modalStep === 'prepare_tags'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/60'
                    : modalStep === 'position_signatures'
                    ? 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60 cursor-pointer'
                    : 'text-slate-400 opacity-60 cursor-default'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    modalStep === 'prepare_tags'
                      ? 'bg-emerald-700 text-white'
                      : modalStep === 'position_signatures' || modalStep === 'links_generated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {modalStep !== 'prepare_tags' ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    '1'
                  )}
                </span>
                <span>1. Parâmetros & Tags</span>
              </button>

              <div className="w-3 h-0.5 bg-slate-300 rounded-full" />

              <button
                type="button"
                disabled={!generatedPdfBase64 || modalStep === 'links_generated'}
                onClick={() => {
                  if (generatedPdfBase64 && modalStep === 'prepare_tags') {
                    setModalStep('position_signatures');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  modalStep === 'position_signatures'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/60'
                    : generatedPdfBase64 && modalStep !== 'links_generated'
                    ? 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60 cursor-pointer'
                    : 'text-slate-400 opacity-60 cursor-default'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    modalStep === 'position_signatures'
                      ? 'bg-emerald-700 text-white'
                      : modalStep === 'links_generated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {modalStep === 'links_generated' ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    '2'
                  )}
                </span>
                <span>2. Assinaturas</span>
              </button>

              <div className="w-3 h-0.5 bg-slate-300 rounded-full" />

              <div
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  modalStep === 'links_generated'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold border border-slate-200/60'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
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
                className="hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer active:scale-95 shadow-xs"
              >
                {showPreview ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-slate-500" />
                    Ocultar Prévia
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-emerald-700" />
                    Exibir Prévia Lado a Lado
                  </>
                )}
              </button>
            )}

            {modalStep === 'position_signatures' && (
              <button
                type="button"
                onClick={() => setModalStep('prepare_tags')}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-95 text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer"
              >
                ← Voltar para Edição
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ALERTA DE ERRO */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-8 py-3 text-xs text-rose-800 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 font-bold hover:underline text-xs cursor-pointer"
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
                width: showPreview ? '54%' : '100%',
                flexShrink: 0,
              }}
            >
              {/* SUB-ABAS MODERNAS (ESTILO SEGMENTED CONTROL) */}
              <div className="px-6 sm:px-8 pt-4 pb-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <SegmentedControl
                  activeId={activeTab}
                  onChange={(tab) => setActiveTab(tab as any)}
                  size="md"
                  items={[
                    {
                      id: 'programs',
                      label: '1. Programa 360®',
                      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
                      badge: currentPlanMeta.name.split(' ')[0],
                    },
                    {
                      id: 'financial',
                      label: '2. Escada & Valores',
                      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
                      badge: `R$ ${tags.valor_plano}`,
                    },
                    {
                      id: 'patient',
                      label: '3. Paciente & Médica',
                      icon: <User className="w-4 h-4 text-slate-500" />,
                      badge: !tags.cpf || !tags.nome ? 'Pendente' : '✓',
                    },
                    {
                      id: 'raw_tags',
                      label: '4. Tags',
                      icon: <SlidersHorizontal className="w-4 h-4 text-slate-500" />,
                      badge: '33',
                    },
                  ]}
                />
              </div>

              {/* CONTEÚDO ROLÁVEL COM ESPAÇAMENTO RESPIRÁVEL */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 bg-slate-50/40">
                
                {/* ---------------------------------------------------------- */}
                {/* ABA 1: PROGRAMA & ESCADA DE VALOR */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'programs' && (
                  <>
                    {/* SELEÇÃO DO PROGRAMA SAÚDE 360® */}
                    <section className="space-y-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-700" />
                          Escolha o Programa da Jornada Saúde 360® (Cláusula II)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Selecione um programa para aplicar automaticamente os escopos clínicos e matriz de valores:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {(Object.keys(SAUDE_360_CATALOG) as Saude360PlanId[]).map((planKey) => {
                          const item = SAUDE_360_CATALOG[planKey];
                          const isSelected = selectedPlanId === planKey;
                          return (
                            <div
                              key={planKey}
                              onClick={() => applyPlanAndTierDefaults(planKey, 'IDEAL_AVISTA')}
                              className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                                isSelected
                                  ? 'bg-emerald-50/70 border-emerald-600 shadow-md ring-4 ring-emerald-600/10'
                                  : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div>
                                    <span
                                      className={`text-sm font-extrabold tracking-tight block ${
                                        isSelected ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md mt-1">
                                      {item.durationLabel}
                                    </span>
                                  </div>
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'border-2 border-slate-300 bg-white group-hover:border-emerald-400'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                                  {item.subtitle}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                                <span className="text-[11px] text-slate-500 font-medium">Ideal À Vista:</span>
                                <span className="font-extrabold text-emerald-800 font-mono text-sm sm:text-base">
                                  R$ {formatMoneyBRL(item.pricing.idealCash)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Resumo da Estrutura Clínica */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Estrutura Clínica Prevista — {currentPlanMeta.name}:
                          </p>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {currentPlanMeta.durationLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {currentPlanMeta.stagesSummary.map((st, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{st}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 text-xs text-slate-500 border-t border-slate-100 flex flex-wrap gap-4 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span><strong>Cronograma:</strong> {currentPlanMeta.consultationsSchedule}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 2: ESCADA DE VALOR & CONDIÇÕES COMERCIAIS */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'financial' && (
                  <>
                    {/* ESCADA DE VALOR (PRESETS OFICIAIS DO NOTEBOOK) */}
                    <section className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-700" />
                          Tabela Comercial Oficial (Escada de Valor Dra. Ana)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Selecione o tier comercial para calcular parcelas e valor por extenso:
                        </p>
                      </div>

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {/* IDEAL À VISTA */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_AVISTA')}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[110px] ${
                            pricingTier === 'IDEAL_AVISTA'
                              ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-700 shadow-md ring-4 ring-emerald-600/20'
                              : 'bg-white hover:bg-emerald-50/20 hover:border-emerald-400 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block w-fit ${
                              pricingTier === 'IDEAL_AVISTA'
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            Ideal À Vista
                          </span>
                          <span className="text-base sm:text-lg font-black mt-1.5 font-mono">
                            R$ {formatMoneyBRL(currentPlanMeta.pricing.idealCash)}
                          </span>
                          <span
                            className={`text-xs mt-0.5 font-medium ${
                              pricingTier === 'IDEAL_AVISTA' ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            PIX / TED
                          </span>
                        </button>

                        {/* IDEAL 12X */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_12X')}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[110px] ${
                            pricingTier === 'IDEAL_12X'
                              ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-700 shadow-md ring-4 ring-emerald-600/20'
                              : 'bg-white hover:bg-emerald-50/20 hover:border-emerald-400 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block w-fit ${
                              pricingTier === 'IDEAL_12X'
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            Ideal 12x Cartão
                          </span>
                          <span className="text-base sm:text-lg font-black mt-1.5 font-mono">
                            12x R$ {formatMoneyBRL(currentPlanMeta.pricing.idealInstallment12x)}
                          </span>
                          <span
                            className={`text-xs mt-0.5 font-medium ${
                              pricingTier === 'IDEAL_12X' ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.idealTotal12x)}
                          </span>
                        </button>

                        {/* MÍNIMO À VISTA */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_AVISTA')}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[110px] ${
                            pricingTier === 'MINIMO_AVISTA'
                              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-md ring-4 ring-slate-800/20'
                              : 'bg-white hover:bg-slate-100 hover:border-slate-400 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block w-fit ${
                              pricingTier === 'MINIMO_AVISTA'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            Mínimo À Vista
                          </span>
                          <span className="text-base sm:text-lg font-black mt-1.5 font-mono">
                            R$ {formatMoneyBRL(currentPlanMeta.pricing.minCash)}
                          </span>
                          <span
                            className={`text-xs mt-0.5 font-medium ${
                              pricingTier === 'MINIMO_AVISTA' ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            Piso Negociado
                          </span>
                        </button>

                        {/* MÍNIMO 12X */}
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_12X')}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[110px] ${
                            pricingTier === 'MINIMO_12X'
                              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-md ring-4 ring-slate-800/20'
                              : 'bg-white hover:bg-slate-100 hover:border-slate-400 border-slate-200 text-slate-800 hover:-translate-y-0.5 active:scale-[0.98]'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block w-fit ${
                              pricingTier === 'MINIMO_12X'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            Mínimo 12x
                          </span>
                          <span className="text-base sm:text-lg font-black mt-1.5 font-mono">
                            12x R$ {formatMoneyBRL(currentPlanMeta.pricing.minInstallment12x)}
                          </span>
                          <span
                            className={`text-xs mt-0.5 font-medium ${
                              pricingTier === 'MINIMO_12X' ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.minTotal12x)}
                          </span>
                        </button>
                      </div>

                      {/* Notificação amigável de arredondamento comercial */}
                      {pricingRoundingDifference !== 0 && (
                        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            Arredondamento do plano: {installmentsCount}x de R${' '}
                            {formatMoneyBRL(installmentNumericValue)} = R${' '}
                            {formatMoneyBRL(installmentsCount * installmentNumericValue)} (Total nominal: R${' '}
                            {formatMoneyBRL(totalNumericValue)}).
                          </span>
                        </div>
                      )}

                      {/* AJUSTE MANUAL DE VALORES E MODALIDADES */}
                      <div className="form-grid-3 pt-2">
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
                          <div className="grid grid-cols-2 gap-2.5">
                            <FormField label="Parcelas">
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
                            <FormField label="Valor Parcela">
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
                      </div>

                      {paymentModality === 'PIX_PARCELADO' && (
                        <div className="w-56">
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

                      <div>
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
                    </section>
                  </>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 2: DADOS DO PACIENTE & MÉDICA */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'patient' && (
                  <>
                    {/* DADOS DA MÉDICA */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Médica Contratada
                          </p>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                            Dra. Ana Carla Morong
                          </h3>
                          <p className="text-xs text-emerald-800 font-medium">
                            CNPJ: 54.811.772/0001-32 • Florianópolis - SC
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          CRM/SC:
                        </label>
                        <Input
                          value={crmDra}
                          onChange={(e) => handleCrmChange(e.target.value)}
                          placeholder="Ex: 28412"
                          mono
                          inputSize="sm"
                          className="w-28"
                        />
                      </div>
                    </div>

                    {/* DADOS CADASTRAIS DO PACIENTE */}
                    <section className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-700" />
                        Dados Pessoais do Contratante (Paciente)
                      </h4>
                      <div className="form-grid-2">
                        <FormField label="Nome Completo" badge="{{nome}}" required>
                          <Input
                            type="text"
                            value={tags.nome}
                            onChange={(e) => handleDirectTagEdit('nome', e.target.value)}
                          />
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="CPF" badge="{{cpf}}" required>
                            <Input
                              type="text"
                              value={tags.cpf}
                              onChange={(e) => handleDirectTagEdit('cpf', e.target.value)}
                              placeholder="000.000.000-00"
                              mono
                            />
                          </FormField>
                          <FormField label="Nascimento" badge="{{data_nascimento}}">
                            <Input
                              type="text"
                              value={tags.data_nascimento}
                              onChange={(e) => handleDirectTagEdit('data_nascimento', e.target.value)}
                              placeholder="DD/MM/AAAA"
                            />
                          </FormField>
                        </div>

                        <FormField label="Endereço Residencial" badge="{{endereco}}">
                          <Input
                            type="text"
                            value={tags.endereco}
                            onChange={(e) => handleDirectTagEdit('endereco', e.target.value)}
                            placeholder="Rua, número e complemento"
                          />
                        </FormField>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="col-span-2">
                            <FormField label="Bairro / Cidade / UF" badge="{{bairro_cidade_uf}}">
                              <Input
                                type="text"
                                value={tags.bairro_cidade_uf}
                                onChange={(e) => handleDirectTagEdit('bairro_cidade_uf', e.target.value)}
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

                        <FormField label="Telefone / WhatsApp" badge="{{telefone}}">
                          <Input
                            type="text"
                            value={tags.telefone}
                            onChange={(e) => handleDirectTagEdit('telefone', e.target.value)}
                            placeholder="(48) 99999-9999"
                          />
                        </FormField>

                        <FormField label="E-mail" badge="{{email}}">
                          <Input
                            type="email"
                            value={tags.email}
                            onChange={(e) => handleDirectTagEdit('email', e.target.value)}
                            placeholder="paciente@exemplo.com.br"
                          />
                        </FormField>
                      </div>
                    </section>
                  </>
                )}

                {/* ---------------------------------------------------------- */}
                {/* ABA 3: TODAS AS 33 TAGS (EDIÇÃO LIVRE COM BUSCA) */}
                {/* ---------------------------------------------------------- */}
                {activeTab === 'raw_tags' && (
                  <section className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Edição Direta de Variáveis Oficiais
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Altere qualquer uma das <strong>33 tags</strong> livremente. A minuta atualiza em tempo real:
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => applyPlanAndTierDefaults(selectedPlanId, pricingTier)}
                          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
                        </button>
                      </div>
                    </div>

                    {/* BARRA DE PESQUISA DAS TAGS */}
                    <Input
                      leftIcon={<Search className="w-4 h-4" />}
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Filtrar por nome da tag ou valor (ex: nome, valor, cpf, crm, cartao)..."
                      clearable
                      onClear={() => setTagSearch('')}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                {`{{${tagKey}}}`}
                              </span>
                            </div>
                            <Input
                              value={tags[tagKey]}
                              onChange={(e) => handleDirectTagEdit(tagKey, e.target.value)}
                              inputSize="sm"
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                )}

              </div>

              {/* RODAPÉ FIXO DO FORMULÁRIO COM BOTÃO PRIMÁRIO DESTACADO */}
              <footer className="h-22 bg-white border-t border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-lg z-10">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Total Selecionado:
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <strong className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
                      R$ {tags.valor_plano}
                    </strong>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {tags.vigencia_contrato}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* BOTÃO PARA BAIXAR O ARQUIVO WORD ORIGINAL (.DOCX) PREENCHIDO */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDownloadingDocx}
                    onClick={handleDownloadDocx}
                    leftIcon={<FileDown className="w-4 h-4 text-emerald-700" />}
                    title="Baixar arquivo oficial em Word (.docx) com papel timbrado e todas as tags preenchidas"
                    className="hidden sm:inline-flex"
                  >
                    {isDownloadingDocx ? 'Gerando Word...' : 'Baixar .DOCX Oficial'}
                  </Button>

                  {(!tags.cpf || !tags.nome) && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{!tags.nome ? 'Nome pendente' : 'CPF pendente'} na Aba 3</span>
                    </div>
                  )}

                  {activeTab === 'programs' && (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => setActiveTab('financial')}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
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
                      >
                        ← Voltar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={() => setActiveTab('patient')}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
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
                      >
                        ← Voltar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={isGeneratingPdf}
                        isLoading={isGeneratingPdf}
                        onClick={handleProceedToSignaturePositioner}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
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
                className="flex flex-col min-h-0 h-full bg-slate-100/90 border-l border-slate-200"
                style={{
                  width: '46%',
                  flexShrink: 0,
                }}
              >
                <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Minuta Oficial do Contrato (Visualização em Tempo Real)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDownloadingDocx}
                      onClick={handleDownloadDocx}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition cursor-pointer"
                      title="Baixar arquivo Word com papel timbrado oficial preenchido"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                      {isDownloadingDocx ? 'Baixando...' : 'Baixar .DOCX'}
                    </button>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                      35 Tags Ativas
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex justify-center items-start bg-slate-100/80">
                  {/* FOLHA DE CONTRATO A4 COM SOMBRA PROFUNDA E TIMBRADO */}
                  <div
                    className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 max-w-xl w-full text-slate-900 text-[11px] leading-relaxed font-serif whitespace-pre-wrap select-text shadow-2xl my-2"
                    style={{
                      boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    {/* CABEÇALHO TIMBRADO DA CLÍNICA NO TOPO DA FOLHA */}
                    <div className="border-b border-slate-200 pb-4 mb-6 text-center font-sans">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-900">
                        Dra. Ana Carla Morong
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Medicina de Precisão & Longevidade Saudável • Florianópolis / SC
                      </p>
                    </div>

                    {renderedContractText}
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
          <div className="flex-1 overflow-y-auto p-8 sm:p-10 flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-7">
            <div className="w-18 h-18 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Contrato Criado e Pronto para Assinatura!
              </h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-slate-500">Código de Autenticação Pública:</span>
                <Badge variant="emerald" size="md">
                  {createdDocInfo.verificationCode}
                </Badge>
              </div>
            </div>

            {/* CARDS DOS SIGNATÁRIOS */}
            <div className="w-full space-y-4 text-left">
              {createdDocInfo.signers.map((signer) => {
                const isPatient = signer.role === 'PACIENTE';
                return (
                  <div
                    key={signer.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3.5 h-3.5 rounded-full ${
                            isPatient ? 'bg-sky-500' : 'bg-emerald-600'
                          }`}
                        />
                        <span className="text-sm font-bold text-slate-900">
                          {signer.fullName}
                        </span>
                        <Badge variant={isPatient ? 'sky' : 'emerald'} size="sm">
                          {signer.role}
                        </Badge>
                      </div>
                      <Badge variant="amber" size="sm" dot>
                        Aguardando Assinatura
                      </Badge>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-slate-700">
                      <span className="truncate pr-3 font-medium">{signer.signUrl}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => copyToClipboard(signer.signUrl, signer.id)}
                        leftIcon={
                          copiedToken === signer.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        {copiedToken === signer.id ? 'Copiado!' : 'Copiar Link'}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <a
                        href={signer.signUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button
                          type="button"
                          variant={isPatient ? 'primary' : 'success'}
                          size="sm"
                          leftIcon={<TabletSmartphone className="w-4 h-4" />}
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
                            size="sm"
                            leftIcon={<Send className="w-4 h-4 text-emerald-600" />}
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

            <div className="pt-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
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
