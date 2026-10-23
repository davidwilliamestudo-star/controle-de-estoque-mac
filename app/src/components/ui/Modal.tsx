import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export type ModalMaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "full";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: ModalMaxWidth;
  size?: ModalMaxWidth;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
  headerRight?: React.ReactNode;
}

const maxWidthMap: Record<ModalMaxWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  "3xl": "max-w-4xl",
  "4xl": "max-w-5xl",
  "5xl": "max-w-6xl",
  "6xl": "max-w-7xl",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon,
  maxWidth,
  size = "2xl",
  footer,
  children,
  className = "",
  hideCloseButton = false,
  headerRight,
}) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const effectiveSubtitle = subtitle || description;
  const effectiveMaxWidth = maxWidth || size;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={`w-full ${maxWidthMap[effectiveMaxWidth]} bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden transition-all duration-200 ${className}`}
      >
        {/* HEADER */}
        <header className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {icon && (
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {title}
              </h2>
              {effectiveSubtitle && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">
                  {effectiveSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-0">
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <footer className="px-6 sm:px-8 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
