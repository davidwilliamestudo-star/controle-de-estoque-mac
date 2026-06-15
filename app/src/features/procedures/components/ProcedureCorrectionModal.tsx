import { useState } from "react";
import { AlertTriangle, Check, X, Package } from "lucide-react";
import type { PatientProcedureHistoryItem } from "../../patients/schemas/patient.schema";
import { procedureCorrectionService } from "../services/procedureCorrection.service";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { ProcedureItemsPanel } from "./ProcedureItemsPanel";
import type { ProcedureItemUsed } from "../types";

interface ProcedureCorrectionModalProps {
  procedure: PatientProcedureHistoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcedureCorrectionModal({ procedure, onClose, onSuccess }: ProcedureCorrectionModalProps) {
  const [reason, setReason] = useState("");
  const [regenerateEvolution, setRegenerateEvolution] = useState(false);
  const [intercurrence, setIntercurrence] = useState(!!procedure.had_intercurrence);
  const [intercurrenceDescription, setIntercurrenceDescription] = useState(procedure.intercurrence_description || "");
  const [notes, setNotes] = useState(procedure.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize items from the procedure's existing items
  const [items, setItems] = useState<Partial<ProcedureItemUsed>[]>(() => {
    return procedure.items_used ? procedure.items_used.map(item => ({
      inventoryItemId: item.inventory_item_id,
      inventoryBatchId: item.inventory_batch_id,
      quantityUsed: item.quantity_used,
      unit: item.unit,
      itemType: item.item_type,
      batchNumberSnapshot: item.batch_number_snapshot,
      expirationDateSnapshot: item.expiration_date_snapshot,
    })) : [];
  });

  const { data: inventoryData } = useInventoryOptions();

  const protocolName = procedure.protocol_name ?? "Procedimento avulso";
  const performedAt = procedure.performed_at
    ? new Date(procedure.performed_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Data não informada";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Motivo da correção é obrigatório.");
      return;
    }

    if (items.some(item => !item.inventoryItemId || !item.quantityUsed || Number(item.quantityUsed) <= 0)) {
      setError("Verifique se todos os itens possuem Medicamento/Material e Quantidade válida.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const userId = "current-user-id";

      await procedureCorrectionService.correctFinalizedProcedure({
        procedureId: procedure.id,
        userId,
        reason,
        regenerateEvolution,
        updates: {
          bodyAreaId: procedure.body_area_id, // mantemos o mesmo, a nao ser q precisasse editar
          intercurrence,
          intercurrenceDescription: intercurrence ? intercurrenceDescription : null,
          notes,
          items: items.map(item => ({
            inventoryItemId: item.inventoryItemId,
            inventoryBatchId: item.inventoryBatchId,
            quantityUsed: Number(item.quantityUsed),
            unit: item.unit,
          })),
        },
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro ao corrigir procedimento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay active correction-modal-overlay">
      <div 
        className="correction-modal-shell" 
        style={{ maxWidth: "900px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="correction-modal-header flex-shrink-0">
          <div className="correction-modal-title-wrap">
            <div className="correction-modal-title-badge">
              <AlertTriangle className="text-amber-500" size={18} />
            </div>
            <div>
              <h2 className="correction-modal-title">Corrigir Procedimento Finalizado</h2>
              <p className="correction-modal-subtitle">
                {protocolName} - {performedAt}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon correction-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f8fafc" }}>
          <form id="correction-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="correction-callout correction-callout-warning m-0">
              <strong>Atenção:</strong> Alterar itens, lotes ou quantidades recalcula automaticamente o estoque e registra logs auditáveis na base de dados (IN/OUT estritos).
            </div>

            {error && <div className="clinical-alert clinical-alert-danger">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Esquerda: Itens */}
              <div className="flex flex-col gap-4">
                <ProcedureItemsPanel 
                  items={items} 
                  setItems={setItems} 
                  inventoryData={inventoryData} 
                />
              </div>

              {/* Direita: Textos e Justificativa */}
              <div className="flex flex-col gap-4">
                <section className="card p-4">
                  <div className="form-group mb-4">
                    <label className="form-label flex justify-between">
                      <span>Motivo da Correção *</span>
                    </label>
                    <textarea
                      className="form-control correction-textarea"
                      required
                      value={reason}
                      onChange={event => setReason(event.target.value)}
                      placeholder="Explique o motivo do estorno, ajuste de lote, quantidade..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="correction-toggle-row p-3 border rounded-lg bg-gray-50">
                      <input
                        type="checkbox"
                        checked={intercurrence}
                        onChange={event => setIntercurrence(event.target.checked)}
                      />
                      <div>
                        <strong className="text-sm">Houve intercorrência?</strong>
                        <p className="text-xs text-gray-500">Marque se a ocorrência clínica mudou.</p>
                      </div>
                    </label>
                  </div>

                  {intercurrence && (
                    <div className="form-group mb-4">
                      <label className="form-label text-xs">Descrição da intercorrência</label>
                      <textarea
                        className="form-control text-sm"
                        value={intercurrenceDescription}
                        onChange={event => setIntercurrenceDescription(event.target.value)}
                        placeholder="Descreva..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Observações gerais</label>
                    <textarea
                      className="form-control text-sm"
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Registros complementares..."
                      rows={2}
                    />
                  </div>
                </section>

                <section className="card p-4 bg-amber-50 border-amber-200">
                  <label className="correction-toggle-row">
                    <input
                      type="checkbox"
                      checked={regenerateEvolution}
                      onChange={event => setRegenerateEvolution(event.target.checked)}
                    />
                    <div>
                      <strong className="text-amber-900 text-sm">Regenerar evolução automática</strong>
                      <p className="text-xs text-amber-700">Reescreve o texto com os novos itens. Edições manuais feitas na evolução original serão perdidas.</p>
                    </div>
                  </label>
                </section>
              </div>
            </div>
          </form>
        </div>

        <div className="correction-modal-footer flex-shrink-0 bg-white border-t p-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost text-gray-600">
            Cancelar
          </button>
          <button type="submit" form="correction-form" disabled={isSubmitting} className="btn btn-primary bg-amber-600 hover:bg-amber-700 text-white border-transparent">
            {isSubmitting ? (
              "Salvando..."
            ) : (
              <>
                <Check size={16} /> Salvar Correção
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
