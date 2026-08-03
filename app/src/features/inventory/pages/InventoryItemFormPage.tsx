import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, ArrowLeft, Pill, Stethoscope, Monitor, Plus, Scale, Type, Tag, LayoutGrid, Zap, Syringe, Building2, MapPin, Hash, Calendar, Settings, Info, Beaker, CircleDollarSign } from "lucide-react";
import { inventoryService } from "../services/inventory.service";
import type { InventoryItem, InventoryItemType, InventoryItemUpdateInput } from "../types";
import { QuickCategoryModal } from "../components/QuickCategoryModal";
import { QuickSupplierModal } from "../components/QuickSupplierModal";

const emptyItemTemplate: InventoryItem = {
  id: "",
  clinic_id: "",
  name: "",
  item_type: "medication",
  unit: "",
  current_stock: 0,
  minimum_stock: 0,
  requires_batch: 0,
  requires_expiration: 0,
  is_active: 1,
  category_id: null,
  category_name: null,
  supplier_id: null,
  supplier_name: null,
  usage_in_protocol: 0,
  cost_price: 0,
  selling_price: 0,
  administration_route_id: null,
  notes: null,
  active_batches: 0,
  next_expiration_date: null,
};

export default function InventoryItemFormPage() {
  const navigate = useNavigate();
  // We use strict: false so we can re-use this page component for both routes (new and edit)
  const { itemId } = useParams({ strict: false }) as { itemId?: string };
  const search = useSearch({ strict: false }) as { type?: InventoryItemType };
  const queryClient = useQueryClient();

  const isEditing = Boolean(itemId);
  const itemTypeParam = search.type || "medication";

  const { data: itemData, isLoading: isLoadingItem } = useQuery({
    queryKey: ["inventory-item", itemId],
    queryFn: () => inventoryService.getInventoryItem(itemId!),
    enabled: isEditing,
  });

  const { data: options } = useQuery({
    queryKey: ["inventory-options"],
    queryFn: inventoryService.getInventoryOptions,
  });

  const item = isEditing ? itemData : { ...emptyItemTemplate, item_type: itemTypeParam };

  const [form, setForm] = useState<InventoryItemUpdateInput>({
    name: "",
    itemType: itemTypeParam,
    categoryId: "",
    administrationRouteId: "",
    unit: "",
    minimumStock: 0,
    requiresBatch: false,
    requiresExpiration: false,
    supplierId: "",
    notes: "",
    isActive: true,
    initialStock: 0,
    costPrice: 0,
    sellingPrice: 0,
    commercialName: "",
    activePrinciple: "",
    concentration: "",
    presentation: "",
    pharmaceuticalForm: "",
    clinicalControlUnit: "",
    unitConverter: null,
    materialType: "",
    usageInProtocol: false,
    equipmentPatrimony: "",
    equipmentSerial: "",
    equipmentBrand: "",
    equipmentModel: "",
    equipmentAcquisitionDate: "",
    equipmentNextMaintenance: "",
    equipmentLocation: "",
    equipmentMaintenanceStatus: "ativo",
  });

  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  useEffect(() => {
    if (isEditing && itemData && itemData.id !== undefined) {
      setForm({
        name: itemData.name || "",
        itemType: itemData.item_type || "medication",
        categoryId: itemData.category_id ?? "",
        administrationRouteId: itemData.administration_route_id ?? "",
        unit: itemData.unit || "",
        minimumStock: Number(itemData.minimum_stock ?? 0),
        requiresBatch: Number(itemData.requires_batch) === 1,
        requiresExpiration: Number(itemData.requires_expiration) === 1,
        supplierId: itemData.supplier_id ?? "",
        notes: itemData.notes ?? "",
        isActive: Number(itemData.is_active) !== 0,
        costPrice: Number(itemData.cost_price ?? 0),
        sellingPrice: Number(itemData.selling_price ?? 0),
        commercialName: itemData.commercial_name ?? "",
        activePrinciple: itemData.active_principle ?? "",
        concentration: itemData.concentration ?? "",
        presentation: itemData.presentation ?? "",
        pharmaceuticalForm: itemData.pharmaceutical_form ?? "",
        clinicalControlUnit: itemData.clinical_control_unit ?? "",
        unitConverter: itemData.unit_converter ?? null,
        materialType: itemData.material_type ?? "",
        usageInProtocol: Boolean(itemData.usage_in_protocol),
        equipmentPatrimony: itemData.equipment_patrimony ?? "",
        equipmentSerial: itemData.equipment_serial ?? "",
        equipmentBrand: itemData.equipment_brand ?? "",
        equipmentModel: itemData.equipment_model ?? "",
        equipmentAcquisitionDate: itemData.equipment_acquisition_date ?? "",
        equipmentNextMaintenance: itemData.equipment_next_maintenance ?? "",
        equipmentLocation: itemData.equipment_location ?? "",
        equipmentMaintenanceStatus: itemData.equipment_maintenance_status ?? "ativo",
      });
    }
  }, [isEditing, itemData]);

  const handleItemTypeChange = (newType: InventoryItemType) => {
    setForm(prev => {
      const next = { ...prev, itemType: newType };
      if (newType === "material") {
        next.administrationRouteId = "";
      } else if (newType === "equipment") {
        next.administrationRouteId = "";
        next.requiresBatch = false;
        next.requiresExpiration = false;
        next.unit = "un";
      }
      return next;
    });
  };

  const updateForm = (data: Partial<InventoryItemUpdateInput>) => {
    setForm(prev => ({ ...prev, ...data }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: InventoryItemUpdateInput) => {
      if (isEditing) {
        await inventoryService.updateInventoryItem(itemId!, data);
      } else {
        await inventoryService.createInventoryItem(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
      navigate({ to: "/inventory", search: {} as any });
    },
  });

  const getHeaderIcon = () => {
    switch (form.itemType) {
      case "medication": return <Pill size={28} />;
      case "equipment": return <Monitor size={28} />;
      case "material": return <Stethoscope size={28} />;
      default: return <Package size={28} />;
    }
  };

  const getTypeLabel = (t: string) => {
    if (t === "medication") return "Medicamento";
    if (t === "material") return "Material";
    if (t === "equipment") return "Equipamento";
    return "Item";
  };

  if (isEditing && isLoadingItem) {
    return <div className="p-8">Carregando dados...</div>;
  }

  const isSaving = saveMutation.isPending;

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12 px-4 sm:px-8 lg:px-12">
      <div className="page-header mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" className="btn btn-ghost btn-icon mr-2" onClick={() => navigate({ to: "/inventory", search: {} as any })}>
            <ArrowLeft size={24} />
          </button>
          <div className="empty-state-icon" style={{ width: 48, height: 48, margin: 0, backgroundColor: 'var(--color-bg-secondary)' }}>
            {getHeaderIcon()}
          </div>
          <div>
            <h1 className="page-title">{isEditing ? `Editar ${getTypeLabel(form.itemType)}` : `Novo ${getTypeLabel(form.itemType)}`}</h1>
            <p className="page-subtitle">
              {form.itemType === "equipment" ? "Atualize dados, status e patrimônio." : "Atualize cadastro, unidade, estoque e validade."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ to: "/inventory", search: {} as any })}>
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn btn-primary px-8" 
            disabled={isSaving}
            onClick={async () => await saveMutation.mutateAsync(form)}
          >
            {isSaving ? "Salvando..." : "Salvar Cadastro"}
          </button>
        </div>
      </div>

      {saveMutation.isError && (
        <div className="badge badge-danger mb-6 p-4 text-base">
          Erro ao salvar: {String(saveMutation.error)}
        </div>
      )}

      <div className="card space-y-8 p-8 shadow-md border border-gray-100">
        
        {/* Sessão Comum */}
        <section>
          <h4 className="font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
            <Package size={18} className="text-primary" />
            Informações Básicas
          </h4>
          <div className="grid-3 mb-6 gap-6">
            <div className="form-group col-span-2">
              <label className="form-label text-gray-700">Nome do {getTypeLabel(form.itemType).toLowerCase()} *</label>
              <div className="input-with-icon">
                <Type size={18} />
                <input className="form-control text-lg py-3 font-medium" value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="Ex: Seringa Descartável 10ml" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label text-gray-700">Tipo do Item</label>
              <div className="input-with-icon">
                <Tag size={18} />
                <select className="form-control text-lg py-3 bg-gray-50" value={form.itemType} onChange={e => handleItemTypeChange(e.target.value as InventoryItemType)}>
                  <option value="medication">Medicamento</option>
                  <option value="material">Material Clínico</option>
                  <option value="equipment">Equipamento</option>
                  <option value="other">Outro / Geral</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid-3 mb-2 gap-6">
            <div className="form-group">
              <label className="form-label text-gray-700 flex justify-between">
                Categoria
                <button type="button" className="text-primary text-sm flex items-center hover:underline" onClick={() => setShowQuickCategory(true)}>
                  <Plus size={14} className="mr-1" /> Nova
                </button>
              </label>
              <div className="input-with-icon">
                <LayoutGrid size={18} />
                <select className="form-control" value={form.categoryId ?? ""} onChange={e => updateForm({ categoryId: e.target.value || null })}>
                  <option value="">Sem categoria</option>
                  {options?.categories?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label text-gray-700 flex justify-between">
                Fornecedor Padrão
                <button type="button" className="text-primary text-sm flex items-center hover:underline" onClick={() => setShowQuickSupplier(true)}>
                  <Plus size={14} className="mr-1" /> Novo
                </button>
              </label>
              <div className="input-with-icon">
                <Building2 size={18} />
                <select className="form-control" value={form.supplierId ?? ""} onChange={e => updateForm({ supplierId: e.target.value })}>
                  <option value="">Sem fornecedor</option>
                  {options?.suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label text-gray-700">Status no Sistema</label>
              <div className="input-with-icon">
                <Settings size={18} />
                <select className="form-control" value={form.isActive ? "1" : "0"} onChange={e => updateForm({ isActive: e.target.value === "1" })}>
                  <option value="1">Ativo (Visível)</option>
                  <option value="0">Inativo</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Informações Financeiras */}
        <section className="mt-8 bg-green-50/30 p-6 rounded-xl border border-green-100">
          <h4 className="font-semibold text-green-800 mb-6 flex items-center gap-2 border-b border-green-200 pb-2">
            <CircleDollarSign size={18} className="text-green-600" />
            Informações Financeiras
          </h4>
          <div className="grid-2 mb-2 gap-6">
            <div className="form-group">
              <label className="form-label text-gray-700">Preço de Custo (R$)</label>
              <div className="input-with-icon">
                <span className="text-gray-500 font-semibold absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  className="form-control pl-10" 
                  value={form.costPrice ?? 0} 
                  onChange={e => updateForm({ costPrice: Number(e.target.value) })} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Quanto a clínica paga pela menor unidade ({form.unit || 'un'})</p>
            </div>
            
            <div className="form-group">
              <label className="form-label text-gray-700">Preço Base de Aplicação (R$)</label>
              <div className="input-with-icon">
                <span className="text-gray-500 font-semibold absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  className="form-control pl-10 font-medium text-green-700" 
                  value={form.sellingPrice ?? 0} 
                  onChange={e => updateForm({ sellingPrice: Number(e.target.value) })} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Valor sugerido de cobrança por {form.unit || 'un'} aplicada</p>
            </div>
          </div>
        </section>


        {/* Especificidades de Acordo com o Tipo */}
        {form.itemType === "medication" && (
          <section className="mt-8">
            <h4 className="font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
              <Pill size={18} className="text-primary" />
              Especificações do Medicamento
            </h4>
            
            <div className="grid-3 mb-6 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Nome Comercial</label>
                <div className="input-with-icon">
                  <Tag size={18} />
                  <input className="form-control" value={form.commercialName ?? ""} onChange={e => updateForm({ commercialName: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Princípio Ativo</label>
                <div className="input-with-icon">
                  <Beaker size={18} />
                  <input className="form-control" value={form.activePrinciple ?? ""} onChange={e => updateForm({ activePrinciple: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Concentração</label>
                <div className="input-with-icon">
                  <Hash size={18} />
                  <input className="form-control" value={form.concentration ?? ""} onChange={e => updateForm({ concentration: e.target.value })} placeholder="ex: 500mg" />
                </div>
              </div>
            </div>

            <div className="grid-3 mb-6 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Apresentação</label>
                <input className="form-control py-2.5" value={form.presentation ?? ""} onChange={e => updateForm({ presentation: e.target.value })} placeholder="ex: Caixa com 30" />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Forma Farmacêutica</label>
                <input className="form-control py-2.5" value={form.pharmaceuticalForm ?? ""} onChange={e => updateForm({ pharmaceuticalForm: e.target.value })} placeholder="ex: Comprimido" />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Vias de Aplicação</label>
                <select className="form-control py-2.5" value={form.administrationRouteId ?? ""} onChange={e => updateForm({ administrationRouteId: e.target.value })}>
                  <option value="">Não se aplica</option>
                  {options?.administrationRoutes.map(route => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6 shadow-sm">
              <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Scale size={18} className="text-primary" />
                Controle e Conversão de Unidades
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                  <label className="form-label text-gray-700 font-semibold">Qual a menor unidade que você controla no estoque? *</label>
                  <p className="text-sm text-gray-500 mb-3">Exemplo: ml, mg, comprimido. Esta será a base dos relatórios.</p>
                  <input 
                    className="form-control py-3 text-lg font-bold text-blue-800 bg-white" 
                    value={form.unit} 
                    onChange={e => updateForm({ unit: e.target.value })} 
                    required 
                    placeholder="ex: ml" 
                  />
                </div>

                <div className="bg-green-50/50 p-5 rounded-lg border border-green-100">
                  <label className="form-label text-gray-700 font-semibold">Como você costuma comprar ou receber esse item?</label>
                  <p className="text-sm text-gray-500 mb-3">Exemplo: caixa, ampola, frasco. Unidade de entrada.</p>
                  <input 
                    className="form-control py-3 text-lg font-bold text-green-800 bg-white" 
                    value={form.clinicalControlUnit ?? ""} 
                    onChange={e => updateForm({ clinicalControlUnit: e.target.value })} 
                    placeholder="ex: un, ampola" 
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="form-label text-gray-700 font-semibold mb-3">Regra de Conversão de Estoque</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <span className="text-gray-600 font-medium whitespace-nowrap">Cada 1</span>
                  <div className="bg-white px-4 py-2 border border-gray-300 rounded font-bold text-green-800 min-w-[120px] text-center">
                    {form.clinicalControlUnit || "(Entrada)"}
                  </div>
                  <span className="text-gray-600 font-medium whitespace-nowrap">vem com</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="form-control text-center text-lg font-bold w-32 border-primary focus:ring-primary shadow-sm" 
                    value={form.unitConverter ?? ""} 
                    onChange={e => updateForm({ unitConverter: e.target.value ? Number(e.target.value) : null })} 
                    placeholder="Qtd..." 
                  />
                  <div className="bg-white px-4 py-2 border border-gray-300 rounded font-bold text-blue-800 min-w-[120px] text-center">
                    {form.unit || "(Estoque)"}
                  </div>
                </div>
                
                {(form.clinicalControlUnit && form.unit && form.unitConverter) ? (
                  <div className="mt-5 bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 text-sm flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                    <span className="text-base">
                      <strong>Simulação:</strong> Se você der entrada em <strong>10 {form.clinicalControlUnit}</strong>, o sistema adicionará <strong>{10 * (form.unitConverter || 0)} {form.unit}</strong> ao seu estoque final.
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid-3 mb-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="form-group mb-0">
                <label className="form-label font-medium text-gray-700">Aviso de Estoque Mínimo</label>
                <input className="form-control py-2.5 text-lg" type="number" min="0" step="0.01" value={form.minimumStock} onChange={e => updateForm({ minimumStock: Number(e.target.value) })} />
              </div>
              <div className="form-group col-span-2 flex items-center gap-8 pl-4">
                <label className="form-label flex items-center gap-3 m-0 cursor-pointer text-gray-700 font-medium">
                  <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary" checked={form.requiresBatch} onChange={e => updateForm({ requiresBatch: e.target.checked })} />
                  Obrigar controle de Lote
                </label>
                <label className="form-label flex items-center gap-3 m-0 cursor-pointer text-gray-700 font-medium">
                  <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary" checked={form.requiresExpiration} onChange={e => updateForm({ requiresExpiration: e.target.checked })} />
                  Obrigar controle de Validade
                </label>
              </div>
            </div>
          </section>
        )}

        {form.itemType === "material" && (
          <section className="mt-8">
            <h4 className="font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
              <Stethoscope size={18} className="text-primary" />
              Especificações do Material
            </h4>
            
            <div className="grid-3 mb-6 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Tipo de Material</label>
                <input className="form-control py-2.5" value={form.materialType ?? ""} onChange={e => updateForm({ materialType: e.target.value })} placeholder="ex: Descartável, Consumo" />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Unidade de Controle *</label>
                <input className="form-control py-2.5 font-medium text-blue-800" value={form.unit} onChange={e => updateForm({ unit: e.target.value })} required placeholder="ex: un, cx" />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Aviso de Estoque Mínimo</label>
                <input className="form-control py-2.5" type="number" min="0" step="0.01" value={form.minimumStock} onChange={e => updateForm({ minimumStock: Number(e.target.value) })} />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mb-2">
              <div className="flex gap-8">
                <label className="form-label flex items-center gap-3 m-0 cursor-pointer text-gray-700 font-medium">
                  <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary" checked={form.requiresBatch} onChange={e => updateForm({ requiresBatch: e.target.checked })} />
                  Obrigar controle de Lote
                </label>
                <label className="form-label flex items-center gap-3 m-0 cursor-pointer text-gray-700 font-medium">
                  <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary" checked={form.requiresExpiration} onChange={e => updateForm({ requiresExpiration: e.target.checked })} />
                  Obrigar controle de Validade
                </label>
                <label className="form-label flex items-center gap-3 m-0 cursor-pointer text-gray-700 font-medium">
                  <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary" checked={form.usageInProtocol} onChange={e => updateForm({ usageInProtocol: e.target.checked })} />
                  Pode ser usado em Protocolos Clínicos
                </label>
              </div>
            </div>
          </section>
        )}

        {form.itemType === "equipment" && (
          <section className="mt-8">
            <h4 className="font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
              <Monitor size={18} className="text-primary" />
              Identificação do Equipamento
            </h4>
            
            <div className="grid-3 mb-6 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Nº de Patrimônio / Etiqueta</label>
                <input className="form-control py-2.5 font-mono text-gray-800 bg-gray-50" value={form.equipmentPatrimony ?? ""} onChange={e => updateForm({ equipmentPatrimony: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Número de Série (SN)</label>
                <input className="form-control py-2.5" value={form.equipmentSerial ?? ""} onChange={e => updateForm({ equipmentSerial: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Localização Inicial de Uso</label>
                <input className="form-control py-2.5" value={form.equipmentLocation ?? ""} onChange={e => updateForm({ equipmentLocation: e.target.value })} placeholder="ex: Consultório 1" />
              </div>
            </div>

            <div className="grid-3 mb-6 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Fabricante / Marca</label>
                <input className="form-control py-2.5" value={form.equipmentBrand ?? ""} onChange={e => updateForm({ equipmentBrand: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Modelo</label>
                <input className="form-control py-2.5" value={form.equipmentModel ?? ""} onChange={e => updateForm({ equipmentModel: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Data de Aquisição / Compra</label>
                <input type="date" className="form-control py-2.5" value={form.equipmentAcquisitionDate ?? ""} onChange={e => updateForm({ equipmentAcquisitionDate: e.target.value })} />
              </div>
            </div>

            <div className="grid-2 mb-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="form-group mb-0">
                <label className="form-label text-gray-700 font-medium flex items-center gap-2">
                  Status Operacional de Manutenção
                </label>
                <select className="form-control py-2.5" value={form.equipmentMaintenanceStatus ?? "ativo"} onChange={e => updateForm({ equipmentMaintenanceStatus: e.target.value })}>
                  <option value="ativo">Ativo - Em funcionamento</option>
                  <option value="em_manutencao">Em Manutenção Técnica</option>
                  <option value="inativo">Inativo / Danificado</option>
                  <option value="descartado">Descartado (Alienado)</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-gray-700 font-medium">Data Prevista para Próxima Manutenção</label>
                <input type="date" className="form-control py-2.5" value={form.equipmentNextMaintenance ?? ""} onChange={e => updateForm({ equipmentNextMaintenance: e.target.value })} />
              </div>
            </div>
          </section>
        )}

        {form.itemType === "other" && (
          <section className="mt-8">
            <div className="grid-2 mb-2 gap-6">
              <div className="form-group">
                <label className="form-label text-gray-600">Unidade de Controle</label>
                <input className="form-control py-2.5 font-medium text-blue-800" value={form.unit} onChange={e => updateForm({ unit: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-gray-600">Aviso de Estoque Mínimo</label>
                <input className="form-control py-2.5" type="number" min="0" step="0.01" value={form.minimumStock} onChange={e => updateForm({ minimumStock: Number(e.target.value) })} />
              </div>
            </div>
          </section>
        )}

        {/* Estoque Inicial (Apenas na criação) */}
        {!isEditing && (
          <section className="mt-8">
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2 text-lg">Estoque Inicial na Prateleira</h4>
              <p className="text-orange-800 mb-4 text-sm">
                Se você já possui este item na clínica, informe a quantidade atual em estoque (em <strong>{form.unit || 'unidade principal'}</strong>).
              </p>
              <div className="form-group mb-0 max-w-xs">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  className="form-control py-3 text-lg font-bold border-orange-300 focus:ring-orange-500 bg-white" 
                  value={form.initialStock ?? 0} 
                  onChange={e => updateForm({ initialStock: Number(e.target.value) })} 
                />
              </div>
            </div>
          </section>
        )}

        {/* Anotações */}
        <section className="mt-8">
          <div className="form-group">
            <label className="form-label text-gray-700 font-medium">
              {form.itemType === "equipment" ? "Observações Técnicas e Gerais" : "Observações Internas (Uso Clínico)"}
            </label>
            <textarea 
              className="form-control p-4 text-gray-700 leading-relaxed" 
              rows={4} 
              value={form.notes ?? ""} 
              onChange={e => updateForm({ notes: e.target.value })} 
              placeholder="Digite aqui qualquer informação relevante sobre uso, conservação ou peculiaridades do cadastro..."
            />
          </div>
        </section>

      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" className="btn btn-secondary" onClick={() => navigate({ to: "/inventory", search: {} as any })}>
          Cancelar e Voltar
        </button>
        <button 
          type="button" 
          className="btn btn-primary px-8" 
          disabled={isSaving}
          onClick={async () => await saveMutation.mutateAsync(form)}
        >
          {isSaving ? "Salvando..." : "Salvar Cadastro"}
        </button>
      </div>

      {showQuickCategory && (
        <QuickCategoryModal 
          onClose={() => setShowQuickCategory(false)}
          onSuccess={(id) => {
            updateForm({ categoryId: id });
            queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
            setShowQuickCategory(false);
          }}
        />
      )}

      {showQuickSupplier && (
        <QuickSupplierModal 
          onClose={() => setShowQuickSupplier(false)}
          onSuccess={(id) => {
            updateForm({ supplierId: id });
            queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
            setShowQuickSupplier(false);
          }}
        />
      )}
    </div>
  );
}
