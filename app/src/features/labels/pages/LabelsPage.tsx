import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Printer, QrCode } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { buildBatchQrPayload, labelsService } from "../services/labels.service";
import { LabelPrintPreview } from "../components/LabelPrintPreview";
import { LabelPrintCalibration } from "../components/LabelPrintCalibration";
import { LabelQrScanner } from "../components/LabelQrScanner";

export default function LabelsPage() {
  const search = useSearch({ from: "/shell/labels" });
  const navigate = useNavigate();
  const jobId = typeof search.jobId === "string" ? search.jobId : undefined;
  const batchQr = typeof search.qr === "string"
    ? search.qr
    : typeof search.batchId === "string"
      ? `CESTQ:BATCH:${search.batchId}`
      : undefined;

  const [startPosition, setStartPosition] = useState(1);
  const [isTestMode, setIsTestMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["label-templates"],
    queryFn: labelsService.listTemplates,
  });

  const inventoryOptionsQuery = useQuery({
    queryKey: ["label-inventory-options"],
    queryFn: labelsService.listInventoryLabelOptions,
  });

  const jobQuery = useQuery({
    queryKey: ["label-job", jobId],
    queryFn: () => labelsService.getPrintJob(jobId as string),
    enabled: Boolean(jobId),
  });

  const batchQuery = useQuery({
    queryKey: ["label-batch-qr", batchQr],
    queryFn: () => labelsService.resolveBatchQr(batchQr as string),
    enabled: Boolean(batchQr) && !jobId,
  });

  const templates = templatesQuery.data ?? [];
  const inventoryOptions = inventoryOptionsQuery.data ?? [];
  const selectedItem = useMemo(
    () => inventoryOptions.find(item => item.id === selectedItemId),
    [inventoryOptions, selectedItemId],
  );
  const selectedBatch = useMemo(
    () => selectedItem?.batches.find(batch => batch.id === selectedBatchId),
    [selectedItem, selectedBatchId],
  );
  const selectedQrPayload = selectedBatchId ? buildBatchQrPayload(selectedBatchId) : "";

  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      const defaultTemplate = templates.find(template => template.is_default === 1) ?? templates[0];
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedItemId && inventoryOptions.length > 0) {
      setSelectedItemId(inventoryOptions[0].id);
      return;
    }

    if (selectedItem && !selectedItem.batches.some(batch => batch.id === selectedBatchId)) {
      setSelectedBatchId(selectedItem.batches[0]?.id ?? "");
    }
  }, [inventoryOptions, selectedBatchId, selectedItem, selectedItemId]);

  async function handleCreateInventoryLabels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTemplateId || !selectedItem || !selectedBatch) {
      alert("Selecione um template, um item e um lote para gerar as etiquetas.");
      return;
    }

    const quantity = Math.max(1, Math.floor(Number(labelQuantity) || 1));
    setIsCreatingJob(true);

    try {
      const newJobId = await labelsService.createBatchLabelJob({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        batchId: selectedBatch.id,
        batchNumber: selectedBatch.batchNumber,
        expirationDate: selectedBatch.expirationDate,
        quantity,
        templateId: selectedTemplateId,
      });

      await navigate({ to: "/labels", search: { jobId: newJobId } });
    } catch (error) {
      console.error("Erro ao gerar etiquetas do estoque", error);
      alert(error instanceof Error ? error.message : "Nao foi possivel gerar as etiquetas.");
    } finally {
      setIsCreatingJob(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Etiquetas</h1>
          <p className="page-subtitle">Previa, impressao e consulta de QR Code por lote.</p>
        </div>
        <Link to="/inventory/entry" className="btn btn-primary">Nova entrada</Link>
      </div>

      {jobId ? (
        jobQuery.isLoading ? (
          <div className="card print-hidden">Carregando etiquetas...</div>
        ) : jobQuery.data ? (
          <div className="flex-col gap-4">
            <div className="grid-2 print-hidden">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Opções de Impressão</h3>
                    <p className="card-description">Configure a posição inicial na folha.</p>
                  </div>
                </div>
                <div className="form-group mt-4" style={{ maxWidth: '200px' }}>
                  <label>Posição Inicial (1 a {jobQuery.data.template.columns * jobQuery.data.template.rows})</label>
                  <input 
                    type="number" 
                    className="input" 
                    min={1} 
                    max={jobQuery.data.template.columns * jobQuery.data.template.rows} 
                    value={startPosition} 
                    onChange={e => setStartPosition(parseInt(e.target.value) || 1)} 
                  />
                </div>
              </div>
              <LabelPrintCalibration 
                template={jobQuery.data.template} 
                onTestPrint={() => setIsTestMode(true)} 
              />
            </div>
            
            {isTestMode ? (
              <div className="flex-col gap-4">
                <div className="flex-row justify-between items-center print-hidden bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <h3 className="text-lg font-bold text-blue-700">Modo de Teste Ativo</h3>
                    <p className="text-sm text-blue-600">Imprima para verificar o alinhamento na sua impressora.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setIsTestMode(false)}>Voltar para Etiquetas</button>
                </div>
                <LabelPrintPreview template={jobQuery.data.template} isTest startPosition={1} />
              </div>
            ) : (
              <LabelPrintPreview job={jobQuery.data} startPosition={startPosition} />
            )}
          </div>
        ) : (
          <EmptyState icon={<QrCode />} title="Job de etiquetas nao encontrado" description="Gere etiquetas a partir de uma entrada de estoque salva." />
        )
      ) : batchQr ? (
        batchQuery.isLoading ? (
          <div className="card">Consultando lote...</div>
        ) : batchQuery.data ? (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Lote encontrado</h3>
                <p className="card-description">Payload: {batchQr}</p>
              </div>
              <PackageSearch size={22} />
            </div>
            <div className="grid-2">
              <div>
                <span className="text-sm text-gray-500">Item</span>
                <p className="font-semibold">{batchQuery.data.item_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Lote</span>
                <p className="font-semibold">{batchQuery.data.batch_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Saldo</span>
                <p className="font-semibold">{batchQuery.data.current_quantity} {batchQuery.data.unit}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Validade</span>
                <p className="font-semibold">{batchQuery.data.expiration_date || "Sem validade"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Fornecedor</span>
                <p className="font-semibold">{batchQuery.data.supplier_name || "Nao informado"}</p>
              </div>
            </div>
            <div className="flex-row gap-2 mt-4">
              <Link
                to="/inventory/items/$itemId/edit"
                params={{ itemId: batchQuery.data.item_id }}
                className="btn btn-secondary"
              >
                Abrir item do estoque
              </Link>
              <Link
                to="/labels"
                search={{ batchId: batchQuery.data.batch_id }}
                className="btn btn-ghost"
              >
                Reabrir pelo lote
              </Link>
            </div>
          </div>
        ) : batchQuery.isError ? (
          <EmptyState
            icon={<QrCode />}
            title="QR Code invalido"
            description={batchQuery.error instanceof Error ? batchQuery.error.message : "Confira se o QR Code usa o formato CESTQ:BATCH:{id}."}
          />
        ) : (
          <EmptyState icon={<QrCode />} title="Lote nao encontrado" description="Confira se o QR Code usa o formato CESTQ:BATCH:{id}." />
        )
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Templates disponiveis</h3>
                <p className="card-description">Modelos configurados no banco local.</p>
              </div>
            </div>
            <div className="flex-col gap-4">
              {(templatesQuery.data ?? []).map(template => (
                <div className="template-row" key={template.id}>
                  <strong>{template.name}</strong>
                  <span>{template.width_mm} x {template.height_mm} mm - {template.columns} col. x {template.rows} lin.</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Imprimir etiquetas do estoque</h3>
                <p className="card-description">Selecione o item, o lote e a quantidade de etiquetas.</p>
              </div>
              <Printer size={22} />
            </div>

            <form className="flex-col gap-4 mt-4" onSubmit={handleCreateInventoryLabels}>
              <div className="form-group">
                <label>Template</label>
                <select
                  className="input"
                  value={selectedTemplateId}
                  onChange={event => setSelectedTemplateId(event.target.value)}
                  disabled={templatesQuery.isLoading || templates.length === 0}
                >
                  {templates.length === 0 ? (
                    <option value="">Nenhum template disponivel</option>
                  ) : templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.columns * template.rows} por folha)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Item do estoque</label>
                <select
                  className="input"
                  value={selectedItemId}
                  onChange={event => {
                    const nextItem = inventoryOptions.find(item => item.id === event.target.value);
                    setSelectedItemId(event.target.value);
                    setSelectedBatchId(nextItem?.batches[0]?.id ?? "");
                  }}
                  disabled={inventoryOptionsQuery.isLoading || inventoryOptions.length === 0}
                >
                  {inventoryOptions.length === 0 ? (
                    <option value="">Nenhum item com lote em estoque</option>
                  ) : inventoryOptions.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - saldo {item.currentStock} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Lote</label>
                  <select
                    className="input"
                    value={selectedBatchId}
                    onChange={event => setSelectedBatchId(event.target.value)}
                    disabled={!selectedItem || selectedItem.batches.length === 0}
                  >
                    {(selectedItem?.batches ?? []).map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.currentQuantity} {selectedItem?.unit ?? ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantidade</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={500}
                    value={labelQuantity}
                    onChange={event => setLabelQuantity(Number(event.target.value))}
                  />
                </div>
              </div>

              {selectedBatch ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="grid-2">
                  <div>
                    <span className="text-sm text-gray-500">Validade</span>
                    <p className="font-semibold">{selectedBatch.expirationDate || "Sem validade"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Fornecedor</span>
                    <p className="font-semibold">{selectedBatch.supplierName || "Nao informado"}</p>
                  </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">Conteudo do QR Code</span>
                    <code className="block text-sm break-all mt-1">{selectedQrPayload}</code>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreatingJob || templates.length === 0 || inventoryOptions.length === 0}
              >
                <Printer size={18} />
                {isCreatingJob ? "Gerando..." : "Gerar etiquetas"}
              </button>
            </form>
          </div>
          <LabelQrScanner />
        </div>
      )}
    </>
  );
}
