import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, MapPin, PackageCheck, Route, UserRound } from "lucide-react";
import type { ProcedureItemUsed } from "../types";
import type { BodyAreaMapEntry } from "../constants/bodyAreaMap";

interface ProcedureExecutionSidebarProps {
  patientName: string;
  protocolName: string;
  routeLabel: string;
  selectedRouteCode: string | null;
  selectedAreaEntry: BodyAreaMapEntry | null;
  bodyAreaName?: string | null;
  activeRouteColor: any;
  items: Partial<ProcedureItemUsed>[];
  inventoryData: any;
  hadIntercurrence: boolean;
  evolutionText?: string | null;
}

function formatSide(side?: string | null) {
  if (side === "left") return "Esquerdo";
  if (side === "right") return "Direito";
  if (side === "center") return "Centro";
  return "-";
}

function truncateText(value?: string | null, max = 220) {
  if (!value?.trim()) return "A previa da evolucao aparecera quando os dados forem preenchidos.";
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
}

export function ProcedureExecutionSidebar({
  patientName,
  protocolName,
  routeLabel,
  selectedRouteCode,
  selectedAreaEntry,
  bodyAreaName,
  activeRouteColor,
  items,
  inventoryData,
  hadIntercurrence,
  evolutionText,
}: ProcedureExecutionSidebarProps) {
  const itemStatuses = items.map(item => {
    const inventoryItem = inventoryData?.items?.find((candidate: any) => candidate.id === item.inventoryItemId);
    const requiresBatch = Number(inventoryItem?.requires_batch ?? 0) === 1;
    const hasItem = Boolean(item.inventoryItemId);
    const hasQuantity = Number(item.quantityUsed ?? 0) > 0;
    const hasBatch = Boolean(item.inventoryBatchId || item.batchNumberSnapshot);
    const complete = hasItem && hasQuantity && (!requiresBatch || hasBatch);

    return {
      complete,
      name: inventoryItem?.name || "Item pendente",
      quantity: item.quantityUsed ? `${item.quantityUsed} ${item.unit || ""}`.trim() : "Qtd. pendente",
      batch: hasBatch ? "Lote informado" : requiresBatch ? "Lote pendente" : "Lote opcional",
      tone: complete ? "success" : "warning",
    };
  });

  const alerts = [
    !selectedAreaEntry ? "Selecione uma area corporal antes de finalizar." : null,
    items.length === 0 ? "Informe os itens utilizados para a conferencia." : null,
    ...itemStatuses.filter(item => !item.complete).map(item => `${item.name}: ${item.batch === "Lote pendente" ? "lote obrigatorio ausente" : "dados incompletos"}.`),
    hadIntercurrence ? "Intercorrencia marcada: revise a descricao antes de finalizar." : null,
  ].filter(Boolean) as string[];

  return (
    <aside className="procedure-execution-sidebar">
      <section className="execution-side-card execution-side-card-highlight">
        <div className="execution-side-heading">
          <ClipboardCheck size={16} />
          <span>Resumo da aplicacao</span>
        </div>
        <div className="execution-summary-list">
          <SummaryLine icon={<UserRound size={14} />} label="Paciente" value={patientName} />
          <SummaryLine icon={<FileText size={14} />} label="Protocolo" value={protocolName} />
          <SummaryLine icon={<Route size={14} />} label="Via ativa" value={routeLabel} accent={activeRouteColor?.stroke} />
          <SummaryLine label="Data e hora" value={new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} />
        </div>
        <div className="execution-status-row">
          <span className="badge badge-warning">Rascunho em execucao</span>
          {selectedRouteCode && <span className="execution-route-chip" style={{ borderColor: activeRouteColor?.fill, color: activeRouteColor?.stroke }}>{selectedRouteCode}</span>}
        </div>
      </section>

      <section className="execution-side-card">
        <div className="execution-side-heading">
          <MapPin size={16} />
          <span>Area selecionada</span>
          <strong>{selectedAreaEntry ? "1" : "0"}</strong>
        </div>
        {selectedAreaEntry ? (
          <div className="selected-area-compact" style={{ borderColor: activeRouteColor?.fill }}>
            <span className="selected-area-dot" style={{ background: activeRouteColor?.fill }} />
            <div>
              <strong>{bodyAreaName || selectedAreaEntry.displayName}</strong>
              <small>{selectedAreaEntry.routeCode} - {formatSide(selectedAreaEntry.side)}</small>
            </div>
          </div>
        ) : (
          <p className="execution-muted">Nenhuma area selecionada no mapa.</p>
        )}
      </section>

      <section className="execution-side-card">
        <div className="execution-side-heading">
          <PackageCheck size={16} />
          <span>Conferencia rapida</span>
          <strong>{itemStatuses.filter(item => item.complete).length}/{itemStatuses.length}</strong>
        </div>
        {itemStatuses.length === 0 ? (
          <p className="execution-muted">Os itens previstos ou adicionados aparecerao aqui.</p>
        ) : (
          <div className="execution-check-list">
            {itemStatuses.map((item, index) => (
              <div className={`execution-check-item tone-${item.tone}`} key={`${item.name}-${index}`}>
                {item.complete ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.quantity} - {item.batch}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="execution-side-card">
        <div className="execution-side-heading">
          <AlertTriangle size={16} />
          <span>Alertas</span>
          <strong>{alerts.length}</strong>
        </div>
        {alerts.length === 0 ? (
          <div className="execution-ok-state">
            <CheckCircle2 size={15} />
            <span>Conferencia visual sem pendencias.</span>
          </div>
        ) : (
          <div className="execution-alert-list">
            {alerts.map(alert => <p key={alert}>{alert}</p>)}
          </div>
        )}
      </section>

      <section className="execution-side-card">
        <div className="execution-side-heading">
          <FileText size={16} />
          <span>Previa da evolucao</span>
        </div>
        <p className="execution-evolution-preview">{truncateText(evolutionText)}</p>
        <span className="execution-edit-hint">Ver / editar no bloco abaixo</span>
      </section>
    </aside>
  );
}

function SummaryLine({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="execution-summary-line">
      <span>{icon}{label}</span>
      <strong style={{ color: accent }}>{value || "-"}</strong>
    </div>
  );
}
