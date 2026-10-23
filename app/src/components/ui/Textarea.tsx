import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  showCount?: boolean;
  resize?: "none" | "vertical" | "both";
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      hasError = false,
      showCount = false,
      maxLength,
      value,
      resize = "vertical",
      disabled,
      className = "",
      rows = 3,
      ...props
    },
    ref
  ) => {
    const currentLength = typeof value === "string" ? value.length : 0;

    const baseShell =
      "relative flex flex-col w-full transition-all duration-200 rounded-xl bg-white border p-3 " +
      (hasError
        ? "border-rose-300 hover:border-rose-400 focus-within:border-rose-600 focus-within:ring-3 focus-within:ring-rose-600/15"
        : "border-slate-200/90 hover:border-slate-300 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-600/15") +
      (disabled ? " bg-slate-50 opacity-65 cursor-not-allowed" : " shadow-2xs");

    const resizeClass =
      resize === "none"
        ? "resize-none"
        : resize === "both"
        ? "resize"
        : "resize-y";

    return (
      <div className={`${baseShell} ${className}`}>
        <textarea
          ref={ref}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          rows={rows}
          className={`w-full bg-transparent outline-none text-slate-900 text-sm font-medium placeholder:text-slate-400 ${resizeClass} ${
            disabled ? "cursor-not-allowed" : ""
          }`}
          {...props}
        />

        {showCount && maxLength && (
          <div className="flex justify-end pt-1">
            <span
              className={`text-[10px] font-mono font-semibold ${
                currentLength >= maxLength ? "text-rose-600" : "text-slate-400"
              }`}
            >
              {currentLength}/{maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
