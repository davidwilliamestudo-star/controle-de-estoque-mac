import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, RefreshCw, Send, X } from "lucide-react";
import { patientReportEmailService } from "@/features/integrations/apps-script/services/patientReportEmail.service";
import type { ReportData } from "@/features/integrations/apps-script/utils/reportEmailTemplates";
import { PatientApplicationReportPreview } from "./PatientApplicationReportPreview";
import { patientApplicationReportPreviewService } from "../services/patientApplicationReportPreview.service";

interface PatientApplicationReportModalProps {
  patientId: string;
  patientName: string;
  patientEmail?: string;
  selectedPlanIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PatientApplicationReportModal({
  patientId,
  patientName,
  patientEmail,
  selectedPlanIds,
  onClose,
  onSuccess,
}: PatientApplicationReportModalProps) {
  const [includeEvolution, setIncludeEvolution] = useState(true);
  const [includeIntercurrence, setIncludeIntercurrence] = useState(true);
  const [includeItems, setIncludeItems] = useState(true);
  const [includeBatches, setIncludeBatches] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [previewTab, setPreviewTab] = useState<"options" | "preview">("options");

  const previewQuery = useQuery({
    queryKey: ["report-preview", patientId, selectedPlanIds],
    queryFn: () => patientApplicationReportPreviewService.getPreview({ patientName, patientEmail, selectedPlanIds }),
  });

  const sendMutation = useMutation({
    mutationFn: () => patientReportEmailService.sendReport({
      patientId,
      applicationPlanIds: selectedPlanIds,
      includeEvolution,
      includeIntercurrence,
      includeItems,
      includeBatches,
      customMessage,
    }),
    onSuccess,
    onError: error => {
      console.error(error);
      alert(`Erro ao enviar relatorio: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  const reportData = useMemo<ReportData | null>(() => {
    if (!previewQuery.data) return null;
    return {
      ...previewQuery.data,
      patientName: previewQuery.data.patientName!,
      patientEmail: previewQuery.data.patientEmail!,
      clinicName: previewQuery.data.clinicName!,
      applications: previewQuery.data.applications || [],
      includeEvolution,
      includeIntercurrence,
      includeItems,
      includeBatches,
      customMessage,
    };
  }, [previewQuery.data, includeEvolution, includeIntercurrence, includeItems, includeBatches, customMessage]);

  const hasEmail = Boolean(patientEmail && patientEmail.trim().length > 0);

  return (
    <div className="modal-overlay active" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 900, width: "90%" }}>
        <div className="modal-header">
          <h2>Enviar Relatorio do Paciente</h2>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {previewQuery.isError && (
            <div style={{ padding: 20, paddingBottom: 0 }}>
              <div className="badge badge-danger" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={18} />
                <span><strong>Erro interno:</strong> {previewQuery.error instanceof Error ? previewQuery.error.message : String(previewQuery.error)}</span>
              </div>
            </div>
          )}

          {!hasEmail && (
            <div style={{ padding: 20, paddingBottom: 0 }}>
              <div className="badge badge-warning" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={18} />
                <span><strong>Atencao:</strong> O paciente nao possui e-mail cadastrado.</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", borderBottom: "1px solid var(--color-gray-200)", marginTop: 10 }}>
            <button
              className={`btn ${previewTab === "options" ? "btn-primary" : "btn-ghost"}`}
              style={{ borderRadius: 0, borderBottom: previewTab === "options" ? "3px solid var(--color-primary-600)" : "3px solid transparent" }}
              onClick={() => setPreviewTab("options")}
            >
              Configuracoes
            </button>
            <button
              className={`btn ${previewTab === "preview" ? "btn-primary" : "btn-ghost"}`}
              style={{ borderRadius: 0, borderBottom: previewTab === "preview" ? "3px solid var(--color-primary-600)" : "3px solid transparent" }}
              onClick={() => setPreviewTab("preview")}
            >
              <Eye size={16} /> Pre-visualizar
            </button>
          </div>

          <div style={{ padding: 20, minHeight: 400 }}>
            {previewQuery.isLoading ? (
              <div className="flex justify-center items-center h-full">
                <RefreshCw className="spin" size={24} style={{ color: "var(--color-primary-600)" }} />
              </div>
            ) : previewTab === "options" ? (
              <div className="grid-2" style={{ gap: 30 }}>
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 15 }}>O que incluir no relatorio?</h3>
                  <ReportCheckbox id="inc-evo" label="Evolucao clinica" checked={includeEvolution} onChange={setIncludeEvolution} />
                  <ReportCheckbox id="inc-int" label="Intercorrencias" checked={includeIntercurrence} onChange={setIncludeIntercurrence} />
                  <ReportCheckbox id="inc-items" label="Rastreabilidade de estoque" checked={includeItems} onChange={setIncludeItems} />
                  {includeItems && (
                    <div style={{ marginLeft: 24 }}>
                      <ReportCheckbox id="inc-batches" label="Incluir lotes e validades" checked={includeBatches} onChange={setIncludeBatches} />
                    </div>
                  )}

                  <div className="form-group mt-6">
                    <label>Mensagem personalizada</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Adicione um recado ou recomendacao para aparecer no topo do relatorio..."
                      value={customMessage}
                      onChange={event => setCustomMessage(event.target.value)}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: "var(--color-gray-50)", padding: 20, borderRadius: 8, border: "1px solid var(--color-gray-200)" }}>
                  <h3 style={{ fontSize: 16, marginBottom: 15 }}>Resumo do envio</h3>
                  <p><strong>Destinatario:</strong> {patientName}</p>
                  <p><strong>E-mail:</strong> {patientEmail || <span style={{ color: "var(--color-danger-600)" }}>Nao cadastrado</span>}</p>
                  <p><strong>Aplicacoes selecionadas:</strong> {selectedPlanIds.length}</p>
                </div>
              </div>
            ) : (
              <div>{reportData && <PatientApplicationReportPreview data={reportData} />}</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {sendMutation.isError && (
            <span style={{ color: "var(--color-danger-600)", fontSize: 14 }}>
              Erro ao agendar envio: {sendMutation.error instanceof Error ? sendMutation.error.message : "Falha desconhecida"}
            </span>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sendMutation.isPending}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !hasEmail || selectedPlanIds.length === 0}
            >
              {sendMutation.isPending ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
              {sendMutation.isPending ? "Agendando..." : "Enviar relatorio agora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="form-group flex items-center gap-2 mb-4">
      <input id={id} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <label htmlFor={id} style={{ margin: 0, cursor: "pointer" }}>{label}</label>
    </div>
  );
}
