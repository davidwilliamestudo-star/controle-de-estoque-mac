import { useDeferredValue, useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, Shield, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuditLogs } from "../hooks/useAuditLogs";
import type { AuditLogItem } from "../repositories/audit.repository";
import { AuditDetailsModal } from "../components/AuditDetailsModal";

const columnHelper = createColumnHelper<AuditLogItem>();

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const deferredSearch = useDeferredValue(search);
  const { data: logs = [], isLoading, error } = useAuditLogs({
    search: deferredSearch,
    entity_type: entityFilter || undefined,
  });

  const columns = useMemo(() => [
    columnHelper.accessor("created_at", {
      header: "Data",
      cell: ({ getValue }) => format(new Date(getValue()), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
    }),
    columnHelper.accessor("user_name", {
      header: "Usuário",
      cell: ({ getValue, row }) => getValue() || (row.original.user_id ? "Usuário Excluído" : "Sistema"),
    }),
    columnHelper.accessor("action", {
      header: "Ação",
      cell: ({ getValue }) => <span className="font-medium text-xs badge badge-neutral" style={{ whiteSpace: "nowrap" }}>{getValue()}</span>,
    }),
    columnHelper.accessor("entity_type", {
      header: "Entidade",
      cell: ({ getValue, row }) => (
        <div>
          <p className="font-medium">{getValue() || "-"}</p>
          {row.original.entity_id && (
            <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
              ID: {row.original.entity_id.slice(0, 8)}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Descrição",
      cell: ({ getValue }) => <span className="text-sm">{getValue() || "-"}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            title="Ver Detalhes"
            onClick={() => setSelectedLog(row.original)}
            className="btn btn-ghost btn-icon"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    }),
  ], [setSelectedLog]);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Shield size={24} style={{ display: 'inline', marginRight: 8, color: 'var(--color-green-deep)', verticalAlign: 'text-bottom' }}/> Auditoria</h1>
          <p className="page-subtitle">Registro de ações, acessos e alterações no sistema.</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input" style={{ flex: 1, maxWidth: "none" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por descrição, ação ou usuário..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={entityFilter}
            onChange={event => setEntityFilter(event.target.value)}
          >
            <option value="">Todas as Entidades</option>
            <option value="patient">Paciente</option>
            <option value="inventory_item">Estoque</option>
            <option value="procedure">Aplicação</option>
            <option value="protocol">Protocolo</option>
            <option value="settings">Configurações</option>
            <option value="user">Usuário</option>
            <option value="auth">Autenticação</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "64px 0" }}>
            <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-title" style={{ color: "var(--color-danger)" }}>Erro ao carregar logs</div>
            <div className="empty-state-description">{String(error)}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Shield /></div>
            <div className="empty-state-title">{search || entityFilter ? "Nenhum log encontrado" : "Nenhum registro de auditoria"}</div>
            <div className="empty-state-description">
              {search || entityFilter ? "Tente outro termo de busca ou ajuste os filtros." : "As ações do sistema aparecerão aqui."}
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--color-gray-100)", backgroundColor: "var(--color-gray-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
              {logs.length} registro{logs.length !== 1 ? "s" : ""} encontrado{logs.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                Anterior
              </button>
              <span className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <AuditDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  );
}
