import { useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { dataExportService } from "../services/dataExport.service";
import type { ImportType } from "../types/importExport.types";

const EXPORT_OPTIONS: Array<{ entity: ImportType; title: string; description: string }> = [
  { entity: "patients", title: "Pacientes", description: "Cadastro completo de pacientes ativos e inativos." },
  { entity: "medications", title: "Medicamentos", description: "Itens de estoque classificados como medicamentos." },
  { entity: "materials", title: "Materiais", description: "Itens de estoque classificados como materiais." },
  { entity: "suppliers", title: "Fornecedores", description: "Cadastro de fornecedores locais." },
  { entity: "inventory", title: "Estoque por lote", description: "Lotes, validade, saldo atual e fornecedor." },
  { entity: "protocols", title: "Protocolos", description: "Protocolos clinicos cadastrados." },
];

export function ExportPanel() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runAction = async (key: string, action: () => Promise<string | null>) => {
    setBusyKey(key);
    setError(null);
    setSuccess(null);

    try {
      const filePath = await action();
      if (filePath) setSuccess(`Arquivo salvo em: ${filePath}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel gerar o arquivo CSV.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--color-gray-900)" }}>Exportar dados</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-gray-500)" }}>
            Baixe arquivos CSV locais para auditoria, backup em planilhas ou revisao operacional.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger mt-4 flex items-start gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success mt-4">
            {success}
          </div>
        )}

        <div className="grid-2 mt-6">
          {EXPORT_OPTIONS.map(option => (
            <div key={option.entity} className="border rounded-lg p-4 flex flex-col gap-4" style={{ borderColor: "var(--color-gray-200)" }}>
              <div className="flex items-start gap-3">
                <div className="icon-box">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--color-gray-900)" }}>{option.title}</h3>
                  <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>{option.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyKey !== null}
                  onClick={() => runAction(`export-${option.entity}`, () => dataExportService.exportEntity(option.entity))}
                >
                  {busyKey === `export-${option.entity}` ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Exportar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyKey !== null}
                  onClick={() => runAction(`template-${option.entity}`, () => dataExportService.downloadTemplate(option.entity))}
                >
                  Modelo CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
