import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory.service";
import { inventoryReceiptService } from "../services/inventoryReceipt.service";
import type { InventoryItemType, ManualInventoryEntryInput } from "../types";
import { BatchFields } from "./BatchFields";
import { EntryReviewStep } from "./EntryReviewStep";
import { UnitConversionFields } from "./UnitConversionFields";
import { XmlImportPanel } from "./XmlImportPanel";

const today = new Date().toISOString().slice(0, 10);

const initialForm: ManualInventoryEntryInput = {
  supplierName: "",
  invoiceNumber: "",
  invoiceKey: "",
  entryDate: today,
  receiptNotes: "",
  itemMode: "existing",
  itemType: "medication",
  itemName: "",
  inventoryItemId: "",
  minimumStock: 0,
  commercialQuantity: 1,
  commercialUnit: "unidade",
  contentPerCommercialUnit: 1,
  controlUnit: "unidade",
  batchNumber: "",
  manufacturingDate: "",
  expirationDate: "",
  unitCost: 0,
  notes: "",
  locationId: "",
  generateLabels: true,
  labelQuantity: 1,
};

export function InventoryEntryForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"manual" | "xml">("manual");
  const [form, setForm] = useState<ManualInventoryEntryInput>(initialForm);
  const [success, setSuccess] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ["inventory-options"],
    queryFn: inventoryService.getInventoryOptions,
  });

  const selectedItem = optionsQuery.data?.items.find(item => item.id === form.inventoryItemId);
  const itemDisplayName = selectedItem?.name ?? "";
  const currentItemType = selectedItem?.item_type ?? "medication";

  const defaultTemplateId = useMemo(() => {
    return optionsQuery.data?.labelTemplates.find(template => template.is_default === 1)?.id
      ?? optionsQuery.data?.labelTemplates[0]?.id
      ?? "";
  }, [optionsQuery.data?.labelTemplates]);

  const defaultLocationId = useMemo(() => {
    return optionsQuery.data?.locations?.find(loc => loc.is_default === 1)?.id 
      ?? optionsQuery.data?.locations?.[0]?.id 
      ?? "";
  }, [optionsQuery.data?.locations]);

  const saveMutation = useMutation({
    mutationFn: inventoryReceiptService.createManualEntry,
    onSuccess: (result) => {
      setSuccess(`Entrada salva: ${result.totalControlQuantity.toLocaleString("pt-BR")} ${form.controlUnit}.`);
      if (result.labelJobId) {
        navigate({ to: "/labels", search: { jobId: result.labelJobId } });
      } else {
        navigate({ to: "/inventory", search: { success: true } });
      }
    },
  });

  function update<K extends keyof ManualInventoryEntryInput>(field: K, value: ManualInventoryEntryInput[K]) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function handleSelectExistingItem(inventoryItemId: string) {
    const item = optionsQuery.data?.items.find(candidate => candidate.id === inventoryItemId);
    setForm(current => ({
      ...current,
      inventoryItemId,
      controlUnit: item?.unit ?? current.controlUnit,
      minimumStock: Number(item?.minimum_stock ?? current.minimumStock),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate({
      ...form,
      labelTemplateId: form.labelTemplateId || defaultTemplateId,
      locationId: form.locationId || defaultLocationId,
    });
  }

  if (optionsQuery.isLoading) {
    return <div className="card">Carregando dados do estoque...</div>;
  }

  return (
    <div className="flex-col gap-6">
      <div className="tabs">
        <button className={`tab ${mode === "manual" ? "active" : ""}`} type="button" onClick={() => setMode("manual")}>
          Entrada manual
        </button>
        <button className={`tab ${mode === "xml" ? "active" : ""}`} type="button" onClick={() => setMode("xml")}>
          Importar XML
        </button>
      </div>

      {mode === "xml" ? (
        <XmlImportPanel />
      ) : (
        <form className="flex-col gap-6" onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Dados da entrada</h3>
                <p className="card-description">Identifique fornecedor, nota fiscal e data da movimentacao.</p>
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <input
                  className="form-control"
                  list="supplier-options"
                  value={form.supplierName}
                  onChange={(event) => update("supplierName", event.target.value)}
                  placeholder="Nome do fornecedor"
                />
                <datalist id="supplier-options">
                  {optionsQuery.data?.suppliers.map(supplier => <option key={supplier.id} value={supplier.name} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Nota fiscal</label>
                <input className="form-control" value={form.invoiceNumber} onChange={(event) => update("invoiceNumber", event.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Chave da nota</label>
                <input className="form-control" value={form.invoiceKey} onChange={(event) => update("invoiceKey", event.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Data de entrada</label>
                <input type="date" className="form-control" value={form.entryDate} onChange={(event) => update("entryDate", event.target.value)} required />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Item de Estoque</h3>
                <p className="card-description">Selecione o item que esta recebendo.</p>
              </div>
            </div>

            <div className="grid-2 mt-4">
              <div className="form-group col-span-2">
                <label className="form-label">Item existente</label>
                <select className="form-control" value={form.inventoryItemId ?? ""} onChange={(event) => handleSelectExistingItem(event.target.value)} required>
                  <option value="">-- Selecione o item --</option>
                  {optionsQuery.data?.items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                </select>
              </div>

              {form.inventoryItemId && (
                <>
                  <div className="form-group">
                    <label className="form-label">Categoria atual</label>
                    <select className="form-control" value={form.categoryId ?? ""} onChange={(event) => update("categoryId", event.target.value)}>
                      <option value="">Sem categoria</option>
                      {optionsQuery.data?.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ajustar estoque minimo</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={form.minimumStock} onChange={(event) => update("minimumStock", Number(event.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destino (Local/Armário) *</label>
                    <select className="form-control" value={form.locationId || defaultLocationId} onChange={(event) => update("locationId", event.target.value)} required>
                      {optionsQuery.data?.locations?.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <UnitConversionFields
            commercialQuantity={form.commercialQuantity}
            commercialUnit={form.commercialUnit}
            contentPerCommercialUnit={form.contentPerCommercialUnit}
            controlUnit={form.controlUnit}
            onChange={(field, value) => update(field, value as never)}
          />

          <BatchFields
            itemType={currentItemType}
            batchNumber={form.batchNumber ?? ""}
            manufacturingDate={form.manufacturingDate ?? ""}
            expirationDate={form.expirationDate ?? ""}
            unitCost={form.unitCost ?? 0}
            onChange={(field, value) => update(field, value as never)}
          />

          <EntryReviewStep data={{ ...form, labelTemplateId: form.labelTemplateId || defaultTemplateId }} itemDisplayName={itemDisplayName} itemType={currentItemType} />

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Etiquetas</h3>
                <p className="card-description">Gere etiquetas com QR Code interno apos salvar a entrada.</p>
              </div>
            </div>
            <div className="grid-3">
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" checked={form.generateLabels} onChange={(event) => update("generateLabels", event.target.checked)} />
                Gerar etiquetas apos salvar
              </label>

              <div className="form-group">
                <label className="form-label">Template</label>
                <select className="form-control" value={form.labelTemplateId || defaultTemplateId} onChange={(event) => update("labelTemplateId", event.target.value)}>
                  {optionsQuery.data?.labelTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantidade de etiquetas</label>
                <input type="number" min="1" className="form-control" value={form.labelQuantity} onChange={(event) => update("labelQuantity", Number(event.target.value))} />
              </div>
            </div>
          </div>

          {success && <div className="badge badge-success">{success}</div>}
          {saveMutation.error && (
            <div className="badge badge-danger">
              {saveMutation.error instanceof Error ? saveMutation.error.message : String(saveMutation.error)}
            </div>
          )}

          <div className="flex justify-between">
            <Link to="/inventory" search={{ success: undefined }} className="btn btn-secondary">Voltar para estoque</Link>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              <Save size={16} />
              {saveMutation.isPending ? "Salvando..." : "Salvar entrada"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

