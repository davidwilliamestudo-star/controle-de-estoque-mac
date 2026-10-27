import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  FileCheck,
  ShieldCheck,
  User,
  ExternalLink,
  Pill,
  DollarSign,
  Calendar,
  Layers,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SignatureDocumentsService,
  type PatientDocument,
} from "@/services/contracts/signatureDocuments.service";
import { PatientDocumentsModal } from "@/components/documents/PatientDocumentsModal";
import { Button, Badge } from "@/components/ui";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await SignatureDocumentsService.getAllDocuments({
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        search: search.trim() || undefined,
      });
      setDocuments(docs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.status === "completed").length;
    const pending = documents.filter((d) => d.status === "pending" || d.status === "partially_signed").length;
    const contratos = documents.filter((d) => d.category === "CONTRATO").length;
    const tcle = documents.filter((d) => d.category === "TCLE").length;
    const outros = total - contratos - tcle;

    return { total, completed, pending, contratos, tcle, outros };
  }, [documents]);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleDownload = async (doc: PatientDocument) => {
    try {
      const res = await SignatureDocumentsService.getDocumentPdf(doc.id);
      if (res.pdf_base64) {
        SignatureDocumentsService.downloadPdf(
          res.pdf_base64,
          `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${doc.verification_code}.pdf`
        );
      } else if (res.drive_file_url) {
        window.open(res.drive_file_url, "_blank");
      }
    } catch (err: any) {
      alert(`Erro ao baixar PDF: ${err.message}`);
    }
  };

  const handlePreview = async (doc: PatientDocument) => {
    try {
      const res = await SignatureDocumentsService.getDocumentPdf(doc.id);
      if (res.pdf_base64) {
        const clean = res.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const byteCharacters = atob(clean);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        setPreviewPdfUrl(URL.createObjectURL(blob));
        setPreviewDocTitle(doc.title);
      } else if (res.drive_file_url) {
        window.open(res.drive_file_url, "_blank");
      }
    } catch (err: any) {
      alert(`Erro ao visualizar PDF: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-gray-900)] flex items-center gap-2.5">
            <FileCheck size={28} className="text-[var(--color-green-deep)]" />
            Documentos Clínicos & Contratos
          </h1>
          <p className="text-sm text-[var(--color-gray-500)] mt-1">
            Gestão, emissão e rastreabilidade de contratos, termos TCLE, atestados e receitas vinculados a cada prontuário.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-sm"
        >
          <Plus size={18} />
          Emitir Novo Documento
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5 bg-white border border-[var(--color-gray-200)] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-green-soft)]/40 flex items-center justify-center text-[var(--color-green-deep)]">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[var(--color-gray-900)]">{stats.total}</div>
            <div className="text-xs font-medium text-[var(--color-gray-500)]">Total de Documentos</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 bg-white border border-[var(--color-gray-200)] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700">{stats.completed}</div>
            <div className="text-xs font-medium text-[var(--color-gray-500)]">Assinados / Concluídos</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 bg-white border border-[var(--color-gray-200)] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-700">{stats.pending}</div>
            <div className="text-xs font-medium text-[var(--color-gray-500)]">Pendentes de Assinatura</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 bg-white border border-[var(--color-gray-200)] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-sky-800">{stats.tcle}</div>
            <div className="text-xs font-medium text-[var(--color-gray-500)]">Termos TCLE Ativos</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="card p-4 bg-white border border-[var(--color-gray-200)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-gray-400)]" />
          <input
            type="text"
            placeholder="Buscar por paciente, CPF, título ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--color-gray-300)] focus:ring-1 focus:ring-[var(--color-green-deep)]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Filtro de Categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-lg border border-[var(--color-gray-300)] bg-white px-3 py-1.5 focus:ring-1 focus:ring-[var(--color-green-deep)]"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="CONTRATO">Contratos Saúde 360</option>
            <option value="TCLE">Termos TCLE</option>
            <option value="ATESTADO">Atestados Médicos</option>
            <option value="RECEITUARIO">Receituários</option>
            <option value="RECIBO">Recibos Financeiros</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-lg border border-[var(--color-gray-300)] bg-white px-3 py-1.5 focus:ring-1 focus:ring-[var(--color-green-deep)]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="completed">Assinados</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
      </div>

      {/* Tabela de Documentos */}
      <div className="card overflow-hidden bg-white border border-[var(--color-gray-200)] shadow-sm">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-[var(--color-green-deep)] border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText size={48} className="mx-auto text-[var(--color-gray-300)] mb-3" />
            <h3 className="text-base font-bold text-[var(--color-gray-700)]">
              Nenhum documento encontrado
            </h3>
            <p className="text-xs text-[var(--color-gray-500)] mt-1 max-w-md mx-auto">
              Nenhum documento corresponde aos filtros aplicados. Clique no botão abaixo para emitir um novo documento.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 gap-1.5"
            >
              <Plus size={16} />
              Emitir Documento
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)] text-[11px] font-bold text-[var(--color-gray-600)] uppercase tracking-wider">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Paciente (Prontuário)</th>
                  <th className="py-3 px-4">Código / QR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data Emissão</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-gray-100)] text-xs">
                {documents.map((doc) => {
                  const isCompleted = doc.status === "completed";
                  const isPending = doc.status === "pending" || doc.status === "partially_signed";
                  const patientSigner = doc.signers.find((s) => s.role === "PACIENTE");

                  return (
                    <tr key={doc.id} className="hover:bg-[var(--color-gray-50)]/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-[var(--color-gray-900)] block truncate max-w-xs">
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-[var(--color-gray-500)]">
                              Categoria: <strong>{doc.category || "DOCUMENTO"}</strong>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: doc.patient_id }}
                          className="font-semibold text-[var(--color-green-deep)] hover:underline inline-flex items-center gap-1"
                        >
                          {doc.patient_name}
                          <ExternalLink size={12} className="opacity-60" />
                        </Link>
                        {doc.patient_cpf && (
                          <span className="block text-[11px] text-[var(--color-gray-500)]">
                            CPF: {doc.patient_cpf}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {doc.verification_code}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={isCompleted ? "emerald" : "amber"} size="sm">
                          {isCompleted ? "Assinado" : "Pendente"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-[var(--color-gray-600)]">
                        {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copiar Link de Assinatura se pendente */}
                          {patientSigner && isPending && patientSigner.remote_access_token && (
                            <button
                              onClick={() => patientSigner.remote_access_token && handleCopyLink(patientSigner.remote_access_token)}
                              className="p-1.5 text-[var(--color-gray-500)] hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Copiar link de assinatura para WhatsApp"
                            >
                              {copiedToken === patientSigner.remote_access_token ? (
                                <Check size={16} className="text-emerald-600" />
                              ) : (
                                <Share2 size={16} />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-1.5 text-[var(--color-gray-500)] hover:text-[var(--color-green-deep)] hover:bg-[var(--color-gray-100)] rounded transition-colors"
                            title="Visualizar PDF"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-[var(--color-gray-500)] hover:text-[var(--color-green-deep)] hover:bg-[var(--color-gray-100)] rounded transition-colors"
                            title="Baixar PDF"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dedicado de Criação & Gestão de Documentos */}
      {isModalOpen && (
        <PatientDocumentsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            loadDocuments();
          }}
          defaultTab="create"
        />
      )}

      {/* Modal de Preview do PDF */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)]">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[var(--color-green-deep)]" />
                <span className="font-bold text-sm text-[var(--color-gray-900)]">
                  Visualização: {previewDocTitle}
                </span>
              </div>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                }}
                className="p-1.5 text-[var(--color-gray-500)] hover:text-[var(--color-gray-800)] rounded-lg hover:bg-[var(--color-gray-200)]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={previewPdfUrl}
                title="PDF Preview"
                className="w-full h-full rounded-lg border border-[var(--color-gray-200)] bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
