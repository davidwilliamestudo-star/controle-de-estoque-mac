import { Filter, Eye, Download, RotateCcw, RefreshCw, Calendar, Users, Package, Bookmark, Plus, Trash2, X, Star } from "lucide-react";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useUsers } from "../hooks/useReports";
import type { ReportFilter, ReportType } from "../schemas/report.schema";
import { SmartCombobox, ComboboxOption } from "@/components/ui/SmartCombobox";
import { useMemo, useEffect, useState } from "react";
import { format, subDays } from "date-fns";

interface ReportFiltersProps {
  reportType: ReportType;
  filter: ReportFilter;
  setFilter: (filter: ReportFilter) => void;
  onGenerate: () => void;
  onClear: () => void;
  onExport: () => void;
  onRefresh: () => void;
  isGenerating?: boolean;
  isExporting?: boolean;
  isRefreshing?: boolean;
}

const dateReports = [
  "patient_history",
  "patient_evolutions",
  "patient_medications",
  "patient_materials",
  "patient_batches",
  "patient_body_areas",
  "stock_consumption",
  "stock_movements",
  "stock_entries",
  "stock_exits",
  "protocol_procedures",
  "audit_log",
  "labels_generated",
];

const patientReports = [
  "patient_general",
  "patient_history",
  "patient_evolutions",
  "patient_medications",
  "patient_materials",
  "patient_batches",
  "patient_body_areas",
];

const batchReports = ["patient_batches", "batch_by_item", "patients_by_batch"];
const categoryReports = ["stock_position", "stock_low", "stock_expirations", "stock_expired", "stock_consumption", "stock_movements", "stock_entries", "stock_exits", "batch_by_item"];
const itemTypeReports = ["stock_position", "stock_low", "stock_expirations", "stock_expired", "stock_consumption", "stock_movements", "stock_entries", "stock_exits", "batch_by_item"];
const protocolReports = ["protocols_list", "protocol_procedures"];

export function ReportFilters({
  reportType,
  filter,
  setFilter,
  onGenerate,
  onClear,
  onExport,
  onRefresh,
  isGenerating = false,
  isExporting = false,
  isRefreshing = false,
}: ReportFiltersProps) {
  const { data: options } = useInventoryOptions();
  const { data: patients = [] } = usePatients();
  const { data: protocols = [] } = useProtocols();
  const { data: users = [] } = useUsers();

  const [favorites, setFavorites] = useState<{ name: string; filter: ReportFilter }[]>([]);
  const [newFavName, setNewFavName] = useState("");
  const [showFavSelector, setShowFavSelector] = useState(false);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "enter":
            e.preventDefault();
            onGenerate();
            break;
          case "e":
            e.preventDefault();
            onExport();
            break;
          case "l":
            e.preventDefault();
            onClear();
            break;
          case "r":
            e.preventDefault();
            onRefresh();
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onGenerate, onExport, onClear, onRefresh]);

  // Load favorites from LocalStorage
  useEffect(() => {
    if (reportType) {
      const favs = localStorage.getItem(`voltq_fav_filters_${reportType}`);
      if (favs) setFavorites(JSON.parse(favs));
      else setFavorites([]);
      setNewFavName("");
      setShowFavSelector(false);

      // Auto-restore last active filter
      const lastFilter = localStorage.getItem(`voltq_last_filter_${reportType}`);
      if (lastFilter) {
        try {
          setFilter(JSON.parse(lastFilter));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [reportType]);

  // Persist filter on change
  useEffect(() => {
    if (reportType && filter) {
      localStorage.setItem(`voltq_last_filter_${reportType}`, JSON.stringify(filter));
    }
  }, [filter, reportType]);

  const saveFavorite = () => {
    if (!newFavName.trim() || !reportType) return;
    const updated = [...favorites, { name: newFavName.trim(), filter }];
    setFavorites(updated);
    localStorage.setItem(`voltq_fav_filters_${reportType}`, JSON.stringify(updated));
    setNewFavName("");
  };

  const deleteFavorite = (idx: number) => {
    if (!reportType) return;
    const updated = favorites.filter((_, i) => i !== idx);
    setFavorites(updated);
    localStorage.setItem(`voltq_fav_filters_${reportType}`, JSON.stringify(updated));
  };

  const applyFavorite = (favFilter: ReportFilter) => {
    setFilter(favFilter);
  };

  const applyQuickDate = (days: number | "this_month" | "this_year") => {
    const end = new Date();
    let start = new Date();
    if (typeof days === "number") {
      start = subDays(end, days);
    } else if (days === "this_month") {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (days === "this_year") {
      start = new Date(end.getFullYear(), 0, 1);
    }
    setFilter({
      ...filter,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  const patientOptions: ComboboxOption[] = useMemo(() => 
    patients.map(p => ({ value: p.id, label: p.full_name, description: p.document || p.phone || undefined })), 
  [patients]);

  const protocolOptions: ComboboxOption[] = useMemo(() => 
    protocols.map(p => ({ value: p.id, label: p.name })), 
  [protocols]);

  const categoryOptions: ComboboxOption[] = useMemo(() => 
    options?.categories.map(c => ({ value: c.id, label: c.name })) || [], 
  [options?.categories]);

  const medicationOptions: ComboboxOption[] = useMemo(() => 
    options?.items.filter(i => i.item_type === "medication").map(i => ({ value: i.id, label: i.name })) || [], 
  [options?.items]);

  const materialOptions: ComboboxOption[] = useMemo(() => 
    options?.items.filter(i => i.item_type === "material").map(i => ({ value: i.id, label: i.name })) || [], 
  [options?.items]);

  const supplierOptions: ComboboxOption[] = useMemo(() => 
    options?.suppliers.map(s => ({ value: s.id, label: s.name, description: s.document || undefined })) || [], 
  [options?.suppliers]);

  const professionalOptions: ComboboxOption[] = useMemo(() => 
    users.map(u => ({ value: u.id, label: u.name })) || [], 
  [users]);

  const itemTypeOptions: ComboboxOption[] = [
    { value: "medication", label: "Medicamentos" },
    { value: "material", label: "Materiais" },
    { value: "equipment", label: "Equipamentos" },
  ];

  const movementTypeOptions: ComboboxOption[] = [
    { value: "entry", label: "Entradas" },
    { value: "exit", label: "Saídas Manuais / Perdas" },
    { value: "usage", label: "Uso em Pacientes" },
  ];

  const auditEntityOptions: ComboboxOption[] = [
    { value: "patient", label: "Paciente" },
    { value: "inventory_item", label: "Item de Estoque" },
    { value: "inventory_batch", label: "Lote" },
    { value: "procedure", label: "Aplicação" },
    { value: "protocol", label: "Protocolo" },
    { value: "report", label: "Relatório" },
  ];

  const rt = reportType || "";
  const showDateRange = dateReports.includes(rt);
  const showPatient = patientReports.includes(rt);
  const showBatch = batchReports.includes(rt);
  const showCategory = categoryReports.includes(rt);
  const showItemType = itemTypeReports.includes(rt);
  const showProtocol = protocolReports.includes(rt);
  const showMovementType = rt === "stock_movements";
  const showAuditEntity = rt === "audit_log";

  const showMedication = ["patient_medications", "stock_consumption", "stock_movements"].includes(rt);
  const showMaterial = ["patient_materials", "stock_consumption", "stock_movements"].includes(rt);
  const showSupplier = ["stock_position", "stock_low", "stock_expirations", "stock_expired", "stock_consumption", "stock_movements", "stock_entries", "stock_exits", "batch_by_item"].includes(rt);
  const showProfessional = ["audit_log", "stock_movements", "patient_history"].includes(rt);

  // Active Pills calculations
  const activePills = useMemo(() => {
    const pills: { key: keyof ReportFilter; label: string; displayValue: string }[] = [];
    if (showDateRange && filter.startDate) pills.push({ key: "startDate", label: "Início", displayValue: filter.startDate });
    if (showDateRange && filter.endDate) pills.push({ key: "endDate", label: "Fim", displayValue: filter.endDate });
    if (showPatient && filter.patientId) {
      const p = patients.find(pat => pat.id === filter.patientId);
      pills.push({ key: "patientId", label: "Paciente", displayValue: p ? p.full_name : filter.patientId });
    }
    if (showProtocol && filter.protocolId) {
      const pt = protocols.find(prot => prot.id === filter.protocolId);
      pills.push({ key: "protocolId", label: "Protocolo", displayValue: pt ? pt.name : filter.protocolId });
    }
    if (showCategory && filter.categoryId) {
      const c = options?.categories.find(cat => cat.id === filter.categoryId);
      pills.push({ key: "categoryId", label: "Categoria", displayValue: c ? c.name : filter.categoryId });
    }
    if (showMedication && filter.medicationId) {
      const m = options?.items.find(i => i.id === filter.medicationId);
      pills.push({ key: "medicationId", label: "Medicamento", displayValue: m ? m.name : filter.medicationId });
    }
    if (showMaterial && filter.materialId) {
      const m = options?.items.find(i => i.id === filter.materialId);
      pills.push({ key: "materialId", label: "Material", displayValue: m ? m.name : filter.materialId });
    }
    if (showSupplier && filter.supplierId) {
      const s = options?.suppliers.find(sup => sup.id === filter.supplierId);
      pills.push({ key: "supplierId", label: "Fornecedor", displayValue: s ? s.name : filter.supplierId });
    }
    if (showProfessional && filter.userId) {
      const u = users.find(usr => usr.id === filter.userId);
      pills.push({ key: "userId", label: "Profissional", displayValue: u ? u.name : filter.userId });
    }
    if (showBatch && filter.batchNumber) pills.push({ key: "batchNumber", label: "Lote", displayValue: filter.batchNumber });
    if (showItemType && filter.itemType) pills.push({ key: "itemType", label: "Tipo Item", displayValue: filter.itemType === "medication" ? "Medicamento" : filter.itemType === "material" ? "Material" : filter.itemType });
    if (showMovementType && filter.movementType && filter.movementType !== "all") pills.push({ key: "movementType", label: "Tipo Mov.", displayValue: filter.movementType === "entry" ? "Entradas" : filter.movementType === "exit" ? "Saídas" : "Uso" });
    if (showAuditEntity && filter.status) pills.push({ key: "status", label: "Entidade", displayValue: filter.status });
    return pills;
  }, [filter, reportType, patients, protocols, options, users, showDateRange, showPatient, showProtocol, showCategory, showMedication, showMaterial, showSupplier, showProfessional, showBatch, showItemType, showMovementType, showAuditEntity]);

  const removeFilterKey = (key: keyof ReportFilter) => {
    setFilter({
      ...filter,
      [key]: key === "movementType" ? "all" : "",
    });
  };

  const labelClass = "text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-2";
  const inputClass = "w-full border-b border-gray-200 bg-transparent py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors";

  return (
    <div className="mb-8 border-b border-gray-100 pb-8 print:hidden flex flex-col gap-6">
      
      {/* HEADER DE FILTROS & FAVORITOS */}
      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Filter size={16} className="text-gray-400" /> Configuração do Relatório
        </h3>
        
        {/* Dropdown de Favoritos */}
        <div className="relative">
          <button
            onClick={() => setShowFavSelector(!showFavSelector)}
            className="flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <Bookmark size={14} className={favorites.length > 0 ? "text-amber-500 fill-amber-500" : ""} />
            Favoritos ({favorites.length})
          </button>
          {showFavSelector && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 p-4 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3 border-b pb-2">Salvar Filtro Atual</div>
              <div className="flex gap-1.5 mb-4">
                <input
                  type="text"
                  placeholder="Nome do favorito..."
                  value={newFavName}
                  onChange={(e) => setNewFavName(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                <button
                  onClick={saveFavorite}
                  className="px-2 py-1.5 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800 flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <Plus size={14} /> Salvar
                </button>
              </div>

              <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 border-b pb-1.5">Filtros Salvos</div>
              {favorites.length === 0 ? (
                <div className="text-xs text-gray-400 italic text-center py-2">Nenhum filtro favorito.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                  {favorites.map((fav, idx) => (
                    <div key={idx} className="flex justify-between items-center p-1.5 hover:bg-gray-50 rounded-lg text-xs">
                      <button
                        onClick={() => {
                          applyFavorite(fav.filter);
                          setShowFavSelector(false);
                        }}
                        className="flex-1 text-left font-medium text-gray-700 truncate hover:text-gray-950"
                      >
                        {fav.name}
                      </button>
                      <button
                        onClick={() => deleteFavorite(idx)}
                        className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BLOCOS DE FILTROS ORGANIZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* BLOCO 1: PERÍODO E DATAS */}
        {showDateRange && (
          <div className="bg-gray-50/20 border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
              <Calendar size={14} className="text-gray-400" /> Período e Datas
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data Inicial</label>
                <input type="date" className={inputClass} value={filter.startDate || ""} onChange={event => setFilter({ ...filter, startDate: event.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Data Final</label>
                <input type="date" className={inputClass} value={filter.endDate || ""} onChange={event => setFilter({ ...filter, endDate: event.target.value })} />
              </div>
            </div>
            
            {/* Filtros Rápidos */}
            <div className="mt-2">
              <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-2">Filtros Rápidos</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "7D", val: 7 },
                  { label: "30D", val: 30 },
                  { label: "Mês", val: "this_month" },
                  { label: "Ano", val: "this_year" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyQuickDate(item.val as any)}
                    className="px-2 py-1 bg-white border border-gray-200 text-[10px] font-semibold text-gray-600 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BLOCO 2: CLÍNICO E PACIENTES */}
        {(showPatient || showProtocol) && (
          <div className="bg-gray-50/20 border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
              <Users size={14} className="text-gray-400" /> Histórico e Clínico
            </h4>
            <div className="space-y-4">
              {showPatient && (
                <div>
                  <label className={labelClass}>Paciente</label>
                  <SmartCombobox 
                    options={patientOptions}
                    value={filter.patientId || ""}
                    onChange={(val) => setFilter({ ...filter, patientId: val })}
                    placeholder={reportType === "patient_general" ? "Selecione um paciente..." : "Todos os pacientes"}
                    searchPlaceholder="Nome, CPF ou telefone..."
                  />
                </div>
              )}
              {showProtocol && (
                <div>
                  <label className={labelClass}>Protocolo Clínico</label>
                  <SmartCombobox 
                    options={protocolOptions}
                    value={filter.protocolId || ""}
                    onChange={(val) => setFilter({ ...filter, protocolId: val })}
                    placeholder="Todos os protocolos"
                    searchPlaceholder="Buscar protocolo..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOCO 3: ESTOQUE E OPERACIONAL */}
        {(showCategory || showMedication || showMaterial || showSupplier || showProfessional || showItemType || showMovementType || showAuditEntity || showBatch) && (
          <div className="bg-gray-50/20 border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
              <Package size={14} className="text-gray-400" /> Estoque & Operacional
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showCategory && (
                <div>
                  <label className={labelClass}>Categoria</label>
                  <SmartCombobox 
                    options={categoryOptions}
                    value={filter.categoryId || ""}
                    onChange={(val) => setFilter({ ...filter, categoryId: val })}
                    placeholder="Todas as categorias"
                    searchPlaceholder="Buscar categoria..."
                  />
                </div>
              )}
              {showMedication && (
                <div>
                  <label className={labelClass}>Medicamento</label>
                  <SmartCombobox 
                    options={medicationOptions}
                    value={filter.medicationId || ""}
                    onChange={(val) => setFilter({ ...filter, medicationId: val })}
                    placeholder="Todos os medicamentos"
                    searchPlaceholder="Buscar medicamento..."
                  />
                </div>
              )}
              {showMaterial && (
                <div>
                  <label className={labelClass}>Material</label>
                  <SmartCombobox 
                    options={materialOptions}
                    value={filter.materialId || ""}
                    onChange={(val) => setFilter({ ...filter, materialId: val })}
                    placeholder="Todos os materiais"
                    searchPlaceholder="Buscar material..."
                  />
                </div>
              )}
              {showSupplier && (
                <div>
                  <label className={labelClass}>Fornecedor</label>
                  <SmartCombobox 
                    options={supplierOptions}
                    value={filter.supplierId || ""}
                    onChange={(val) => setFilter({ ...filter, supplierId: val })}
                    placeholder="Todos os fornecedores"
                    searchPlaceholder="Buscar fornecedor..."
                  />
                </div>
              )}
              {showProfessional && (
                <div>
                  <label className={labelClass}>Responsável</label>
                  <SmartCombobox 
                    options={professionalOptions}
                    value={filter.userId || ""}
                    onChange={(val) => setFilter({ ...filter, userId: val })}
                    placeholder="Todos os profissionais"
                    searchPlaceholder="Buscar profissional..."
                  />
                </div>
              )}
              {showItemType && (
                <div>
                  <label className={labelClass}>Tipo de Item</label>
                  <SmartCombobox 
                    options={itemTypeOptions}
                    value={filter.itemType || ""}
                    onChange={(val) => setFilter({ ...filter, itemType: val as ReportFilter["itemType"] })}
                    placeholder="Todos os tipos"
                    searchPlaceholder="Filtrar por tipo..."
                  />
                </div>
              )}
              {showMovementType && (
                <div>
                  <label className={labelClass}>Tipo Movimentação</label>
                  <SmartCombobox 
                    options={movementTypeOptions}
                    value={filter.movementType && filter.movementType !== "all" ? filter.movementType : ""}
                    onChange={(val) => setFilter({ ...filter, movementType: (val || "all") as ReportFilter["movementType"] })}
                    placeholder="Todas as movimentações"
                    searchPlaceholder="Filtrar tipo..."
                  />
                </div>
              )}
              {showAuditEntity && (
                <div>
                  <label className={labelClass}>Entidade Auditada</label>
                  <SmartCombobox 
                    options={auditEntityOptions}
                    value={filter.status || ""}
                    onChange={(val) => setFilter({ ...filter, status: val })}
                    placeholder="Todas as entidades"
                    searchPlaceholder="Buscar entidade..."
                  />
                </div>
              )}
              {showBatch && (
                <div>
                  <label className={labelClass}>Número do Lote</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ex: LOTE-1234"
                    value={filter.batchNumber || ""}
                    onChange={event => setFilter({ ...filter, batchNumber: event.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PILLS DE FILTROS ATIVOS */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mr-1">Filtros Ativos:</span>
          {activePills.map((pill) => (
            <div key={pill.key} className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs px-2.5 py-1 rounded-full text-gray-700 shadow-sm transition-transform hover:scale-102">
              <span className="text-gray-400 font-medium">{pill.label}:</span>
              <span className="font-bold text-gray-900 max-w-[150px] truncate">{pill.displayValue}</span>
              <button
                onClick={() => removeFilterKey(pill.key)}
                className="text-gray-400 hover:text-rose-500 hover:bg-gray-100 rounded-full p-0.5 transition-colors"
                title={`Limpar filtro ${pill.label}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={onClear}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 tracking-wider uppercase ml-auto px-2 py-1 hover:bg-rose-50 rounded"
            title="Limpar todos os filtros ativos"
          >
            Limpar Todos
          </button>
        </div>
      )}

      {/* BARRA DE AÇÕES PREMIUM (TOOLBAR COM MICRO-ANIMAÇÕES E SHORTCUTS TOOLTIPS) */}
      <div className="flex flex-wrap gap-3 justify-end items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] mt-2">
        <button 
          onClick={onClear}
          className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all active:scale-95 duration-200"
          title="Limpar todos os filtros definidos (Ctrl + L)"
        >
          <RotateCcw size={14} className="transition-transform hover:rotate-45" />
          Limpar Filtros
        </button>

        <button 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 bg-white transition-all active:scale-95 disabled:opacity-50 duration-200"
          title="Atualizar dados do banco local (Ctrl + R)"
        >
          <RefreshCw size={14} className={`transition-all ${isRefreshing ? "animate-spin text-gray-400" : ""}`} />
          {isRefreshing ? "Atualizando..." : "Atualizar"}
        </button>

        <button 
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 py-2 px-5 text-xs font-bold text-gray-700 hover:text-white hover:bg-gray-800 border border-gray-300 bg-white rounded-xl transition-all active:scale-95 disabled:opacity-50 duration-200"
          title="Exportar dados do relatório para planilha CSV (Ctrl + E)"
        >
          <Download size={14} className={isExporting ? "animate-bounce" : ""} />
          {isExporting ? "Exportando..." : "Exportar CSV"}
        </button>

        <button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 py-2.5 px-6 text-xs font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10 hover:shadow-lg active:scale-95 disabled:opacity-50 duration-200"
          title="Visualizar documento formatado para impressão (Ctrl + Enter)"
        >
          <Eye size={14} className={isGenerating ? "animate-pulse" : ""} />
          {isGenerating ? "Gerando..." : "Visualizar e Imprimir"}
        </button>
      </div>
    </div>
  );
}
