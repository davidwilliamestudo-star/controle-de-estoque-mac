import { useDeferredValue, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Activity, Plus, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProcedures } from "../hooks/useProcedures";
import type { Procedure } from "../types";

const columnHelper = createColumnHelper<Procedure>();

export default function ProceduresPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  
  const { data: procedures = [], isLoading, error } = useProcedures();

  const displayedProcedures = useMemo(() => procedures.filter(p => 
    (p.patientName?.toLowerCase() || "").includes(deferredSearch.toLowerCase()) ||
    (p.protocolName?.toLowerCase() || "").includes(deferredSearch.toLowerCase())
  ), [procedures, deferredSearch]);

  const columns = useMemo(() => [
    columnHelper.accessor("patientName", {
      header: "Paciente",
      cell: ({ row }) => (
        <div>
          <p className="font-medium" style={{ color: "var(--color-gray-900)" }}>{row.original.patientName}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
            Protocolo: {row.original.protocolName || "-"}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("performedAt", {
      header: "Data",
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return "-";
        return format(new Date(val), "dd/MM/yyyy HH:mm", { locale: ptBR });
      },
    }),
    columnHelper.accessor("bodyAreaName", {
      header: "Area Corporal",
      cell: ({ getValue }) => <span style={{ color: "var(--color-gray-500)" }}>{getValue() || "-"}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue();
        if (status === "finalized") return <span className="badge badge-success">Finalizado</span>;
        if (status === "cancelled") return <span className="badge badge-danger">Cancelado</span>;
        return <span className="badge badge-neutral">Rascunho</span>;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Acoes</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {row.original.status !== "finalized" && (
            <button
              title="Continuar Atendimento"
              onClick={() => navigate({ to: "/procedures/new", search: { procedureId: row.original.id } })}
              className="btn btn-ghost btn-icon"
            >
              <Activity size={16} />
            </button>
          )}
        </div>
      ),
    }),
  ], [navigate]);

  const table = useReactTable({
    data: displayedProcedures,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Atendimentos</h1>
          <p className="page-subtitle">Historico de aplicacoes e procedimentos realizados.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ to: "/procedures/new" })}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Nova Aplicacao
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input" style={{ flex: 1, maxWidth: "none" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por paciente ou protocolo..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "64px 0" }}>
            <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-title" style={{ color: "var(--color-danger)" }}>Erro ao carregar atendimentos</div>
            <div className="empty-state-description">{String(error)}</div>
          </div>
        ) : displayedProcedures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText /></div>
            <div className="empty-state-title">{search ? "Nenhum atendimento encontrado" : "Ainda nao ha atendimentos registrados"}</div>
            <div className="empty-state-description">
              {search ? "Tente outro termo de busca." : "Clique em Nova Aplicacao para comecar."}
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

        {displayedProcedures.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--color-gray-100)", backgroundColor: "var(--color-gray-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
              {displayedProcedures.length} atendimento{displayedProcedures.length !== 1 ? "s" : ""} exibido{displayedProcedures.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                Anterior
              </button>
              <span className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
