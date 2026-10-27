import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Activity, AlertTriangle, ArrowLeft, Clipboard, FileText, MapPin, Package, Pill, Printer, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { usePatientRecord, usePatientProcedureHistory } from "../hooks/usePatients";
import type { PatientRecord, ProcedureSummary, PatientProcedureHistoryItem } from "../schemas/patient.schema";
import { PatientRecordReport } from "../components/PatientRecordReport";
import { ProcedureBodyMapPreview } from "@/features/procedures/components/ProcedureBodyMapPreview";
import { PatientApplicationsManager } from "../components/PatientApplicationsManager";
import { getApplicationRecency } from "../utils/applicationRecency";
import { PatientUsedItemsTab } from "../components/PatientUsedItemsTab";
import { PatientUsedBatchesTab } from "../components/PatientUsedBatchesTab";
import { ProcedureCorrectionModal } from "@/features/procedures/components/ProcedureCorrectionModal";
import { PatientRecordReportPanel } from "../components/PatientRecordReportPanel";
import { PatientMonthlyCostPanel } from "@/features/monthly-summary/components/PatientMonthlyCostPanel";
import { ContractPreparationAndSignatureModal } from "@/components/contracts/ContractPreparationAndSignatureModal";
import { PatientDocumentsModal } from "@/components/documents/PatientDocumentsModal";
import { PatientDocumentsTab } from "../components/PatientDocumentsTab";

// FIX: Removida tab "Relatórios" redundante — botão já existe no PatientHeader
type Tab = "overview" | "applications" | "history" | "evolutions" | "documents" | "medications" | "lots" | "areas";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "applications", label: "Aplicações" },
  { id: "history", label: "Histórico" },
  { id: "evolutions", label: "Evoluções" },
  { id: "documents", label: "Documentos e Contratos" },
  { id: "medications", label: "Medicamentos e Materiais" },
  { id: "lots", label: "Lotes Utilizados" },
  { id: "areas", label: "Áreas Corporais" },
];

function safeFormatDate(value: string | null | undefined, pattern: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, pattern, { locale: ptBR });
}

export default function PatientRecordPage() {
  const { patientId } = useParams({ strict: false }) as { patientId: string };
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);

  const { data: recordResult, isLoading, error } = usePatientRecord(patientId);

  const {
    data: fullHistory,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory
  } = usePatientProcedureHistory(patientId);
  const [correctingProcedure, setCorrectingProcedure] = useState<PatientProcedureHistoryItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <button onClick={() => navigate({ to: "/patients" })} className="btn btn-ghost mb-4">
          <ArrowLeft size={16} />
          Voltar para Pacientes
        </button>
        <div className="card">
          <EmptyState
            icon={<AlertTriangle />}
            title="Erro interno ao carregar prontuario"
            description="Nao foi possivel carregar o prontuario por erro interno. Tente novamente e verifique os logs."
          />
        </div>
      </>
    );
  }

  if (!recordResult || recordResult.status === "not_found") {
    return (
      <>
        <button onClick={() => navigate({ to: "/patients" })} className="btn btn-ghost mb-4">
          <ArrowLeft size={16} />
          Voltar para Pacientes
        </button>
        <div className="card">
          <EmptyState
            icon={<User />}
            title="Paciente nao encontrado"
            description="Nao foi possivel carregar este prontuario. Volte para a lista e tente novamente."
          />
        </div>
      </>
    );
  }

  if (recordResult.status === "merged") {
    return (
      <>
        <button onClick={() => navigate({ to: "/patients" })} className="btn btn-ghost mb-4">
          <ArrowLeft size={16} />
          Voltar para Pacientes
        </button>
        <div className="card">
          <EmptyState
            icon={<User />}
            title="Cadastro mesclado"
            description="Este cadastro foi mesclado com outro paciente."
            action={
              <button className="btn btn-primary" onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: recordResult.redirectPatientId } })}>
                Abrir prontuario principal
              </button>
            }
          />
        </div>
      </>
    );
  }

  if (recordResult.status === "deleted") {
    return (
      <>
        <button onClick={() => navigate({ to: "/patients" })} className="btn btn-ghost mb-4">
          <ArrowLeft size={16} />
          Voltar para Pacientes
        </button>
        <div className="card">
          <EmptyState
            icon={<User />}
            title="Paciente inativo ou removido"
            description="Este cadastro foi removido logicamente e nao esta disponivel para atendimento."
          />
        </div>
      </>
    );
  }

  const record = recordResult.patient;
  const partialWarnings = recordResult.status === "partial" ? recordResult.warnings : [];
  const historyWarning = historyError
    ? `Paciente carregado, mas houve erro ao carregar historico: ${historyError instanceof Error ? historyError.message : String(historyError)}`
    : null;

  const finalizedProcedures = record.procedures.filter(procedure => procedure.status === "finalized");
  const lastProcedure = finalizedProcedures[0];

  return (
    <>
      <button onClick={() => navigate({ to: "/patients" })} className="btn btn-ghost mb-4">
        <ArrowLeft size={16} />
        Voltar para Pacientes
      </button>

      <PatientHeader
        record={record}
        lastProcedure={lastProcedure}
        proceduresCount={finalizedProcedures.length}
        onNewProcedure={() => navigate({ to: "/procedures/new", search: { patientId: record.id } })}
        onPrintReport={() => setIsReportOpen(true)}
        onPrepareContract={() => setIsContractModalOpen(true)}
        onOpenDocumentsModal={() => setIsDocumentsModalOpen(true)}
      />

      {record.alert_notes?.trim() && (
        <div className="card mb-6" style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: "var(--color-warning)", marginTop: 2 }} />
            <div>
              <h3 className="card-title" style={{ color: "#92400E" }}>Observacoes de alerta</h3>
              <p className="text-sm mt-1" style={{ color: "#92400E" }}>{record.alert_notes}</p>
            </div>
          </div>
        </div>
      )}

      <div className="tabs patient-record-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab record={record} procedures={finalizedProcedures} />}
      {activeTab === "applications" && (
        <PatientApplicationsManager
          patientId={record.id}
          patientName={record.full_name}
          patientEmail={record.email || undefined}
          onShowHistory={() => setActiveTab("history")}
        />
      )}
      {activeTab === "history" && (
        <HistoryPanel
          procedures={fullHistory || []}
          isLoading={isLoadingHistory}
          warnings={[...partialWarnings, historyWarning].filter(Boolean) as string[]}
          onCorrectProcedure={setCorrectingProcedure}
        />
      )}
      {activeTab === "evolutions" && <EvolutionsTab procedures={finalizedProcedures} />}
      {activeTab === "documents" && (
        <PatientDocumentsTab
          patientId={record.id}
          patientName={record.full_name}
          patientCpf={record.document || undefined}
          patientPhone={record.phone || undefined}
          onNewContract={() => setIsContractModalOpen(true)}
          onNewDocument={() => setIsDocumentsModalOpen(true)}
        />
      )}
      {activeTab === "medications" && <PatientUsedItemsTab patientId={record.id} />}
      {activeTab === "lots" && <PatientUsedBatchesTab patientId={record.id} />}
      {activeTab === "areas" && <AreasTab procedures={finalizedProcedures} />}

      {isReportOpen && (
        <PatientRecordReportPanel 
          record={record} 
          procedures={finalizedProcedures} 
          onClose={() => setIsReportOpen(false)} 
        />
      )}

      {correctingProcedure && (
        <ProcedureCorrectionModal 
          procedure={correctingProcedure} 
          onClose={() => setCorrectingProcedure(null)} 
          onSuccess={() => {
            setCorrectingProcedure(null);
            refetchHistory();
          }} 
        />
      )}

      {isContractModalOpen && (
        <ContractPreparationAndSignatureModal
          isOpen={isContractModalOpen}
          patient={{
            id: record.id,
            nome: record.full_name,
            cpf: record.document || "",
            data_nascimento: record.birth_date || "",
            telefone: record.phone || "",
            email: record.email || "",
          }}
          onClose={() => setIsContractModalOpen(false)}
        />
      )}

      {isDocumentsModalOpen && (
        <PatientDocumentsModal
          isOpen={isDocumentsModalOpen}
          patientId={record.id}
          patientName={record.full_name}
          patientCpf={record.document || undefined}
          patientPhone={record.phone || undefined}
          patientEmail={record.email || undefined}
          onClose={() => setIsDocumentsModalOpen(false)}
          onOpenContractPreparation={() => setIsContractModalOpen(true)}
        />
      )}
    </>
  );
}

function PatientHeader({
  record,
  lastProcedure,
  proceduresCount,
  onNewProcedure,
  onPrintReport,
  onPrepareContract,
  onOpenDocumentsModal,
}: {
  record: PatientRecord;
  lastProcedure?: ProcedureSummary;
  proceduresCount: number;
  onNewProcedure: () => void;
  onPrintReport: () => void;
  onPrepareContract: () => void;
  onOpenDocumentsModal: () => void;
}) {
  const recency = getApplicationRecency(lastProcedure?.performed_at);
  const daysSinceLastApplication =
    recency.days === null
      ? "-"
      : recency.days < 0
        ? "Data futura"
        : recency.days === 1
          ? "1 dia"
          : `${recency.days} dias`;

  return (
    <div className="card patient-hero-card mb-6">
      <div className="patient-hero-main">
        <div className="user-avatar" style={{ width: 56, height: 56, fontSize: 20, borderRadius: "var(--radius-lg)" }}>
          {record.full_name.charAt(0).toUpperCase()}
        </div>

        <div className="patient-hero-identity">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="page-title" style={{ marginBottom: 0 }}>{record.full_name}</h1>
            <span className={`badge ${record.is_active ? "badge-success" : "badge-neutral"}`}>
              {record.is_active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: "var(--color-gray-500)" }}>
            {record.birth_date && (
              <span>
                {safeFormatDate(record.birth_date, "dd/MM/yyyy")} ({calcAge(record.birth_date)} anos)
              </span>
            )}
            {record.phone && <span>{record.phone}</span>}
            {record.email && <span>{record.email}</span>}
          </div>

          {record.notes && (
            <p className="text-sm mt-3" style={{ color: "var(--color-gray-700)" }}>
              {record.notes}
            </p>
          )}
        </div>

        <div className="patient-hero-metrics">
          <Metric label="Aplicacoes" value={proceduresCount} />
          <Metric
            label="Ultima aplicacao"
            value={safeFormatDate(lastProcedure?.performed_at, "dd/MM/yy")}
          />
          <Metric
            label="Dias desde ultima"
            value={daysSinceLastApplication}
          />
        </div>
      </div>

      <div className="patient-recency-note" style={{ color: recency.urgency === "stale" ? "var(--color-danger)" : "var(--color-gray-500)" }}>
        {recency.detail}
      </div>

      <div className="patient-hero-actions">
        <button
          className="btn btn-primary"
          onClick={onPrepareContract}
          style={{ backgroundColor: "#059669", borderColor: "#047857" }}
        >
          <FileText size={16} />
          Contrato Saúde 360®
        </button>
        <button className="btn btn-secondary" onClick={onOpenDocumentsModal}>
          <FileText size={16} />
          Documentos & TCLE
        </button>
        <button className="btn btn-secondary" onClick={onNewProcedure}>
          <Activity size={16} />
          Nova Aplicacao
        </button>
        <button className="btn btn-secondary" onClick={onPrintReport}>
          <Printer size={16} />
          Gerar Relatorio
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="patient-metric">
      <div className="summary-card-value" style={{ fontSize: 20 }}>{value}</div>
      <div className="summary-card-subtext">{label}</div>
    </div>
  );
}

function OverviewTab({ record, procedures }: { record: PatientRecord; procedures: ProcedureSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Informacoes do Paciente</h3>
              <p className="card-description">Dados principais do cadastro real</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--color-gray-700)" }}>
            <InfoLine label="CPF" value={record.document} />
            <InfoLine label="Telefone" value={record.phone} />
            <InfoLine label="E-mail" value={record.email} />
            <InfoLine label="Nascimento" value={safeFormatDate(record.birth_date, "dd/MM/yyyy")} />
            <InfoLine label="Observacoes" value={record.notes} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Resumo Clinico</h3>
              <p className="card-description">Resumo calculado com dados existentes</p>
            </div>
          </div>
          {procedures.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>
              Este paciente ainda nao possui aplicacoes finalizadas.
            </p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <InfoLine label="Total de aplicacoes" value={String(procedures.length)} />
              <InfoLine label="Ultimo protocolo" value={procedures[0]?.protocol_name} />
              <InfoLine label="Ultima area" value={procedures[0]?.body_area_name} />
            </div>
          )}
        </div>
      </div>

      <PatientMonthlyCostPanel patientId={record.id} />
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: "var(--color-gray-500)" }}>{label}</span>
      <span className="font-medium text-right" style={{ color: "var(--color-gray-900)" }}>{value || "-"}</span>
    </div>
  );
}

function HistoryPanel({
  procedures,
  isLoading,
  warnings,
  onCorrectProcedure,
}: {
  procedures: PatientProcedureHistoryItem[];
  isLoading: boolean;
  warnings: string[];
  onCorrectProcedure: (p: PatientProcedureHistoryItem) => void;
}) {
  // FIX: verificar isLoading ANTES de warnings para não exibir erro enquanto ainda carrega
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center" style={{ padding: "48px 0" }}>
          <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
        </div>
      </div>
    );
  }

  if (warnings.length > 0) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: "var(--color-warning)", marginTop: 2 }} />
          <div>
            <h3 className="card-title" style={{ color: "#92400E" }}>Erro ao carregar histórico de procedimentos.</h3>
            <p className="text-sm mt-1" style={{ color: "var(--color-gray-600)" }}>{warnings.join(" ")}</p>
          </div>
        </div>
      </div>
    );
  }

  return <HistoryTab procedures={procedures} onCorrectProcedure={onCorrectProcedure} />;
}

function HistoryTab({ procedures, onCorrectProcedure }: { procedures: PatientProcedureHistoryItem[], onCorrectProcedure: (p: PatientProcedureHistoryItem) => void }) {
  if (procedures.length === 0) {
    return <EmptyClinicalData icon={<FileText />} title="Sem histórico de aplicações" description="As aplicações finalizadas aparecerão aqui com data, protocolo, área e intercorrências." />;
  }

  return (
    <div className="patient-history-list">
      {procedures.map(procedure => (
        <div key={procedure.id} className="card patient-history-card relative">
          <div className="patient-history-actions">
            <button className="btn btn-ghost text-xs" onClick={() => onCorrectProcedure(procedure)}>
              Corrigir
            </button>
          </div>
          <div className="patient-history-body">
            {/* Miniatura do mapa corporal */}
            {procedure.body_area_svg_region_id && (
              <ProcedureBodyMapPreview
                svgRegionId={procedure.body_area_svg_region_id}
                routeCode={procedure.route_name || undefined}
                size="sm"
              />
            )}

            <div className="patient-history-content">
              <div className="patient-history-title-row">
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: "var(--color-gray-900)" }}>
                    {procedure.protocol_name ?? "Procedimento Avulso"}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-gray-500)" }}>
                    {safeFormatDate(procedure.performed_at, "dd/MM/yyyy HH:mm")}
                    {procedure.professional_name && ` por ${procedure.professional_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {procedure.had_intercurrence ? (
                    <span className="badge badge-warning">⚠ Intercorrência</span>
                  ) : (
                    <span className="badge badge-success">Sem intercorrência</span>
                  )}
                </div>
              </div>

              <div className="patient-history-meta" style={{ color: "var(--color-gray-600)" }}>
                {procedure.body_area_name && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} style={{ color: "var(--color-green-deep)" }} />
                    {procedure.body_area_name} {procedure.body_area_side && `(${procedure.body_area_side})`}
                  </span>
                )}
                {procedure.route_name && (
                  <span className="flex items-center gap-1">
                    <Activity size={11} />
                    Via {procedure.route_name}
                  </span>
                )}
              </div>

              {procedure.items_used && procedure.items_used.length > 0 ? (
                <div className="patient-history-items">
                  <h5 className="font-medium text-gray-700 mb-2">Itens Utilizados</h5>
                  <ul className="space-y-1">
                    {procedure.items_used.map(item => (
                      <li key={item.id} className="text-gray-600 flex justify-between items-center bg-gray-50 p-2 rounded">
                        <div className="flex flex-col">
                          <span>
                            {item.item_name} <span className="text-gray-400">({item.quantity_used} {item.unit})</span>
                          </span>
                          {item.batch_number && (
                            <span className="text-[10px] text-gray-400">
                              Lote: {item.batch_number}
                              {item.expiration_date && safeFormatDate(item.expiration_date, "MM/yyyy") !== "-" && ` (Val: ${safeFormatDate(item.expiration_date, "MM/yyyy")})`}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end">
                          {item.unit_cost === null || item.unit_cost === undefined ? (
                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                              Preço não informado na nota
                            </span>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-gray-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_cost || 0)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_cost)}/un
                              </span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {procedure.total_procedure_cost !== undefined && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase">Custo Total da Aplicação</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(procedure.total_procedure_cost)}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              {procedure.had_intercurrence && procedure.intercurrence_description && (
                <p className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: "#FFFBEB", color: "#92400E" }}>
                  <b>Intercorrência:</b> {procedure.intercurrence_description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvolutionsTab({ procedures }: { procedures: ProcedureSummary[] }) {
  const withEvolution = procedures.filter(procedure => procedure.evolution_text);

  if (withEvolution.length === 0) {
    return <EmptyClinicalData icon={<Clipboard />} title="Sem evolucoes registradas" description="As evolucoes geradas por aplicacoes finalizadas ficarao disponiveis para consulta e copia." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {withEvolution.map(procedure => (
        <div className="card" key={procedure.id}>
          <div className="card-header">
            <div>
              <h3 className="card-title">{safeFormatDate(procedure.performed_at, "dd/MM/yyyy")}</h3>
              <p className="card-description">{procedure.protocol_name ?? "Protocolo nao identificado"}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(procedure.evolution_text ?? "")}>
              <Clipboard size={16} />
              Copiar
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-gray-700)" }}>
            {procedure.evolution_text}
          </p>
        </div>
      ))}
    </div>
  );
}

function AreasTab({ procedures }: { procedures: ProcedureSummary[] }) {
  const areas = procedures.filter(procedure => procedure.body_area_name);

  if (areas.length === 0) {
    return <EmptyClinicalData icon={<MapPin />} title="Sem areas corporais registradas" description="As areas selecionadas no fluxo de aplicacao aparecerao aqui quando houver atendimentos finalizados." />;
  }

  return (
    <div className="grid-3">
      {areas.map(procedure => (
        <div className="card summary-card" key={procedure.id}>
          <div className="summary-card-header">
            <span>{procedure.body_area_name}</span>
            <MapPin size={18} style={{ color: "var(--color-green-deep)" }} />
          </div>
          <div className="summary-card-subtext">{safeFormatDate(procedure.performed_at, "dd/MM/yyyy")}</div>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({ onPrintReport }: { onPrintReport: () => void }) {
  return (
    <div className="card">
      <EmptyState
        icon={<Printer />}
        title="Prontuário Completo"
        description="Gere um PDF do prontuário contendo aplicações, evoluções clínicas e alertas."
        action={<button className="btn btn-primary" onClick={onPrintReport}>Ver Relatório e Imprimir</button>}
      />
    </div>
  );
}

function EmptyClinicalData({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="card">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

// FIX: retorna string para poder exibir "-" em vez de "0 anos" para datas inválidas
function calcAge(birthDate: string): string {
  const today = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "-";
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}
