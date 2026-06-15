import { Package, Plus, Trash2 } from "lucide-react";
import type { ProcedureItemUsed } from "../types";
import { useBatchesForItem } from "../hooks/useBodyAreas";

interface ProcedureItemsPanelProps {
  items: Partial<ProcedureItemUsed>[];
  setItems: React.Dispatch<React.SetStateAction<Partial<ProcedureItemUsed>[]>>;
  inventoryData: any;
}

export function ProcedureItemsPanel({ items, setItems, inventoryData }: ProcedureItemsPanelProps) {
  const handleAddItem = () => {
    setItems([
      ...items, 
      { inventoryItemId: "", inventoryBatchId: "", quantityUsed: 1, unit: "un", itemType: "medication" }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onItemChange = (index: number, field: keyof ProcedureItemUsed | "batchSelect", value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === "inventoryItemId" && inventoryData) {
      const invItem = inventoryData.items.find((i: any) => i.id === value);
      if (invItem) {
        item.inventoryItemId = value;
        item.unit = invItem.unit;
        item.itemType = invItem.item_type as any;
        item.inventoryBatchId = "";
      }
    } else if (field === "batchSelect") {
      item.inventoryBatchId = value;
    } else {
      (item as any)[field] = value;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  return (
    <div className="card procedure-items-card" style={{ borderColor: "var(--color-gray-200)" }}>
      <div className="procedure-card-heading">
        <div>
          <h2>
            <Package size={16} style={{ color: "var(--color-green-deep)" }} /> Itens Utilizados
          </h2>
          <p>Conferencia de medicamentos, materiais, quantidades e lotes.</p>
        </div>
        <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-gray-50 border border-dashed rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            Nenhum item adicionado. Adicione medicamentos ou materiais.
          </p>
        </div>
      ) : (
        <div className="procedure-item-list">
          {items.map((item, index) => (
            <ProcedureItemRow
              key={index}
              item={item}
              index={index}
              inventoryData={inventoryData}
              onItemChange={onItemChange}
              onRemove={() => handleRemoveItem(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProcedureItemRow({
  item, index, inventoryData, onItemChange, onRemove,
}: {
  item: Partial<ProcedureItemUsed>;
  index: number;
  inventoryData: any;
  onItemChange: (i: number, field: any, value: any) => void;
  onRemove: () => void;
}) {
  const { data: batches = [] } = useBatchesForItem(item.inventoryItemId || null);
  const selectedInventoryItem = inventoryData?.items.find((candidate: any) => candidate.id === item.inventoryItemId);
  const requiresBatch = Number(selectedInventoryItem?.requires_batch ?? 0) === 1;

  return (
    <div className="procedure-item-row" style={{ borderColor: requiresBatch && !item.inventoryBatchId && item.inventoryItemId ? "rgba(245, 158, 11, 0.45)" : "var(--color-gray-200)" }}>
      <div className="procedure-item-main-row">
        <div className="flex-1 form-group mb-0">
          <label className="form-label text-xs">Item *</label>
          <select
            className="form-control text-sm bg-white"
            value={item.inventoryItemId}
            onChange={e => onItemChange(index, "inventoryItemId", e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {inventoryData?.items.map((opt: any) => (
              <option key={opt.id} value={opt.id}>
                {opt.name} ({opt.current_stock} disp.)
              </option>
            ))}
          </select>
        </div>
        <div className="procedure-quantity-field form-group mb-0">
          <label className="form-label text-xs">Qtd *</label>
          <input
            type="number" step="0.01" min="0.01"
            className="form-control text-sm bg-white"
            value={item.quantityUsed || ""}
            onChange={e => onItemChange(index, "quantityUsed", e.target.value)}
            required
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost btn-icon procedure-remove-item"
          style={{ color: "var(--color-danger)" }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {item.inventoryItemId && (
        <div className="form-group mb-0 procedure-batch-field">
          <label className="form-label text-xs flex justify-between">
            <span>Lote {requiresBatch ? "*" : "(opcional)"} {batches.length === 0 ? "(sem lotes ativos)" : ""}</span>
          </label>
          {batches.length > 0 ? (
            <select
              className="form-control text-sm bg-white"
              value={item.inventoryBatchId || ""}
              onChange={e => onItemChange(index, "batchSelect", e.target.value)}
              required={requiresBatch}
            >
              <option value="">{requiresBatch ? "Selecione um lote..." : "Selecionar lote (opcional)..."}</option>
              {batches.map((batch: any) => {
                const exp = batch.expirationDate
                  ? new Date(batch.expirationDate).toLocaleDateString("pt-BR")
                  : "sem val.";
                const soon = batch.expirationDate &&
                  new Date(batch.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} — {batch.currentQuantity} disp. — Val: {exp}{soon ? " ⚠️" : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="text"
              className="form-control text-sm bg-white"
              placeholder="Número do lote (Opcional)"
              value={item.batchNumberSnapshot || ""}
              onChange={e => onItemChange(index, "batchNumberSnapshot", e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}
