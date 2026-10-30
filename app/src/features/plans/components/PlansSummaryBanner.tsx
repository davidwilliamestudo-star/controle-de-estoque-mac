import React from 'react';
import { Sparkles, MessageSquare, RotateCw, ArrowRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useFollowupQueue, useRenewalQueue } from '../hooks/usePatientPlans';

export const PlansSummaryBanner: React.FC = () => {
  const navigate = useNavigate();
  const { data: followups = [] } = useFollowupQueue();
  const { data: renewals = [] } = useRenewalQueue();

  if (followups.length === 0 && renewals.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50 via-amber-50/40 to-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">
              Inteligência de Planos & Retenção Saúde 360®
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
              Hoje
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 flex-wrap">
            {followups.length > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-900">
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <strong>{followups.length}</strong> {followups.length === 1 ? 'follow-up pendente' : 'follow-ups pendentes'} de fechamento
              </span>
            )}
            {renewals.length > 0 && (
              <span className="flex items-center gap-1 font-semibold text-purple-900">
                <RotateCw className="w-3.5 h-3.5 text-purple-700" />
                <strong>{renewals.length}</strong> {renewals.length === 1 ? 'plano em renovação' : 'planos em renovação'} (≤ 14 dias)
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: '/plans' })}
        className="btn btn-primary text-xs font-bold flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl px-4 py-2 shrink-0 shadow-2xs"
      >
        <span>Acessar Painel de Planos</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

