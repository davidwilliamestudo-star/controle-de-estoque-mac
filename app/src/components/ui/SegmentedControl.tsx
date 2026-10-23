import React from "react";

export interface SegmentedControlItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  items: SegmentedControlItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  items,
  activeId,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: "p-1 rounded-xl gap-1 text-xs",
    md: "p-1.5 rounded-2xl gap-1.5 text-xs sm:text-sm",
  };

  const buttonSizeStyles = {
    sm: "px-2.5 py-1.5 rounded-lg",
    md: "px-3.5 py-2 rounded-xl",
  };

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-slate-200/80 p-1 border border-slate-300/40 select-none ${sizeStyles[size]} ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed ${
              buttonSizeStyles[size]
            } ${
              isActive
                ? "bg-white text-emerald-950 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            {item.icon && (
              <span className={`shrink-0 ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
