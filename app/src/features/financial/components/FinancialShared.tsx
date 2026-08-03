import type { FinancialPeriodPreset, FinancialStatus } from "../types";

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function statusLabel(status: FinancialStatus) {
  const labels: Record<FinancialStatus, string> = {
    open: "Aberto",
    paid: "Pago",
    overdue: "Vencido",
    cancelled: "Cancelado",
    partially_paid: "Parcial",
  };
  return labels[status] ?? status;
}

export function StatusBadge({ status }: { status: FinancialStatus }) {
  const className =
    status === "paid" ? "badge-success" :
    status === "overdue" ? "badge-danger" :
    status === "cancelled" ? "badge-neutral" :
    status === "partially_paid" ? "badge-warning" :
    "badge-primary";
  return <span className={`badge ${className}`}>{statusLabel(status)}</span>;
}

const periodOptions: Array<{ value: FinancialPeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "this_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "custom", label: "Personalizado" },
];

export function FinancialPeriodFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onDateChange,
}: {
  preset: FinancialPeriodPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: FinancialPeriodPreset) => void;
  onDateChange: (field: "startDate" | "endDate", value: string) => void;
}) {
  return (
    <div className="dashboard-period-filter">
      <div className="segmented-control" role="tablist" aria-label="Periodo financeiro">
        {periodOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`segment ${preset === option.value ? "active" : ""}`}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="dashboard-custom-dates">
          <input className="form-control" type="date" value={startDate} onChange={event => onDateChange("startDate", event.target.value)} />
          <input className="form-control" type="date" value={endDate} onChange={event => onDateChange("endDate", event.target.value)} />
        </div>
      )}
    </div>
  );
}

export function EmptyFinancialState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state py-10">
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-description">{description}</div>
    </div>
  );
}
