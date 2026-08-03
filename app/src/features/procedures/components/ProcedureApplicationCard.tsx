import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, MapPin, Package, Plus, Trash2, X, Droplets, AlertTriangle } from "lucide-react";
import type { ProcedureApplication, ProcedureItemUsed } from "../types";
import { useProtocolItems } from "../hooks/useProcedures";
import { useBatchesForItem } from "../hooks/useBodyAreas";

interface ProcedureApplicationCardProps {
  application: ProcedureApplication;
  index: number;
  protocols: any[];
  bodyAreas: any[];
  inventoryData: any;
  onChange: (updated: ProcedureApplication) => void;
  onRemove: () => void;
  canRemove: boolean;
  /** Quando true, exibe borda destacada (card sinalizado pelo clique no mapa) */
  isFocused?: boolean;
}

/** Determina a unidade correta para um item de inventário */
function resolveUnit(itemType: string | undefined, inventoryUnit: string | undefined): string {
  // Medicamentos são sempre em ml
  if (!itemType || itemType === "medication") return "ml";
  // Materiais mantêm a unidade cadastrada no estoque
  return inventoryUnit || "un";
}

/** Linha de item dentro de uma aplicação */
function ApplicationItemRow({
  item,
  inventoryData,
  onChange,
  onRemove,
}: {
  item: Partial<ProcedureItemUsed>;
  index: number;
  inventoryData: any;
  onChange: (updates: Partial<ProcedureItemUsed>) => void;
  onRemove: () => void;
}) {
  const { data: batches = [] } = useBatchesForItem(item.inventoryItemId || null);

  const isMedication = !item.itemType || item.itemType === "medication";
  const displayUnit = isMedication ? "ml" : (item.unit || "un");

  const handleItemSelect = (itemId: string) => {
    const inv = inventoryData?.items?.find((i: any) => i.id === itemId);
    if (inv) {
      const resolvedUnit = resolveUnit(inv.item_type, inv.unit);
      onChange({
        inventoryItemId: itemId,
        unit: resolvedUnit,
        itemType: inv.item_type || "medication",
        inventoryBatchId: ""
      });
    } else {
      onChange({ inventoryItemId: itemId });
    }
  };

  const selectedInv = inventoryData?.items?.find((i: any) => i.id === item.inventoryItemId);

  return (
    <div
      className="flex gap-2 items-start p-2 rounded-lg border"
      style={{
        background: isMedication ? "rgba(59,130,246,0.04)" : "rgba(107,114,128,0.04)",
        borderColor: isMedication ? "rgba(59,130,246,0.15)" : "#f3f4f6",
      }}
    >
      <div className="flex-1 min-w-0">
        <select
          className="form-control text-xs mb-1.5"
          value={item.inventoryItemId || ""}
          onChange={(e) => handleItemSelect(e.target.value)}
        >
          <option value="">Selecionar medicamento / material...</option>
          {inventoryData?.items?.map((inv: any) => (
            <option key={inv.id} value={inv.id}>
              {inv.name}{" "}
              {inv.current_stock !== undefined
                ? `(${inv.current_stock} ${resolveUnit(inv.item_type, inv.unit)} disponível)`
                : ""}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5 items-center">
          <div className="relative">
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="form-control text-xs w-24 pr-7"
              placeholder={isMedication ? "0.00 ml" : "Qtd"}
              value={item.quantityUsed ?? ""}
              onChange={(e) => onChange({ quantityUsed: e.target.value ? parseFloat(e.target.value) : undefined })}
              title={isMedication ? "Quantidade em mililitros (ml)" : "Quantidade"}
            />
          </div>

          {/* Badge da unidade */}
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0"
            style={{
              background: isMedication ? "rgba(59,130,246,0.12)" : "#f3f4f6",
              color: isMedication ? "#1d4ed8" : "#6b7280",
            }}
          >
            {isMedication && <Droplets size={10} />}
            {displayUnit}
          </span>

          {batches.length > 0 && (
            <select
              className="form-control text-xs flex-1"
              value={item.inventoryBatchId || ""}
              onChange={(e) => onChange({ inventoryBatchId: e.target.value })}
            >
              <option value="">Lote...</option>
              {batches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {b.currentQuantity} {displayUnit} disp.
                  {b.expirationDate ? ` (val: ${b.expirationDate})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Aviso de unidade para medicamentos */}
        {isMedication && item.inventoryItemId && (
          <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
            <Droplets size={9} />
            Informe a quantidade em mililitros (ml)
          </p>
        )}

        {/* Estoque disponível */}
        {selectedInv && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Estoque: {selectedInv.current_stock} {resolveUnit(selectedInv.item_type, selectedInv.unit)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="btn btn-ghost btn-icon btn-sm text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5"
        title="Remover item"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Card de uma aplicação individual */
export function ProcedureApplicationCard({
  application,
  index,
  protocols,
  bodyAreas,
  inventoryData,
  onChange,
  onRemove,
  canRemove,
  isFocused = false,
}: ProcedureApplicationCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: protocolItems = [], isFetching, isSuccess } = useProtocolItems(application.protocolId);

  // Quando o protocolo muda, pré-popula os itens com unidade ml para medicamentos
  const [lastProtocolId, setLastProtocolId] = useState<string | null | undefined>(
    application.protocolId
  );
  useEffect(() => {
    // Só tentamos popular se o protocolo atual for diferente do último que populamos
    if (application.protocolId !== lastProtocolId) {
      if (!application.protocolId) {
        // Se limpou o protocolo
        setLastProtocolId(null);
      } else if (isSuccess && !isFetching) {
        // A query terminou de carregar os dados para este protocolo
        setLastProtocolId(application.protocolId);
        
        if (protocolItems.length > 0) {
          const existingIds = new Set(application.items.map((i) => i.inventoryItemId));
          const newItems: Partial<ProcedureItemUsed>[] = protocolItems
            .filter((pi) => !existingIds.has(pi.inventoryItemId))
            .map((pi) => ({
              inventoryItemId: pi.inventoryItemId,
              itemName: pi.itemName,
              itemType: pi.itemRole as any,
              quantityUsed: pi.defaultQuantity,
              // Medicamentos sempre em ml
              unit: resolveUnit(pi.itemRole, pi.unit),
              inventoryBatchId: "",
            }));
          if (newItems.length > 0) {
            onChange({ ...application, items: [...application.items, ...newItems] });
          }
        }
      }
    }
  }, [protocolItems, application.protocolId, lastProtocolId, isSuccess, isFetching]);

  function handleFieldChange(field: keyof ProcedureApplication, value: any) {
    onChange({ ...application, [field]: value || null });
  }

  function handleItemChange(itemIndex: number, updates: Partial<ProcedureItemUsed>) {
    const updated = application.items.map((item, i) =>
      i === itemIndex ? { ...item, ...updates } : item
    );
    onChange({ ...application, items: updated });
  }

  function handleAddItem() {
    onChange({
      ...application,
      items: [
        ...application.items,
        {
          inventoryItemId: "",
          inventoryBatchId: "",
          quantityUsed: undefined,
          unit: "ml",
          itemType: "medication",
        },
      ],
    });
  }

  function handleRemoveItem(itemIndex: number) {
    onChange({
      ...application,
      items: application.items.filter((_, i) => i !== itemIndex),
    });
  }

  const selectedProtocol = protocols.find((p) => p.id === application.protocolId);
  const selectedArea = bodyAreas.find((a: any) => a.id === application.bodyAreaId);

  // --- TRAVA DE SEGURANÇA VISUAL (VIA DE ADMINISTRAÇÃO) ---
  const routeMap: Record<string, string> = {
    'route-ev': 'EV',
    'route-im': 'IM',
    'route-sc': 'SC'
  };

  const getRequiredRoute = (): { route: string; sourceName: string } | null => {
    if (selectedProtocol?.administrationRouteId) {
      const code = routeMap[selectedProtocol.administrationRouteId];
      if (code) return { route: code, sourceName: `Protocolo ${selectedProtocol.name}` };
    }
    for (const item of application.items) {
      if (item.inventoryItemId) {
        const invItem = inventoryData?.inventoryItems?.find((i: any) => i.id === item.inventoryItemId);
        if (invItem?.administration_route_id) {
          const code = routeMap[invItem.administration_route_id];
          if (code) return { route: code, sourceName: `Medicamento ${invItem.name}` };
        }
      }
    }
    return null;
  };

  const requiredRoute = getRequiredRoute();
  const areaRoute = selectedArea?.routeCode?.toUpperCase();
  const showRouteWarning = requiredRoute && areaRoute && requiredRoute.route !== areaRoute;
  // --------------------------------------------------------

  return (
    <div
      className="card"
      style={{
        borderColor: isFocused ? "#2563eb" : "var(--color-primary-border, #d1d5db)",
        borderWidth: isFocused ? 2 : 1.5,
        boxShadow: isFocused ? "0 0 0 3px rgba(37,99,235,0.18), 0 2px 8px rgba(0,0,0,0.07)" : undefined,
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 p-3 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "var(--color-green-deep, #166534)" }}
          >
            {index + 1}
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-800">
              {selectedProtocol ? selectedProtocol.name : "Aplicação avulsa"}
            </span>
            {selectedArea && (
              <span className="ml-2 text-xs text-gray-500">
                <MapPin size={10} className="inline mr-0.5" />
                {selectedArea.displayName || selectedArea.name}
              </span>
            )}
            {application.items.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                · {application.items.length} item(ns)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="btn btn-ghost btn-icon btn-sm text-gray-400 hover:text-red-500"
              title="Remover aplicação"
            >
              <Trash2 size={14} />
            </button>
          )}
          {collapsed ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronUp size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {showRouteWarning && !collapsed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 mx-4 mt-2 rounded-md flex gap-2 items-start shadow-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <strong>Atenção à via de administração!</strong>
            <p className="mt-1 text-amber-700 text-xs">
              O <strong>{requiredRoute.sourceName}</strong> possui a via de administração pré-definida como <strong>{requiredRoute.route}</strong>, 
              mas a área selecionada ({selectedArea.displayName || selectedArea.name}) é indicada para via <strong>{areaRoute}</strong>.
            </p>
            <p className="mt-1 text-amber-700/80 text-xs italic">
              Esta é uma trava de segurança visual. Você pode prosseguir com a aplicação caso seja uma decisão clínica proposital.
            </p>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
          {/* Área (info da seleção no mapa) + Protocolo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Área selecionada pelo mapa — somente leitura aqui */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-600" /> Área de Aplicação
              </label>
              {selectedArea ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    borderColor: "rgba(59,130,246,0.25)",
                    color: "#1e40af",
                  }}
                >
                  <MapPin size={13} />
                  <span className="font-medium">{selectedArea.displayName || selectedArea.name}</span>
                  <button
                    type="button"
                    className="ml-auto text-gray-400 hover:text-red-500"
                    title="Limpar área"
                    onClick={() => handleFieldChange("bodyAreaId", null)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-dashed text-gray-400"
                  style={{ background: "#f9fafb" }}
                >
                  <MapPin size={12} />
                  Clique no mapa corporal ao lado para selecionar
                </div>
              )}
            </div>

            {/* Protocolo */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-1.5">
                <FlaskConical size={13} className="text-green-700" /> Protocolo
              </label>
              <select
                className="form-control text-sm"
                value={application.protocolId || ""}
                onChange={(e) => handleFieldChange("protocolId", e.target.value)}
              >
                <option value="">Avulso (sem protocolo)</option>
                {protocols.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {application.protocolId && protocolItems.length > 0 && (
                <p className="text-xs text-green-700 mt-1">
                  ✓ {protocolItems.length} medicamento(s) carregado(s) do protocolo
                </p>
              )}
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0 flex items-center gap-1.5">
                <Package size={13} className="text-gray-600" /> Medicamentos / Materiais
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-ghost btn-sm text-xs gap-1"
              >
                <Plus size={12} /> Adicionar item
              </button>
            </div>

            {application.items.length === 0 ? (
              <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 p-3 text-center">
                <p className="text-xs text-gray-400">
                  {application.protocolId
                    ? "Nenhum item carregado ainda. Aguarde ou adicione manualmente."
                    : "Selecione um protocolo para carregar os medicamentos, ou adicione manualmente."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {application.items.map((item, i) => (
                  <ApplicationItemRow
                    key={i}
                    item={item}
                    index={i}
                    inventoryData={inventoryData}
                    onChange={(updates) => handleItemChange(i, updates)}
                    onRemove={() => handleRemoveItem(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="form-group mb-0">
            <label className="form-label text-xs text-gray-500">
              Observações desta aplicação (opcional)
            </label>
            <input
              type="text"
              className="form-control text-sm"
              placeholder="Ex: Aplicação bilateral, paciente referiu dor leve..."
              value={application.notes || ""}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
