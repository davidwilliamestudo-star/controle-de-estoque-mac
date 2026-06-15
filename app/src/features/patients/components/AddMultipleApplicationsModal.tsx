import { useState } from "react";
import { Layers3, Plus, Trash2, X } from "lucide-react";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useAdministrationRoutes } from "@/features/procedures/hooks/useBodyAreas";
import type { CreatePatientApplicationPlanInput } from "../types";

interface AddMultipleApplicationsModalProps {
  patientId: string;
  onClose: () => void;
  onSave: (inputs: CreatePatientApplicationPlanInput[]) => Promise<void>;
  isSaving: boolean;
}

interface DraftRow {
  id: string;
  protocolId: string;
  routeId: string;
  scheduledAt: string;
  notes: string;
}

function createRow(): DraftRow {
  return { id: crypto.randomUUID(), protocolId: "", routeId: "", scheduledAt: "", notes: "" };
}

export function AddMultipleApplicationsModal({ patientId, onClose, onSave, isSaving }: AddMultipleApplicationsModalProps) {
  const { data: protocols = [] } = useProtocols();
  const { data: routes = [] } = useAdministrationRoutes();
  const [rows, setRows] = useState<DraftRow[]>([createRow(), createRow()]);

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows(current => current.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, ...patch };
      if (patch.protocolId) {
        const protocol = protocols.find(item => item.id === patch.protocolId);
        if (protocol?.administrationRouteId) next.routeId = protocol.administrationRouteId;
      }
      return next;
    }));
  }

  const validRows = rows.filter(row => row.protocolId && row.routeId);

  return (
    <div className="modal-overlay active" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 920 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="empty-state-icon" style={{ width: 40, height: 40, margin: 0 }}>
              <Layers3 size={20} />
            </div>
            <div>
              <h2 className="modal-title">Adicionar múltiplas aplicações</h2>
              <p className="card-description">Monte várias aplicações independentes antes de salvar.</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={async event => {
            event.preventDefault();
            await onSave(validRows.map(row => ({
              patientId,
              protocolId: row.protocolId,
              routeId: row.routeId,
              scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : null,
              notes: row.notes.trim() || null,
            })));
          }}
        >
          <div className="modal-body">
            <div className="flex justify-between items-center mb-4">
              <div>
                <strong>{validRows.length} aplicação{validRows.length === 1 ? "" : "es"} pronta{validRows.length === 1 ? "" : "s"} para salvar</strong>
                <p className="card-description">Linhas sem protocolo ou via serão ignoradas.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setRows(current => [...current, createRow()])}>
                <Plus size={16} />
                Adicionar linha
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Via</th>
                    <th>Data/hora opcional</th>
                    <th>Observações</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <select className="form-control" value={row.protocolId} onChange={event => updateRow(row.id, { protocolId: event.target.value })}>
                          <option value="">Selecione...</option>
                          {protocols.filter(protocol => Number(protocol.isActive) === 1).map(protocol => (
                            <option key={protocol.id} value={protocol.id}>{protocol.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-control" value={row.routeId} onChange={event => updateRow(row.id, { routeId: event.target.value })}>
                          <option value="">Selecione...</option>
                          {routes.map(route => (
                            <option key={route.id} value={route.id}>{route.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="form-control" type="datetime-local" value={row.scheduledAt} onChange={event => updateRow(row.id, { scheduledAt: event.target.value })} />
                      </td>
                      <td>
                        <input className="form-control" value={row.notes} onChange={event => updateRow(row.id, { notes: event.target.value })} />
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-icon" style={{ color: "var(--color-danger)" }} onClick={() => setRows(current => current.filter(item => item.id !== row.id))}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || validRows.length === 0}>
              {isSaving ? "Salvando..." : "Salvar aplicações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
