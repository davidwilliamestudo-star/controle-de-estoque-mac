import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Lock,
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
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const defaultVerifyUrl = verifyUrl || `/verificar/${verificationCode}`;

  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/40 p-5 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                {hasPadesIcpBrasil ? "ICP-Brasil • Assinatura Qualificada" : "Assinatura Eletrônica Avançada"}
              </span>
              <span className="text-[10px] font-bold text-slate-500">Lei nº 14.063/2020</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <span>Documento Autenticado & Inviolável</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </h4>
          </div>
        </div>

        {/* CÓDIGO DE VERIFICAÇÃO */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
              Autenticador
            </span>
            <span className="font-mono font-bold text-emerald-950 text-xs">
              {verificationCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Copiar Código de Autenticação"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* METADADOS DA ASSINATURA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3.5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="truncate">
            <strong>Signatário:</strong> {signerName} ({signerRole})
          </span>
        </div>

        {signedAt && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">
              <strong>Data:</strong> {signedAt}
            </span>
          </div>
        )}

        {sha256Hash && (
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <Fingerprint className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-mono text-[11px] truncate text-slate-500" title={sha256Hash}>
              <strong>SHA:</strong> {sha256Hash.slice(0, 16)}...
            </span>
          </div>
        )}
      </div>

      {/* LINK DE CONFERÊNCIA PÚBLICA */}
      <div className="mt-3.5 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          Chancela oficial da Clínica Dra. Ana Carla Morong (CRM/SC 28412)
        </span>
        <a
          href={defaultVerifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
        >
          <span>Conferir Validade Jurídica</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
