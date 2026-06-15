import type { ManualInventoryEntryInput } from "../types";

interface EntryReviewStepProps {
  data: ManualInventoryEntryInput;
  itemDisplayName: string;
  itemType: string;
}

function formatDate(value?: string) {
  if (!value) return "Nao informado";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function EntryReviewStep({ data, itemDisplayName, itemType }: EntryReviewStepProps) {
  const total = data.commercialQuantity * data.contentPerCommercialUnit;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Revisao da entrada</h3>
          <p className="card-description">Confira os dados antes de salvar no estoque local.</p>
        </div>
      </div>

      <div className="review-grid">
        <div><span>Item</span><strong>{itemDisplayName || "Nao informado"}</strong></div>
        <div><span>Tipo</span><strong>{itemType}</strong></div>
        <div><span>Fornecedor</span><strong>{data.supplierName || "Nao informado"}</strong></div>
        <div><span>Nota fiscal</span><strong>{data.invoiceNumber || "Nao informada"}</strong></div>
        <div><span>Lote</span><strong>{data.batchNumber || "Automatico para equipamento"}</strong></div>
        <div><span>Validade</span><strong>{formatDate(data.expirationDate)}</strong></div>
        <div><span>Entrada</span><strong>{formatDate(data.entryDate)}</strong></div>
        <div><span>Total controlado</span><strong>{total.toLocaleString("pt-BR")} {data.controlUnit}</strong></div>
      </div>
    </div>
  );
}

