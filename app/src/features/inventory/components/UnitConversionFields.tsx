interface UnitConversionFieldsProps {
  commercialQuantity: number;
  commercialUnit: string;
  contentPerCommercialUnit: number;
  controlUnit: string;
  onChange: (field: "commercialQuantity" | "commercialUnit" | "contentPerCommercialUnit" | "controlUnit", value: string | number) => void;
}

const commercialUnits = ["caixa", "frasco", "ampola", "pacote", "unidade"];
const controlUnits = ["mL", "mg", "UI", "ampola", "frasco", "unidade", "par"];

export function UnitConversionFields({
  commercialQuantity,
  commercialUnit,
  contentPerCommercialUnit,
  controlUnit,
  onChange,
}: UnitConversionFieldsProps) {
  const total = commercialQuantity * contentPerCommercialUnit;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Controle de unidade</h3>
          <p className="card-description">Converta a compra para a unidade usada no atendimento.</p>
        </div>
      </div>

      <div className="grid-4">
        <div className="form-group">
          <label className="form-label">Quantidade recebida</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            value={commercialQuantity}
            onChange={(event) => onChange("commercialQuantity", Number(event.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Unidade recebida</label>
          <select className="form-control" value={commercialUnit} onChange={(event) => onChange("commercialUnit", event.target.value)}>
            {commercialUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Conteudo por unidade</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            value={contentPerCommercialUnit}
            onChange={(event) => onChange("contentPerCommercialUnit", Number(event.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Unidade de controle</label>
          <select className="form-control" value={controlUnit} onChange={(event) => onChange("controlUnit", event.target.value)}>
            {controlUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      </div>

      <div className="entry-total-box">
        <span>Quantidade total controlada</span>
        <strong>{Number.isFinite(total) ? total.toLocaleString("pt-BR") : "0"} {controlUnit}</strong>
      </div>
    </div>
  );
}

