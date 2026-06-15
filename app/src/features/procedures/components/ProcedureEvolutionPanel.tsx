import { FileText, AlertTriangle } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import type { Procedure } from "../types";

interface ProcedureEvolutionPanelProps {
  register: UseFormRegister<Partial<Procedure>>;
  hadIntercurrence: boolean;
}

export function ProcedureEvolutionPanel({ register, hadIntercurrence }: ProcedureEvolutionPanelProps) {
  return (
    <div className="card procedure-evolution-card" style={{ borderColor: "var(--color-gray-200)" }}>
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-900">
        <FileText size={16} style={{ color: "var(--color-green-deep)" }} /> Notas & Evolução
      </h2>

      <div className="form-group mb-4 clinical-field-block">
        <label className="form-label text-sm text-gray-600 font-medium">Observações Gerais</label>
        <textarea className="form-control text-sm bg-gray-50" rows={2} {...register("notes")} placeholder="Anotações do procedimento..." />
      </div>

      <div className={`intercurrence-panel ${hadIntercurrence ? "active" : ""}`}>
        <label className="form-label flex items-center gap-2 mb-0 cursor-pointer">
          <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" {...register("hadIntercurrence")} />
          <AlertTriangle size={14} style={{ color: "var(--color-warning)" }} />
          <span className="text-sm font-medium text-gray-700">Houve intercorrência?</span>
        </label>
        
        {hadIntercurrence && (
          <div className="mt-3">
            <textarea
              className="form-control text-sm bg-white"
              placeholder="Descreva a intercorrência em detalhes..."
              rows={3}
              {...register("intercurrenceDescription")}
            />
          </div>
        )}
      </div>

      <div className="clinical-field-block mt-4">
        <label className="form-label text-sm text-gray-600 font-medium">Prévia da Evolução (Automática)</label>
        <textarea
          className="form-control text-sm bg-gray-50 border-dashed"
          rows={5}
          {...register("evolutionText")}
          placeholder="A evolução será gerada automaticamente com base nos dados do procedimento..."
        />
        <p className="text-xs text-gray-400 mt-1">Você pode editar este texto manualmente antes de finalizar.</p>
      </div>
    </div>
  );
}
