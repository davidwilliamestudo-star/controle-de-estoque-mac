import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Plus,
  Trash2,
  X,
  FileType,
  Syringe,
  LayoutGrid,
  Settings,
  AlignLeft,
  FileSignature,
  CircleDollarSign,
  Package,
  Pill,
} from "lucide-react";
import { protocolSchema, type ProtocolFormData } from "../schemas/protocol.schema";
import { useSaveProtocol } from "../hooks/useProtocols";
import { useEvolutionTemplates } from "../hooks/useEvolutionTemplates";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { classifyMaterial, isSyringeKind } from "@/features/monthly-summary/lib/materialClassifier";
import type { Protocol, ProtocolItem } from "../types";

interface ProtocolFormModalProps {
  protocol: { protocol: Protocol; items: ProtocolItem[] } | null;
  onClose: () => void;
}

type QuickSlot = "syringe" | "needle" | "disposable";

function makeMaterialItem(
  inventoryItemId: string,
  unit: string,
  itemRole: ProtocolItem["itemRole"] = "material",
): Partial<ProtocolItem> {
  return {
    inventoryItemId,
    itemRole,
    defaultQuantity: 1,
    unit: unit || "un",
    isRequired: 1,
  };
}

export function ProtocolFormModal({ protocol, onClose }: ProtocolFormModalProps) {
  const saveProtocol = useSaveProtocol();
  const { data: options } = useInventoryOptions();
  const { data: templates = [] } = useEvolutionTemplates();

  const [items, setItems] = useState<Partial<ProtocolItem>[]>(
    protocol ? protocol.items : [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema) as any,
    defaultValues: {
      name: "",
      categoryId: "",
      administrationRouteId: "",
      description: "",
      internalNotes: "",
      isActive: 1,
      basePrice: 0,
    },
  });

  useEffect(() => {
    if (protocol) {
      reset({
        id: protocol.protocol.id,
        name: protocol.protocol.name,
        categoryId: protocol.protocol.categoryId ?? "",
        administrationRouteId: protocol.protocol.administrationRouteId ?? "",
        description: protocol.protocol.description ?? "",
        internalNotes: protocol.protocol.internalNotes ?? "",
        defaultEvolutionTemplateId: protocol.protocol.defaultEvolutionTemplateId ?? "",
        isActive: protocol.protocol.isActive,
        basePrice: protocol.protocol.basePrice ?? 0,
      });
      setItems(protocol.items);
    } else {
      reset({
        name: "",
        categoryId: "",
        administrationRouteId: "",
        description: "",
        internalNotes: "",
        defaultEvolutionTemplateId: "",
        isActive: 1,
        basePrice: 0,
      });
      setItems([]);
    }
  }, [protocol, reset]);

  const inventoryItems = options?.items || [];

  const materialCatalog = useMemo(() => {
    const syringes: typeof inventoryItems = [];
    const needles: typeof inventoryItems = [];
    const disposables: typeof inventoryItems = [];

    for (const inv of inventoryItems) {
      if (inv.item_type === "medication") continue;
      const kind = classifyMaterial(inv.name, inv.category_name, inv.item_type);
      if (isSyringeKind(kind)) {
        syringes.push(inv);
      } else if (kind === "needle") {
        needles.push(inv);
      } else if (
        kind === "cotton" ||
        kind === "alcohol" ||
        kind === "other_material" ||
        inv.item_type === "material"
      ) {
        disposables.push(inv);
      }
    }

    // Ordena seringas: 3 → 5 → 10 → outras
    const syringeOrder = (name: string) => {
      const n = name.toLowerCase();
      if (/\b3\s*ml\b|\b3ml\b/.test(n)) return 1;
      if (/\b5\s*ml\b|\b5ml\b/.test(n)) return 2;
      if (/\b10\s*ml\b|\b10ml\b/.test(n)) return 3;
      return 9;
    };
    syringes.sort((a, b) => syringeOrder(a.name) - syringeOrder(b.name) || a.name.localeCompare(b.name));

    return { syringes, needles, disposables };
  }, [inventoryItems]);

  /** Índices dos itens de insumos (não-medicamento) já no protocolo */
  const supplySlots = useMemo(() => {
    let syringeIdx = -1;
    let needleIdx = -1;
    let disposableIdx = -1;

    items.forEach((item, index) => {
      if (!item.inventoryItemId) return;
      const inv = inventoryItems.find((i) => i.id === item.inventoryItemId);
      const kind = classifyMaterial(
        inv?.name || item.itemName || "",
        inv?.category_name,
        item.itemRole || inv?.item_type,
      );
      if (isSyringeKind(kind) && syringeIdx < 0) syringeIdx = index;
      else if (kind === "needle" && needleIdx < 0) needleIdx = index;
      else if (
        (kind === "cotton" || kind === "alcohol" || kind === "other_material") &&
        disposableIdx < 0 &&
        item.itemRole !== "medication"
      ) {
        disposableIdx = index;
      }
    });

    return { syringeIdx, needleIdx, disposableIdx };
  }, [items, inventoryItems]);

  const medicationItems = useMemo(() => {
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        if (index === supplySlots.syringeIdx || index === supplySlots.needleIdx || index === supplySlots.disposableIdx) {
          return false;
        }
        if (!item.inventoryItemId) {
          return item.itemRole === "medication" || !item.itemRole;
        }
        const inv = inventoryItems.find((i) => i.id === item.inventoryItemId);
        const kind = classifyMaterial(
          inv?.name || item.itemName || "",
          inv?.category_name,
          item.itemRole || inv?.item_type,
        );
        return kind === "medication" || item.itemRole === "medication";
      });
  }, [items, inventoryItems, supplySlots]);

  const extraMaterials = useMemo(() => {
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        if (
          index === supplySlots.syringeIdx ||
          index === supplySlots.needleIdx ||
          index === supplySlots.disposableIdx
        ) {
          return false;
        }
        // já listado como medicamento?
        if (medicationItems.some((m) => m.index === index)) return false;
        if (!item.inventoryItemId) return item.itemRole === "material";
        const inv = inventoryItems.find((i) => i.id === item.inventoryItemId);
        const kind = classifyMaterial(
          inv?.name || item.itemName || "",
          inv?.category_name,
          item.itemRole || inv?.item_type,
        );
        return kind !== "medication";
      });
  }, [items, inventoryItems, supplySlots, medicationItems]);

  const onSubmit = async (data: any) => {
    try {
      // Filtra linhas sem item selecionado
      const cleanItems = items.filter((i) => i.inventoryItemId);
      await saveProtocol.mutateAsync({
        protocol: {
          ...data,
          categoryId: data.categoryId || null,
          administrationRouteId: data.administrationRouteId || null,
          defaultEvolutionTemplateId: data.defaultEvolutionTemplateId || null,
        },
        items: cleanItems,
      });
      onClose();
    } catch (error) {
      alert(String(error));
    }
  };

  const handleAddMedication = () => {
    setItems([
      ...items,
      {
        inventoryItemId: "",
        itemRole: "medication",
        defaultQuantity: 1,
        unit: "ml",
        isRequired: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ProtocolItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === "inventoryItemId" && options) {
      const invItem = options.items.find((i) => i.id === value);
      if (invItem) {
        item.unit = invItem.unit;
        item.itemRole = (invItem.item_type as ProtocolItem["itemRole"]) || "medication";
        item.itemName = invItem.name;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  /** Define ou limpa o slot rápido de insumo (seringa / agulha / descartável). */
  const setQuickSupply = (slot: QuickSlot, inventoryItemId: string) => {
    const idxMap = {
      syringe: supplySlots.syringeIdx,
      needle: supplySlots.needleIdx,
      disposable: supplySlots.disposableIdx,
    } as const;
    const currentIdx = idxMap[slot];

    if (!inventoryItemId) {
      if (currentIdx >= 0) {
        setItems(items.filter((_, i) => i !== currentIdx));
      }
      return;
    }

    const inv = inventoryItems.find((i) => i.id === inventoryItemId);
    if (!inv) return;

    const next = makeMaterialItem(inventoryItemId, inv.unit, "material");
    next.itemName = inv.name;

    if (currentIdx >= 0) {
      const copy = [...items];
      copy[currentIdx] = { ...copy[currentIdx], ...next };
      setItems(copy);
    } else {
      setItems([...items, next]);
    }
  };

  const getSlotValue = (slot: QuickSlot): string => {
    const idx =
      slot === "syringe"
        ? supplySlots.syringeIdx
        : slot === "needle"
          ? supplySlots.needleIdx
          : supplySlots.disposableIdx;
    if (idx < 0) return "";
    return items[idx]?.inventoryItemId || "";
  };

  const getSlotQty = (slot: QuickSlot): number => {
    const idx =
      slot === "syringe"
        ? supplySlots.syringeIdx
        : slot === "needle"
          ? supplySlots.needleIdx
          : supplySlots.disposableIdx;
    if (idx < 0) return 1;
    return Number(items[idx]?.defaultQuantity) || 1;
  };

  const setSlotQty = (slot: QuickSlot, qty: number) => {
    const idx =
      slot === "syringe"
        ? supplySlots.syringeIdx
        : slot === "needle"
          ? supplySlots.needleIdx
          : supplySlots.disposableIdx;
    if (idx < 0) return;
    handleItemChange(idx, "defaultQuantity", qty > 0 ? qty : 1);
  };

  const missingSyringe = supplySlots.syringeIdx < 0;
  const missingNeedle = supplySlots.needleIdx < 0;

  return (
    <div className="modal-overlay active">
      <div className="modal-content" style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="icon-box icon-box-primary">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {protocol ? "Editar Protocolo" : "Novo Protocolo"}
              </h2>
              <p className="modal-subtitle">
                Defina substância e insumos (seringa, agulha) que já vêm na aplicação.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body custom-scrollbar">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome do Protocolo</label>
              <div className="input-with-icon">
                <FileType size={18} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Protocolo Vitamina C EV"
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Via de Aplicacao</label>
              <div className="input-with-icon">
                <Syringe size={18} />
                <select className="form-control" {...register("administrationRouteId")}>
                  <option value="">(Nenhuma / Nao se aplica)</option>
                  {(options?.administrationRoutes || []).map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Categoria</label>
              <div className="input-with-icon">
                <LayoutGrid size={18} />
                <select className="form-control" {...register("categoryId")}>
                  <option value="">(Nenhuma)</option>
                  {(options?.categories || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="input-with-icon">
                <Settings size={18} />
                <select
                  className="form-control"
                  {...register("isActive", { valueAsNumber: true })}
                >
                  <option value={1}>Ativo</option>
                  <option value={0}>Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid-2 mt-4">
            <div className="form-group">
              <label className="form-label font-semibold text-green-700">
                Preco Base (R$)
              </label>
              <div className="input-with-icon">
                <CircleDollarSign size={18} className="text-green-600" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  {...register("basePrice", { valueAsNumber: true })}
                />
              </div>
              {errors.basePrice && <p className="form-error">{errors.basePrice.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Descricao Breve (para uso em tela)</label>
              <div className="input-with-icon">
                <AlignLeft size={18} />
                <input type="text" className="form-control" {...register("description")} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Modelo de Evolucao Padrao</label>
              <div className="input-with-icon">
                <FileSignature size={18} />
                <select className="form-control" {...register("defaultEvolutionTemplateId")}>
                  <option value="">(Usar Padrao Geral)</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Observacoes Internas</label>
            <textarea className="form-control" rows={2} {...register("internalNotes")} />
          </div>

          {/* ── SUBSTÂNCIAS ─────────────────────────────── */}
          <div className="divider mt-6 mb-4" />

          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--color-gray-900)" }}
            >
              <Pill size={16} className="text-[#1A5347]" />
              Substâncias / Medicamentos
            </h3>
            <button type="button" onClick={handleAddMedication} className="btn btn-secondary btn-sm">
              <Plus size={16} /> Adicionar substância
            </button>
          </div>

          {medicationItems.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-4 mb-4 text-center"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
            >
              <p className="text-sm text-slate-500">
                Nenhuma substância ainda. Adicione o medicamento principal do protocolo.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {medicationItems.map(({ item, index }) => (
                <div
                  key={`med-${index}`}
                  className="flex items-start gap-3 p-3 rounded-xl border"
                  style={{
                    borderColor: "rgba(59,130,246,0.2)",
                    backgroundColor: "rgba(59,130,246,0.04)",
                  }}
                >
                  <div className="flex-1 form-group mb-0">
                    <label className="form-label text-xs">Medicamento</label>
                    <select
                      className="form-control text-sm"
                      value={item.inventoryItemId}
                      onChange={(e) => handleItemChange(index, "inventoryItemId", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {inventoryItems
                        .filter((o) => o.item_type === "medication" || o.item_type === "other")
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="w-24 form-group mb-0">
                    <label className="form-label text-xs">Qtd (ml)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control text-sm"
                      value={item.defaultQuantity ?? ""}
                      onChange={(e) =>
                        handleItemChange(index, "defaultQuantity", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="btn btn-ghost btn-icon mt-6"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── INSUMOS DO ATENDIMENTO ─────────────────── */}
          <div
            className="rounded-2xl border p-4 mb-4"
            style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
          >
            <div className="flex items-start gap-2 mb-3">
              <div
                className="p-1.5 rounded-lg shrink-0"
                style={{ backgroundColor: "#ECFDF5", color: "#047857" }}
              >
                <Syringe size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Insumos do Atendimento</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ao escolher este protocolo na aplicação, seringa e agulha já entram automaticamente.
                  Quantidade padrão = 1 (editável na hora).
                </p>
              </div>
            </div>

            {(missingSyringe || missingNeedle) && (
              <div
                className="text-xs rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
                style={{ backgroundColor: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}
              >
                <Package size={14} />
                {missingSyringe && missingNeedle
                  ? "Este protocolo ainda não tem seringa nem agulha definidas."
                  : missingSyringe
                    ? "Falta definir a seringa deste protocolo."
                    : "Falta definir a agulha deste protocolo."}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Seringa */}
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold text-[#4A3328]">
                  Seringa (3 / 5 / 10 ml)
                </label>
                <select
                  className="form-control text-sm"
                  value={getSlotValue("syringe")}
                  onChange={(e) => setQuickSupply("syringe", e.target.value)}
                >
                  <option value="">(Não incluir)</option>
                  {materialCatalog.syringes.length === 0 ? (
                    <option value="" disabled>
                      Cadastre seringas em Materiais
                    </option>
                  ) : (
                    materialCatalog.syringes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
                {getSlotValue("syringe") && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[#6B7280]">Qtd</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="form-control text-xs w-16 py-1"
                      value={getSlotQty("syringe")}
                      onChange={(e) => setSlotQty("syringe", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                )}
              </div>

              {/* Agulha */}
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold text-[#4A3328]">Agulha</label>
                <select
                  className="form-control text-sm"
                  value={getSlotValue("needle")}
                  onChange={(e) => setQuickSupply("needle", e.target.value)}
                >
                  <option value="">(Não incluir)</option>
                  {materialCatalog.needles.length === 0 ? (
                    <option value="" disabled>
                      Cadastre agulhas em Materiais
                    </option>
                  ) : (
                    materialCatalog.needles.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))
                  )}
                </select>
                {getSlotValue("needle") && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[#6B7280]">Qtd</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="form-control text-xs w-16 py-1"
                      value={getSlotQty("needle")}
                      onChange={(e) => setSlotQty("needle", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                )}
              </div>

              {/* Descartável */}
              <div className="form-group mb-0">
                <label className="form-label text-xs font-semibold text-[#4A3328]">
                  Descartável (algodão, álcool...)
                </label>
                <select
                  className="form-control text-sm"
                  value={getSlotValue("disposable")}
                  onChange={(e) => setQuickSupply("disposable", e.target.value)}
                >
                  <option value="">(Opcional)</option>
                  {materialCatalog.disposables.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {getSlotValue("disposable") && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[#6B7280]">Qtd</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="form-control text-xs w-16 py-1"
                      value={getSlotQty("disposable")}
                      onChange={(e) => setSlotQty("disposable", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                )}
              </div>
            </div>

            {materialCatalog.syringes.length === 0 && materialCatalog.needles.length === 0 && (
              <p className="text-[11px] text-[#8C4A27] mt-3">
                Dica: cadastre materiais com nomes como &quot;Seringa 3ml&quot;, &quot;Seringa 5ml&quot;,
                &quot;Seringa 10ml&quot; e &quot;Agulha 30G&quot; em Materiais para aparecerem aqui.
              </p>
            )}
          </div>

          {/* Materiais extras (além dos 3 slots) */}
          {extraMaterials.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                Outros materiais no protocolo
              </h4>
              <div className="space-y-2">
                {extraMaterials.map(({ item, index }) => (
                  <div
                    key={`mat-${index}`}
                    className="flex items-start gap-3 p-3 rounded border"
                    style={{
                      borderColor: "var(--color-gray-200)",
                      backgroundColor: "var(--color-gray-50)",
                    }}
                  >
                    <div className="flex-1 form-group mb-0">
                      <label className="form-label text-xs">Item</label>
                      <select
                        className="form-control text-sm"
                        value={item.inventoryItemId}
                        onChange={(e) =>
                          handleItemChange(index, "inventoryItemId", e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        {inventoryItems.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 form-group mb-0">
                      <label className="form-label text-xs">Qtd</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control text-sm"
                        value={item.defaultQuantity ?? ""}
                        onChange={(e) =>
                          handleItemChange(index, "defaultQuantity", parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="btn btn-ghost btn-icon mt-6"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveProtocol.isPending}
            >
              {saveProtocol.isPending ? "Salvando..." : "Salvar Protocolo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
