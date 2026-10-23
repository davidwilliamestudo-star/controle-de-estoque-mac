import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "gold";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-xs hover:shadow-md border border-emerald-800/20",
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs hover:border-slate-300",
  outline:
    "bg-transparent hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:border-emerald-400",
  ghost:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 border border-transparent",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs hover:shadow-md border border-rose-700/20",
  success:
    "bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-xs hover:shadow-md border border-teal-700/20",
  gold:
    "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xs border border-amber-800/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
  sm: "h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl",
  md: "h-11 px-4.5 text-sm font-semibold gap-2 rounded-xl",
  lg: "h-12 px-6 text-base font-bold gap-2.5 rounded-2xl",
  icon: "h-10 w-10 p-0 rounded-xl justify-center shrink-0",
  "icon-sm": "h-8 w-8 p-0 rounded-lg justify-center shrink-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-3 focus:ring-emerald-600/25 active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
