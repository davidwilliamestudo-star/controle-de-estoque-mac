import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle } from "lucide-react";
import { useDetailedReport } from "../../hooks/useReports";
import type { ReportFilter, ReportType } from "../../schemas/report.schema";
import { ReportDocumentLayout } from "../ReportDocumentLayout";

interface Props {
  reportType: Exclude<ReportType, null>;
  filter: ReportFilter;
}

function formatCell(key: string, value: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("pt-BR")
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }

  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes("date") ||
    lowerKey.includes("_at") ||
    lowerKey.includes("expiration") ||
    lowerKey.includes("application")
  ) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const hasTime = value.includes(":");
      return format(parsed, hasTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: ptBR });
    }
  }

  if (lowerKey === "action" || lowerKey === "entity") {
    if (typeof value === "string") {
      // Basic translation map for audit logs
      const map: Record<string, string> = {
        report_viewed: "Relatorio Visualizado",
        procedure_finalized: "Procedimento Finalizado",
        patient_application_plan_created: "Plano de Aplicacao Criado",
        appointment_created: "Agendamento Criado",
        labels_job_created: "Geracao de Etiquetas",
        stock_entry_movement_created: "Entrada de Estoque",
        inventory_batch_created: "Lote Criado",
        report: "Relatorio",
        procedure: "Procedimento",
        patient_application_plan: "Plano de Aplicacao",
        appointment: "Agendamento",
        label_print_job: "Impressao de Etiquetas",
        stock_movement: "Movimentacao de Estoque",
        inventory_batch: "Lote",
      };
      if (map[value]) return map[value];
      
      // Fallback: title case the snake_case string
      return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  return value;
}

const toneClasses = {
  neutral: "bg-gray-50 text-gray-700",
  success: "bg-green-50 text-green-800",
  warning: "bg-yellow-50 text-yellow-800",
  danger: "bg-red-50 text-red-800",
  info: "bg-blue-50 text-blue-800",
};

export function DetailedOperationalReport({ reportType, filter }: Props) {
  const { data, isLoading, error } = useDetailedReport(reportType, filter, true);

  if (isLoading) {
    return (
      <ReportDocumentLayout title="Carregando relatorio" subtitle="Buscando dados no banco local...">
        <div className="text-center py-20 text-gray-500">Carregando informacoes...</div>
      </ReportDocumentLayout>
    );
  }

  if (error || !data) {
    return (
      <ReportDocumentLayout title="Relatorio indisponivel" subtitle="Nao foi possivel gerar este relatorio.">
        <div className="text-center py-20 text-red-600">
          Ocorreu um erro ao consultar os dados deste relatorio.
        </div>
      </ReportDocumentLayout>
    );
  }

  return (
    <ReportDocumentLayout title={data.title} subtitle={data.subtitle}>
      {data.summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {data.summary.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg p-4 border border-gray-100 ${toneClasses[item.tone || "neutral"]}`}
            >
              <p className="text-xs uppercase font-semibold opacity-70">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {data.notes && data.notes.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 flex gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            {data.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      )}

      {data.rows.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border border-dashed rounded-lg mt-4">
          Nenhum registro encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left border-collapse bg-white">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {data.columns.map((column) => (
                  <th
                    key={column.key}
                    className={`text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-4 ${
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((row, index) => (
                <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                  {data.columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-3 px-4 text-sm align-middle text-gray-700 ${
                        column.align === "right" ? "text-right font-medium" : column.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {column.key === "description" ? (
                        <span className="text-gray-600 block max-w-lg leading-relaxed">{formatCell(column.key, row[column.key])}</span>
                      ) : column.key === "action" || column.key === "entity" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {formatCell(column.key, row[column.key])}
                        </span>
                      ) : (
                        formatCell(column.key, row[column.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportDocumentLayout>
  );
}
