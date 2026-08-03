/**
 * CurrencyInput.tsx
 * Campo de input monetário em formato R$ brasileiro.
 *
 * Resolve os problemas:
 * - "0" como placeholder estático que fica na frente do valor digitado
 * - Ausência de formatação de moeda (R$) durante a digitação
 * - Input type="number" que aceita valores inválidos e sem máscara visual
 *
 * Comportamento:
 * - Exibe o valor formatado como "R$ 1.250,00" enquanto o campo está em foco
 * - Usa string interna mascarada para display, envia number para o onChange
 * - Campo vazio mostra placeholder "R$ 0,00" em cinza
 * - Aceita apenas dígitos — vírgulas e pontos são gerados automaticamente
 */

import { useCallback, useRef, useState, useEffect } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
  min?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

/**
 * Converte centavos (inteiro) para número com 2 casas decimais
 * ex: 125000 → 1250.00
 */
function centsToFloat(cents: number): number {
  return cents / 100;
}

/**
 * Formata centavos para exibição brasileira
 * ex: 125000 → "1.250,00"
 */
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extrai apenas os dígitos de uma string e retorna como centavos (inteiro)
 * ex: "1.250,00" → 125000
 * ex: "R$ 1.250,50" → 125050
 */
function parseToCents(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export function CurrencyInput({
  value,
  onChange,
  label,
  required = false,
  min = 0,
  disabled = false,
  className = "",
  id,
  placeholder = "R$ 0,00",
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Converte o valor externo (float) em centavos para estado interno
  const initialCents = Math.round((value ?? 0) * 100);
  const [cents, setCents] = useState<number>(initialCents);
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>(
    initialCents === 0 ? "" : formatCents(initialCents)
  );

  // Sincroniza quando o valor externo muda programaticamente (ex: autopreenchimento)
  useEffect(() => {
    const newCents = Math.round((value ?? 0) * 100);
    if (newCents !== cents) {
      setCents(newCents);
      if (!isFocused) {
        setDisplayValue(newCents === 0 ? "" : formatCents(newCents));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Ao focar: mostra valor formatado ou vazio para facilitar digitação
    setDisplayValue(cents === 0 ? "" : formatCents(cents));
    // Seleciona tudo para facilitar substituição
    setTimeout(() => inputRef.current?.select(), 0);
  }, [cents]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const newCents = parseToCents(raw);
    const newFloat = centsToFloat(newCents);

    setCents(newCents);
    setDisplayValue(newCents === 0 ? "" : formatCents(newCents));
    onChange(newFloat);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Ao perder foco: formata o valor final
    setDisplayValue(cents === 0 ? "" : formatCents(cents));
  }, [cents]);

  const displayedValue = isFocused ? displayValue : (cents === 0 ? "" : formatCents(cents));

  const isInvalid = required && cents === 0;

  return (
    <div className={`relative ${className}`}>
      {/* Prefixo R$ fixo visível */}
      <span
        className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none select-none
          ${disabled ? "text-gray-300" : cents === 0 ? "text-gray-400" : "text-gray-700"}`}
        aria-hidden="true"
      >
        R$
      </span>

      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        className={`form-control pl-9 text-right tabular-nums
          ${isInvalid ? "border-red-400 focus:ring-red-300" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        value={displayedValue}
        placeholder="0,00"
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        aria-label={label}
        aria-required={required}
        // Impede o scroll do mouse de mudar o valor (bug comum em inputs numéricos)
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
      />

      {/* Valor numérico oculto para compatibilidade com validação nativa de formulário */}
      <input
        type="hidden"
        value={centsToFloat(cents)}
        required={required}
        min={min}
      />
    </div>
  );
}
