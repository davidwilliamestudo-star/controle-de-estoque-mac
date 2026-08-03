/**
 * ReportFilterPanel.tsx
 * Filtros espaçosos — campos grandes, hierarquia clara.
 */
import { useMemo, useEffect, useState, type ElementType, type ReactNode } from "react";
import { Calendar, Users, Package, Bookmark, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { format, subDays } from "date-fns";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useUsers } from "../hooks/useReportData";
import { SmartCombobox, type ComboboxOption } from "@/components/ui/SmartCombobox";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

const filterVisibility = {
  date: ["patient_history","patient_evolutions","patient_medications","patient_materials","patient_batches","patient_body_areas","stock_consumption","stock_movements","stock_entries","stock_exits","protocol_procedures","audit_log","labels_generated"],
  patient: ["patient_general","patient_history","patient_evolutions","patient_medications","patient_materials","patient_batches","patient_body_areas"],
  batch: ["patient_batches","batch_by_item","patients_by_batch"],
  category: ["stock_position","stock_low","stock_expirations","stock_expired","stock_consumption","stock_movements","stock_entries","stock_exits","batch_by_item"],
  itemType: ["stock_position","stock_low","stock_expirations","stock_expired","stock_consumption","stock_movements","stock_entries","stock_exits","batch_by_item"],
  protocol: ["protocols_list","protocol_procedures"],
  movementType: ["stock_movements"],
  auditEntity: ["audit_log"],
  medication: ["patient_medications","stock_consumption","stock_movements"],
  material: ["patient_materials","stock_consumption","stock_movements"],
  supplier: ["stock_position","stock_low","stock_expirations","stock_expired","stock_consumption","stock_movements","stock_entries","stock_exits","batch_by_item"],
  professional: ["audit_log","stock_movements","patient_history"],
};

function has(type: string, list: string[]): boolean {
  return list.includes(type);
}

interface ReportFilterPanelProps {
  reportType: ReportType;
  filter: ReportFilter;
  setFilter: (f: ReportFilter) => void;
}

const QUICK_DATES = [
  { label: "Últimos 7 dias", value: 7 as const },
  { label: "Últimos 30 dias", value: 30 as const },
  { label: "Este mês", value: "this_month" as const },
  { label: "Este ano", value: "this_year" as const },
];

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="block text-sm font-semibold mb-2"
      style={{ color: "#4A3328" }}
    >
      {children}
    </label>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "#1A5347",
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="rounded-3xl border p-6 sm:p-8"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E8E0D2",
        boxShadow: "0 4px 24px -8px rgba(74,51,40,0.08)",
      }}
    >
      <div className="flex items-center gap-3.5 mb-6">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: "#111827" }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: "#8C7A6B" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

const dateInputClass =
  "w-full min-h-[52px] px-4 rounded-2xl border bg-white text-[15px] font-medium text-gray-900 outline-none transition-all focus:border-[#1A5347] focus:ring-4 focus:ring-[#1A5347]/10";

export function ReportFilterPanel({ reportType, filter, setFilter }: ReportFilterPanelProps) {
  const { data: options } = useInventoryOptions();
  const { data: patients = [] } = usePatients();
  const { data: protocols = [] } = useProtocols();
  const { data: users = [] } = useUsers();

  const rt = reportType || "";

  const showDate = has(rt, filterVisibility.date);
  const showPatient = has(rt, filterVisibility.patient);
  const showBatch = has(rt, filterVisibility.batch);
  const showCategory = has(rt, filterVisibility.category);
  const showItemType = has(rt, filterVisibility.itemType);
  const showProtocol = has(rt, filterVisibility.protocol);
  const showMovementType = has(rt, filterVisibility.movementType);
  const showAuditEntity = has(rt, filterVisibility.auditEntity);
  const showMedication = has(rt, filterVisibility.medication);
  const showMaterial = has(rt, filterVisibility.material);
  const showSupplier = has(rt, filterVisibility.supplier);
  const showProfessional = has(rt, filterVisibility.professional);

  const hasInventoryBlock =
    showCategory ||
    showMedication ||
    showMaterial ||
    showSupplier ||
    showProfessional ||
    showItemType ||
    showMovementType ||
    showAuditEntity ||
    showBatch;

  const patientOptions = useMemo<ComboboxOption[]>(
    () => patients.map((p) => ({ value: p.id, label: p.full_name, description: p.document || p.phone || undefined })),
    [patients],
  );
  const protocolOptions = useMemo<ComboboxOption[]>(
    () => protocols.map((p) => ({ value: p.id, label: p.name })),
    [protocols],
  );
  const categoryOptions = useMemo<ComboboxOption[]>(
    () => options?.categories.map((c) => ({ value: c.id, label: c.name })) || [],
    [options?.categories],
  );
  const medicationOptions = useMemo<ComboboxOption[]>(
    () =>
      options?.items
        .filter((i) => i.item_type === "medication")
        .map((i) => ({ value: i.id, label: i.name })) || [],
    [options?.items],
  );
  const materialOptions = useMemo<ComboboxOption[]>(
    () =>
      options?.items
        .filter((i) => i.item_type === "material")
        .map((i) => ({ value: i.id, label: i.name })) || [],
    [options?.items],
  );
  const supplierOptions = useMemo<ComboboxOption[]>(
    () => options?.suppliers.map((s) => ({ value: s.id, label: s.name })) || [],
    [options?.suppliers],
  );
  const professionalOptions = useMemo<ComboboxOption[]>(
    () => users.map((u) => ({ value: u.id, label: u.name })),
    [users],
  );

  const itemTypeOptions: ComboboxOption[] = [
    { value: "medication", label: "Medicamentos" },
    { value: "material", label: "Materiais" },
  ];
  const movementTypeOptions: ComboboxOption[] = [
    { value: "entry", label: "Entradas" },
    { value: "exit", label: "Saídas / Perdas" },
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

  const applyQuickDate = (val: number | "this_month" | "this_year") => {
    const end = new Date();
    let start = new Date();
    if (typeof val === "number") {
      start = subDays(end, val);
    } else if (val === "this_month") {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      start = new Date(end.getFullYear(), 0, 1);
    }
    setFilter({
      ...filter,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  if (!reportType) return null;

  const noFilters =
    !showDate && !showPatient && !showProtocol && !hasInventoryBlock;

  if (noFilters) {
    return (
      <div
        className="rounded-3xl border px-8 py-10 text-center"
        style={{ backgroundColor: "#F7F4EE", borderColor: "#E5DEC9" }}
      >
        <p className="text-base font-semibold" style={{ color: "#4A3328" }}>
          Este relatório não exige filtros adicionais.
        </p>
        <p className="text-sm mt-2" style={{ color: "#8C7A6B" }}>
          Clique em <strong>Visualizar e Imprimir</strong> para gerar o documento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showDate && (
        <SectionCard
          icon={Calendar}
          title="Período"
          subtitle="Defina o intervalo de datas do relatório"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <FieldLabel>Data início</FieldLabel>
              <input
                type="date"
                className={dateInputClass}
                style={{ borderColor: "#E5DEC9" }}
                value={filter.startDate || ""}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Data fim</FieldLabel>
              <input
                type="date"
                className={dateInputClass}
                style={{ borderColor: "#E5DEC9" }}
                value={filter.endDate || ""}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {QUICK_DATES.map((qd) => (
              <button
                key={qd.label}
                type="button"
                onClick={() => applyQuickDate(qd.value)}
                className="min-h-[40px] px-4 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                style={{
                  borderColor: "#E5DEC9",
                  color: "#1A5347",
                  backgroundColor: "#F7F4EE",
                }}
              >
                {qd.label}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {(showPatient || showProtocol) && (
        <SectionCard
          icon={Users}
          title="Dados clínicos"
          subtitle="Paciente e protocolo, quando aplicável"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {showPatient && (
              <div className={showProtocol ? "" : "sm:col-span-2"}>
                <FieldLabel>Paciente</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={patientOptions}
                  value={filter.patientId || ""}
                  onChange={(val) => setFilter({ ...filter, patientId: val })}
                  placeholder={
                    reportType === "patient_general"
                      ? "Selecione um paciente..."
                      : "Todos os pacientes"
                  }
                  searchPlaceholder="Nome, CPF ou telefone..."
                />
              </div>
            )}
            {showProtocol && (
              <div className={showPatient ? "" : "sm:col-span-2"}>
                <FieldLabel>Protocolo</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={protocolOptions}
                  value={filter.protocolId || ""}
                  onChange={(val) => setFilter({ ...filter, protocolId: val })}
                  placeholder="Todos os protocolos"
                  searchPlaceholder="Buscar protocolo..."
                />
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {hasInventoryBlock && (
        <SectionCard
          icon={Package}
          title="Estoque e operação"
          subtitle="Refine por categoria, item, fornecedor ou lote"
          accent="#8C4A27"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {showCategory && (
              <div>
                <FieldLabel>Categoria</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={categoryOptions}
                  value={filter.categoryId || ""}
                  onChange={(val) => setFilter({ ...filter, categoryId: val })}
                  placeholder="Todas as categorias"
                  searchPlaceholder="Buscar categoria..."
                />
              </div>
            )}
            {showItemType && (
              <div>
                <FieldLabel>Tipo de item</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={itemTypeOptions}
                  value={filter.itemType || ""}
                  onChange={(val) =>
                    setFilter({ ...filter, itemType: val as ReportFilter["itemType"] })
                  }
                  placeholder="Todos os tipos"
                  searchPlaceholder="Filtrar..."
                />
              </div>
            )}
            {showMedication && (
              <div>
                <FieldLabel>Medicamento</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
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
                <FieldLabel>Material</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
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
                <FieldLabel>Fornecedor</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
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
                <FieldLabel>Responsável</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={professionalOptions}
                  value={filter.userId || ""}
                  onChange={(val) => setFilter({ ...filter, userId: val })}
                  placeholder="Todos os profissionais"
                  searchPlaceholder="Buscar profissional..."
                />
              </div>
            )}
            {showMovementType && (
              <div>
                <FieldLabel>Tipo de movimentação</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={movementTypeOptions}
                  value={
                    filter.movementType && filter.movementType !== "all"
                      ? filter.movementType
                      : ""
                  }
                  onChange={(val) =>
                    setFilter({
                      ...filter,
                      movementType: (val || "all") as ReportFilter["movementType"],
                    })
                  }
                  placeholder="Todas as movimentações"
                  searchPlaceholder="Filtrar tipo..."
                />
              </div>
            )}
            {showAuditEntity && (
              <div>
                <FieldLabel>Entidade auditada</FieldLabel>
                <SmartCombobox
                  variant="field"
                  size="lg"
                  options={auditEntityOptions}
                  value={filter.status || ""}
                  onChange={(val) => setFilter({ ...filter, status: val })}
                  placeholder="Todas as entidades"
                  searchPlaceholder="Buscar entidade..."
                />
              </div>
            )}
            {showBatch && (
              <div className="sm:col-span-2">
                <FieldLabel>Número do lote</FieldLabel>
                <input
                  type="text"
                  className={dateInputClass}
                  style={{ borderColor: "#E5DEC9" }}
                  placeholder="Ex: LOTE-1234"
                  value={filter.batchNumber || ""}
                  onChange={(e) => setFilter({ ...filter, batchNumber: e.target.value })}
                />
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Pills de filtros ativos ─────────────────────────────────────────────────
interface ActiveFilterPillsProps {
  filter: ReportFilter;
  reportType: ReportType;
  onRemove: (key: keyof ReportFilter) => void;
  onClearAll: () => void;
}

export function ActiveFilterPills({ filter, onRemove, onClearAll }: ActiveFilterPillsProps) {
  const pills: { key: keyof ReportFilter; label: string; value: string }[] = [];

  if (filter.startDate) pills.push({ key: "startDate", label: "Início", value: filter.startDate });
  if (filter.endDate) pills.push({ key: "endDate", label: "Fim", value: filter.endDate });
  if (filter.patientId) pills.push({ key: "patientId", label: "Paciente", value: "selecionado" });
  if (filter.protocolId) pills.push({ key: "protocolId", label: "Protocolo", value: "selecionado" });
  if (filter.categoryId) pills.push({ key: "categoryId", label: "Categoria", value: "selecionada" });
  if (filter.medicationId) pills.push({ key: "medicationId", label: "Medicamento", value: "selecionado" });
  if (filter.materialId) pills.push({ key: "materialId", label: "Material", value: "selecionado" });
  if (filter.supplierId) pills.push({ key: "supplierId", label: "Fornecedor", value: "selecionado" });
  if (filter.userId) pills.push({ key: "userId", label: "Responsável", value: "selecionado" });
  if (filter.batchNumber) pills.push({ key: "batchNumber", label: "Lote", value: filter.batchNumber });
  if (filter.itemType)
    pills.push({
      key: "itemType",
      label: "Tipo",
      value: filter.itemType === "medication" ? "Medicamentos" : "Materiais",
    });
  if (filter.movementType && filter.movementType !== "all")
    pills.push({ key: "movementType", label: "Movimentação", value: filter.movementType });
  if (filter.status) pills.push({ key: "status", label: "Entidade", value: filter.status });

  if (pills.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2.5 px-5 py-4 rounded-2xl border"
      style={{ backgroundColor: "#F7F4EE", borderColor: "#E5DEC9" }}
    >
      <span className="text-xs font-bold mr-1" style={{ color: "#8C7A6B" }}>
        Filtros ativos
      </span>
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-2 bg-white border text-sm px-3.5 py-2 rounded-full shadow-sm"
          style={{ borderColor: "#E5DEC9", color: "#4A3328" }}
        >
          <span className="font-medium" style={{ color: "#8C7A6B" }}>
            {pill.label}
          </span>
          <span className="font-bold" style={{ color: "#1A5347" }}>
            {pill.value}
          </span>
          <button
            type="button"
            onClick={() => onRemove(pill.key)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
            style={{ color: "#B8A083" }}
            aria-label={`Remover filtro ${pill.label}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-sm font-bold px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
        style={{ color: "#B91C1C" }}
      >
        Limpar todos
      </button>
    </div>
  );
}

// ─── Favoritos ───────────────────────────────────────────────────────────────
interface FavoritesPanelProps {
  reportType: ReportType;
  filter: ReportFilter;
  onApply: (f: ReportFilter) => void;
}

export function FavoritesPanel({ reportType, filter, onApply }: FavoritesPanelProps) {
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState<{ name: string; filter: ReportFilter }[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!reportType) return;
    const saved = localStorage.getItem(`voltq_fav_filters_${reportType}`);
    setFavorites(saved ? JSON.parse(saved) : []);
    setNewName("");
  }, [reportType]);

  const save = () => {
    if (!newName.trim() || !reportType) return;
    const updated = [...favorites, { name: newName.trim(), filter }];
    setFavorites(updated);
    localStorage.setItem(`voltq_fav_filters_${reportType}`, JSON.stringify(updated));
    setNewName("");
  };

  const remove = (idx: number) => {
    if (!reportType) return;
    const updated = favorites.filter((_, i) => i !== idx);
    setFavorites(updated);
    localStorage.setItem(`voltq_fav_filters_${reportType}`, JSON.stringify(updated));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="min-h-[48px] flex items-center gap-2 px-5 border text-sm font-bold rounded-2xl transition-all shadow-sm"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E5DEC9",
          color: "#4A3328",
        }}
      >
        <Bookmark
          size={18}
          className={favorites.length > 0 ? "fill-current" : ""}
          style={{ color: favorites.length > 0 ? "#D4AF37" : "#B8A083" }}
        />
        Favoritos {favorites.length > 0 && `(${favorites.length})`}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "#B8A083" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-3 w-96 rounded-3xl z-30 p-5 border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E8E0D2",
            boxShadow: "0 20px 50px -12px rgba(74,51,40,0.2)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#8C7A6B" }}>
            Salvar filtro atual
          </p>
          <div className="flex gap-2 mb-5">
            <input
              type="text"
              placeholder="Nome do favorito..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="flex-1 min-h-[48px] text-sm border rounded-2xl px-4 font-medium focus:outline-none focus:border-[#1A5347] focus:ring-4 focus:ring-[#1A5347]/10"
              style={{ borderColor: "#E5DEC9" }}
            />
            <button
              type="button"
              onClick={save}
              className="min-h-[48px] px-4 text-white rounded-2xl text-sm font-bold flex items-center gap-1.5"
              style={{ backgroundColor: "#1A5347" }}
            >
              <Plus size={16} /> Salvar
            </button>
          </div>

          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#8C7A6B" }}>
            Salvos {favorites.length > 0 && `· ${favorites.length}`}
          </p>
          {favorites.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#B8A083" }}>
              Nenhum favorito ainda.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {favorites.map((fav, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-3 rounded-2xl hover:bg-[#F7F4EE] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(fav.filter);
                      setOpen(false);
                    }}
                    className="flex-1 text-left text-sm font-semibold truncate"
                    style={{ color: "#1A5347" }}
                  >
                    {fav.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-2 rounded-xl hover:bg-white"
                    style={{ color: "#B8A083" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
