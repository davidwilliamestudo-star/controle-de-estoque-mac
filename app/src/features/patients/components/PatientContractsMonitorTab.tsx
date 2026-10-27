import React, { useState, useEffect, useMemo } from "react";
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
  Send,
  CloudCheck,
  Mail,
  HardDrive,
  TabletSmartphone,
  ChevronRight,
  Layers,
  Sparkles,
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

interface PatientContractsMonitorTabProps {
  patientId: string;
  patientName: string;
  patientCpf?: string | null;
  patientEmail?: string | null;
  patientPhone?: string | null;
  onNewContract: () => void;
}

export function PatientContractsMonitorTab({
  patientId,
  patientName,
  patientCpf,
  patientEmail,
  patientPhone,
  onNewContract,
}: PatientContractsMonitorTabProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "completed" | "pending">("ALL");
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<{ id: string; msg: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await SignatureDocumentsService.getDocumentsByPatient(patientId);
      setDocuments(data);
    } catch (err: any) {
      console.error("Erro ao carregar contratos:", err);
      setError(err?.message || "Erro ao carregar contratos do paciente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  // Filtra por termo de busca e status
  const filteredContracts = useMemo(() => {
    return documents.filter((doc) => {
      // Prioriza contratos ou TCLE
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.verification_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "completed") {
        return doc.status === "completed";
      }
      if (statusFilter === "pending") {
        return doc.status === "pending" || doc.status === "partially_signed";
      }
      return true;
    });
  }, [documents, searchTerm, statusFilter]);

  // Estatísticas do Monitoramento
  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.status === "completed").length;
    const pending = documents.filter((d) => d.status === "pending" || d.status === "partially_signed").length;
    const syncedDrive = documents.filter((d) => Boolean(d.drive_file_url)).length;
    return { total, completed, pending, syncedDrive };
  }, [documents]);

  // Sincronização manual com Google Drive e Envio de E-mail
  const handleSyncToDrive = async (doc: PatientDocument) => {
    setSyncingDocId(doc.id);
    try {
      const res = await SignatureDocumentsService.syncDocumentToDrive(doc.id);
      if (!res.success) {
        throw new Error(res.error || "Falha ao sincronizar com Google Drive.");
      }

      setSyncSuccessMsg({
        id: doc.id,
        msg: `Sincronizado com sucesso! Arquivado no Google Drive e cópia enviada ao e-mail (${res.email_status || "OK"}).`,
      });

      // Recarrega lista atualizada
      await fetchDocuments();

      setTimeout(() => setSyncSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(`Erro na sincronização: ${err?.message || String(err)}`);
    } finally {
      setSyncingDocId(null);
    }
  };

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
    const signUrl = signer.sign_url || `${window.location.origin}/assinar/${signer.remote_access_token}`;
    navigator.clipboard.writeText(signUrl);
    setCopiedToken(signer.id);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSendWhatsApp = (doc: PatientDocument, signer: PatientDocumentSigner) => {
    const rawPhone = signer.phone_whatsapp || patientPhone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const signUrl = signer.sign_url || `${window.location.origin}/assinar/${signer.remote_access_token}`;

    const text = encodeURIComponent(
      `Olá, ${signer.full_name}!\n\n` +
      `Consta em aberto o contrato *"${doc.title}"* da Clínica Dra. Ana Morong para sua assinatura eletrônica.\n\n` +
      `Clique no link seguro abaixo para assinar pelo celular ou computador:\n${signUrl}\n\n` +
      `Código de verificação: ${doc.verification_code}`
    );

    const waUrl = cleanPhone ? `https://wa.me/${phoneWithCountry}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
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
    <div className="space-y-6" style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}>
      {/* ==================================================================== */}
      {/* 1. HERO HEADER DO MONITOR DE CONTRATOS */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
              <FileCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Painel de Monitoramento de Contratos
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Jornada Saúde 360®
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento em tempo real das assinaturas, arquivamento automático no <strong>Google Drive</strong> e envio de cópias por <strong>e-mail</strong> para <strong>{patientName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
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
              style={{ backgroundColor: "#047857", borderColor: "#065f46" }}
            >
              Emitir Contrato Saúde 360®
            </Button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. CARDS DE MÉTRICAS / KPIS */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Contratos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-400">emitidos</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Assinados & Válidos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-950">{stats.completed}</span>
              <span className="text-xs text-emerald-700 font-medium">ICP-Brasil / PAdES</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Aguardando Assinatura
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-950">{stats.pending}</span>
              <span className="text-xs text-amber-700 font-medium">em coleta</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/70">
            <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider block">
              Arquivados no Drive
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-sky-950">{stats.syncedDrive}</span>
              <span className="text-xs text-sky-700 font-medium">com e-mail enviado</span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. BARRA DE BUSCA E FILTROS */}
        {/* ==================================================================== */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              leftIcon={<Search size={15} />}
              placeholder="Buscar por plano, código ANA-..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              inputSize="sm"
              clearable
              onClear={() => setSearchTerm("")}
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({documents.length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === "completed" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-emerald-800"
              }`}
            >
              Assinados ({stats.completed})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === "pending" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-600 hover:text-amber-800"
              }`}
            >
              Pendentes ({stats.pending})
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900 text-sm">Erro ao carregar contratos</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <button onClick={fetchDocuments} className="text-xs font-bold text-rose-800 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <div
            className="splash-loader mx-auto mb-3"
            style={{ borderTopColor: "var(--color-green-deep, #047857)", borderColor: "var(--color-gray-200, #E5E7EB)" }}
          />
          <p className="text-sm font-semibold text-slate-600">Carregando contratos e status de assinaturas...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && documents.length === 0 && (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center">
          <EmptyState
            icon={<FileText size={44} className="text-emerald-700" />}
            title="Nenhum contrato emitido para este paciente"
            description="Emita o primeiro contrato médico da Jornada Saúde 360® com geração automática de minuta, rubricas por página, selagem ICP-Brasil e backup no Google Drive."
            action={
              <button
                onClick={onNewContract}
                className="btn btn-primary mt-4 inline-flex items-center gap-2"
                style={{ backgroundColor: "var(--color-green-deep, #047857)", color: "#fff" }}
              >
                <Plus size={16} />
                Emitir Contrato Saúde 360®
              </button>
            }
          />
        </div>
      )}

      {/* Lista de Contratos */}
      {!isLoading && !error && filteredContracts.length > 0 && (
        <div className="space-y-4">
          {filteredContracts.map((doc) => {
            const isCompleted = doc.status === "completed";
            const patientSigner = doc.signers.find((s) => s.role === "PACIENTE");
            const doctorSigner = doc.signers.find((s) => s.role === "DRA_ANA");
            const isSyncing = syncingDocId === doc.id;
            const hasDrive = Boolean(doc.drive_file_url);

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-5"
              >
                {/* TOPO DO CARD: Categoria, Status, Código e Botões de Ação Primária */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                        {doc.category || "CONTRATO"}
                      </span>

                      {/* Status de Assinatura */}
                      {isCompleted ? (
                        <Badge variant="emerald" size="md" icon={<CheckCircle2 size={13} className="text-emerald-600" />}>
                          Assinado & Selado (ICP-Brasil)
                        </Badge>
                      ) : doc.status === "partially_signed" ? (
                        <Badge variant="sky" size="md" icon={<Clock size={13} className="text-sky-600" />}>
                          Assinado Parcialmente
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="md" icon={<Clock size={13} className="text-amber-600" />}>
                          Pendente de Assinatura
                        </Badge>
                      )}

                      {/* Status Google Drive */}
                      {hasDrive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <HardDrive size={12} className="text-emerald-600" />
                          Salvo no Google Drive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <HardDrive size={12} className="text-slate-400" />
                          Drive Pendente
                        </span>
                      )}

                      {/* Código de Verificação Pública */}
                      <button
                        onClick={() => handleCopyCode(doc.verification_code)}
                        className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 flex items-center gap-1.5 transition"
                        title="Clique para copiar código verificador"
                      >
                        <ShieldCheck size={12} className="text-emerald-700" />
                        {doc.verification_code}
                        {copiedCode === doc.verification_code ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-slate-400" />
                        )}
                      </button>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {doc.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Criado em: <strong className="text-slate-700">{formatDate(doc.created_at)}</strong></span>
                      {doc.completed_at && (
                        <span>Finalizado em: <strong className="text-slate-700">{formatDate(doc.completed_at)}</strong></span>
                      )}
                      <span>
                        Modalidade: <strong className="text-slate-700 capitalize">{doc.signing_mode === "remote" ? "Remoto (WhatsApp/Email)" : doc.signing_mode === "in_person" ? "Presencial (Tablet/Totem)" : "Híbrido"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Ações do Contrato */}
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePreview(doc)}
                      disabled={downloadingDocId === doc.id}
                      leftIcon={<Eye size={14} />}
                    >
                      Visualizar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingDocId === doc.id}
                      leftIcon={<Download size={14} className={downloadingDocId === doc.id ? "animate-bounce" : ""} />}
                    >
                      {isCompleted ? "Baixar Assinado" : "Baixar PDF"}
                    </Button>

                    <a
                      href={`/verificar/${doc.verification_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button variant="ghost" size="sm" leftIcon={<ExternalLink size={13} />}>
                        Validar
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Feedback de sucesso na sincronização */}
                {syncSuccessMsg && syncSuccessMsg.id === doc.id && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{syncSuccessMsg.msg}</span>
                  </div>
                )}

                {/* SIGNATÁRIOS: PAINEL DE ACOMPANHAMENTO INDIVIDUAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Paciente */}
                  {patientSigner && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Paciente (Contratante)
                          </span>
                          {patientSigner.status === "signed" ? (
                            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 size={13} /> Assinado
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold text-xs flex items-center gap-1">
                              <Clock size={13} /> Aguardando
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                          {patientSigner.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {patientSigner.status === "signed"
                            ? `Assinatura registrada em ${formatDate(patientSigner.signed_at)}`
                            : "Aguardando assinatura digital ou no tablet"}
                        </p>
                      </div>

                      {/* Botões de Coleta de Assinatura se Pendente */}
                      {patientSigner.status !== "signed" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                          <button
                            onClick={() => handleCopySignLink(patientSigner)}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
                            title="Copiar link seguro para assinatura"
                          >
                            {copiedToken === patientSigner.id ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(doc, patientSigner)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                            title="Enviar link seguro no WhatsApp do paciente"
                          >
                            <Share2 size={13} />
                            <span>WhatsApp</span>
                          </button>

                          <a
                            href={patientSigner.sign_url || `/assinar/${patientSigner.remote_access_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Abrir tela de assinatura para tablet no consultório"
                          >
                            <TabletSmartphone size={13} />
                            <span>Assinar no Tablet</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Médica Dra. Ana Morong */}
                  {doctorSigner && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Médica Responsável
                          </span>
                          {doctorSigner.status === "signed" ? (
                            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                              <ShieldCheck size={14} /> Selada ICP-Brasil
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold text-xs flex items-center gap-1">
                              <Clock size={13} /> Pendente
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                          Dra. Ana Carla Morong (CRM/SC 28412)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doctorSigner.status === "signed"
                            ? `Chancela criptográfica vinculada em ${formatDate(doctorSigner.signed_at)}`
                            : "Pendente contra-assinatura médica via cofre ICP-Brasil"}
                        </p>
                      </div>

                      {doctorSigner.status !== "signed" && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                          <a
                            href={doctorSigner.sign_url || `/assinar/${doctorSigner.remote_access_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <ShieldCheck size={13} />
                            <span>Assinar como Médica Agora</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ==================================================================== */}
                {/* SINCRONIZAÇÃO NUVEM: GOOGLE DRIVE & DISPARO DE E-MAIL */}
                {/* ==================================================================== */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <HardDrive size={15} className="text-teal-700" />
                        Armazenamento Google Drive & Envio de E-mail
                      </span>
                      {hasDrive ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                          Sincronizado
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                          Pendente
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      {hasDrive ? (
                        <>
                          O contrato assinado está seguro na pasta individual do paciente no Drive.
                          {doc.patient_email ? (
                            <> Uma via foi disparada para <strong>{doc.patient_email}</strong>.</>
                          ) : (
                            <> (Sem e-mail cadastrado no prontuário para envio).</>
                          )}
                        </>
                      ) : (
                        <>
                          Ao concluir as assinaturas, o sistema salva o PDF original selado no Drive da clínica e dispara a cópia ao paciente por e-mail.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Botão de Abrir no Google Drive */}
                    {doc.drive_file_url && (
                      <a
                        href={doc.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ExternalLink size={13} className="text-teal-700" />}
                        >
                          Abrir no Drive
                        </Button>
                      </a>
                    )}

                    {/* Botão de Abrir Pasta do Paciente no Drive */}
                    {doc.drive_folder_url && (
                      <a
                        href={doc.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ExternalLink size={13} />}
                        >
                          Pasta no Drive
                        </Button>
                      </a>
                    )}

                    {/* Botão de Sincronizar com Drive e Enviar E-mail */}
                    <Button
                      variant={hasDrive ? "outline" : "primary"}
                      size="sm"
                      onClick={() => handleSyncToDrive(doc)}
                      disabled={isSyncing}
                      leftIcon={<RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />}
                    >
                      {isSyncing
                        ? "Sincronizando..."
                        : hasDrive
                        ? "Reenviar por E-mail & Atualizar Drive"
                        : "Salvar no Drive & Enviar E-mail"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE PDF */}
      {/* ==================================================================== */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={20} className="text-emerald-700 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm md:text-base truncate max-w-md">
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
                  className="btn btn-sm btn-ghost text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 text-xs flex items-center gap-1.5 border border-emerald-200 rounded-lg"
                >
                  <Download size={14} /> Baixar
                </button>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={`${previewPdfUrl}#toolbar=1`}
                className="w-full h-full rounded-lg border border-slate-200"
                title="Visualização do Contrato"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
