import { useMemo, useState, type ElementType } from "react";
import { CircleDollarSign, ChevronLeft, ChevronRight, Syringe, Package, Pill } from "lucide-react";
import { usePatientMonthlyCost } from "../hooks/useMonthlySummary";
import { formatBRL, MONTH_NAMES_PT } from "../lib/materialClassifier";

interface PatientMonthlyCostPanelProps {
  patientId: string;
}

export function PatientMonthlyCostPanel({ patientId }: PatientMonthlyCostPanelProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error } = usePatientMonthlyCost(patientId, year, month);
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

  return (
    <div className="card p-5 rounded-2xl border" style={{ borderColor: "#E5E7EB" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: "#F7F4EE", color: "#1A5347" }}
          >
            <CircleDollarSign size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Gasto com insumos no mês</h3>
            <p className="text-[11px] text-[#6B7280]">
              Protocolo + seringas + agulhas usados nesta paciente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={16} />
          </button>
          <select
            className="form-control text-xs py-1"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES_PT.map((n, i) => (
              <option key={n} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
          <select
            className="form-control text-xs py-1 w-20"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#9CA3AF] py-4 text-center">Calculando {periodLabel}...</p>
      ) : error ? (
        <p className="text-sm text-red-600">Erro ao carregar custos.</p>
      ) : !data || data.proceduresCount === 0 ? (
        <p className="text-sm text-[#9CA3AF] py-4 text-center">
          Nenhuma aplicação finalizada em {periodLabel} para esta paciente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <MiniCost
              icon={Pill}
              label="Substâncias"
              value={formatBRL(data.medicationCost)}
            />
            <MiniCost
              icon={Syringe}
              label="Seringas"
              value={formatBRL(data.syringesCost)}
            />
            <MiniCost
              icon={Package}
              label="Agulhas"
              value={formatBRL(data.needlesCost)}
            />
            <MiniCost
              icon={CircleDollarSign}
              label="Total"
              value={formatBRL(data.totalCost)}
              highlight
            />
          </div>

          {data.protocolNames.length > 0 && (
            <p className="text-xs text-[#6B7280] mb-3">
              Protocolos:{" "}
              <span className="font-medium text-[#111827]">{data.protocolNames.join(", ")}</span>
              {" · "}
              {data.proceduresCount} sessão(ões)
            </p>
          )}

          {data.lines.length > 0 && (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {data.lines.map((line, idx) => (
                <li key={`${line.label}-${idx}`} className="flex justify-between py-2 text-xs gap-2">
                  <span className="truncate text-[#374151]">
                    {line.label}
                    <span className="text-[#9CA3AF] ml-1">
                      ({line.qty.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {line.unit})
                    </span>
                  </span>
                  <span className="font-semibold text-[#1A5347] shrink-0">
                    {formatBRL(line.cost)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data.otherMaterialsCost > 0 && (
            <p className="text-[11px] text-[#9CA3AF] mt-2">
              Outros materiais: {formatBRL(data.otherMaterialsCost)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function MiniCost({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        backgroundColor: highlight ? "#F7F4EE" : "#FAFAF9",
        borderColor: highlight ? "#E5DEC9" : "#F3F4F6",
      }}
    >
      <div className="flex items-center gap-1 text-[#6B7280] mb-1">
        <Icon size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p
        className="text-sm font-bold"
        style={{ color: highlight ? "#1A5347" : "#111827" }}
      >
        {value}
      </p>
    </div>
  );
}
