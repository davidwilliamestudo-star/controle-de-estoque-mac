import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus, Trash2, X, FileType, Syringe, LayoutGrid, Settings, AlignLeft, FileSignature } from "lucide-react";
import { protocolSchema, type ProtocolFormData } from "../schemas/protocol.schema";
import { useSaveProtocol } from "../hooks/useProtocols";
import { useEvolutionTemplates } from "../hooks/useEvolutionTemplates";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import type { Protocol, ProtocolItem } from "../types";

interface ProtocolFormModalProps {
  protocol: { protocol: Protocol; items: ProtocolItem[] } | null;
  onClose: () => void;
}

export function ProtocolFormModal({ protocol, onClose }: ProtocolFormModalProps) {
  const saveProtocol = useSaveProtocol();
  const { data: options } = useInventoryOptions();
  const { data: templates = [] } = useEvolutionTemplates();

  const [items, setItems] = useState<Partial<ProtocolItem>[]>(
    protocol ? protocol.items : []
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
      });
    }
  }, [protocol, reset]);

  const onSubmit = async (data: any) => {
    try {
      await saveProtocol.mutateAsync({
        protocol: {
          ...data,
          categoryId: data.categoryId || null,
          administrationRouteId: data.administrationRouteId || null,
          defaultEvolutionTemplateId: data.defaultEvolutionTemplateId || null,
        },
        items,
      });
      onClose();
    } catch (error) {
      alert(String(error));
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        inventoryItemId: "",
        itemRole: "medication",
        defaultQuantity: 1,
        unit: "un",
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

    // Auto fill unit and role when item changes
    if (field === "inventoryItemId" && options) {
      const invItem = options.items.find(i => i.id === value);
      if (invItem) {
        item.unit = invItem.unit;
        item.itemRole = invItem.item_type as any;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="icon-box icon-box-primary">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="modal-title">{protocol ? "Editar Protocolo" : "Novo Protocolo"}</h2>
              <p className="modal-subtitle">Defina os detalhes e a composicao padrao.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome do Protocolo</label>
              <div className="input-with-icon">
                <FileType size={18} />
                <input type="text" className="form-control" placeholder="Ex: Protocolo Vitamina C EV" {...register("name")} />
              </div>
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Via de Aplicacao</label>
              <div className="input-with-icon">
                <Syringe size={18} />
                <select className="form-control" {...register("administrationRouteId")}>
                  <option value="">(Nenhuma / Nao se aplica)</option>
                  {(options?.administrationRoutes || []).map(route => (
                    <option key={route.id} value={route.id}>{route.name}</option>
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
                  {(options?.categories || []).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="input-with-icon">
                <Settings size={18} />
                <select className="form-control" {...register("isActive", { valueAsNumber: true })}>
                  <option value={1}>Ativo</option>
                  <option value={0}>Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid-2 mt-4">
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
                  {templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Observacoes Internas</label>
            <textarea className="form-control" rows={3} {...register("internalNotes")} />
          </div>

          <div className="divider mt-6 mb-4"></div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-gray-900)" }}>
              Composicao Padrao (Itens)
            </h3>
            <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state py-4">
              <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>Nenhum item padrao definido para este protocolo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded border" style={{ borderColor: "var(--color-gray-200)", backgroundColor: "var(--color-gray-50)" }}>
                  <div className="flex-1 form-group mb-0">
                    <label className="form-label text-xs">Item de Estoque</label>
                    <select
                      className="form-control text-sm"
                      value={item.inventoryItemId}
                      onChange={(e) => handleItemChange(index, "inventoryItemId", e.target.value)}
                      required
                    >
                      <option value="">Selecione o item...</option>
                      {(options?.items || []).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-24 form-group mb-0">
                    <label className="form-label text-xs">Qtd Padrao</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control text-sm"
                      value={item.defaultQuantity}
                      onChange={(e) => handleItemChange(index, "defaultQuantity", parseFloat(e.target.value))}
                      required
                    />
                  </div>

                  <div className="w-24 form-group mb-0">
                    <label className="form-label text-xs">Obrigatorio?</label>
                    <select
                      className="form-control text-sm"
                      value={item.isRequired}
                      onChange={(e) => handleItemChange(index, "isRequired", parseInt(e.target.value))}
                    >
                      <option value={1}>Sim</option>
                      <option value={0}>Nao</option>
                    </select>
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

          <div className="modal-footer mt-6">
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
