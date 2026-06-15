import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { csvParserService } from "../services/csvParser.service";
import { dataImportService } from "../services/dataImport.service";
import { importMappingService } from "../services/importMapping.service";
import type { ImportAction, ImportApplyResult, ImportType, ImportValidationResult, ParsedCsv } from "../types/importExport.types";

const IMPORT_TYPES: Array<{ value: ImportType; label: string; description: string }> = [
  { value: "patients", label: "Pacientes", description: "Cadastro, contatos, nascimento e observacoes" },
  { value: "medications", label: "Medicamentos", description: "Itens do tipo medicamento" },
  { value: "materials", label: "Materiais", description: "Itens do tipo material" },
  { value: "suppliers", label: "Fornecedores", description: "Cadastro de fornecedores" },
  { value: "inventory", label: "Estoque por lote", description: "Lotes, validade, quantidade e fornecedor" },
  { value: "protocols", label: "Protocolos", description: "Protocolos clinicos basicos" },
];

const ACTION_LABELS: Record<ImportAction, string> = {
  create: "Criar",
  update: "Atualizar existente",
  merge: "Mesclar",
  ignore: "Ignorar",
  manual_review: "Revisar depois",
};

interface ImportWizardProps {
  onCancel: () => void;
}

export function ImportWizard({ onCancel }: ImportWizardProps) {
  const [importType, setImportType] = useState<ImportType>("patients");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportValidationResult | null>(null);
  const [applyResult, setApplyResult] = useState<ImportApplyResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableFields = useMemo(() => importMappingService.fieldsFor(importType), [importType]);
  const liveRows = result?.rows ?? [];
  const liveSummary = {
    create: liveRows.filter(row => row.selectedAction === "create").length,
    update: liveRows.filter(row => row.selectedAction === "update").length,
    review: liveRows.filter(row => row.selectedAction === "manual_review").length,
    ignore: liveRows.filter(row => row.selectedAction === "ignore").length,
    invalid: liveRows.filter(row => row.status === "invalid").length,
    duplicates: liveRows.filter(row => row.duplicateCandidatesJson.length > 0).length,
  };

  const handleFileUpload = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setParsed(null);
    setResult(null);
    setApplyResult(null);
    setError(null);
    setIsParsing(true);

    try {
      const text = await csvParserService.readFileAsText(selected);
      const parsedCsv = csvParserService.parseCsvString(text);
      setParsed(parsedCsv);
      setMapping(importMappingService.buildMapping(importType, parsedCsv.headers));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao ler o arquivo CSV.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleValidate = async () => {
    if (!file || !parsed) return;
    setIsValidating(true);
    setError(null);
    setApplyResult(null);

    try {
      const validation = await dataImportService.validateParsedCsv({
        importType,
        fileName: file.name,
        parsed,
        mapping,
      });
      setResult(validation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao validar a importacao.");
    } finally {
      setIsValidating(false);
    }
  };

  const updateRowAction = (rowId: string, selectedAction: ImportAction) => {
    setResult(current => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map(row => row.id === rowId ? { ...row, selectedAction } : row),
      };
    });
  };

  const handleApply = async () => {
    if (!result) return;
    setIsApplying(true);
    setError(null);

    try {
      const applied = await dataImportService.applyValidatedImport(result);
      setApplyResult(applied);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : String(caught) || "A importacao falhou e foi revertida.";
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert("Erro ao aplicar importação: " + msg);
    } finally {
      setIsApplying(false);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
    setApplyResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-gray-900)" }}>Assistente de Importacao CSV</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-gray-500)" }}>
              Tudo roda localmente no SQLite. Antes de gravar, o sistema cria backup e valida duplicidades.
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Voltar</button>
        </div>

        {error && (
          <div className="alert alert-danger mt-4 flex items-start gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid-2 mt-6">
          <div className="form-group">
            <label className="form-label">Modulo de destino</label>
            <select
              className="form-control"
              value={importType}
              onChange={event => {
                const nextType = event.target.value as ImportType;
                setImportType(nextType);
                setResult(null);
                setApplyResult(null);
                if (parsed) setMapping(importMappingService.buildMapping(nextType, parsed.headers));
              }}
            >
              {IMPORT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
              {IMPORT_TYPES.find(type => type.value === importType)?.description}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Arquivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="form-control"
              onChange={event => handleFileUpload(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
              Separadores aceitos: ponto e virgula ou virgula.
            </p>
          </div>
        </div>

        {isParsing && (
          <div className="empty-state mt-6">
            <Loader2 className="animate-spin" size={28} />
            <div className="empty-state-title">Lendo CSV...</div>
          </div>
        )}
      </div>

      {parsed && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-gray-900)" }}>Mapeamento de colunas</h3>
              <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>
                {file?.name} com {parsed.rows.length} linhas e separador "{parsed.delimiter}".
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleValidate} disabled={isValidating || parsed.rows.length === 0}>
              {isValidating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Validar dados
            </button>
          </div>

          {parsed.errors.length > 0 && (
            <div className="alert alert-warning mb-4">
              {parsed.errors.slice(0, 3).join(" | ")}
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Coluna CSV</th>
                  <th>Campo no sistema</th>
                  <th>Previa</th>
                </tr>
              </thead>
              <tbody>
                {parsed.headers.map(header => (
                  <tr key={header}>
                    <td>{header}</td>
                    <td>
                      <select
                        className="form-control"
                        value={mapping[header] ?? ""}
                        onChange={event => setMapping(current => ({ ...current, [header]: event.target.value }))}
                      >
                        <option value="">Ignorar coluna</option>
                        {availableFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-sm" style={{ color: "var(--color-gray-500)" }}>
                      {parsed.rows[0]?.[header] ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-gray-900)" }}>Revisao antes da importacao</h3>
              <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>
                Ajuste a acao de cada linha antes de gravar no banco local.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={resetWizard}>
                <RotateCcw size={16} /> Novo arquivo
              </button>
              <button type="button" className="btn btn-primary" onClick={handleApply} disabled={isApplying || liveRows.length === 0 || liveSummary.review > 0}>
                {isApplying ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                Aplicar importacao
              </button>
            </div>
          </div>

          <div className="stats-grid mb-5">
            <div className="stat-card"><div className="stat-value">{result.summary.totalRows}</div><div className="stat-label">Linhas</div></div>
            <div className="stat-card"><div className="stat-value">{liveSummary.create}</div><div className="stat-label">Criar</div></div>
            <div className="stat-card"><div className="stat-value">{liveSummary.update}</div><div className="stat-label">Atualizar</div></div>
            <div className="stat-card"><div className="stat-value">{liveSummary.duplicates}</div><div className="stat-label">Duplicidades</div></div>
            <div className="stat-card"><div className="stat-value">{liveSummary.invalid}</div><div className="stat-label">Invalidas</div></div>
          </div>

          {liveSummary.review > 0 && (
            <div className="alert alert-warning mb-4">
              Existem linhas marcadas como "Revisar depois". Troque a acao para criar, atualizar ou ignorar antes de aplicar.
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Status</th>
                  <th>Dados</th>
                  <th>Duplicidade</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {liveRows.slice(0, 80).map(row => (
                  <tr key={row.id}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <span className={`badge ${row.status === "invalid" ? "badge-danger" : row.status === "duplicate" ? "badge-warning" : "badge-success"}`}>
                        {row.status}
                      </span>
                      {row.validationErrorsJson.length > 0 && (
                        <div className="text-xs mt-1" style={{ color: "var(--color-danger)" }}>{row.validationErrorsJson.join(", ")}</div>
                      )}
                    </td>
                    <td className="text-sm">
                      {Object.entries(row.mappedJson).slice(0, 4).map(([key, value]) => `${key}: ${value ?? ""}`).join(" | ")}
                    </td>
                    <td className="text-sm" style={{ color: "var(--color-gray-500)" }}>
                      {row.duplicateCandidatesJson[0]
                        ? `${row.duplicateCandidatesJson[0].score}% - ${String(row.duplicateCandidatesJson[0].entityData.full_name ?? row.duplicateCandidatesJson[0].entityData.name ?? "")}`
                        : "-"}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={row.selectedAction}
                        onChange={event => updateRowAction(row.id, event.target.value as ImportAction)}
                      >
                        {Object.entries(ACTION_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {applyResult && (
        <div className="card">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} style={{ color: "var(--color-success)" }} />
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-gray-900)" }}>Importacao concluida</h3>
              <p className="text-sm mt-1" style={{ color: "var(--color-gray-500)" }}>
                Criados: {applyResult.created} | Atualizados: {applyResult.updated} | Ignorados: {applyResult.skipped}. Backup de seguranca: {applyResult.backupPath}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
