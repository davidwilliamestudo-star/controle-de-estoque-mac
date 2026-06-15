import { useMemo, useState } from "react";
import { Pill, Search } from "lucide-react";
import { usePatientUsedItems } from "../hooks/usePatients";
import { EmptyState } from "@/components/common/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientUsedItemsTabProps {
  patientId: string;
}

export function PatientUsedItemsTab({ patientId }: PatientUsedItemsTabProps) {
  const { data: items, isLoading } = usePatientUsedItems(patientId);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(i => 
      i.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando itens...</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="card">
        <EmptyState 
          icon={<Pill />} 
          title="Nenhum item utilizado" 
          description="Este paciente ainda não possui medicamentos ou materiais utilizados registrados." 
        />
      </div>
    );
  }

  return (
    <div className="card patient-table-card">
      <div className="patient-table-header">
        <div>
          <h3 className="card-title">Medicamentos e Materiais</h3>
          <p className="card-description">Itens efetivamente usados e baixados do estoque neste paciente</p>
        </div>
        
        <div className="search-bar patient-search-bar w-full md:w-64">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar item..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table premium-data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Tipo</th>
              <th className="text-right">Qtd. Total Usada</th>
              <th className="text-center">Vezes Usado</th>
              <th>Último Uso</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.item_id}>
                <td className="font-medium">{item.item_name}</td>
                <td>
                  <span className={`badge ${item.item_type === 'medication' ? 'badge-primary' : 'badge-neutral'}`}>
                    {item.item_type === 'medication' ? 'Medicamento' : 'Material'}
                  </span>
                </td>
                <td className="text-right">{Number(item.total_quantity).toFixed(2)} {item.unit}</td>
                <td className="text-center">{item.usage_count}</td>
                <td>
                  {item.last_used_at ? format(new Date(item.last_used_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">Nenhum item encontrado com o filtro atual.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
