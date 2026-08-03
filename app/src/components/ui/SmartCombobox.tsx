import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface SmartComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  /** default = underline compacto | field = caixa de formulário grande */
  variant?: "default" | "field";
  size?: "md" | "lg";
}

export function SmartCombobox({
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className = "",
  disabled = false,
  variant = "default",
  size = "md",
}: SmartComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.description && opt.description.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightedIndex(0);
      setScrollTop(0);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    setScrollTop(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [search]);

  const containerHeight = 240;
  const itemHeight = 50;
  const totalHeight = filteredOptions.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(filteredOptions.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);

  useEffect(() => {
    if (listRef.current && isOpen && filteredOptions.length > 0) {
      const container = listRef.current;
      const targetScrollTop = highlightedIndex * itemHeight;
      if (targetScrollTop < container.scrollTop) {
        container.scrollTop = targetScrollTop;
      } else if (targetScrollTop + itemHeight > container.scrollTop + containerHeight) {
        container.scrollTop = targetScrollTop - containerHeight + itemHeight;
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const isField = variant === "field";
  const isLg = size === "lg" || isField;

  const triggerClass = isField
    ? `w-full rounded-2xl border bg-white text-gray-900 transition-all flex items-center justify-between cursor-pointer group ${
        isLg ? "min-h-[52px] px-4 py-3 text-[15px]" : "min-h-[44px] px-3.5 py-2.5 text-sm"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#1A5347]/50"} ${
        isOpen ? "border-[#1A5347] ring-4 ring-[#1A5347]/10" : "border-[#E5DEC9]"
      }`
    : `w-full border-b border-gray-200 bg-transparent py-2 text-sm text-gray-900 transition-colors flex items-center justify-between cursor-pointer group ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-900"
      }`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={triggerClass}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={!disabled ? handleKeyDown : undefined}
      >
        <span className={`truncate pr-2 ${selectedOption ? "text-gray-900 font-medium" : "text-gray-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-rose-500 transition-colors rounded-full p-1.5 focus:outline-none"
              title="Limpar seleção"
            >
              <X size={isLg ? 16 : 14} />
            </button>
          )}
          <ChevronDown
            size={isLg ? 18 : 16}
            className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : "group-hover:text-gray-900"}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={16} className="text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none text-gray-900"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          <ul 
            ref={listRef} 
            className="max-h-60 overflow-y-auto p-1 relative scrollbar-thin"
            onScroll={handleScroll}
            style={{ height: filteredOptions.length > 0 ? Math.min(containerHeight, totalHeight) : "auto" }}
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-sm text-center text-gray-500">
                {emptyMessage}
              </li>
            ) : (
              <div style={{ height: totalHeight, position: "relative", width: "100%" }}>
                <div style={{ transform: `translateY(${startIndex * itemHeight}px)`, position: "absolute", left: 0, right: 0, top: 0 }}>
                  {filteredOptions.slice(startIndex, endIndex).map((opt, index) => {
                    const actualIndex = startIndex + index;
                    const isSelected = opt.value === value;
                    const isHighlighted = actualIndex === highlightedIndex;
                    
                    return (
                      <li
                        key={opt.value}
                        style={{ height: itemHeight }}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${
                          isHighlighted ? "bg-gray-50 text-gray-900" : "text-gray-700"
                        }`}
                        onClick={() => handleSelect(opt.value)}
                        onMouseEnter={() => setHighlightedIndex(actualIndex)}
                      >
                        <div className="truncate">
                          <div className={isSelected ? "font-semibold" : ""}>{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{opt.description}</div>
                          )}
                        </div>
                        {isSelected && <Check size={16} className="text-gray-900 shrink-0 ml-2" />}
                      </li>
                    );
                  })}
                </div>
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
