import { Activity } from "lucide-react";
import type { UseFormRegister, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import Select from "react-select";
import type { Procedure } from "../types";

interface ProcedureContextCardProps {
  register: UseFormRegister<Partial<Procedure>>;
  control: Control<Partial<Procedure>>;
  patients: any[];
  protocols: any[];
  routes: any[];
  manualRouteId: string;
  setManualRouteId: (id: string) => void;
  selectedRouteCode: string | null;
  activeRouteColor: any;
}

export function ProcedureContextCard({
  register,
  control,
  patients,
  protocols,
  routes,
  manualRouteId,
  setManualRouteId,
  selectedRouteCode,
  activeRouteColor
}: ProcedureContextCardProps) {
  return (
    <div className="card procedure-context-card" style={{ borderColor: "var(--color-gray-200)" }}>
      <div className="procedure-card-heading">
        <div>
          <h2>
            <Activity size={16} style={{ color: "var(--color-green-deep)" }} /> Dados Principais
          </h2>
          <p>Contexto carregado do planejamento da aplicacao.</p>
        </div>
        {selectedRouteCode && activeRouteColor && (
          <span className="execution-route-chip" style={{ borderColor: activeRouteColor.fill, color: activeRouteColor.stroke }}>
            {selectedRouteCode}
          </span>
        )}
      </div>

      <div className="procedure-context-grid">
      <div className="form-group">
        <label className="form-label text-sm text-gray-600 font-medium">Paciente *</label>
        <Controller
          name="patientId"
          control={control}
          rules={{ required: true }}
          render={({ field: { onChange, value, ref } }) => (
            <Select
              ref={ref}
              options={patients.map(p => ({ value: p.id, label: p.full_name }))}
              value={patients.find(p => p.id === value) ? { value: value, label: patients.find(p => p.id === value).full_name } : null}
              onChange={(val) => onChange(val?.value || "")}
              placeholder="Selecione ou busque o paciente..."
              noOptionsMessage={() => "Nenhum paciente encontrado"}
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f9fafb',
                  borderColor: '#d1d5db',
                  fontSize: '0.875rem',
                  minHeight: '38px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#9ca3af'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999
                })
              }}
            />
          )}
        />
      </div>

      <div className="form-group">
        <label className="form-label text-sm text-gray-600 font-medium">Protocolo</label>
        <select className="form-control bg-gray-50 text-sm" {...register("protocolId")}>
          <option value="">(Nenhum / Avulso)</option>
          {protocols.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {routes.length > 0 && (
        <div className="form-group mb-0">
          <label className="form-label text-sm text-gray-600 font-medium">Via de Administração</label>
          <select
            className="form-control bg-gray-50 text-sm"
            value={manualRouteId}
            onChange={e => setManualRouteId(e.target.value)}
          >
            <option value="">
              {selectedRouteCode ? `Detectado do protocolo: ${selectedRouteCode}` : "Selecionar manualmente..."}
            </option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
            ))}
          </select>
          {selectedRouteCode && activeRouteColor && (
            <p className="route-support-text" style={{ color: activeRouteColor.stroke }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeRouteColor.fill }}></span>
              Via {selectedRouteCode} ativa — {activeRouteColor.label}
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
