import { useDeferredValue, useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileText, Plus, Search, Edit3, Settings, Trash2 } from "lucide-react";
import { useProtocols, useProtocolWithItems, useDeleteProtocol } from "../hooks/useProtocols";
import type { Protocol } from "../types";
import { ProtocolFormModal } from "../components/ProtocolFormModal";
import { EvolutionTemplatesTab } from "../components/EvolutionTemplatesTab";

const columnHelper = createColumnHelper<Protocol>();

export default function ProtocolsPage() {
  const [activeTab, setActiveTab] = useState<"protocols" | "templates">("protocols");
  
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  
  const { data: protocols = [], isLoading, error } = useProtocols();
  const deleteProtocol = useDeleteProtocol();
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // When editing, fetch the full protocol with items
  const { data: editingData } = useProtocolWithItems(editingProtocolId);

  // If we just clicked "Novo Protocolo", show form without data
  const isCreating = showForm && !editingProtocolId;
  const isEditing = showForm && editingProtocolId && editingData;

  const displayedProtocols = useMemo(() => {
    return protocols.filter(p => 
      p.name.toLowerCase().includes(deferredSearch.toLowerCase())
    );
  }, [protocols, deferredSearch]);

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Protocolo",
      cell: ({ row }) => (
        <div>
          <p className="font-medium" style={{ color: "var(--color-gray-900)" }}>{row.original.name}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
            ID: #{row.original.id.slice(0, 8)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("categoryName", {
      header: "Categoria",
      cell: ({ getValue }) => <span style={{ color: "var(--color-gray-500)" }}>{getValue() || "-"}</span>,
    }),
    columnHelper.accessor("routeName", {
      header: "Via de Aplicacao",
      cell: ({ getValue }) => <span style={{ color: "var(--color-gray-500)" }}>{getValue() || "-"}</span>,
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: ({ getValue }) => (
        <span className={`badge ${getValue() ? "badge-success" : "badge-neutral"}`}>
          {getValue() ? "Ativo" : "Inativo"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Acoes</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button
            title="Editar Protocolo"
            onClick={() => {
              setEditingProtocolId(row.original.id);
              setShowForm(true);
            }}
            className="btn btn-ghost btn-icon"
          >
            <Edit3 size={16} />
          </button>
          <button
            title="Excluir Protocolo"
            onClick={() => {
              if (window.confirm("Tem certeza que deseja excluir este protocolo? Esta acao nao pode ser desfeita.")) {
                deleteProtocol.mutate(row.original.id);
              }
            }}
            className="btn btn-ghost btn-icon"
            style={{ color: "var(--color-danger)" }}
            disabled={deleteProtocol.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    }),
  ], [deleteProtocol.isPending]);

  const table = useReactTable({
    data: displayedProtocols,
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
          <h1 className="page-title">Protocolos Clínicos</h1>
          <p className="page-subtitle">Gerencie protocolos de tratamento, materiais padrão e modelos de evolução.</p>
        </div>
        {activeTab === "protocols" && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingProtocolId(null);
                setShowForm(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} />
              Novo Protocolo
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("protocols")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "protocols"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Protocolos & Materiais
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "templates"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText size={16} /> Modelos de Evolução
            </span>
          </button>
        </nav>
      </div>

      {activeTab === "protocols" ? (
        <>
          <div className="card mb-6">
            <div className="search-filter-bar" style={{ marginBottom: 0 }}>
              <div className="search-input" style={{ flex: 1, maxWidth: "none" }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome do protocolo..."
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
                <div className="empty-state-title" style={{ color: "var(--color-danger)" }}>Erro ao carregar protocolos</div>
                <div className="empty-state-description">{String(error)}</div>
              </div>
            ) : displayedProtocols.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileText /></div>
                <div className="empty-state-title">{search ? "Nenhum protocolo encontrado" : "Ainda não há protocolos cadastrados"}</div>
                <div className="empty-state-description">
                  {search ? "Tente outro termo de busca." : "Clique em Novo Protocolo para começar."}
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

            {displayedProtocols.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--color-gray-100)", backgroundColor: "var(--color-gray-50)" }}>
                <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                  {displayedProtocols.length} protocolo{displayedProtocols.length !== 1 ? "s" : ""} exibido{displayedProtocols.length !== 1 ? "s" : ""}
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
        </>
      ) : (
        <EvolutionTemplatesTab />
      )}

      {(isCreating || isEditing) && (
        <ProtocolFormModal
          protocol={isEditing ? editingData! : null}
          onClose={() => {
            setShowForm(false);
            setEditingProtocolId(null);
          }}
        />
      )}
    </>
  );
}
