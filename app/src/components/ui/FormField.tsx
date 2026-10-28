import React from "react";
import { AlertCircle, Info } from "lucide-react";

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  badge?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  optional = false,
  badge,
  helperText,
  error,
  className = "",
  children,
  hint,
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2.5">
          <label
            htmlFor={htmlFor}
            className="text-xs sm:text-[13px] font-bold text-slate-700 tracking-tight flex items-center gap-1.5 select-none"
          >
            <span>{label}</span>
            {required && (
              <span className="text-rose-500 font-bold text-sm leading-none" title="Campo obrigatório">
                *
              </span>
            )}
            {hint && (
              <span className="text-slate-400 cursor-help" title={hint}>
                <Info className="w-3.5 h-3.5" />
              </span>
            )}
          </label>

          {badge ? (
            <div className="shrink-0">
              {typeof badge === "string" ? (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                  {badge}
                </span>
              ) : (
                badge
              )}
            </div>
          ) : optional ? (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100/90 px-1.5 py-0.5 rounded">
              Opcional
            </span>
          ) : null}
        </div>
      )}

      {children}

      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 font-normal leading-normal pt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
