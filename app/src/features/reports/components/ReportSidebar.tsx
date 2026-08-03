/**
 * ReportSidebar.tsx — lista larga e legível
 */
import type { ElementType } from "react";
import {
  Search,
  Users,
  Package,
  Activity,
  ShoppingCart,
  ChevronRight,
  FileText,
  CalendarDays,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReportType } from "../schemas/report.schema";

type ConcreteReportType = Exclude<ReportType, null>;

export const reportGroups: Array<{
  id: string;
  title: string;
  icon: ElementType;
  reports: Array<{ id: ConcreteReportType; name: string; description: string; badge?: string }>;
}> = [
  {
    id: "patients",
    title: "Pacientes",
    icon: Users,
    reports: [
      { id: "patient_general", name: "Analítico do Paciente", description: "Cadastro, aplicações e lotes." },
      { id: "patient_history", name: "Histórico de Aplicações", description: "Atendimentos por período." },
      { id: "patient_evolutions", name: "Evoluções", description: "Evoluções e intercorrências." },
      { id: "patient_medications", name: "Medicamentos Utilizados", description: "Medicamentos por paciente." },
      { id: "patient_materials", name: "Materiais Utilizados", description: "Materiais nas aplicações." },
      { id: "patient_batches", name: "Lotes por Paciente", description: "Lotes vinculados." },
      { id: "patient_body_areas", name: "Áreas Corporais", description: "Resumo por área." },
    ],
  },
  {
    id: "inventory",
    title: "Estoque",
    icon: Package,
    reports: [
      { id: "stock_position", name: "Posição de Estoque", description: "Saldo e vencimentos." },
      { id: "stock_low", name: "Estoque Baixo", description: "Abaixo do mínimo.", badge: "⚠" },
      { id: "stock_expirations", name: "Vencimentos Próximos", description: "30 dias.", badge: "⚠" },
      { id: "stock_expired", name: "Itens Vencidos", description: "Lotes vencidos." },
      { id: "stock_forecasting", name: "Previsão de Ruptura", description: "Risco de falta." },
      { id: "top_consumed", name: "Top Consumo e Custos", description: "Mais usados." },
      { id: "stock_consumption", name: "Consumo por Período", description: "Agregado por item." },
      { id: "stock_movements", name: "Movimentações", description: "Entradas e saídas." },
      { id: "stock_entries", name: "Entradas", description: "Entradas no estoque." },
      { id: "stock_exits", name: "Saídas e Perdas", description: "Baixas manuais." },
    ],
  },
  {
    id: "operations",
    title: "Operação",
    icon: Activity,
    reports: [
      { id: "batch_by_item", name: "Lotes por Item", description: "Inventário de lotes." },
      { id: "patients_by_batch", name: "Pacientes por Lote", description: "Rastreabilidade." },
      { id: "protocols_list", name: "Protocolos Cadastrados", description: "Lista de protocolos." },
      { id: "protocol_procedures", name: "Aplicações por Protocolo", description: "Volume por protocolo." },
      { id: "audit_log", name: "Log de Auditoria", description: "Logs do sistema." },
      { id: "labels_generated", name: "Etiquetas Geradas", description: "Histórico de impressão." },
    ],
  },
];

interface ReportSidebarProps {
  selectedReportType: ReportType;
  onSelectReport: (type: ConcreteReportType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ReportSidebar({
  selectedReportType,
  onSelectReport,
  searchQuery,
  onSearchChange,
}: ReportSidebarProps) {
  const filteredGroups = reportGroups
    .map((group) => ({
      ...group,
      reports: group.reports.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((g) => g.reports.length > 0);

  return (
    <aside
      className="w-[300px] xl:w-[320px] shrink-0 flex flex-col h-full border-r"
      style={{ backgroundColor: "#F7F4EE", borderColor: "#E8E0D2" }}
    >
      <div className="p-4 border-b space-y-3" style={{ borderColor: "#E8E0D2" }}>
        <Link
          to="/resumo-mes"
          className="flex items-center gap-3 w-full min-h-[56px] px-4 rounded-2xl text-sm font-bold transition-all"
          style={{ backgroundColor: "#1A5347", color: "#FFFFFF" }}
        >
          <CalendarDays size={20} className="shrink-0 opacity-90" />
          <span className="flex-1 text-left leading-tight">
            Resumo do Mês
            <span className="block text-xs font-medium opacity-70 mt-0.5">Visão simples</span>
          </span>
          <ChevronRight size={18} className="opacity-60" />
        </Link>

        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            size={18}
            style={{ color: "#B8A083" }}
          />
          <input
            type="text"
            placeholder="Buscar relatório..."
            className="w-full min-h-[48px] pl-11 pr-4 bg-white border rounded-2xl text-sm font-medium focus:outline-none focus:border-[#1A5347] focus:ring-4 focus:ring-[#1A5347]/10"
            style={{ borderColor: "#E5DEC9", color: "#111827" }}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText size={28} className="mx-auto mb-3" style={{ color: "#B8A083" }} />
            <p className="text-sm font-semibold" style={{ color: "#5C4033" }}>
              Nenhum relatório encontrado
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 px-3 mb-2.5">
                  <Icon size={14} style={{ color: "#B8A083" }} />
                  <h3
                    className="text-xs font-bold uppercase tracking-[0.14em]"
                    style={{ color: "#B8A083" }}
                  >
                    {group.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {group.reports.map((report) => {
                    const isSelected = selectedReportType === report.id;
                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => onSelectReport(report.id)}
                        className="w-full text-left min-h-[52px] px-3.5 py-3 rounded-2xl transition-all"
                        style={
                          isSelected
                            ? {
                                backgroundColor: "#1A5347",
                                color: "#FFFFFF",
                                boxShadow: "0 8px 20px -6px rgba(26,83,71,0.4)",
                              }
                            : { backgroundColor: "transparent", color: "#3D2B22" }
                        }
                      >
                        <span className="flex items-center gap-2">
                          {report.badge && (
                            <span className="text-sm" style={{ opacity: isSelected ? 0.85 : 1 }}>
                              {report.badge}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm leading-snug ${
                                isSelected ? "font-bold" : "font-semibold"
                              }`}
                            >
                              {report.name}
                            </span>
                            <span
                              className="block text-xs mt-0.5 leading-snug"
                              style={{
                                color: isSelected ? "rgba(255,255,255,0.7)" : "#9A8B7A",
                              }}
                            >
                              {report.description}
                            </span>
                          </span>
                          {isSelected && <ChevronRight size={16} className="shrink-0 opacity-70" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t" style={{ borderColor: "#E8E0D2" }}>
        <Link
          to="/reports/purchase-plan"
          className="flex items-center gap-3 w-full min-h-[52px] px-4 rounded-2xl text-sm font-bold border bg-white transition-all hover:shadow-sm"
          style={{ borderColor: "#E5DEC9", color: "#1A5347" }}
        >
          <ShoppingCart size={18} />
          <span className="flex-1">Lista de Compras</span>
          <ChevronRight size={16} style={{ color: "#B8A083" }} />
        </Link>
      </div>
    </aside>
  );
}
