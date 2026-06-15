import { MapPin, Info } from "lucide-react";
import type { BodyAreaMapEntry } from "../constants/bodyAreaMap";

interface ProcedureAreaDetailsProps {
  selectedAreaEntry: BodyAreaMapEntry | null;
  activeRouteColor: any;
  clearSelection: () => void;
  bodyAreaName?: string | null;
  bodyAreaTechnicalName?: string | null;
}

export function ProcedureAreaDetails({ selectedAreaEntry, activeRouteColor, clearSelection, bodyAreaName, bodyAreaTechnicalName }: ProcedureAreaDetailsProps) {
  if (!selectedAreaEntry) {
    return (
      <div className="card procedure-area-card procedure-area-empty" style={{ borderColor: "var(--color-gray-200)" }}>
        <MapPin size={32} className="text-gray-300 mb-3" />
        <h3 className="text-sm font-medium text-gray-700">Nenhuma área selecionada</h3>
        <p className="text-xs text-gray-500 mt-1">Selecione um ponto compatível no mapa corporal.</p>
      </div>
    );
  }

  return (
    <div className="card procedure-area-card relative overflow-hidden" style={{ borderColor: activeRouteColor?.fill || "var(--color-gray-200)" }}>
      {activeRouteColor && (
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: activeRouteColor.fill }} />
      )}
      
      <div className="procedure-card-heading">
        <div>
          <h2>
            <MapPin size={16} style={{ color: activeRouteColor?.fill || "var(--color-gray-500)" }} /> 
            Detalhes da Área
          </h2>
          <p>Ultima selecao aplicada ao mapa corporal.</p>
        </div>
        <button 
          type="button"
          onClick={clearSelection}
          className="btn btn-ghost"
        >
          Limpar seleção
        </button>
      </div>

      <div className="procedure-area-detail-grid">
        <div className="clinical-info-tile span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Local Exato</p>
          <p className="text-sm font-medium text-gray-900">{bodyAreaName || selectedAreaEntry.displayName}</p>
          {bodyAreaTechnicalName && (
            <p className="text-xs text-gray-500 mt-1" title="Nome Técnico Anatômico">{bodyAreaTechnicalName}</p>
          )}
        </div>

          <div className="clinical-info-tile">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Via</p>
            <p className="text-sm font-medium" style={{ color: activeRouteColor?.stroke }}>
              {selectedAreaEntry.routeCode}
            </p>
          </div>
          <div className="clinical-info-tile">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Lado</p>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {selectedAreaEntry.side === "left" ? "Esquerdo" : selectedAreaEntry.side === "right" ? "Direito" : "Centro"}
            </p>
          </div>
      </div>
    </div>
  );
}
