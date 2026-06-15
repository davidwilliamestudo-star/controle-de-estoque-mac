import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { InventoryItem, StockAdjustmentInput } from "../types";

interface StockAdjustmentModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSubmit: (data: StockAdjustmentInput) => Promise<void>;
  isSaving: boolean;
}

export function StockAdjustmentModal({ item, onClose, onSubmit, isSaving }: StockAdjustmentModalProps) {
  const currentStock = Number(item.current_stock ?? 0);
  const [newQuantity, setNewQuantity] = useState(currentStock);
  const [reason, setReason] = useState("Acerto manual de estoque");
  const [notes, setNotes] = useState("");
  const delta = useMemo(() => newQuantity - currentStock, [newQuantity, currentStock]);

  return (
    <div className="modal-overlay active" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="empty-state-icon" style={{ width: 40, height: 40, margin: 0 }}>
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="modal-title">Acerto de estoque</h2>
              <p className="card-description">{item.name}</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={async event => {
            event.preventDefault();
            await onSubmit({
              inventoryItemId: item.id,
              newQuantity,
              reason,
              notes,
            });
          }}
        >
          <div className="modal-body">
            <div className="review-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div><span>Saldo atual</span><strong>{currentStock.toLocaleString("pt-BR")} {item.unit}</strong></div>
              <div><span>Novo saldo</span><strong>{newQuantity.toLocaleString("pt-BR")} {item.unit}</strong></div>
              <div><span>Diferença</span><strong style={{ color: delta < 0 ? "var(--color-danger)" : delta > 0 ? "var(--color-success)" : "var(--color-gray-700)" }}>{delta.toLocaleString("pt-BR")} {item.unit}</strong></div>
            </div>

            <div className="form-group mt-4">
              <label className="form-label">Novo saldo real</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={newQuantity}
                onChange={event => setNewQuantity(Number(event.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo do acerto</label>
              <input className="form-control" value={reason} onChange={event => setReason(event.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Ex: contagem física, perda, conferência de lote..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? "Ajustando..." : "Salvar acerto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
