import React from "react";
import { X } from "lucide-react";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hasError?: boolean;
  mono?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const sizeConfig: Record<InputSize, { height: string; text: string; padding: string; iconSize: string }> = {
  sm: { height: "h-9", text: "text-xs", padding: "px-3", iconSize: "w-3.5 h-3.5" },
  md: { height: "h-11", text: "text-sm", padding: "px-3.5", iconSize: "w-4 h-4" },
  lg: { height: "h-12", text: "text-base", padding: "px-4", iconSize: "w-5 h-5" },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = "md",
      leftIcon,
      rightIcon,
      hasError = false,
      mono = false,
      clearable = false,
      onClear,
      disabled,
      className = "",
      value,
      ...props
    },
    ref
  ) => {
    const config = sizeConfig[inputSize];
    const showClear = clearable && Boolean(value) && !disabled && onClear;

    const baseShell =
      "relative flex items-center w-full transition-all duration-200 rounded-xl bg-white border " +
      (hasError
        ? "border-rose-300 hover:border-rose-400 focus-within:border-rose-600 focus-within:ring-3 focus-within:ring-rose-600/15"
        : "border-slate-200/90 hover:border-slate-300 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-600/15") +
      (disabled ? " bg-slate-50 opacity-65 cursor-not-allowed" : " shadow-2xs");

    const inputClasses =
      `w-full h-full bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-400 ` +
      `${config.text} ` +
      (mono ? "font-mono font-semibold " : "") +
      (leftIcon ? "pl-2.5 " : config.padding + " ") +
      (rightIcon || showClear ? "pr-2 " : config.padding + " ") +
      (disabled ? "cursor-not-allowed " : "");

    return (
      <div className={`${baseShell} ${config.height} ${className}`}>
        {leftIcon && (
          <div className="pl-3.5 flex items-center justify-center text-slate-400 shrink-0 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          value={value}
          className={inputClasses}
          {...props}
        />

        {showClear && (
          <button
            type="button"
            onClick={onClear}
            tabIndex={-1}
            className="p-1 mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Limpar campo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {rightIcon && !showClear && (
          <div className="pr-3.5 flex items-center justify-center text-slate-400 shrink-0 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
