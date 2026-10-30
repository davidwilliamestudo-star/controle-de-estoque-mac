import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Plus,
  Edit3,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  usePatientPlans,
  useActivePatientPlan,
  usePlanMutations,
} from '../hooks/usePatientPlans';
import { formatMoneyBRL } from '@/services/contracts/saude360ContractEngine.service';
import { type PlanHealth, totalPausedDays, todayISO } from '../domain/planLifecycle';

interface PatientPlanOverviewCardProps {
  patientId: string;
  patientName: string;
  patientPhone?: string | null;
  onOpenContractStudio: () => void;
}

export const PatientPlanOverviewCard: React.FC<PatientPlanOverviewCardProps> = ({
  patientId,
  patientName,
  patientPhone,
  onOpenContractStudio,
}) => {
  const { data: activePlan, isLoading } = useActivePatientPlan(patientId);
  const { data: allPlans = [] } = usePatientPlans(patientId);
  const {
    confirmPayment,
    updateProcedures,
    pausePlan,
    resumePlan,
    addFollowup,
    markLost,
  } = usePlanMutations();

  // Modais de Controle
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('Pausa médica programada');
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const [isEditSessionsModalOpen, setIsEditSessionsModalOpen] = useState(false);
  const [newSessionsTotal, setNewSessionsTotal] = useState<number>(0);
  const [editSessionsReason, setEditSessionsReason] = useState(
    'Ajuste clínico prescrito pela Dra. Ana'
  );

  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedPlanForAction, setSelectedPlanForAction] = useState<string | null>(null);
  const [followupType, setFollowupType] = useState('whatsapp');
  const [followupStatus, setFollowupStatus] = useState('contacted');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextFollowupDays, setNextFollowupDays] = useState(3);

  if (isLoading) {
    return (
      <div className="card mb-6 p-5 animate-pulse bg-slate-50 border border-slate-200">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Identifica propostas recentes abertas que não estão ativas ainda
  const pendingProposal = allPlans.find(
    (p) => p.status === 'proposed' || p.status === 'signed_pending_payment'
  );

  const handleConfirmPayment = async (planId: string) => {
    if (
      !window.confirm(
        'Confirmar recebimento do pagamento e iniciar a vigência do plano a partir de hoje?'
      )
    ) {
      return;
    }
    try {
      await confirmPayment.mutateAsync({ planId });
    } catch (err: any) {
      alert(`Erro ao ativar plano: ${err.message}`);
    }
  };

  const handleExecutePause = async () => {
    if (!activePlan) return;
    try {
      await pausePlan.mutateAsync({
        planId: activePlan.id,
        reason: pauseReason,
      });
      setIsPauseModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao pausar: ${err.message}`);
    }
  };

  const handleExecuteResume = async () => {
    if (!activePlan) return;
    try {
      await resumePlan.mutateAsync({ planId: activePlan.id });
      setIsResumeModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao retomar: ${err.message}`);
    }
  };

  const handleSaveSessionsAdjustment = async () => {
    if (!activePlan) return;
    try {
      await updateProcedures.mutateAsync({
        planId: activePlan.id,
        newTotal: newSessionsTotal,
        reason: editSessionsReason,
      });
      setIsEditSessionsModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao atualizar sessões: ${err.message}`);
    }
  };

  const handleSaveFollowup = async () => {
    const targetPlanId = selectedPlanForAction || pendingProposal?.id || activePlan?.id;
    if (!targetPlanId) return;

    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + Number(nextFollowupDays));
      const nextFollowupIso = nextDate.toISOString();

      await addFollowup.mutateAsync({
        planId: targetPlanId,
        channel: followupType as any,
        outcome: (followupStatus === 'closed' ? 'won' : 'negotiating'),
        nextContactAt: nextFollowupIso,
        notes: followupNotes,
      });
      setIsFollowupModalOpen(false);
      setFollowupNotes('');
    } catch (err: any) {
      alert(`Erro ao salvar contato: ${err.message}`);
    }
  };

  // 1. Cenário: Paciente com Plano Ativo em Vigência
  if (activePlan) {
    const { view } = activePlan;
    const isPaused = activePlan.pauses.some((p) => p.pausedTo === null);
    const healthBadge = getHealthBadge(view.health);

    return (
      <div className="card mb-6 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/40 p-5 sm:p-6 shadow-xs rounded-2xl relative overflow-hidden">
        {/* Marca d'água estética suave */}
        <div className="absolute right-[-20px] top-[-20px] w-40 h-40 rounded-full bg-emerald-100/40 pointer-events-none blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-900/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Programa Saúde 360®
              </span>
              {healthBadge}
              {isPaused && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  <PauseCircle className="w-3.5 h-3.5 text-purple-700" />
                  Plano Pausado
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activePlan.planName}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Vigência: {formatDateBR(activePlan.startDate)} até{' '}
              <strong className="text-emerald-950">{formatDateBR(activePlan.endDate)}</strong>
              {totalPausedDays(activePlan.pauses, todayISO()) > 0 && (
                <span className="text-purple-700 ml-1.5 font-semibold">
                  (+{totalPausedDays(activePlan.pauses, todayISO())} dias compensados por pausas)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isPaused ? (
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="btn btn-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 border-none shadow-xs"
              >
                <PlayCircle className="w-4 h-4" />
                Retomar Vigência
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(true)}
                className="btn btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                title="Pausar o plano durante viagens ou intercorrências"
              >
                <PauseCircle className="w-4 h-4 text-slate-600" />
                Pausar Plano
              </button>
            )}

            <button
              type="button"
              onClick={onOpenContractStudio}
              className="btn btn-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white border-none shadow-xs"
            >
              <RotateCw className="w-4 h-4" />
              Renovar / Novo Contrato
            </button>
          </div>
        </div>

        {/* Linha de Indicadores e Termômetro */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {/* Card 1: Contagem Regressiva e Progresso Temporal */}
          <div className="bg-white/90 border border-slate-200/90 rounded-xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                Tempo de Tratamento
              </span>
              <span className="font-mono text-emerald-900">
                {view.daysRemaining} dias restantes
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className={`h-full transition-all duration-500 ${
                  view.health === 'renewal_window' ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, view.progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{view.progressPercent}% decorrido</span>
              <span>Duração: {activePlan.durationMonths} meses</span>
            </div>
          </div>

          {/* Card 2: Franquia de Aplicações / Sessões Injetáveis */}
          <div className="bg-white/90 border border-slate-200/90 rounded-xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                Sessões Injetáveis
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewSessionsTotal(activePlan.includedProceduresTotal);
                  setIsEditSessionsModalOpen(true);
                }}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer underline"
                title="Ajustar total de sessões do contrato"
              >
                <Edit3 className="w-3 h-3" />
                Editar
              </button>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (activePlan.proceduresUsed /
                        Math.max(1, activePlan.includedProceduresTotal)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-medium">
              <span>
                <strong>{activePlan.proceduresUsed}</strong> de{' '}
                <strong>{activePlan.includedProceduresTotal}</strong> sessões realizadas
              </span>
              <span className="text-emerald-800 font-bold">
                {Math.max(0, activePlan.includedProceduresTotal - activePlan.proceduresUsed)}{' '}
                restantes
              </span>
            </div>
          </div>

          {/* Card 3: Financeiro & Modalidade */}
          <div className="bg-white/90 border border-slate-200/90 rounded-xl p-4 space-y-2 shadow-2xs sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Condição Comercial
              </span>
              <span className="text-emerald-900 font-black font-mono">
                R$ {formatMoneyBRL(activePlan.totalValue)}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Modalidade: <strong>{activePlan.paymentModality || 'A Combinar'}</strong>
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Plano ativo com assinatura e faturamento regularizados.</span>
            </div>
          </div>
        </div>

        {/* Alerta de Janela de Renovação Antecipada (14 dias) */}
        {view.health === 'renewal_window' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
                  Janela de Renovação Antecipada (Faltam {view.daysRemaining} dias)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Momento ideal para a Dra. Ana e a recepção apresentarem a continuidade com o
                  programa de Manutenção Saúde 360®.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenContractStudio}
              className="btn text-xs font-bold px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-lg shrink-0"
            >
              Iniciar Renovação
            </button>
          </div>
        )}

        {/* Modais de Pausa, Retomada e Ajuste de Sessões */}
        {renderModals()}
      </div>
    );
  }

  // 2. Cenário: Paciente com Proposta em Negociação ou Aguardando Pagamento
  if (pendingProposal) {
    const isSigned = pendingProposal.status === 'signed_pending_payment';

    return (
      <div className="card mb-6 border-2 border-amber-400 bg-amber-50/40 p-5 sm:p-6 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                {isSigned ? 'Assinado — Aguardando Pagamento' : 'Proposta em Negociação'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                R$ {formatMoneyBRL(pendingProposal.totalValue)}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {pendingProposal.planName} ({pendingProposal.durationMonths} Meses)
            </h3>
            <p className="text-xs text-slate-600">
              {isSigned
                ? 'O contrato já foi assinado pela paciente! Clique abaixo para confirmar a liquidação financeira e iniciar a contagem regressiva.'
                : 'Proposta gerada. Registre o contato de acompanhamento da secretária para fechamento.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedPlanForAction(pendingProposal.id);
                setIsFollowupModalOpen(true);
              }}
              className="btn btn-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              Follow-up Comercial
            </button>

            <button
              type="button"
              onClick={() => handleConfirmPayment(pendingProposal.id)}
              className="btn btn-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Pagamento & Iniciar
            </button>
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // 3. Cenário: Paciente Sem Plano Ativo Nem Proposta Aberta
  return (
    <div className="card mb-6 border border-slate-200 bg-slate-50/70 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
            Sem Plano Saúde 360® Ativo
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Apresente a jornada de acompanhamento integrado ou gere um novo contrato para este paciente.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenContractStudio}
        className="btn btn-primary text-xs font-bold flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white shrink-0"
      >
        <Plus className="w-4 h-4" />
        Apresentar Jornada / Gerar Contrato
      </button>

      {renderModals()}
    </div>
  );

  // Renderiza submodais interativos
  function renderModals() {
    return (
      <>
        {/* Modal: Pausar Plano */}
        {isPauseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
                <PauseCircle className="w-5 h-5 text-purple-700" />
                <span>Pausar Vigência do Plano</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Durante a pausa, o cronômetro do plano fica congelado. Ao retomar, a data de
                vencimento final será automaticamente estendida pelo número exato de dias
                em que o plano ficou pausado.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo da Pausa *
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Ex: Viagem ao exterior por 3 semanas"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-purple-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPauseModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutePause}
                  className="btn text-xs font-bold bg-purple-700 text-white hover:bg-purple-800"
                >
                  Confirmar Pausa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Retomar Plano */}
        {isResumeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
                <PlayCircle className="w-5 h-5 text-emerald-700" />
                <span>Retomar Vigência do Plano</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A pausa será encerrada na data de hoje e o término do plano será compensado
                pelos dias de pausa acumulados.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResumeModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResume}
                  className="btn text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Retomar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar Total de Sessões Inclusas */}
        {isEditSessionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
                <Edit3 className="w-5 h-5 text-emerald-700" />
                <span>Ajustar Franquia de Sessões Injetáveis</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Altere a quantidade de aplicações inclusas contratadas no plano. Esta ação será
                registrada na trilha de auditoria clínica.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Novo Total de Sessões *
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newSessionsTotal}
                  onChange={(e) =>
                    setNewSessionsTotal(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Justificativa Clínica *
                </label>
                <input
                  type="text"
                  value={editSessionsReason}
                  onChange={(e) => setEditSessionsReason(e.target.value)}
                  placeholder="Ex: Ampliação de sessões para reequilíbrio hormonal"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditSessionsModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionsAdjustment}
                  className="btn text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Salvar Ajuste
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Registrar Follow-up Comercial */}
        {isFollowupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <span>Registrar Contato de Follow-up</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Canal</label>
                  <select
                    value={followupType}
                    onChange={(e) => setFollowupType(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Ligação Telefônica</option>
                    <option value="in_person">Presencial (Recepção)</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={followupStatus}
                    onChange={(e) => setFollowupStatus(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="contacted">Contato Realizado (Aguardando Retorno)</option>
                    <option value="requested_callback">Pediu retorno em data específica</option>
                    <option value="scheduled_return">Agendou consulta de retorno</option>
                    <option value="closed">Fechou o Plano</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Próximo Contato em (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={nextFollowupDays}
                    onChange={(e) => setNextFollowupDays(parseInt(e.target.value, 10) || 3)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Anotações</label>
                  <textarea
                    rows={3}
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    placeholder="Ex: Paciente aguarda virada do cartão dia 10. Muito interessada no Evolution."
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFollowupModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFollowup}
                  className="btn text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Gravar Contato
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
};

function getHealthBadge(health: PlanHealth) {
  switch (health) {
    case 'ok':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Ativo
        </span>
      );
    case 'renewal_window':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          Renovação Próxima (≤ 14 dias)
        </span>
      );
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
          <PauseCircle className="w-3.5 h-3.5 text-purple-700" />
          Pausado
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
          Expirado
        </span>
      );
    default:
      return null;
  }
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '---';
  const parts = iso.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}
