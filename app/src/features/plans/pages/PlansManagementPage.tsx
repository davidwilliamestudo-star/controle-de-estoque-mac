import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Users,
  Clock,
  RotateCw,
  MessageSquare,
  Phone,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  ArrowRight,
  Send,
  XCircle,
  PlayCircle,
  PauseCircle,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import {
  useFollowupQueue,
  useRenewalQueue,
  usePlanMutations,
  PLANS_QUERY_KEY,
} from '../hooks/usePatientPlans';
import { patientPlansRepository, type PatientPlanWithView } from '../repositories/patientPlans.repository';
import { useQuery } from '@tanstack/react-query';
import { formatMoneyBRL } from '@/services/contracts/saude360ContractEngine.service';
import { ContractPreparationAndSignatureModal } from '@/components/contracts/ContractPreparationAndSignatureModal';
import { usePatients } from '@/features/patients/hooks/usePatients';

type Tab = 'followup' | 'active' | 'renewal';

export default function PlansManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('followup');
  const [searchTerm, setSearchTerm] = useState('');

  // Carrega filas
  const { data: followupList = [], isLoading: loadingFollowups } = useFollowupQueue();
  const { data: renewalList = [], isLoading: loadingRenewals } = useRenewalQueue();

  // Carrega lista de planos ativos gerais
  const { data: activePlansList = [], isLoading: loadingActive } = useQuery({
    queryKey: [...PLANS_QUERY_KEY, 'all_active'],
    queryFn: async () => {
      // Consulta planos com status 'active'
      const { dbSelect } = await import('@/lib/db/sqlite');
      const rows = await dbSelect<any>(`
        SELECT pp.*, p.full_name as patient_name, p.phone as patient_phone, p.email as patient_email
        FROM patient_plans pp
        JOIN patients p ON p.id = pp.patient_id
        WHERE pp.status = 'active'
        ORDER BY pp.end_date ASC
      `);
      
      const results: (PatientPlanWithView & { patientName: string; patientPhone?: string; patientEmail?: string })[] = [];
      for (const r of rows) {
        const full = await patientPlansRepository.getActiveForPatient(r.patient_id);
        if (full) {
          results.push({
            ...full,
            patientName: r.patient_name,
            patientPhone: r.patient_phone,
            patientEmail: r.patient_email,
          });
        }
      }
      return results;
    },
    staleTime: 15_000,
  });

  const { confirmPayment, addFollowup, markLost } = usePlanMutations();

  // Estado para Contrato / Renovação Modal
  const [selectedPatientForContract, setSelectedPatientForContract] = useState<any | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // Estado para Modal de Follow-up
  const [selectedPlanForFollowup, setSelectedPlanForFollowup] = useState<any | null>(null);
  const [followupType, setFollowupType] = useState('whatsapp');
  const [followupStatus, setFollowupStatus] = useState('contacted');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextFollowupDays, setNextFollowupDays] = useState(3);
  const [isLostReasonOpen, setIsLostReasonOpen] = useState(false);
  const [lostReason, setLostReason] = useState('Preço / Orçamento');

  // Metricas de Topo
  const pendingFollowupsCount = followupList.length;
  const activeCount = activePlansList.length;
  const renewalsCount = renewalList.length;

  const handleConfirmPayment = async (planId: string) => {
    if (
      !window.confirm(
        'Confirmar recebimento do pagamento e iniciar vigência oficial a partir de hoje?'
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

  const handleSaveFollowup = async () => {
    if (!selectedPlanForFollowup) return;
    try {
      if (isLostReasonOpen) {
        await markLost.mutateAsync({
          planId: selectedPlanForFollowup.id,
          reason: lostReason,
          notes: followupNotes,
        });
      } else {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + Number(nextFollowupDays));
        await addFollowup.mutateAsync({
          planId: selectedPlanForFollowup.id,
          channel: followupType as any,
          outcome: (followupStatus === 'closed' ? 'won' : 'negotiating'),
          nextContactAt: nextDate.toISOString(),
          notes: followupNotes,
        });
      }
      setSelectedPlanForFollowup(null);
      setFollowupNotes('');
      setIsLostReasonOpen(false);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const openWhatsApp = (phone?: string, patientName?: string, planName?: string) => {
    if (!phone) {
      alert('Paciente sem telefone cadastrado.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(
      `Olá ${patientName || ''}, tudo bem? Aqui é da Clínica Dra. Ana Carla Morong! Estou entrando em contato sobre a sua proposta do programa ${planName || 'Saúde 360®'}. Ficou alguma dúvida sobre o acompanhamento ou forma de pagamento? Estamos à disposição para ajudá-la!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Identidade Visual Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Motor de Ciclo de Vida & Retenção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Gestão de Planos Saúde 360®
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Funil comercial de fechamento, controle de acompanhamentos ativos e esteira de renovação antecipada.
          </p>
        </div>
      </div>

      {/* Cards de Métricas no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('followup')}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
            activeTab === 'followup'
              ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                1. Follow-up de Fechamento
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                {pendingFollowupsCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Propostas abertas / aguardando</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('active')}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
            activeTab === 'active'
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-500 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                2. Planos Ativos Vigentes
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                {activeCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Pacientes em tratamento</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('renewal')}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
            activeTab === 'renewal'
              ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-400 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                3. Renovações (≤ 14 dias)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                {renewalsCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Janela de continuidade ativa</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
              <RotateCw className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Abas & Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Em Negociação ({pendingFollowupsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Planos Ativos ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('renewal')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'renewal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Esteira de Renovação ({renewalsCount})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'followup' && (
        <div className="space-y-4">
          {loadingFollowups ? (
            <div className="text-center py-12 text-xs text-slate-500 animate-pulse">
              Carregando fila de follow-up...
            </div>
          ) : followupList.length === 0 ? (
            <div className="card p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Nenhum follow-up pendente</h4>
              <p className="text-xs">
                Todas as propostas foram concluídas ou ainda não há contatos agendados para hoje.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {followupList
                .filter((item) =>
                  searchTerm
                    ? (item.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
                    : true
                )
                .map((item) => {
                  const isSigned = item.status === 'signed_pending_payment';
                  return (
                    <div
                      key={item.id}
                      className="card p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              isSigned
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isSigned ? 'Assinado ✓ Aguarda Pagamento' : 'Proposta Aberta'}
                          </span>
                          <span className="text-xs font-bold text-emerald-950 font-mono">
                            R$ {formatMoneyBRL(item.totalValue)}
                          </span>
                          {item.paymentModality && (
                            <span className="text-xs text-slate-500">
                              • {item.paymentModality}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h4 className="text-base font-extrabold text-slate-900">
                            {item.patientName}
                          </h4>
                          <span className="text-xs text-slate-500">
                            ({item.planName})
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          {item.patientPhone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {item.patientPhone}
                            </span>
                          )}
                          {item.nextFollowupAt && (
                            <span className="flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Próximo contato:{' '}
                              {new Date(item.nextFollowupAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {item.notes && (
                            <span className="italic text-slate-600 truncate max-w-xs">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações Rápidas da Secretária */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp(item.patientPhone, item.patientName, item.planName)
                          }
                          className="btn text-xs font-bold flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white border-none shadow-2xs px-3 py-2 rounded-xl"
                        >
                          <Send className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPlanForFollowup(item)}
                          className="btn btn-secondary text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                          Registrar Retorno
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmPayment(item.id)}
                          className="btn btn-primary text-xs font-bold flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 rounded-xl shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ativar Plano
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate({ to: `/patients/${item.patientId}` })}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Abrir Prontuário"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Aba 2: Planos Ativos */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {loadingActive ? (
            <div className="text-center py-12 text-xs text-slate-500 animate-pulse">
              Carregando planos ativos...
            </div>
          ) : activePlansList.length === 0 ? (
            <div className="card p-12 text-center text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Nenhum plano ativo</h4>
              <p className="text-xs">
                Inicie novos planos através do prontuário do paciente ou do Estúdio de Contratos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlansList
                .filter((p) =>
                  searchTerm
                    ? p.patientName.toLowerCase().includes(searchTerm.toLowerCase())
                    : true
                )
                .map((plan) => (
                  <div
                    key={plan.id}
                    className="card p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all space-y-4"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wide">
                          {plan.planKey}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {plan.patientName}
                        </h4>
                        <p className="text-xs font-semibold text-emerald-900">
                          {plan.planName} ({plan.durationMonths} Meses)
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-700 font-mono">
                        {plan.view.daysRemaining} dias restantes
                      </span>
                    </div>

                    {/* Barra de Progresso Temporal */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Início: {formatDate(plan.startDate)}</span>
                        <span>Término: {formatDate(plan.endDate)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${Math.min(100, plan.view.progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Sessões Injetáveis */}
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-600 font-medium">Aplicações Realizadas:</span>
                      <span className="font-bold text-slate-900">
                        {plan.proceduresUsed} de {plan.includedProceduresTotal} sessões
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 font-mono font-medium">
                        R$ {formatMoneyBRL(plan.totalValue)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate({ to: `/patients/${plan.patientId}` })}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Abrir Prontuário</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Aba 3: Esteira de Renovação Antecipada (≤ 14 dias) */}
      {activeTab === 'renewal' && (
        <div className="space-y-4">
          {loadingRenewals ? (
            <div className="text-center py-12 text-xs text-slate-500 animate-pulse">
              Carregando planos a renovar...
            </div>
          ) : renewalList.length === 0 ? (
            <div className="card p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">
                Nenhum plano vencendo nos próximos 14 dias
              </h4>
              <p className="text-xs">
                A esteira de renovação alertará automaticamente quando os pacientes entrarem na reta final do tratamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {renewalList.map((item) => (
                <div
                  key={item.id}
                  className="card p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/40 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide">
                        Vence em {item.view.daysRemaining} dias
                      </span>
                      <span className="text-xs text-slate-500">
                        Término previsto: {formatDate(item.endDate)}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {item.patientName}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Plano atual: <strong>{item.planName}</strong> •{' '}
                      {item.proceduresUsed} de {item.includedProceduresTotal} sessões realizadas
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigate({ to: `/patients/${item.patientId}?tab=contracts` });
                      }}
                      className="btn btn-primary text-xs font-bold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Renovar Contrato
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: `/patients/${item.patientId}` })}
                      className="btn btn-secondary text-xs font-semibold px-3 py-2 rounded-xl"
                    >
                      Prontuário
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para Registrar Contato / Desistência */}
      {selectedPlanForFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <span>Follow-up Comercial — {selectedPlanForFollowup.patientName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForFollowup(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Resultado do Contato</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsLostReasonOpen(false)}
                    className={`p-2 rounded-lg border font-semibold ${
                      !isLostReasonOpen
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Em Negociação
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLostReasonOpen(true)}
                    className={`p-2 rounded-lg border font-semibold ${
                      isLostReasonOpen
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Não Fechou / Perda
                  </button>
                </div>
              </div>

              {isLostReasonOpen ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Motivo da Não Adesão *
                  </label>
                  <select
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Preço / Orçamento">Preço / Orçamento</option>
                    <option value="Vai falar com cônjuge / família">Vai falar com cônjuge / família</option>
                    <option value="Falta de tempo / rotina">Falta de tempo / rotina</option>
                    <option value="Aguardando virada do cartão">Aguardando virada do cartão</option>
                    <option value="Priorizou outro tratamento">Priorizou outro tratamento</option>
                    <option value="Vai fazer exames primeiro">Vai fazer exames primeiro</option>
                    <option value="Outro">Outro motivo</option>
                  </select>
                </div>
              ) : (
                <>
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
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Agendar Próximo Contato em (dias)
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
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Anotações da Conversa
                </label>
                <textarea
                  rows={3}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Resumo do que a paciente relatou..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForFollowup(null)}
                className="btn btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFollowup}
                className="btn text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '---';
  const parts = iso.slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}
