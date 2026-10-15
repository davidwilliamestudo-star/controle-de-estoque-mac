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
  ExternalLink,
  AlertCircle,
  Stethoscope,
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
import {
  WebPdfSignaturePositioner,
  SignatureFieldPosition,
  WebSignerConfig,
} from '@/components/signatures/WebPdfSignaturePositioner';
import {
  SignatureDocumentsService,
  CreatedDocumentSignerResult,
} from '@/services/contracts/signatureDocuments.service';

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
  const [activeSubTab, setActiveSubTab] = useState<'guided' | 'raw_tags'>('guided');

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
  const [isSavingDocument, setIsSavingDocument] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resultado do documento criado (Passo 3)
  const [createdDocInfo, setCreatedDocInfo] = useState<{
    documentId: string;
    verificationCode: string;
    signers: CreatedDocumentSignerResult[];
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
        colorHex: '#10b981',
      },
    ],
    [tags.nome, tags.cpf, tags.email, tags.telefone, patient]
  );

  // Checagem de discrepância de arredondamento
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
      valor_parcela_cartao: mod === 'CARTAO' ? formattedInst : '---',
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

      // Assinatura da Médica e do Paciente na última página (sobre as linhas de assinatura)
      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-dra-ana',
        field_type: 'signature',
        page: pageCount,
        x_percent: 12,
        y_percent: 74,
        width_percent: 36,
        height_percent: 9,
      });

      autoFields.push({
        id: crypto.randomUUID(),
        signer_id: 'signer-patient',
        field_type: 'signature',
        page: pageCount,
        x_percent: 52,
        y_percent: 74,
        width_percent: 36,
        height_percent: 9,
      });

      setInitialSignatureFields(autoFields);
      setModalStep('position_signatures');
    } catch (err: any) {
      setErrorMessage(`Erro ao gerar PDF do contrato: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-[96vw] h-[94vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* TOPBAR DO MODAL */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Estúdio de Preparação e Assinatura de Contrato — Jornada Saúde 360®
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  {modalStep === 'prepare_tags' && 'Passo 1: Configurar Plano e Tags'}
                  {modalStep === 'position_signatures' && 'Passo 2: Posicionar Assinaturas'}
                  {modalStep === 'links_generated' && 'Passo 3: Links Prontos para Assinatura'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Paciente: <strong className="text-slate-200">{tags.nome}</strong> • CPF: {tags.cpf}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modalStep === 'position_signatures' && (
              <button
                type="button"
                onClick={() => setModalStep('prepare_tags')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                ← Voltar para Edição de Tags
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white transition"
              title="Fechar Janela"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ALERTA DE ERRO */}
        {errorMessage && (
          <div className="bg-rose-950/80 border-b border-rose-800 px-5 py-2 text-xs text-rose-200 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* PASSO 1: CONFIGURAÇÃO DO PLANO + EDIÇÃO DE TAGS + PREVIEW AO VIVO */}
        {modalStep === 'prepare_tags' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* COLUNA ESQUERDA: CONFIGURADOR GUIADO OU EDIÇÃO DIRETA DE TODAS AS TAGS */}
            <div className="w-full lg:w-[55%] border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950">
              {/* Sub-Abas: Configuração Guiada (Escada de Valor) vs. Editor Direto de Tags */}
              <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 pt-3 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('guided')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeSubTab === 'guided'
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  1. Seleção de Programa & Valores Padrão (Saúde 360®)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('raw_tags')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeSubTab === 'raw_tags'
                      ? 'border-sky-400 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  2. Editar Todas as Tags Manualmente (33 Tags)
                </button>
              </div>

              {/* CONTEÚDO ROLÁVEL DA ESQUERDA */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {activeSubTab === 'guided' ? (
                  <>
                    {/* BLOCO CRM DA MÉDICA */}
                    <section className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Médica Contratada</p>
                          <p className="text-[11px] text-slate-400">Dra. Ana Carla Morong</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-300">CRM/SC:</label>
                        <input
                          type="text"
                          value={crmDra}
                          onChange={(e) => handleCrmChange(e.target.value)}
                          placeholder="Ex: 28412"
                          className="w-28 bg-slate-900 border border-emerald-600/50 rounded px-2.5 py-1 text-xs text-emerald-300 font-mono"
                        />
                      </div>
                    </section>

                    {/* BLOCO 1: ESCOLHA DO PROGRAMA DA JORNADA SAÚDE 360® */}
                    <section className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Escolha o Programa de Acompanhamento (Cláusula II)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {(Object.keys(SAUDE_360_CATALOG) as Saude360PlanId[]).map(
                          (planKey) => {
                            const item = SAUDE_360_CATALOG[planKey];
                            const isSelected = selectedPlanId === planKey;
                            return (
                              <button
                                key={planKey}
                                type="button"
                                onClick={() =>
                                  applyPlanAndTierDefaults(planKey, 'IDEAL_AVISTA')
                                }
                                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/40'
                                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                                      R$ {formatMoneyBRL(item.pricing.idealCash)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    {item.subtitle}
                                  </p>
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>

                      {/* Resumo das Etapas do Programa (Extraído do Notebook) */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                        <p className="text-xs font-bold text-slate-200">
                          Estrutura Clínica do {currentPlanMeta.name}:
                        </p>
                        <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                          {currentPlanMeta.stagesSummary.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    {/* BLOCO 2: PRESETS DA ESCADA DE VALOR (IDEAL VS MÍNIMO / À VISTA VS 12X) */}
                    <section className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        Tabela Comercial Padrão (Escada de Valor do Notebook)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_AVISTA')
                          }
                          className={`p-2.5 rounded-lg border text-left transition ${
                            pricingTier === 'IDEAL_AVISTA'
                              ? 'bg-emerald-900/40 border-emerald-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <p className="text-[10px] uppercase text-emerald-400 font-bold">
                            Ideal À Vista
                          </p>
                          <p className="text-xs font-bold mt-0.5">
                            R$ {formatMoneyBRL(currentPlanMeta.pricing.idealCash)}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPlanAndTierDefaults(selectedPlanId, 'IDEAL_12X')
                          }
                          className={`p-2.5 rounded-lg border text-left transition ${
                            pricingTier === 'IDEAL_12X'
                              ? 'bg-emerald-900/40 border-emerald-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <p className="text-[10px] uppercase text-emerald-400 font-bold">
                            Ideal 12x Cartão
                          </p>
                          <p className="text-xs font-bold mt-0.5">
                            12x R$ {formatMoneyBRL(currentPlanMeta.pricing.idealInstallment12x)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.idealTotal12x)}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_AVISTA')
                          }
                          className={`p-2.5 rounded-lg border text-left transition ${
                            pricingTier === 'MINIMO_AVISTA'
                              ? 'bg-sky-900/40 border-sky-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <p className="text-[10px] uppercase text-sky-400 font-bold">
                            Mínimo À Vista
                          </p>
                          <p className="text-xs font-bold mt-0.5">
                            R$ {formatMoneyBRL(currentPlanMeta.pricing.minCash)}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyPlanAndTierDefaults(selectedPlanId, 'MINIMO_12X')
                          }
                          className={`p-2.5 rounded-lg border text-left transition ${
                            pricingTier === 'MINIMO_12X'
                              ? 'bg-sky-900/40 border-sky-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <p className="text-[10px] uppercase text-sky-400 font-bold">
                            Mínimo 12x Cartão
                          </p>
                          <p className="text-xs font-bold mt-0.5">
                            12x R$ {formatMoneyBRL(currentPlanMeta.pricing.minInstallment12x)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Total: R$ {formatMoneyBRL(currentPlanMeta.pricing.minTotal12x)}
                          </p>
                        </button>
                      </div>

                      {/* Notificação amigável de arredondamento comercial */}
                      {pricingRoundingDifference !== 0 && (
                        <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-2 text-[11px] text-amber-300 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Diferença de arredondamento comercial:{' '}
                            {installmentsCount}x de R$ {formatMoneyBRL(installmentNumericValue)} = R${' '}
                            {formatMoneyBRL(installmentsCount * installmentNumericValue)} (Total tabelado:{' '}
                            R$ {formatMoneyBRL(totalNumericValue)}).
                          </span>
                        </div>
                      )}

                      {/* Ajuste Fino de Valores e Modalidade */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Modalidade de Pagamento
                          </label>
                          <select
                            value={paymentModality}
                            onChange={(e) =>
                              handleManualFinancialChange({
                                modality: e.target.value as PaymentModality,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                          >
                            <option value="AVISTA">À Vista (PIX / Transferência)</option>
                            <option value="CARTAO">Cartão de Crédito Parcelado</option>
                            <option value="PIX_PARCELADO">PIX Parcelado / Recorrência</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Valor Total do Contrato (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={totalNumericValue}
                            onChange={(e) =>
                              handleManualFinancialChange({
                                total: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                          />
                        </div>

                        {paymentModality !== 'AVISTA' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Nº Parcelas
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={24}
                                value={installmentsCount}
                                onChange={(e) =>
                                  handleManualFinancialChange({
                                    count: parseInt(e.target.value, 10) || 1,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Valor Parcela (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={installmentNumericValue}
                                onChange={(e) =>
                                  handleManualFinancialChange({
                                    installment: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {paymentModality === 'PIX_PARCELADO' && (
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Dia de Vencimento Mensal (Tag {'{{dia_vencimento_pix}}'})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={pixDueDay}
                            onChange={(e) =>
                              handleManualFinancialChange({
                                dueDay: parseInt(e.target.value, 10) || 10,
                              })
                            }
                            className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Valor por Extenso Automático (Tag {'{{valor_plano_extenso}}'} — Editável)
                        </label>
                        <input
                          type="text"
                          value={tags.valor_plano_extenso}
                          onChange={(e) =>
                            handleDirectTagEdit('valor_plano_extenso', e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-300"
                        />
                      </div>
                    </section>

                    {/* BLOCO 3: DADOS PESSOAIS DO PACIENTE (TAGS DO CABEÇALHO) */}
                    <section className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                      <label className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Dados Pessoais do Contratante (Preenchidos do Cadastro)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400">
                            Nome Completo ({'{{nome}}'})
                          </label>
                          <input
                            type="text"
                            value={tags.nome}
                            onChange={(e) => handleDirectTagEdit('nome', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400">
                              CPF ({'{{cpf}}'})
                            </label>
                            <input
                              type="text"
                              value={tags.cpf}
                              onChange={(e) => handleDirectTagEdit('cpf', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">
                              Nascimento ({'{{data_nascimento}}'})
                            </label>
                            <input
                              type="text"
                              value={tags.data_nascimento}
                              onChange={(e) =>
                                handleDirectTagEdit('data_nascimento', e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">
                            Endereço Residencial ({'{{endereco}}'})
                          </label>
                          <input
                            type="text"
                            value={tags.endereco}
                            onChange={(e) => handleDirectTagEdit('endereco', e.target.value)}
                            placeholder="Rua / Av., número, complemento"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[10px] text-slate-400">
                              Bairro / Cidade / UF ({'{{bairro_cidade_uf}}'})
                            </label>
                            <input
                              type="text"
                              value={tags.bairro_cidade_uf}
                              onChange={(e) =>
                                handleDirectTagEdit('bairro_cidade_uf', e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">
                              CEP ({'{{cep}}'})
                            </label>
                            <input
                              type="text"
                              value={tags.cep}
                              onChange={(e) => handleDirectTagEdit('cep', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">
                            Telefone / WhatsApp ({'{{telefone}}'})
                          </label>
                          <input
                            type="text"
                            value={tags.telefone}
                            onChange={(e) => handleDirectTagEdit('telefone', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">
                            E-mail ({'{{email}}'})
                          </label>
                          <input
                            type="email"
                            value={tags.email}
                            onChange={(e) => handleDirectTagEdit('email', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                          />
                        </div>
                      </div>
                    </section>
                  </>
                ) : (
                  /* ABA 2: EDITOR DIRETO DE TODAS AS 33 TAGS DO CONTRATO */
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-300">
                        Edite diretamente qualquer variável <code className="text-sky-400">{'{{tag}}'}</code> abaixo. O contrato ao lado reflete a alteração instantaneamente:
                      </p>
                      <button
                        type="button"
                        onClick={() => applyPlanAndTierDefaults(selectedPlanId, pricingTier)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão do Plano
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(Object.keys(tags) as Array<keyof OfficialContractTagMap>).map(
                        (tagKey) => (
                          <div
                            key={tagKey}
                            className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5"
                          >
                            <label className="block text-[10px] font-mono text-sky-400 mb-1">
                              {`{{${tagKey}}}`}
                            </label>
                            <input
                              type="text"
                              value={tags[tagKey]}
                              onChange={(e) =>
                                handleDirectTagEdit(tagKey, e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* RODAPÉ DE AÇÃO DO PASSO 1 */}
              <footer className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
                <div className="text-xs">
                  <span className="text-slate-400">Total Selecionado: </span>
                  <strong className="text-emerald-400 text-sm">
                    R$ {tags.valor_plano}
                  </strong>
                  <span className="text-[11px] text-slate-500 ml-2">
                    ({tags.vigencia_contrato})
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingPdf || !tags.nome || !tags.cpf}
                  onClick={handleProceedToSignaturePositioner}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
                >
                  {isGeneratingPdf ? (
                    'Gerando PDF Paginado...'
                  ) : (
                    <>
                      Confirmar Dados e Posicionar Assinaturas
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </footer>
            </div>

            {/* COLUNA DIREITA: PREVIEW AO VIVO DO CONTRATO PREENCHIDO */}
            <div className="w-full lg:w-[45%] bg-slate-900 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Preview em Tempo Real (MODELO CONTRATO FINANCEIRO DRA ANA 3)
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  100% das Tags Preenchidas
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 max-w-2xl mx-auto font-serif text-[12px] leading-relaxed whitespace-pre-wrap border border-slate-300">
                  {renderedContractText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2: POSICIONADOR DE ASSINATURAS E DISPARO (PRESENCIAL OU REMOTO) */}
        {modalStep === 'position_signatures' && generatedPdfBase64 && (
          <div className="flex-1 overflow-hidden relative">
            {isSavingDocument && (
              <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium text-white">
                  Registrando documento de assinatura no sistema...
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

        {/* PASSO 3: SUCESSO - LINKS DE ASSINATURA GERADOS */}
        {modalStep === 'links_generated' && createdDocInfo && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                Documento Registrado com Sucesso!
              </h3>
              <p className="text-xs text-slate-400">
                Código de Verificação Pública:{' '}
                <strong className="text-emerald-400 font-mono">
                  {createdDocInfo.verificationCode}
                </strong>
              </p>
            </div>

            {/* CARDS DE SIGNATÁRIOS */}
            <div className="w-full space-y-3 text-left">
              {createdDocInfo.signers.map((signer) => {
                const isPatient = signer.role === 'PACIENTE';
                return (
                  <div
                    key={signer.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isPatient ? 'bg-sky-400' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-sm font-bold text-white">
                          {signer.fullName} ({signer.role})
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        Aguardando Assinatura
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono text-slate-300 break-all">
                      <span className="truncate pr-2">{signer.signUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(signer.signUrl, signer.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs shrink-0 flex items-center gap-1 transition"
                      >
                        {copiedToken === signer.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Link
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={signer.signUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                          isPatient
                            ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        }`}
                      >
                        <TabletSmartphone className="w-3.5 h-3.5" />
                        {isPatient
                          ? 'Abrir para Paciente Assinar no Consultório / Tablet'
                          : 'Assinar como Dra. Ana Carla Morong Agora'}
                      </a>

                      {isPatient && tags.telefone && (
                        <a
                          href={`https://wa.me/55${tags.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${tags.nome}, segue o link seguro para assinatura eletrônica do seu Contrato de Acompanhamento Saúde 360® com a Dra. Ana Carla Morong: ${signer.signUrl}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3.5 rounded-lg bg-emerald-950/80 border border-emerald-700 hover:bg-emerald-900 text-emerald-300 font-medium text-xs flex items-center gap-1.5 transition"
                        >
                          <Send className="w-3.5 h-3.5" /> Enviar via WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Concluir e Voltar ao Prontuário
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
