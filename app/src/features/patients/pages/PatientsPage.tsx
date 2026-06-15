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
import { Activity, Edit3, FileText, Plus, Search, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDeactivatePatient, usePatients, useReactivatePatient } from "../hooks/usePatients";
import type { Patient } from "../schemas/patient.schema";
import { PatientFormModal } from "../components/PatientFormModal";
import { getApplicationRecency } from "../utils/applicationRecency";

const columnHelper = createColumnHelper<Patient>();
type StatusFilter = "all" | "active" | "inactive";

export default function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const deferredSearch = useDeferredValue(search);
  const { data: patients = [], isLoading, error } = usePatients(deferredSearch, false);
  const deactivate = useDeactivatePatient();
  const reactivate = useReactivatePatient();

  const displayedPatients = useMemo(() => patients.filter(patient => {
    if (statusFilter === "active") return Boolean(patient.is_active);
    if (statusFilter === "inactive") return !patient.is_active;
    return true;
  }), [patients, statusFilter]);

  const activeCount = patients.filter(patient => Boolean(patient.is_active)).length;
  const inactiveCount = patients.length - activeCount;
  const totalProcedures = patients.reduce((sum, patient) => sum + Number(patient.total_procedures ?? 0), 0);

  const columns = useMemo(() => [
    columnHelper.accessor("full_name", {
      header: "Paciente",
      cell: ({ row }) => (
        <div>
          <button
            className="font-medium text-left"
            style={{ color: "var(--color-gray-900)" }}
            onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: row.original.id } })}
          >
            {row.original.full_name}
          </button>
          <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
            {row.original.birth_date ? `${calcAge(row.original.birth_date)} anos - ` : ""}
            ID: #{row.original.id.slice(0, 8)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("phone", {
      header: "Contato",
      cell: ({ row }) => (
        <div>
          <p>{row.original.phone || "-"}</p>
          <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
            {row.original.email || ""}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("last_procedure_date", {
      header: "Ultima Aplicacao",
      cell: ({ getValue }) => {
        const value = getValue();
        if (!value) return <span style={{ color: "var(--color-gray-400)" }}>-</span>;
        const recency = getApplicationRecency(value);
        return (
          <div>
            <div className="font-medium" style={{ color: "var(--color-gray-900)" }}>
              {format(new Date(value), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs mt-1" style={{ color: recency.urgency === "stale" ? "var(--color-danger)" : "var(--color-gray-500)" }}>
              {recency.label} desde a ultima
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("last_protocol_name", {
      header: "Protocolo Frequente",
      cell: ({ getValue }) => (
        <span className="text-sm" style={{ color: "var(--color-gray-500)" }}>
          {getValue() || "-"}
        </span>
      ),
    }),
    columnHelper.accessor("total_procedures", {
      header: "Total",
      cell: ({ getValue }) => <span className="font-medium">{Number(getValue() ?? 0)}</span>,
    }),
    columnHelper.accessor("is_active", {
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
            title="Ver Prontuario"
            onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: row.original.id } })}
            className="btn btn-ghost btn-icon"
          >
            <FileText size={16} />
          </button>
          <button
            title="Nova Aplicacao"
            onClick={() => navigate({ to: "/procedures/new", search: { patientId: row.original.id } })}
            className="btn btn-ghost btn-icon"
          >
            <Activity size={16} />
          </button>
          <button
            title="Editar"
            onClick={() => {
              setEditingPatient(row.original);
              setShowForm(true);
            }}
            className="btn btn-ghost btn-icon"
          >
            <Edit3 size={16} />
          </button>
          {row.original.is_active ? (
            <button
              title="Inativar"
              onClick={() => deactivate.mutate(row.original.id)}
              className="btn btn-ghost btn-icon"
            >
              <UserX size={16} />
            </button>
          ) : (
            <button
              title="Reativar"
              onClick={() => reactivate.mutate(row.original.id)}
              className="btn btn-ghost btn-icon"
            >
              <UserCheck size={16} />
            </button>
          )}
        </div>
      ),
    }),
  ], [navigate, deactivate, reactivate]);

  const table = useReactTable({
    data: displayedPatients,
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
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">Central de cadastros, historicos clinicos e prontuarios.</p>
        </div>
        <button
          onClick={() => {
            setEditingPatient(null);
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Novo Paciente
        </button>
      </div>

      <div className="grid-4 mb-6">
        <SummaryCard label="Total de Pacientes" value={patients.length} subtext={`${activeCount} ativos no cadastro`} badge="Todos" />
        <SummaryCard label="Pacientes Ativos" value={activeCount} subtext="Disponiveis para atendimento" badge="Ativos" badgeClass="badge-success" />
        <SummaryCard label="Pacientes Inativos" value={inactiveCount} subtext="Mantidos para historico" badge="Inativos" />
        <SummaryCard label="Aplicacoes Registradas" value={totalProcedures} subtext="Total vindo do historico real" badge="Real" badgeClass="badge-accent" />
      </div>

      <div className="card mb-6">
        <div className="search-filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input" style={{ flex: 1, maxWidth: "none" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
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
            <div className="empty-state-title" style={{ color: "var(--color-danger)" }}>Erro ao carregar pacientes</div>
            <div className="empty-state-description">{String(error)}</div>
          </div>
        ) : displayedPatients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText /></div>
            <div className="empty-state-title">{search ? "Nenhum paciente encontrado" : "Ainda nao ha pacientes cadastrados"}</div>
            <div className="empty-state-description">
              {search ? "Tente outro termo de busca ou ajuste os filtros." : "Clique em Novo Paciente para comecar o cadastro real."}
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

        {displayedPatients.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--color-gray-100)", backgroundColor: "var(--color-gray-50)" }}>
            <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
              {displayedPatients.length} paciente{displayedPatients.length !== 1 ? "s" : ""} exibido{displayedPatients.length !== 1 ? "s" : ""}
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

      {showForm && (
        <PatientFormModal
          patient={editingPatient}
          onClose={() => {
            setShowForm(false);
            setEditingPatient(null);
          }}
        />
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  badge,
  badgeClass = "badge-neutral",
}: {
  label: string;
  value: number;
  subtext: string;
  badge: string;
  badgeClass?: string;
}) {
  return (
    <div className="card summary-card">
      <div className="summary-card-header">
        <span>{label}</span>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div className="summary-card-value">{value}</div>
      <div className="summary-card-subtext">{subtext}</div>
    </div>
  );
}

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
