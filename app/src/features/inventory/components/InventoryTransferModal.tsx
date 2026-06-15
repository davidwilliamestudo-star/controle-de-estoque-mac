import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { locationsService } from "../services/locations.service";
import type { InventoryLocation, InventoryLocationStock } from "../types";

interface InventoryTransferModalProps {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryTransferModal({ inventoryItemId, itemName, unit, onClose, onSuccess }: InventoryTransferModalProps) {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [stocks, setStocks] = useState<InventoryLocationStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const [toLocationId, setToLocationId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [inventoryItemId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [locs, itemStocks] = await Promise.all([
        locationsService.listLocations(),
        locationsService.getStockByLocation(inventoryItemId)
      ]);
      setLocations(locs);
      setStocks(itemStocks);
      if (itemStocks.length > 0) setSelectedStockId(itemStocks[0].id);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar locais e estoque.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const stock = stocks.find(s => s.id === selectedStockId);
    if (!stock) {
      setError("Selecione um lote/local de origem.");
      return;
    }
    if (!toLocationId) {
      setError("Selecione um local de destino.");
      return;
    }
    if (stock.location_id === toLocationId) {
      setError("O local de destino não pode ser igual ao local de origem.");
      return;
    }
    
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (qty > stock.quantity) {
      setError(`Quantidade indisponível. O máximo é ${stock.quantity} ${unit}.`);
      return;
    }

    setIsSaving(true);
    try {
      await locationsService.transferStock({
        inventoryItemId,
        inventoryBatchId: stock.inventory_batch_id || undefined,
        fromLocationId: stock.location_id,
        toLocationId,
        quantity: qty,
        notes: notes.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro ao realizar transferência.");
      setIsSaving(false);
    }
  };

  const selectedStock = stocks.find(s => s.id === selectedStockId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transferência Interna</h3>
          <button className="btn btn-ghost btn-icon text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando dados...</div>
        ) : (
          <form onSubmit={handleTransfer} className="flex flex-col">
            <div className="p-6 space-y-5">
              {error && <div className="alert alert-error">{error}</div>}
              
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{itemName}</h4>
                <p className="text-sm text-gray-500">Selecione de onde retirar e para onde enviar o produto.</p>
              </div>

              {stocks.length === 0 ? (
                <div className="alert alert-warning">
                  Este item não possui saldo em nenhum local/armário para ser transferido.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Origem (Local e Lote) *</label>
                    <select 
                      className="form-control"
                      value={selectedStockId}
                      onChange={e => setSelectedStockId(e.target.value)}
                      required
                    >
                      <option value="">-- Selecione a origem --</option>
                      {stocks.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.location_name} {s.batch_number ? `(Lote: ${s.batch_number})` : ''} - Disp: {s.quantity} {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center text-gray-400 py-2">
                    <ArrowRight size={24} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Destino (Local) *</label>
                      <select 
                        className="form-control"
                        value={toLocationId}
                        onChange={e => setToLocationId(e.target.value)}
                        required
                      >
                        <option value="">-- Selecione --</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id} disabled={selectedStock?.location_id === l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quantidade ({unit}) *</label>
                      <input 
                        type="number"
                        className="form-control"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Observações (Opcional)</label>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Motivo da transferência..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSaving || stocks.length === 0}
              >
                {isSaving ? "Transferindo..." : "Confirmar Transferência"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
