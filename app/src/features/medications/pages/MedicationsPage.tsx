import { Pill } from "lucide-react";
import { InventoryTypePage } from "@/features/inventory/components/InventoryTypePage";

export default function MedicationsPage() {
  return (
    <InventoryTypePage
      itemType="medication"
      title="Medicamentos"
      subtitle="Medicamentos com lote, validade, unidade clinica e saldo atual."
      emptyTitle="Nenhum medicamento cadastrado"
      emptyDescription="Use Nova Entrada para cadastrar o primeiro medicamento com lote e validade."
      icon={Pill}
    />
  );
}

