import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Layers3, ListFilter, Plus } from "lucide-react";
import { format, isSameDay, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CreatePatientApplicationPlanInput, PatientApplicationPlan, UpdatePatientApplicationPlanInput } from "../types";
import { patientApplicationsService } from "../services/patientApplications.service";
import { PatientApplicationCard } from "./PatientApplicationCard";
import { AddApplicationToPatientModal } from "./AddApplicationToPatientModal";
import { AddMultipleApplicationsModal } from "./AddMultipleApplicationsModal";
import { PatientApplicationReportModal } from "./PatientApplicationReportModal";
import { Send } from "lucide-react";
import { AppointmentModal } from "@/features/agenda/components/AppointmentModal";

interface PatientApplicationsManagerProps {
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  onShowHistory?: () => void;
}

type StatusFilter = "all" | "planned" | "scheduled" | "in_progress" | "finalized" | "cancelled";

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function isFutureOrToday(plan: PatientApplicationPlan) {
  const date = safeDate(plan.scheduledAt);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function nextApplication(plans: PatientApplicationPlan[]) {
  return plans
    .filter(plan => ["planned", "scheduled", "in_progress"].includes(plan.status))
    .filter(plan => safeDate(plan.scheduledAt))
    .sort((a, b) => safeDate(a.scheduledAt)!.getTime() - safeDate(b.scheduledAt)!.getTime())[0];
}

function sectionTitle(section: string) {
  const titles: Record<string, string> = {
    today: "Hoje",
    upcoming: "Próximas",
    unscheduled: "Sem data definida",
    finalized: "Finalizadas",
    cancelled: "Canceladas",
  };
  return titles[section] ?? section;
}

function groupPlans(plans: PatientApplicationPlan[]) {
  const groups: Record<string, PatientApplicationPlan[]> = {
    today: [],
    upcoming: [],
    unscheduled: [],
    finalized: [],
    cancelled: [],
  };

  for (const plan of plans) {
    if (plan.status === "finalized") groups.finalized.push(plan);
    else if (plan.status === "cancelled") groups.cancelled.push(plan);
    else if (!plan.scheduledAt) groups.unscheduled.push(plan);
    else if (safeDate(plan.scheduledAt) && isSameDay(safeDate(plan.scheduledAt)!, new Date())) groups.today.push(plan);
    else groups.upcoming.push(plan);
  }

  return groups;
}

export function PatientApplicationsManager({ patientId, patientName, patientEmail, onShowHistory }: PatientApplicationsManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [editingPlan, setEditingPlan] = useState<PatientApplicationPlan | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMultipleModal, setShowMultipleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [schedulingPlan, setSchedulingPlan] = useState<PatientApplicationPlan | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["patient-application-plans", patientId],
    queryFn: () => patientApplicationsService.getByPatientId(patientId),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["patient-application-plans", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["patient-record", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["procedures"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (input: CreatePatientApplicationPlanInput) => patientApplicationsService.createPlan(input),
    onSuccess: invalidate,
    onError: err => setError(err instanceof Error ? err.message : String(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePatientApplicationPlanInput }) => patientApplicationsService.updatePlan(id, input),
    onSuccess: invalidate,
    onError: err => setError(err instanceof Error ? err.message : String(err)),
  });

  const multipleMutation = useMutation({
    mutationFn: (inputs: CreatePatientApplicationPlanInput[]) => patientApplicationsService.createMultiplePlans(inputs),
    onSuccess: invalidate,
    onError: err => setError(err instanceof Error ? err.message : String(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => patientApplicationsService.cancelPlan(id),
    onSuccess: invalidate,
    onError: err => setError(err instanceof Error ? err.message : String(err)),
  });

  const plans = plansQuery.data ?? [];
  const filteredPlans = useMemo(() => plans.filter(plan => {
    const matchesStatus = filter === "all" || plan.status === filter;
    const matchesProtocol = protocolFilter === "all" || plan.protocolId === protocolFilter;
    const matchesRoute = routeFilter === "all" || plan.routeId === routeFilter;
    return matchesStatus && matchesProtocol && matchesRoute;
  }), [plans, filter, protocolFilter, routeFilter]);

  const grouped = useMemo(() => groupPlans(filteredPlans), [filteredPlans]);
  const protocols = Array.from(new Map(plans.map(plan => [plan.protocolId, plan.protocolName || "Protocolo desconhecido"])));
  const routes = Array.from(new Map(plans.map(plan => [plan.routeId, plan.routeName || "Via não informada"])));
  const next = nextApplication(plans);


  async function handleSave(input: CreatePatientApplicationPlanInput, keepOpen: boolean) {
    setError(null);
    try {
      if (editingPlan) {
        await updateMutation.mutateAsync({
          id: editingPlan.id,
          input: {
            id: editingPlan.id,
            protocolId: input.protocolId,
            routeId: input.routeId,
            scheduledAt: input.scheduledAt,
            notes: input.notes,
          },
        });
        setEditingPlan(null);
        return;
      }
      
      await createMutation.mutateAsync(input);
      if (!keepOpen) setShowAddModal(false);
    } catch (err) {
      // Error is handled by mutation onError
    }
  }

  async function handleSaveMultiple(inputs: CreatePatientApplicationPlanInput[]) {
    setError(null);
    await multipleMutation.mutateAsync(inputs);
    setShowMultipleModal(false);
  }

  function handleToggleSelect(plan: PatientApplicationPlan, selected: boolean) {
    if (selected) {
      setSelectedPlanIds(prev => [...prev, plan.id]);
    } else {
      setSelectedPlanIds(prev => prev.filter(id => id !== plan.id));
    }
  }

  return (
    <div className="patient-applications-manager">
      <div className="card mb-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="card-title">Gerenciador de Aplicações</h2>
            <p className="card-description">
              {patientName ? `${patientName}: ` : ""}planeje, agende e execute aplicações individualmente.
            </p>
          </div>
          <div className="flex gap-2">
            {selectedPlanIds.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setShowReportModal(true)}>
                <Send size={16} />
                Enviar relatório ({selectedPlanIds.length})
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setShowMultipleModal(true)}>
              <Layers3 size={16} />
              Adicionar múltiplas
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Adicionar aplicação
            </button>
          </div>
        </div>

        <div className="grid-4 mt-4">
          <Metric label="Planejadas" value={plans.filter(plan => plan.status === "planned").length} />
          <Metric label="Agendadas" value={plans.filter(plan => plan.status === "scheduled").length} />
          <Metric label="Finalizadas" value={plans.filter(plan => plan.status === "finalized").length} />
          <Metric
            label="Próxima aplicação"
            value={next?.scheduledAt ? format(safeDate(next.scheduledAt)!, "dd/MM HH:mm", { locale: ptBR }) : "-"}
          />
        </div>
      </div>

      {error && <div className="badge badge-danger mb-4" style={{ padding: 12 }}>{error}</div>}

      <div className="card mb-6">
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-2">
            <ListFilter size={16} style={{ color: "var(--color-gray-500)" }} />
            <strong>Filtros</strong>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className="form-control" style={{ width: 160 }} value={filter} onChange={event => setFilter(event.target.value as StatusFilter)}>
              <option value="all">Todas</option>
              <option value="planned">Planejadas</option>
              <option value="scheduled">Agendadas</option>
              <option value="in_progress">Em andamento</option>
              <option value="finalized">Finalizadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <select className="form-control" style={{ width: 210 }} value={protocolFilter} onChange={event => setProtocolFilter(event.target.value)}>
              <option value="all">Todos os protocolos</option>
              {protocols.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select className="form-control" style={{ width: 180 }} value={routeFilter} onChange={event => setRouteFilter(event.target.value)}>
              <option value="all">Todas as vias</option>
              {routes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {plansQuery.isLoading ? (
        <div className="card">Carregando aplicações...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CalendarDays /></div>
            <div className="empty-state-title">Nenhuma aplicação encontrada</div>
            <div className="empty-state-description">Adicione uma aplicação planejada para este paciente, com ou sem data.</div>
          </div>
        </div>
      ) : (
        <div className="application-sections">
          {Object.entries(grouped).map(([section, sectionPlans]) => {
            if (sectionPlans.length === 0) return null;
            return (
              <div className="application-section" key={section}>
                <h3>{sectionTitle(section)}</h3>
                <div className="grid-2">
                  {sectionPlans
                    .sort((a, b) => {
                      if (section === "upcoming" || section === "today") {
                        return (safeDate(a.scheduledAt)?.getTime() ?? 0) - (safeDate(b.scheduledAt)?.getTime() ?? 0);
                      }
                      return (safeDate(b.updatedAt)?.getTime() ?? 0) - (safeDate(a.updatedAt)?.getTime() ?? 0);
                    })
                    .map(plan => (
                      <PatientApplicationCard
                        key={plan.id}
                        plan={plan}
                        onSchedule={setSchedulingPlan}
                        selectable={plan.status === "finalized" || plan.status === "in_progress"}
                        isSelected={selectedPlanIds.includes(plan.id)}
                        onToggleSelect={handleToggleSelect}
                        onEdit={setEditingPlan}
                        onCancel={planToCancel => {
                          if (confirm(`Cancelar a aplicação "${planToCancel.protocolName}"?`)) {
                            cancelMutation.mutate(planToCancel.id);
                          }
                        }}
                        onExecute={planToExecute => navigate({ to: "/procedures/execute/$applicationPlanId", params: { applicationPlanId: planToExecute.id } })}
                        onHistory={onShowHistory ? () => onShowHistory() : undefined}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddModal || editingPlan) && (
        <AddApplicationToPatientModal
          patientId={patientId}
          plan={editingPlan}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
          }}
          onSave={handleSave}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {showMultipleModal && (
        <AddMultipleApplicationsModal
          patientId={patientId}
          onClose={() => setShowMultipleModal(false)}
          onSave={handleSaveMultiple}
          isSaving={multipleMutation.isPending}
        />
      )}

      {showReportModal && (
        <PatientApplicationReportModal
          patientId={patientId}
          patientName={patientName || ""}
          patientEmail={patientEmail}
          selectedPlanIds={selectedPlanIds}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            setSelectedPlanIds([]);
            alert("Relatório agendado com sucesso e será enviado em breve!");
          }}
        />
      )}

      {schedulingPlan && (
        <AppointmentModal
          initialDate={new Date()}
          defaultPatientId={patientId}
          defaultApplicationPlanId={schedulingPlan.id}
          onClose={() => {
            setSchedulingPlan(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="summary-card" style={{ padding: 0 }}>
      <div className="summary-card-value" style={{ fontSize: 22 }}>{value}</div>
      <div className="summary-card-subtext">{label}</div>
    </div>
  );
}
