import { useState, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Filter } from "lucide-react";

interface SmartDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
}

export function SmartDataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar na tabela...",
  pageSize = 50,
}: SmartDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // Virtualização de Linhas
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBefore = () => setIsPrinting(true);
    const handleAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", handleBefore);
    window.addEventListener("afterprint", handleAfter);
    return () => {
      window.removeEventListener("beforeprint", handleBefore);
      window.removeEventListener("afterprint", handleAfter);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isPrinting) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const rowHeight = 48;
  const containerHeight = 600;

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const rows = table.getFilteredRowModel().rows;

  return (
    <div className="flex flex-col w-full h-full text-gray-700">
      {/* Barra de Ferramentas / Busca - Oculta na impressão */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 print:hidden">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Column Filters */}
          <button
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-lg transition-all ${
              showColumnFilters
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
            title="Filtrar por Coluna"
          >
            <Filter size={14} />
            {showColumnFilters ? "Ocultar Filtros" : "Filtrar Colunas"}
          </button>

          {/* Seletor de Colunas Ocultáveis */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-lg bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all"
              title="Exibir/Ocultar Colunas"
            >
              <Eye size={14} />
              Colunas
            </button>
            {showColumnSelector && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 p-3 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 border-b pb-1.5">Colunas Visíveis</div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {table.getAllLeafColumns().map((column) => {
                    const headerText = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
                    if (!headerText) return null;
                    return (
                      <label key={column.id} className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="rounded text-gray-900 focus:ring-gray-900 border-gray-300 w-3.5 h-3.5"
                        />
                        {headerText}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-2">
            {rows.length} registros
          </div>
        </div>
      </div>

      {/* Container da Tabela com Rolagem e Cabeçalho Fixo */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] print:border-none print:shadow-none print:rounded-none">
        <div ref={scrollContainerRef} onScroll={handleScroll} className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin relative print:overflow-visible print:max-h-none">
          <table className="w-full text-sm text-left text-gray-700 table-layout-fixed" style={{ width: table.getTotalSize() }}>
            <thead className="text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50/80 border-b border-gray-100 sticky top-0 z-20 backdrop-blur print:bg-transparent print:border-b-2 print:border-gray-800 print:static">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className="px-4 py-3 font-bold group relative print:py-1 print:px-1"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex flex-col gap-1.5">
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? "cursor-pointer select-none flex items-center gap-2 hover:text-gray-700 transition-colors"
                                  : "flex items-center gap-2",
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: <ChevronUp size={14} className="text-gray-900" />,
                                desc: <ChevronDown size={14} className="text-gray-900" />,
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                            
                            {showColumnFilters && header.column.getCanFilter() && (
                              <input
                                type="text"
                                value={(header.column.getFilterValue() ?? "") as string}
                                onClick={(e) => e.stopPropagation()} // Evita ordenar ao clicar no input
                                onChange={(e) => header.column.setFilterValue(e.target.value)}
                                placeholder="Filtrar..."
                                className="w-full px-2 py-1 text-[10px] font-normal border border-gray-200 rounded bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                              />
                            )}
                          </div>
                        )}

                        {/* Resizer de Coluna */}
                        {header.column.getCanResize() && (
                          <div
                            {...{
                              onMouseDown: header.getResizeHandler(),
                              onTouchStart: header.getResizeHandler(),
                              className: `absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none bg-gray-200 opacity-0 group-hover:opacity-100 hover:bg-gray-400 hover:w-2 transition-all duration-150 ${
                                header.column.getIsResizing() ? "bg-gray-900 opacity-100 w-2" : ""
                              }`,
                            }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
              {rows.length > 0 ? (
                (() => {
                  const totalHeight = rows.length * rowHeight;
                  const startIndex = isPrinting ? 0 : Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
                  const endIndex = isPrinting ? rows.length : Math.min(rows.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + 5);

                  return (
                    <>
                      {!isPrinting && startIndex > 0 && (
                        <tr style={{ height: startIndex * rowHeight }}>
                          <td colSpan={columns.length} style={{ padding: 0 }} />
                        </tr>
                      )}
                      
                      {(isPrinting ? rows : rows.slice(startIndex, endIndex)).map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50/50 even:bg-gray-50/10 transition-colors print:hover:bg-transparent print:break-inside-avoid"
                          style={{ height: rowHeight }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3 print:py-1 print:px-1 print:text-[10px]">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {!isPrinting && endIndex < rows.length && (
                        <tr style={{ height: (rows.length - endIndex) * rowHeight }}>
                          <td colSpan={columns.length} style={{ padding: 0 }} />
                        </tr>
                      )}
                    </>
                  );
                })()
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totalizadores Automáticos */}
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-bold sticky bottom-0 z-10 print:static print:bg-transparent print:border-t-2 print:border-gray-800">
                {table.getFooterGroups().map((footerGroup) => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => {
                      const column = header.column;
                      
                      // Verifica de forma dinâmica se os valores dessa coluna são puramente numéricos
                      const isNumeric = rows.length > 0 && rows.every(row => {
                        const val = row.getValue(column.id);
                        return val === null || val === undefined || typeof val === "number";
                      }) && rows.some(row => typeof row.getValue(column.id) === "number");

                      let totalDisplay = "";
                      if (isNumeric) {
                        const sum = rows.reduce((acc, row) => {
                          const val = row.getValue(column.id);
                          return acc + (typeof val === "number" ? val : 0);
                        }, 0);
                        
                        const colId = String(column.id).toLowerCase();
                        if (colId.includes("cost") || colId.includes("price") || colId.includes("custo") || colId.includes("valor")) {
                          totalDisplay = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sum);
                        } else {
                          totalDisplay = Number.isInteger(sum) ? sum.toLocaleString("pt-BR") : sum.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
                        }
                      }

                      return (
                        <td key={header.id} className="px-4 py-3 print:py-1 print:px-1 print:text-[10px]" style={{ width: header.getSize() }}>
                          {isNumeric ? (
                            <div>
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-normal print:hidden">Total</span>
                              {totalDisplay}
                            </div>
                          ) : header.index === 0 ? (
                            <div>
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-normal print:hidden">Resumo</span>
                              Totalizador
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>

        {/* Paginação Inteligente - Oculta na impressão */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-100 print:hidden">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              Página <span className="font-bold text-gray-900">{table.getState().pagination.pageIndex + 1}</span> de{" "}
              <span className="font-bold text-gray-900">{table.getPageCount() || 1}</span>
            </div>
            
            {/* Seletor de Tamanho de Página */}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 transition-colors"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  Mostrar {size} por página
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Primeira Página"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Próxima Página"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Última Página"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
