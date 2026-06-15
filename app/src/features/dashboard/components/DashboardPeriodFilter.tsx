import type { DashboardPeriodPreset } from "../types/dashboard.types";

interface DashboardPeriodFilterProps {
  value: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  onCustomDateChange: (field: "startDate" | "endDate", value: string) => void;
}

const options: Array<{ value: DashboardPeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "this_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "custom", label: "Personalizado" },
];

export function DashboardPeriodFilter({ value, startDate, endDate, onPresetChange, onCustomDateChange }: DashboardPeriodFilterProps) {
  return (
    <div className="dashboard-period-filter">
      <div className="segmented-control" role="tablist" aria-label="Periodo do dashboard">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`segment ${value === option.value ? "active" : ""}`}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value === "custom" && (
        <div className="dashboard-custom-dates">
          <input
            className="form-control"
            type="date"
            value={startDate}
            onChange={event => onCustomDateChange("startDate", event.target.value)}
          />
          <input
            className="form-control"
            type="date"
            value={endDate}
            onChange={event => onCustomDateChange("endDate", event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
