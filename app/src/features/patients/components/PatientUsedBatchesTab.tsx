import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { usePatientUsedBatches } from "../hooks/usePatients";
import { EmptyState } from "@/components/common/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientUsedBatchesTabProps {
  patientId: string;
}

export function PatientUsedBatchesTab({ patientId }: PatientUsedBatchesTabProps) {
  const { data: batches, isLoading } = usePatientUsedBatches(patientId);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    return batches.filter(b => 
      (b.batch_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [batches, searchTerm]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando lotes...</div>;
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="card">
        <EmptyState 
          icon={<Package />} 
          title="Nenhum lote utilizado" 
          description="Este paciente ainda não possui itens controlados por lote utilizados." 
        />
      </div>
    );
  }

  return (
    <div className="card patient-table-card">
      <div className="patient-table-header">
        <div>
          <h3 className="card-title">Lotes Utilizados</h3>
          <p className="card-description">Rastreabilidade completa de lotes já aplicados no paciente</p>
        </div>
        
        <div className="search-bar patient-search-bar w-full md:w-64">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar lote ou item..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table premium-data-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Item</th>
              <th>Validade</th>
              <th className="text-right">Qtd. Usada deste Lote</th>
              <th>Último Uso</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map(batch => (
              <tr key={batch.batch_id}>
                <td className="font-semibold text-gray-900">{batch.batch_number || "Sem Lote"}</td>
                <td>{batch.item_name}</td>
                <td>
                  {batch.expiration_date ? format(new Date(batch.expiration_date), "MM/yyyy") : '-'}
                </td>
                <td className="text-right">{Number(batch.total_quantity_used).toFixed(2)} {batch.unit}</td>
                <td>
                  {batch.last_used_at ? format(new Date(batch.last_used_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </td>
              </tr>
            ))}
            {filteredBatches.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">Nenhum lote encontrado com o filtro atual.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
