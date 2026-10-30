import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useActivePatientPlan } from '@/features/plans/hooks/usePatientPlans';
import { useNavigate } from '@tanstack/react-router';

export type PlanChargeMode = 'included' | 'discounted_extra' | 'full_price';

interface ProcedurePlanSelectorProps {
  patientId: string | null | undefined;
  chargeMode: PlanChargeMode;
  onChangeChargeMode: (mode: PlanChargeMode) => void;
}

export const ProcedurePlanSelector: React.FC<ProcedurePlanSelectorProps> = ({
  patientId,
  chargeMode,
  onChangeChargeMode,
}) => {
  const navigate = useNavigate();
  const { data: activePlan, isLoading } = useActivePatientPlan(patientId);

  if (!patientId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card p-3 animate-pulse bg-slate-50 border border-slate-200">
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
      </div>
    );
  }

  // Paciente com Plano Ativo
  if (activePlan) {
    const isExceeded = activePlan.proceduresUsed >= activePlan.includedProceduresTotal;

    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  {activePlan.planName}
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  Ativo
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Vigência até {activePlan.endDate} • {activePlan.view.daysRemaining} dias restantes
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Franquia de Sessões */}
        <div className="space-y-1 bg-white/80 p-2.5 rounded-lg border border-emerald-200/80">
          <div className="flex justify-between text-[11px] font-semibold text-emerald-950">
            <span>Franquia de Aplicações:</span>
            <span>
              {activePlan.proceduresUsed} de {activePlan.includedProceduresTotal} sessões
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isExceeded ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (activePlan.proceduresUsed /
                      Math.max(1, activePlan.includedProceduresTotal)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
          {isExceeded && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 mt-1">
              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Limite contratual atingido ({activePlan.includedProceduresTotal} sessões).</span>
            </div>
          )}
        </div>

        {/* Seletor de Modalidade de Cobrança da Sessão */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
            Vínculo desta aplicação:
          </label>
          <div className="space-y-1.5 text-xs">
            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-emerald-200 cursor-pointer hover:bg-emerald-50/50 transition-colors">
              <input
                type="radio"
                name="planChargeMode"
                value="included"
                checked={chargeMode === 'included'}
                onChange={() => onChangeChargeMode('included')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-800">
                [✓] Inclusa no Plano (Sessão {activePlan.proceduresUsed + 1} de {activePlan.includedProceduresTotal})
              </span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="planChargeMode"
                value="full_price"
                checked={chargeMode === 'full_price'}
                onChange={() => onChangeChargeMode('full_price')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-700">
                [ ] Aplicação Avulsa (Cobrança extra por fora do plano)
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Paciente sem plano ativo
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Aplicação Avulsa (Sem plano ativo)
        </span>
        <button
          type="button"
          onClick={() => navigate({ to: `/patients/${patientId}` })}
          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer underline"
        >
          <span>Jornada Saúde 360®</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        A paciente ainda não possui plano de acompanhamento ativo contratado.
      </p>
    </div>
  );
};

