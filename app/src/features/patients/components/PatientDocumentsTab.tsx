import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Eye,
  FileCheck,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SignatureDocumentsService,
  type PatientDocument,
  type PatientDocumentSigner,
} from "@/services/contracts/signatureDocuments.service";
import { EmptyState } from "@/components/common/EmptyState";
import { Button, Badge, Input } from "@/components/ui";

interface PatientDocumentsTabProps {
  patientId: string;
  patientName: string;
  patientCpf?: string | null;
  patientPhone?: string | null;
  onNewContract: () => void;
}

export function PatientDocumentsTab({
  patientId,
  patientName,
  patientCpf,
  patientPhone,
  onNewContract,
}: PatientDocumentsTabProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await SignatureDocumentsService.getDocumentsByPatient(patientId);
      setDocuments(data);
    } catch (err: any) {
      console.error("Erro ao carregar documentos do paciente:", err);
      setError(err.message || "Erro ao carregar contratos e termos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      const matchSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.verification_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [documents, searchTerm]);

  const handleDownload = async (doc: PatientDocument) => {
    setDownloadingDocId(doc.id);
    try {
      const result = await SignatureDocumentsService.getDocumentPdf(doc.id);
      if (result.pdf_base64) {
        const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${doc.verification_code}.pdf`;
        SignatureDocumentsService.downloadPdf(result.pdf_base64, filename);
      } else if (result.drive_file_url) {
        window.open(result.drive_file_url, "_blank");
      }
    } catch (err: any) {
      alert(`Não foi possível baixar o PDF: ${err.message}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handlePreview = async (doc: PatientDocument) => {
    setDownloadingDocId(doc.id);
    try {
      const result = await SignatureDocumentsService.getDocumentPdf(doc.id);
      if (result.pdf_base64) {
        const cleanBase64 = result.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(blob);
        setPreviewPdfUrl(objectUrl);
        setPreviewDocTitle(doc.title);
      } else if (result.drive_file_url) {
        window.open(result.drive_file_url, "_blank");
      }
    } catch (err: any) {
      alert(`Não foi possível visualizar o PDF: ${err.message}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleCopySignLink = (signer: PatientDocumentSigner) => {
    if (!signer.sign_url) return;
    navigator.clipboard.writeText(signer.sign_url);
    setCopiedToken(signer.id);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleSendWhatsApp = (doc: PatientDocument, signer: PatientDocumentSigner) => {
    const rawPhone = signer.phone_whatsapp || patientPhone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const signUrl = signer.sign_url || `${window.location.origin}/assinar/${signer.remote_access_token}`;

    const text = encodeURIComponent(
      `Olá, ${signer.full_name}!\n\n` +
      `Consta em aberto o documento *"${doc.title}"* da Clínica Dra. Ana Morong para sua assinatura eletrônica.\n\n` +
      `Clique no link seguro abaixo para assinar pelo celular ou computador:\n${signUrl}\n\n` +
      `Código de verificação: ${doc.verification_code}`
    );

    const waUrl = cleanPhone ? `https://wa.me/${phoneWithCountry}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

  const getStatusBadge = (status: PatientDocument["status"], hasPades: boolean) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="emerald" size="md" icon={<CheckCircle2 size={13} className="text-emerald-600" />}>
            {hasPades ? "Assinado & Válido (ICP-Brasil)" : "Concluído & Assinado"}
          </Badge>
        );
      case "partially_signed":
        return (
          <Badge variant="sky" size="md" icon={<Clock size={13} className="text-sky-600" />}>
            Assinado Parcialmente
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="amber" size="md" icon={<Clock size={13} className="text-amber-600" />}>
            Pendente de Assinatura
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="rose" size="md" icon={<XCircle size={13} className="text-rose-600" />}>
            Recusado / Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="md">
            Rascunho
          </Badge>
        );
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return "-";
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="card patient-table-card p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FileCheck size={24} />
              </div>
              <div>
                <h3 className="card-title text-xl font-bold text-gray-900 flex items-center gap-2">
                  Documentos, Contratos e TCLE
                  <Badge variant="emerald" size="sm">
                    {documents.length} {documents.length === 1 ? "documento" : "documentos"}
                  </Badge>
                </h3>
                <p className="card-description text-sm text-gray-500 mt-0.5">
                  Termos de consentimento, contratos de procedimentos e chancelas digitais com validade jurídica
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              leftIcon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
            >
              Atualizar
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onNewContract}
              leftIcon={<Plus size={16} />}
            >
              Novo Contrato / Termo
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {documents.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <Input
                leftIcon={<Search size={15} />}
                placeholder="Buscar por título ou código ANA-..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputSize="sm"
                clearable
                onClear={() => setSearchTerm("")}
              />
            </div>
            <div className="text-xs text-gray-500">
              Exibindo <strong>{filteredDocuments.length}</strong> de <strong>{documents.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-rose-900 text-sm">Erro ao carregar documentos</h4>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchDocuments}
            className="btn btn-sm btn-ghost text-rose-800 hover:bg-rose-100 text-xs"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="card p-12 text-center bg-white border border-gray-200 rounded-xl">
          <div
            className="splash-loader mx-auto mb-3"
            style={{ borderTopColor: "var(--color-green-deep, #047857)", borderColor: "var(--color-gray-200, #E5E7EB)" }}
          />
          <p className="text-sm text-gray-500">Buscando documentos e termos assinados...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && documents.length === 0 && (
        <div className="card p-12 bg-white border border-gray-200 rounded-xl text-center">
          <EmptyState
            icon={<FileText size={40} className="text-teal-600" />}
            title="Nenhum contrato ou termo emitido"
            description="Este paciente ainda não possui contratos de procedimentos ou termos de consentimento (TCLE) registrados no sistema."
            action={
              <button
                onClick={onNewContract}
                className="btn btn-primary mt-4 inline-flex items-center gap-2"
                style={{ backgroundColor: "var(--color-green-deep, #047857)", color: "#fff" }}
              >
                <Plus size={16} />
                Emitir Primeiro Termo / Contrato
              </button>
            }
          />
        </div>
      )}

      {/* Documents List */}
      {!isLoading && !error && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map((doc) => {
            const isCompleted = doc.status === "completed";
            const patientSigner = doc.signers.find((s) => s.role === "PACIENTE");
            const doctorSigner = doc.signers.find((s) => s.role === "DRA_ANA");

            return (
              <div
                key={doc.id}
                className="card p-5 bg-white border border-gray-200 hover:border-teal-300 rounded-xl shadow-xs transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Column: Title & Main info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                        {doc.category || "CONTRATO"}
                      </span>
                      {getStatusBadge(doc.status, doc.has_pades)}
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-teal-600" />
                        {doc.verification_code}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-gray-900">{doc.title}</h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Criado em: <strong>{formatDate(doc.created_at)}</strong>
                      </span>
                      {doc.completed_at && (
                        <span>
                          Finalizado em: <strong>{formatDate(doc.completed_at)}</strong>
                        </span>
                      )}
                      {doc.signing_mode && (
                        <span className="capitalize">
                          Modalidade: <strong>{doc.signing_mode === "remote" ? "Remoto (WhatsApp/Email)" : doc.signing_mode === "in_person" ? "Presencial (Tablet/Totem)" : "Híbrido"}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    {/* View Preview button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePreview(doc)}
                      disabled={downloadingDocId === doc.id}
                      leftIcon={<Eye size={14} />}
                      title="Visualizar documento"
                    >
                      Visualizar
                    </Button>

                    {/* Download PDF button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingDocId === doc.id}
                      leftIcon={<Download size={14} className={downloadingDocId === doc.id ? "animate-bounce" : ""} />}
                      title="Baixar PDF com selos"
                    >
                      {isCompleted ? "Baixar Assinado" : "Baixar PDF"}
                    </Button>

                    {/* Verification Page link */}
                    <a
                      href={`/verificar/${doc.verification_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ExternalLink size={13} />}
                        title="Abrir página de validação pública"
                      >
                        Validar
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Signers status strip */}
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Paciente */}
                  {patientSigner && (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200/70 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="font-semibold text-gray-800 block truncate">
                          Paciente: {patientSigner.full_name}
                        </span>
                        <span className="text-gray-500 text-[11px]">
                          {patientSigner.status === "signed"
                            ? `Assinado em ${formatDate(patientSigner.signed_at)}`
                            : "Aguardando assinatura do paciente"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {patientSigner.status === "signed" ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Assinado
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleCopySignLink(patientSigner)}
                              className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                              title="Copiar link de assinatura"
                            >
                              {copiedToken === patientSigner.id ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleSendWhatsApp(doc, patientSigner)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 text-[11px]"
                              title="Enviar link via WhatsApp"
                            >
                              <Share2 size={12} /> WhatsApp
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Médica Dra. Ana */}
                  {doctorSigner && (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200/70 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="font-semibold text-gray-800 block truncate">
                          Médica: Dra. Ana Carla Morong (CRM/SC)
                        </span>
                        <span className="text-gray-500 text-[11px]">
                          {doctorSigner.status === "signed"
                            ? `Assinado em ${formatDate(doctorSigner.signed_at)} (ICP-Brasil)`
                            : "Pendente contra-assinatura médica"}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {doctorSigner.status === "signed" ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <ShieldCheck size={14} /> Selada
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <Clock size={14} /> Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Modal Preview */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-teal-700" />
                <h3 className="font-bold text-gray-900 text-sm md:text-base truncate max-w-md">
                  {previewDocTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = previewPdfUrl;
                    a.download = `${previewDocTitle}.pdf`;
                    a.click();
                  }}
                  className="btn btn-sm btn-ghost text-teal-800 hover:bg-teal-50 px-3 py-1.5 text-xs flex items-center gap-1.5 border border-teal-200 rounded-lg"
                >
                  <Download size={14} /> Baixar
                </button>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-2">
              <iframe
                src={`${previewPdfUrl}#toolbar=1`}
                className="w-full h-full rounded-lg border border-gray-200"
                title="Visualização do PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
