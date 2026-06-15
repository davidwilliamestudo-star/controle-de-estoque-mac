import type { PatientApplicationPlan } from "../types";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Edit, FileText, Play, XCircle } from "lucide-react";

interface PatientApplicationCardProps {
  plan: PatientApplicationPlan;
  onEdit: (plan: PatientApplicationPlan) => void;
  onCancel: (plan: PatientApplicationPlan) => void;
  onExecute: (plan: PatientApplicationPlan) => void;
  onHistory?: (plan: PatientApplicationPlan) => void;
  onSchedule?: (plan: PatientApplicationPlan) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (plan: PatientApplicationPlan, selected: boolean) => void;
}

const statusClasses: Record<string, string> = {
  planned: "badge-neutral",
  scheduled: "badge-accent",
  in_progress: "badge-warning",
  finalized: "badge-success",
  cancelled: "badge-danger",
};

const statusLabels: Record<string, string> = {
  planned: "Planejada",
  scheduled: "Agendada",
  in_progress: "Em andamento",
  finalized: "Finalizada",
  cancelled: "Cancelada",
};

function formatScheduledAt(value?: string | null) {
  if (!value) return "Sem data definida";
  const date = parseISO(value);
  if (!isValid(date)) return "Data inválida";
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function PatientApplicationCard({ plan, onEdit, onCancel, onExecute, onHistory, onSchedule, selectable, isSelected, onToggleSelect }: PatientApplicationCardProps) {
  const canMutate = plan.status !== "finalized" && plan.status !== "cancelled";
  const canExecute = plan.status !== "finalized" && plan.status !== "cancelled";

  return (
    <div className={`card application-plan-card status-${plan.status}`} style={{ padding: 18, border: isSelected ? '2px solid var(--color-primary-600)' : undefined }}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          {selectable && (
            <input 
              type="checkbox" 
              checked={isSelected || false} 
              onChange={e => onToggleSelect && onToggleSelect(plan, e.target.checked)} 
              style={{ marginTop: '5px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
          )}
          <div>
            <h4 className="font-semibold" style={{ color: "var(--color-gray-900)" }}>{plan.protocolName || "Protocolo desconhecido"}</h4>
            <div className="flex items-center gap-3 flex-wrap mt-2 text-sm text-gray-500">
              <span>Via: {plan.routeName || "Não informada"}</span>
              <span className="flex items-center gap-1"><CalendarClock size={14} /> {formatScheduledAt(plan.scheduledAt)}</span>
            </div>
          </div>
        </div>
        <span className={`badge ${statusClasses[plan.status] || "badge-neutral"}`}>
          {statusLabels[plan.status] || plan.status}
        </span>
      </div>

      {plan.notes && (
        <p className="text-sm mt-4" style={{ color: "var(--color-gray-500)" }}>
          {plan.notes}
        </p>
      )}

      <div className="application-plan-meta">
        <span>Área corporal: definida na execução</span>
        <span>Itens/lotes: conferidos ao finalizar</span>
        <span>Evolução: gerada na execução</span>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        {canExecute && (
          <button type="button" className="btn btn-primary" onClick={() => onExecute(plan)}>
            <Play size={16} />
            Executar
          </button>
        )}
        {canMutate && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(plan)}>
              <Edit size={16} />
              Editar
            </button>
            {plan.status === "planned" && onSchedule && (
              <button type="button" className="btn btn-accent" onClick={() => onSchedule(plan)}>
                <CalendarClock size={16} />
                Agendar
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => onCancel(plan)}>
              <XCircle size={16} />
              Cancelar
            </button>
          </>
        )}
        {plan.status === "finalized" && onHistory && (
          <button type="button" className="btn btn-secondary" onClick={() => onHistory(plan)}>
            <FileText size={16} />
            Ver histórico
          </button>
        )}
      </div>
    </div>
  );
}
