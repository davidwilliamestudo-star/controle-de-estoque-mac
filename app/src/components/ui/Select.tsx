import React from "react";
import { ChevronDown } from "lucide-react";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  selectSize?: SelectSize;
  leftIcon?: React.ReactNode;
  hasError?: boolean;
  options?: SelectOption[];
}

const sizeConfig: Record<SelectSize, { height: string; text: string; padding: string }> = {
  sm: { height: "h-9", text: "text-xs", padding: "pl-3" },
  md: { height: "h-11", text: "text-sm", padding: "pl-3.5" },
  lg: { height: "h-12", text: "text-base", padding: "pl-4" },
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      selectSize = "md",
      leftIcon,
      hasError = false,
      options,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const config = sizeConfig[selectSize];

    const baseShell =
      "relative flex items-center w-full transition-all duration-200 rounded-xl bg-white border " +
      (hasError
        ? "border-rose-300 hover:border-rose-400 focus-within:border-rose-600 focus-within:ring-3 focus-within:ring-rose-600/15"
        : "border-slate-200/90 hover:border-slate-300 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-600/15") +
      (disabled ? " bg-slate-50 opacity-65 cursor-not-allowed" : " shadow-2xs");

    const selectClasses =
      `w-full h-full appearance-none bg-transparent outline-none text-slate-900 font-medium cursor-pointer pr-9 ` +
      `${config.text} ` +
      (leftIcon ? "pl-2.5 " : config.padding + " ") +
      (disabled ? "cursor-not-allowed " : "");

    return (
      <div className={`${baseShell} ${config.height} ${className}`}>
        {leftIcon && (
          <div className="pl-3.5 flex items-center justify-center text-slate-400 shrink-0 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <select ref={ref} disabled={disabled} className={selectClasses} {...props}>
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
