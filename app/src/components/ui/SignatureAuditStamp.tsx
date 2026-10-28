import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  User,
  Fingerprint,
} from "lucide-react";

export interface SignatureAuditStampProps {
  verificationCode: string;
  signerName: string;
  signerRole?: string;
  signedAt?: string;
  sha256Hash?: string;
  hasPadesIcpBrasil?: boolean;
  verifyUrl?: string;
  className?: string;
}

export const SignatureAuditStamp: React.FC<SignatureAuditStampProps> = ({
  verificationCode,
  signerName,
  signerRole = "Paciente",
  signedAt,
  sha256Hash,
  hasPadesIcpBrasil = false,
  verifyUrl,
  className = "",
}) => {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyHash = () => {
    if (!sha256Hash) return;
    navigator.clipboard.writeText(sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const defaultVerifyUrl = verifyUrl || `/verificar/${verificationCode}`;

  const roleLabel =
    signerRole === "PACIENTE"
      ? "Paciente"
      : signerRole === "RESPONSAVEL_LEGAL"
        ? "Responsável Legal"
        : signerRole === "DRA_ANA"
          ? "Médica Responsável"
          : signerRole;

  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-5 sm:p-6 shadow-xs text-left ${className}`}
    >
      {/* CABEÇALHO DO SELO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100/90">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {hasPadesIcpBrasil
                  ? "ICP-Brasil • Assinatura Qualificada"
                  : "Assinatura Eletrônica Avançada"}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Lei nº 14.063/2020
              </span>
            </div>
            <h4 className="text-sm sm:text-[15px] font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
              <span>Documento Autenticado & Inviolável</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </h4>
          </div>
        </div>

        {/* CÓDIGO DE VERIFICAÇÃO COPIÁVEL */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-emerald-200/90 shadow-2xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
              Código Autenticador
            </span>
            <span className="font-mono font-bold text-emerald-950 text-xs sm:text-[13px]">
              {verificationCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Copiar Código de Autenticação"
          >
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* METADADOS ESTRUTURADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-xs">
        <div className="bg-white/85 border border-slate-200/70 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
          <User className="w-4 h-4 text-emerald-700 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Signatário Titular
            </span>
            <span className="font-bold text-slate-800 block truncate">
              {signerName}{" "}
              <span className="font-medium text-slate-500">({roleLabel})</span>
            </span>
          </div>
        </div>

        <div className="bg-white/85 border border-slate-200/70 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Carimbo de Tempo Oficial
            </span>
            <span className="font-bold text-slate-800 block truncate">
              {signedAt || "Horário Oficial de Brasília (BRT)"}
            </span>
          </div>
        </div>

        {sha256Hash && (
          <div className="sm:col-span-2 bg-white/85 border border-slate-200/70 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Fingerprint className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Resumo Criptográfico SHA-256
                </span>
                <span
                  className="font-mono text-[11px] text-slate-700 block truncate"
                  title={sha256Hash}
                >
                  {sha256Hash}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyHash}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer shrink-0"
              title="Copiar Hash SHA-256 completo"
            >
              {copiedHash ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* RODAPÉ DE CONFERÊNCIA PÚBLICA */}
      <div className="mt-4 pt-3.5 border-t border-emerald-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500 font-medium">
          Chancela oficial • Clínica Dra. Ana Carla Morong (CRM/SC 28412)
        </span>
        <a
          href={defaultVerifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-800 font-bold hover:text-emerald-950 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Conferir Autenticidade Online</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
