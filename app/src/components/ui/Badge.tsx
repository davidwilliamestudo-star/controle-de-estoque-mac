import React from "react";

export type BadgeVariant =
  | "emerald"
  | "neutral"
  | "amber"
  | "rose"
  | "sky"
  | "indigo"
  | "gold";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  emerald: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    dot: "bg-emerald-600",
  },
  neutral: {
    container: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  amber: {
    container: "bg-amber-50 text-amber-900 border-amber-200/90",
    dot: "bg-amber-500",
  },
  rose: {
    container: "bg-rose-50 text-rose-800 border-rose-200/90",
    dot: "bg-rose-500",
  },
  sky: {
    container: "bg-sky-50 text-sky-800 border-sky-200/90",
    dot: "bg-sky-500",
  },
  indigo: {
    container: "bg-indigo-50 text-indigo-800 border-indigo-200/90",
    dot: "bg-indigo-500",
  },
  gold: {
    container: "bg-amber-50/70 text-amber-900 border-amber-300/80",
    dot: "bg-amber-600",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] font-bold px-2 py-0.5 gap-1 rounded-md",
  md: "text-xs font-semibold px-2.5 py-1 gap-1.5 rounded-lg",
  lg: "text-xs font-bold px-3 py-1.5 gap-2 rounded-xl",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "emerald",
  size = "md",
  dot = false,
  icon,
  className = "",
  children,
  ...props
}) => {
  const current = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center tracking-tight border transition-colors select-none ${current.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
