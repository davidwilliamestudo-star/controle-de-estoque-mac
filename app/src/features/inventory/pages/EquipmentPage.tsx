import { Wrench } from "lucide-react";
import { InventoryTypePage } from "../components/InventoryTypePage";

export default function EquipmentPage() {
  return (
    <InventoryTypePage
      itemType="equipment"
      title="Equipamentos"
      subtitle="Equipamentos e acessorios clinicos controlados no estoque local."
      emptyTitle="Nenhum equipamento cadastrado"
      emptyDescription="Use Nova Entrada para cadastrar equipamentos ou acessorios reutilizaveis."
      icon={Wrench}
    />
  );
}

