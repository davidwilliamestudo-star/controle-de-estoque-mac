import { InventoryEntryForm } from "../components/InventoryEntryForm";

export default function InventoryEntryPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Entrada de Estoque</h1>
          <p className="page-subtitle">Cadastre medicamentos e materiais recebidos ou ajuste saldos manualmente.</p>
        </div>
      </div>

      <InventoryEntryForm />
    </>
  );
}
