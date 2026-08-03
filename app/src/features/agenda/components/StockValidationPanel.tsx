import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { appointmentStockValidationService } from "../services/appointmentStockValidation.service";
import type { StockValidationResult } from "../types/appointmentStockValidation";

interface StockValidationPanelProps {
  protocolId?: string;
  applicationPlanId?: string;
  excludeAppointmentId?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export function StockValidationPanel({ 
  protocolId, 
  applicationPlanId, 
  excludeAppointmentId,
  onValidationChange 
}: StockValidationPanelProps) {

  const query = useQuery({
    queryKey: ["stock-validation", protocolId, applicationPlanId, excludeAppointmentId],
    queryFn: async () => {
      let result: StockValidationResult | null = null;
      if (applicationPlanId) {
        result = await appointmentStockValidationService.validatePlanStock(applicationPlanId, excludeAppointmentId);
      } else if (protocolId) {
        result = await appointmentStockValidationService.validateProtocolStock(protocolId, excludeAppointmentId);
      }
      return result;
    },
    enabled: !!protocolId || !!applicationPlanId,
  });

  const result = query.data;

  // Atualizar o form parent sobre a validade do estoque (opcional, para bloquear o submit)
  useEffect(() => {
    if (result && onValidationChange) {
      onValidationChange(result.isSufficient);
    }
  }, [result, onValidationChange]);

  if (!protocolId && !applicationPlanId) return null;
  if (query.isLoading) return <div className="p-3 text-sm text-gray-500">Verificando estoque...</div>;
  if (!result || result.items.length === 0) return <div className="p-3 text-sm text-gray-500">Nenhum item obrigatório no protocolo.</div>;

  return (
    <div className={`mt-4 border rounded-md overflow-hidden ${
      !result.isSufficient ? "border-red-300" : result.hasWarnings ? "border-yellow-300" : "border-green-200"
    }`}>
      <div className={`p-3 flex items-center gap-2 ${
        !result.isSufficient ? "bg-red-50 text-red-800" : result.hasWarnings ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"
      }`}>
        {!result.isSufficient ? (
          <AlertCircle size={18} />
        ) : result.hasWarnings ? (
          <AlertTriangle size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        <h4 className="font-medium text-sm">
          {!result.isSufficient ? "Estoque Insuficiente" : result.hasWarnings ? "Atenção ao Estoque" : "Estoque Suficiente"}
        </h4>
      </div>

      <div className="bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Necessário</th>
              <th className="px-3 py-2 text-right">Atual</th>
              <th className="px-3 py-2 text-right">Reservado</th>
              <th className="px-3 py-2 text-right">Disponível</th>
              <th className="px-3 py-2">Lote Sugerido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.items.map((item, idx) => (
              <tr key={idx} className={
                item.status === "insufficient" ? "bg-red-50/50" : item.status === "warning" ? "bg-yellow-50/50" : ""
              }>
                <td className="px-3 py-2 font-medium">{item.itemName}</td>
                <td className="px-3 py-2 text-right">{item.requiredQuantity} {item.unit}</td>
                <td className="px-3 py-2 text-right">{item.currentStock} {item.unit}</td>
                <td className="px-3 py-2 text-right">{item.reservedStock} {item.unit}</td>
                <td className={`px-3 py-2 text-right font-medium ${item.availableStock < item.requiredQuantity ? "text-red-600" : ""}`}>
                  {item.availableStock} {item.unit}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {item.suggestedBatchNumber ? (
                    <span>
                      {item.suggestedBatchNumber}
                      {item.suggestedBatchExpiration && (
                        <span className="text-[10px] ml-1 text-gray-400">
                          (Vence: {new Date(item.suggestedBatchExpiration).toLocaleDateString('pt-BR')})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!result.isSufficient && (
        <div className="p-2 bg-red-50 text-red-700 text-xs flex gap-1 items-start border-t border-red-100">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <p>Você não pode agendar este protocolo pois faltam insumos. Atualize o estoque ou escolha um protocolo diferente.</p>
        </div>
      )}
    </div>
  );
}
