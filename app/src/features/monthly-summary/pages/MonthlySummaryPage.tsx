import { useMemo, useState, type ElementType } from "react";
import {
  CalendarDays,
  Syringe,
  Activity,
  CircleDollarSign,
  Package,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useMonthlySummary } from "../hooks/useMonthlySummary";
import { formatBRL, MONTH_NAMES_PT } from "../lib/materialClassifier";

function qtyLabel(n: number, unit = "un"): string {
  const v = Number(n) || 0;
  if (v === 0) return "0";
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`;
}

export default function MonthlySummaryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error, isFetching } = useMonthlySummary(year, month);

  const periodLabel = `${MONTH_NAMES_PT[month - 1]} / ${year}`;

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, [now]);

  const totalSyringes =
    (data?.syringes.ml3 || 0) +
    (data?.syringes.ml5 || 0) +
    (data?.syringes.ml10 || 0) +
    (data?.syringes.other || 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl border flex items-center justify-center shadow-xs bg-emerald-50 border-emerald-200 text-emerald-700"
          >
            <CalendarDays size={26} />
          </div>
          <div>
            <h1 className="page-title text-2xl font-bold tracking-tight text-slate-900">
              Resumo do Mês
            </h1>
            <p className="page-subtitle text-xs text-slate-500 font-medium mt-0.5">
              Protocolos, seringas, agulhas e quanto você gastou em insumos.
            </p>
          </div>
        </div>

        {/* Seletor de mês */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white border-slate-200"
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="btn btn-ghost btn-icon"
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <select
            className="form-control text-sm font-semibold border-0 bg-transparent min-w-[120px]"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES_PT.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="form-control text-sm font-semibold border-0 bg-transparent w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="btn btn-ghost btn-icon"
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div
          className="card p-12 flex flex-col items-center justify-center text-center gap-3 rounded-2xl border bg-white border-slate-200 shadow-sm"
        >
          <div
            className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"
          />
          <p className="text-sm text-slate-500 font-medium">Calculando resumo de {periodLabel}...</p>
        </div>
      ) : error ? (
        <div className="card p-8 flex items-center gap-3 text-rose-700 bg-white border-rose-200 rounded-2xl">
          <AlertTriangle size={20} />
          <span>Não foi possível carregar o resumo: {String(error)}</span>
        </div>
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-emerald-600 -mt-3">Atualizando...</p>
          )}

          {/* KPI principal: custo */}
          <div
            className="card p-6 rounded-2xl border-l-4 shadow-xs bg-white border-slate-200 border-l-emerald-600"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Gasto total com insumos em {periodLabel}
                </p>
                <p className="text-3xl font-bold text-emerald-800">{formatBRL(data.totalCost)}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Substâncias: {formatBRL(data.medicationCost)} · Materiais:{" "}
                  {formatBRL(data.materialCost)}
                </p>
              </div>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100"
              >
                <CircleDollarSign size={28} className="text-emerald-700" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wide opacity-75">
                    Sessões finalizadas
                  </p>
                  <p className="text-xl font-bold">{data.proceduresCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards simples */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={Activity}
              label="Protocolos realizados"
              value={String(data.protocolApplicationsCount)}
              hint={
                data.proceduresCount !== data.protocolApplicationsCount
                  ? `${data.proceduresCount} sessão(ões) no mês`
                  : "aplicações com protocolo"
              }
              accent="#047857"
            />
            <SummaryCard
              icon={Syringe}
              label="Seringas (total)"
              value={qtyLabel(totalSyringes)}
              hint={`3 ml: ${data.syringes.ml3} · 5 ml: ${data.syringes.ml5} · 10 ml: ${data.syringes.ml10}`}
              accent="#0284C7"
            />
            <SummaryCard
              icon={Package}
              label="Agulhas"
              value={qtyLabel(data.needlesCount)}
              hint="consumidas no mês"
              accent="#6366F1"
            />
            <SummaryCard
              icon={Package}
              label="Algodão / Álcool"
              value={`${qtyLabel(data.cottonCount)} / ${qtyLabel(data.alcoholCount)}`}
              hint="algodão · álcool"
              accent="#10B981"
            />
          </div>

          {/* Detalhe seringas */}
          <div className="card p-6 rounded-2xl border bg-white border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Syringe size={16} className="text-emerald-600" />
              Seringas por tamanho
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SyringeTile label="3 ml" qty={data.syringes.ml3} />
              <SyringeTile label="5 ml" qty={data.syringes.ml5} />
              <SyringeTile label="10 ml" qty={data.syringes.ml10} />
              <SyringeTile label="Outro" qty={data.syringes.other} muted />
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              A contagem usa o nome do item cadastrado (ex.: &quot;Seringa 10ml&quot;). Cadastre com o
              volume no nome para o resumo separar corretamente.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Por protocolo */}
            <div className="card p-6 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                Protocolos no mês
              </h2>
              {data.byProtocol.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum protocolo finalizado neste mês.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.byProtocol.map((row) => (
                    <li
                      key={row.protocolId || row.protocolName}
                      className="flex items-center justify-between py-2.5 gap-3"
                    >
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {row.protocolName}
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {row.applicationsCount}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Outros materiais + lista de consumo */}
            <div className="card p-6 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package size={16} className="text-emerald-600" />
                Outros materiais
              </h2>
              {data.otherMaterials.length === 0 &&
              data.cottonCount === 0 &&
              data.alcoholCount === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum outro material consumido além de seringas e agulhas.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.cottonCount > 0 && (
                    <li className="flex justify-between py-2 text-sm text-slate-700">
                      <span>Algodão</span>
                      <span className="font-semibold text-slate-900">{qtyLabel(data.cottonCount)}</span>
                    </li>
                  )}
                  {data.alcoholCount > 0 && (
                    <li className="flex justify-between py-2 text-sm text-slate-700">
                      <span>Álcool</span>
                      <span className="font-semibold text-slate-900">{qtyLabel(data.alcoholCount)}</span>
                    </li>
                  )}
                  {data.otherMaterials.map((m) => (
                    <li key={m.name} className="flex justify-between py-2 text-sm gap-2 text-slate-700">
                      <span className="truncate">{m.name}</span>
                      <span className="font-semibold shrink-0 text-slate-900">
                        {qtyLabel(m.qty, m.unit)} · {formatBRL(m.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Tabela detalhada de custos */}
          <div className="card p-0 rounded-2xl border overflow-hidden bg-white border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Detalhamento de insumos e custos</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tudo que saiu das aplicações finalizadas neste mês (com custo unitário cadastrado).
              </p>
            </div>
            {data.materials.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Nenhum consumo registrado em {periodLabel}. Finalize aplicações para alimentar este
                resumo.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Tipo</th>
                      <th className="text-right">Qtd</th>
                      <th className="text-right">Custo (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m) => (
                      <tr key={m.itemId}>
                        <td className="font-medium text-slate-900">{m.itemName}</td>
                        <td className="text-xs text-slate-500">
                          {m.kind === "medication"
                            ? "Substância"
                            : m.categoryName || "Material"}
                        </td>
                        <td className="text-right text-slate-700">
                          {m.totalQty.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                          <span className="text-xs text-slate-400">{m.unit}</span>
                        </td>
                        <td className="text-right font-semibold text-emerald-700">
                          {formatBRL(m.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="font-bold text-sm text-slate-900">
                        Total
                      </td>
                      <td className="text-right font-bold text-emerald-700">
                        {formatBRL(data.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div
      className="card p-5 rounded-2xl border shadow-xs bg-white border-slate-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className="p-2 rounded-xl bg-emerald-50 text-emerald-700"
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

function SyringeTile({
  label,
  qty,
  muted,
}: {
  label: string;
  qty: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 text-center border ${
        muted 
          ? "bg-slate-50 border-slate-200 text-slate-400" 
          : "bg-emerald-50/50 border-emerald-200 text-emerald-800"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${muted ? "text-slate-400" : "text-emerald-700"}`}>
        {qty.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5">unidades</p>
    </div>
  );
}
