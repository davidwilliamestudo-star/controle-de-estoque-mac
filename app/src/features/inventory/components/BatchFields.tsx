import type { InventoryItemType } from "../types";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface BatchFieldsProps {
  itemType: InventoryItemType;
  batchNumber: string;
  manufacturingDate: string;
  expirationDate: string;
  unitCost: number;
  onChange: (field: "batchNumber" | "manufacturingDate" | "expirationDate" | "unitCost", value: string | number) => void;
}

function getExpirationWarning(expirationDate: string): string | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(`${expirationDate}T00:00:00`);
  const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Validade vencida. Medicamentos e materiais nao podem entrar vencidos.";
  if (diffDays <= 30) return "Validade proxima: este lote vence em ate 30 dias.";
  return null;
}

export function BatchFields({
  itemType,
  batchNumber,
  manufacturingDate,
  expirationDate,
  unitCost,
  onChange,
}: BatchFieldsProps) {
  const requiresBatch = itemType === "medication" || itemType === "material";
  const warning = getExpirationWarning(expirationDate);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Lote e validade</h3>
          <p className="card-description">
            Medicamentos e materiais exigem lote e validade. Equipamentos podem usar lote interno automatico.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <div className="form-group">
          <label className="form-label">Lote {requiresBatch ? "*" : ""}</label>
          <input
            className="form-control"
            value={batchNumber}
            onChange={(event) => onChange("batchNumber", event.target.value)}
            placeholder={requiresBatch ? "Ex.: L23091" : "Opcional"}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Fabricacao</label>
          <input
            type="date"
            className="form-control"
            value={manufacturingDate}
            onChange={(event) => onChange("manufacturingDate", event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Validade {requiresBatch ? "*" : ""}</label>
          <input
            type="date"
            className="form-control"
            value={expirationDate}
            onChange={(event) => onChange("expirationDate", event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Custo unitário (R$)</label>
          <CurrencyInput
            value={unitCost}
            onChange={(v) => onChange("unitCost", v)}
            label="Custo unitário"
          />
          <p className="text-xs text-gray-400 mt-1">Custo por unidade de controle. Usado no CMV financeiro.</p>
        </div>
      </div>

      {warning && <div className={`badge ${warning.includes("vencida") ? "badge-danger" : "badge-warning"} mt-4`}>{warning}</div>}
    </div>
  );
}

