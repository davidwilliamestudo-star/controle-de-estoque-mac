import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, X } from "lucide-react";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useAdministrationRoutes } from "@/features/procedures/hooks/useBodyAreas";
import { protocolsService } from "@/features/protocols/services/protocols.service";
import type { CreatePatientApplicationPlanInput, PatientApplicationPlan } from "../types";

interface AddApplicationToPatientModalProps {
  patientId: string;
  plan?: PatientApplicationPlan | null;
  onClose: () => void;
  onSave: (input: CreatePatientApplicationPlanInput, keepOpen: boolean) => Promise<void>;
  isSaving: boolean;
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

export function AddApplicationToPatientModal({ patientId, plan, onClose, onSave, isSaving }: AddApplicationToPatientModalProps) {
  const { data: protocols = [] } = useProtocols();
  const { data: routes = [] } = useAdministrationRoutes();
  const [protocolId, setProtocolId] = useState(plan?.protocolId ?? "");
  const [routeId, setRouteId] = useState(plan?.routeId ?? "");
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(plan?.scheduledAt));
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [keepOpen, setKeepOpen] = useState(false);

  const selectedProtocol = protocols.find(protocol => protocol.id === protocolId);

  const protocolItemsQuery = useQuery({
    queryKey: ["protocol-preview-items", protocolId],
    queryFn: async () => {
      if (!protocolId) return null;
      return protocolsService.getProtocolWithItems(protocolId);
    },
    enabled: !!protocolId,
  });

  useEffect(() => {
    if (!plan && selectedProtocol?.administrationRouteId && !routeId) {
      setRouteId(selectedProtocol.administrationRouteId);
    }
  }, [selectedProtocol, routeId, plan]);

  const routeOptions = useMemo(() => {
    if (selectedProtocol?.administrationRouteId) {
      const selected = routes.find(route => route.id === selectedProtocol.administrationRouteId);
      return selected ? [selected] : routes;
    }
    return routes;
  }, [routes, selectedProtocol]);

  return (
    <div className="modal-overlay active" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="empty-state-icon" style={{ width: 40, height: 40, margin: 0 }}>
              <CalendarPlus size={20} />
            </div>
            <div>
              <h2 className="modal-title">{plan ? "Editar aplicação planejada" : "Adicionar aplicação ao paciente"}</h2>
              <p className="card-description">Planeje uma aplicação sem baixar estoque. O estoque só baixa na finalização.</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={async event => {
            event.preventDefault();
            await onSave({
              patientId,
              protocolId,
              routeId,
              scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
              notes: notes.trim() || null,
            }, keepOpen);
          }}
        >
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Protocolo</label>
                <select className="form-control" value={protocolId} onChange={event => setProtocolId(event.target.value)} required>
                  <option value="">Selecione o protocolo...</option>
                  {protocols.filter(protocol => Number(protocol.isActive) === 1).map(protocol => (
                    <option key={protocol.id} value={protocol.id}>{protocol.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Via</label>
                <select className="form-control" value={routeId} onChange={event => setRouteId(event.target.value)} required>
                  <option value="">Selecione a via...</option>
                  {routeOptions.map(route => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Data e hora opcional</label>
                <input className="form-control" type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Status resultante</label>
                <input className="form-control" value={scheduledAt ? "Agendada" : "Planejada sem data"} disabled />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
            </div>

            <div className="card" style={{ padding: 16, background: "var(--color-gray-50)", boxShadow: "none" }}>
              <strong>Itens previstos do protocolo</strong>
              <p className="card-description">Pré-visualização. Lotes e baixa de estoque serão definidos somente na execução.</p>
              {(protocolItemsQuery.data?.items ?? []).length === 0 ? (
                <p className="text-sm mt-4 text-gray-500">Nenhum item padrão cadastrado para este protocolo.</p>
              ) : (
                <div className="compact-list" style={{ maxHeight: 180 }}>
                  {protocolItemsQuery.data?.items.map(item => (
                    <div key={item.id}>
                      <strong>{item.itemName ?? item.inventoryItemId}</strong>
                      <span>{item.defaultQuantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!plan && (
              <label className="form-label flex items-center gap-2 mt-4">
                <input type="checkbox" checked={keepOpen} onChange={event => setKeepOpen(event.target.checked)} />
                Adicionar outra aplicação após salvar
              </label>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !protocolId || !routeId}>
              {isSaving ? "Salvando..." : plan ? "Salvar alterações" : "Adicionar aplicação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
