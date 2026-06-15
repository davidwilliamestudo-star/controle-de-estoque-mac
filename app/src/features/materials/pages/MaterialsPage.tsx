import { Boxes } from "lucide-react";
import { InventoryTypePage } from "@/features/inventory/components/InventoryTypePage";

export default function MaterialsPage() {
  return (
    <InventoryTypePage
      itemType="material"
      title="Materiais"
      subtitle="Materiais de enfermagem e descartaveis com lote, validade e saldo real."
      emptyTitle="Nenhum material cadastrado"
      emptyDescription="Use Nova Entrada para cadastrar seringas, agulhas, descartaveis e demais materiais."
      icon={Boxes}
    />
  );
}

