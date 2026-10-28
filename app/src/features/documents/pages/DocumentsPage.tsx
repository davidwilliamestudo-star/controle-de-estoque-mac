import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Pill,
  DollarSign,
  Calendar,
  Layers,
  Share2,
  RefreshCw,
  Sparkles,
  QrCode,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SignatureDocumentsService,
  type PatientDocument,
} from "@/services/contracts/signatureDocuments.service";
import { PatientDocumentsModal } from "@/components/documents/PatientDocumentsModal";
import { Button, Badge, Input } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

type CategoryFilter =
  | "ALL"
  | "CONTRATO"
  | "TCLE"
  | "ATESTADO"
  | "RECEITUARIO"
  | "RECIBO";

type StatusFilter = "ALL" | "completed" | "pending";

interface CategoryMeta {
  label: string;
  shortLabel: string;
  badgeVariant: BadgeVariant;
  iconBoxClass: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}

const CATEGORY_OPTIONS: Array<{
  id: CategoryFilter;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  { id: "ALL", label: "Todas as Categorias", Icon: Layers },
  { id: "CONTRATO", label: "Contratos Saúde 360®", Icon: FileText },
  { id: "TCLE", label: "Termos TCLE", Icon: ShieldCheck },
  { id: "ATESTADO", label: "Atestados", Icon: FileCheck },
  { id: "RECEITUARIO", label: "Receituários", Icon: Pill },
  { id: "RECIBO", label: "Recibos", Icon: DollarSign },
];

function getCategoryMeta(category?: string): CategoryMeta {
  switch ((category || "").toUpperCase()) {
    case "CONTRATO":
      return {
        label: "Contrato Saúde 360®",
        shortLabel: "CONTRATO",
        badgeVariant: "emerald",
        iconBoxClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200/80 group-hover:bg-emerald-100/70",
        Icon: FileText,
      };
    case "TCLE":
      return {
        label: "Termo TCLE",
        shortLabel: "TCLE",
        badgeVariant: "sky",
        iconBoxClass:
          "bg-sky-50 text-sky-700 border-sky-200/80 group-hover:bg-sky-100/70",
        Icon: ShieldCheck,
      };
    case "ATESTADO":
      return {
        label: "Atestado Médico",
        shortLabel: "ATESTADO",
        badgeVariant: "indigo",
        iconBoxClass:
          "bg-indigo-50 text-indigo-700 border-indigo-200/80 group-hover:bg-indigo-100/70",
        Icon: FileCheck,
      };
    case "RECEITUARIO":
      return {
        label: "Receituário",
        shortLabel: "RECEITUÁRIO",
        badgeVariant: "emerald",
        iconBoxClass:
          "bg-teal-50 text-teal-700 border-teal-200/80 group-hover:bg-teal-100/70",
        Icon: Pill,
      };
    case "RECIBO":
      return {
        label: "Recibo Financeiro",
        shortLabel: "RECIBO",
        badgeVariant: "gold",
        iconBoxClass:
          "bg-amber-50 text-amber-800 border-amber-200/80 group-hover:bg-amber-100/70",
        Icon: DollarSign,
      };
    default:
      return {
        label: category || "Documento Clínico",
        shortLabel: category || "DOCUMENTO",
        badgeVariant: "neutral",
        iconBoxClass:
          "bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-slate-200/70",
        Icon: FileText,
      };
  }
}

function formatCpfDisplay(cpf?: string): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function getPatientInitials(name?: string): string {
  if (!name) return "PA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeSearchText(value?: string): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function DocumentsPage() {
  const [allDocuments, setAllDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{
    id: string;
    type: "preview" | "download";
  } | null>(null);

  // PDF Preview Modal
  const [previewDoc, setPreviewDoc] = useState<PatientDocument | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const loadDocuments = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const docs = await SignatureDocumentsService.getAllDocuments();
      setAllDocuments(docs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments(false);
  }, [loadDocuments]);

  // Estatísticas globais preservadas independentemente dos filtros ativos
  const stats = useMemo(() => {
    const total = allDocuments.length;
    const completed = allDocuments.filter((d) => d.status === "completed").length;
    const pending = allDocuments.filter(
      (d) => d.status === "pending" || d.status === "partially_signed"
    ).length;
    const contratos = allDocuments.filter((d) => d.category === "CONTRATO").length;
    const tcle = allDocuments.filter((d) => d.category === "TCLE").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byCategory: Record<CategoryFilter, number> = {
      ALL: total,
      CONTRATO: contratos,
      TCLE: tcle,
      ATESTADO: allDocuments.filter((d) => d.category === "ATESTADO").length,
      RECEITUARIO: allDocuments.filter((d) => d.category === "RECEITUARIO").length,
      RECIBO: allDocuments.filter((d) => d.category === "RECIBO").length,
    };

    return { total, completed, pending, contratos, tcle, completionRate, byCategory };
  }, [allDocuments]);

  // Filtragem instantânea e fluida em memória
  const filteredDocuments = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    const queryDigits = search.replace(/\D/g, "");

    return allDocuments.filter((doc) => {
      if (selectedCategory !== "ALL" && doc.category !== selectedCategory) {
        return false;
      }

      if (selectedStatus === "completed" && doc.status !== "completed") {
        return false;
      }

      if (
        selectedStatus === "pending" &&
        doc.status !== "pending" &&
        doc.status !== "partially_signed"
      ) {
        return false;
      }

      if (query) {
        const matchesText =
          normalizeSearchText(doc.title).includes(query) ||
          normalizeSearchText(doc.patient_name).includes(query) ||
          normalizeSearchText(doc.verification_code).includes(query) ||
          normalizeSearchText(doc.patient_cpf).includes(query);

        const docCpfDigits = (doc.patient_cpf || "").replace(/\D/g, "");
        const matchesDigits =
          queryDigits.length >= 3 && docCpfDigits.includes(queryDigits);

        if (!matchesText && !matchesDigits) {
          return false;
        }
      }

      return true;
    });
  }, [allDocuments, selectedCategory, selectedStatus, search]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategory !== "ALL" ||
    selectedStatus !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCopyVerificationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownload = async (doc: PatientDocument) => {
    setLoadingAction({ id: doc.id, type: "download" });
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
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePreview = async (doc: PatientDocument) => {
    setLoadingAction({ id: doc.id, type: "preview" });
    try {
      const res = await SignatureDocumentsService.getDocumentPdf(doc.id);
      if (res.pdf_base64) {
        const clean = res.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const byteCharacters = atob(clean);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], {
          type: "application/pdf",
        });
        setPreviewPdfUrl(URL.createObjectURL(blob));
        setPreviewDoc(doc);
      } else if (res.drive_file_url) {
        window.open(res.drive_file_url, "_blank");
      }
    } catch (err: any) {
      alert(`Erro ao visualizar PDF: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const closePreviewModal = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setPreviewDoc(null);
  };

  return (
    <div
      className="max-w-[1600px] mx-auto space-y-7 pb-8"
      style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
    >
      {/* Hero Header Executivo */}
      <section className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/90 px-6 py-6 sm:px-8 sm:py-7 shadow-xs">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-emerald-100/50 via-teal-50/30 to-transparent blur-2xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/15 shrink-0">
              <FileCheck className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Documentos Clínicos &amp; Contratos
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Central ICP-Brasil &amp; Prontuário
                </span>
              </div>

              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                Gestão, emissão timbrada e rastreabilidade de contratos Saúde 360®,
                termos TCLE, atestados, prescrições e recibos vinculados a cada
                paciente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => loadDocuments(true)}
              disabled={isRefreshing || isLoading}
              leftIcon={
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshing ? "animate-spin text-emerald-600" : "text-slate-500"
                  }`}
                />
              }
            >
              Atualizar
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-5 h-5" />}
              className="shadow-sm shadow-emerald-900/15"
            >
              Emitir Novo Documento
            </Button>
          </div>
        </div>
      </section>

      {/* Cards de Indicadores (Interativos para Filtro Rápido) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <button
          type="button"
          onClick={resetFilters}
          className={`group text-left bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
            selectedStatus === "ALL" && selectedCategory === "ALL"
              ? "border-emerald-300 ring-3 ring-emerald-600/10 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total de Documentos
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-xs font-medium text-slate-400">
              {stats.contratos} contratos Saúde 360® emitidos
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedStatus((prev) => (prev === "completed" ? "ALL" : "completed"))
          }
          className={`group text-left bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
            selectedStatus === "completed"
              ? "border-emerald-400 ring-3 ring-emerald-600/15 shadow-sm"
              : "border-slate-200/90 hover:border-emerald-200 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assinados / Concluídos
            </span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {stats.completed}
              </span>
              {stats.total > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  {stats.completionRate}%
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400">
              Validade jurídica concluída
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50/90 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedStatus((prev) => (prev === "pending" ? "ALL" : "pending"))
          }
          className={`group text-left bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
            selectedStatus === "pending"
              ? "border-amber-400 ring-3 ring-amber-500/15 shadow-sm"
              : "border-slate-200/90 hover:border-amber-200 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendentes de Assinatura
            </span>
            <div className="text-3xl font-extrabold text-amber-700 tracking-tight">
              {stats.pending}
            </div>
            <p className="text-xs font-medium text-slate-400">
              Aguardando coleta de assinatura
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategory((prev) => (prev === "TCLE" ? "ALL" : "TCLE"))
          }
          className={`group text-left bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
            selectedCategory === "TCLE"
              ? "border-sky-400 ring-3 ring-sky-500/15 shadow-sm"
              : "border-slate-200/90 hover:border-sky-200 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Termos TCLE Ativos
            </span>
            <div className="text-3xl font-extrabold text-sky-800 tracking-tight">
              {stats.tcle}
            </div>
            <p className="text-xs font-medium text-slate-400">
              Consentimentos livres e esclarecidos
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </button>
      </section>

      {/* Barra de Busca e Filtros Fluidos */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 lg:max-w-xl">
            <Input
              inputSize="lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              clearable
              onClear={() => setSearch("")}
              leftIcon={<Search className="w-5 h-5" />}
              placeholder="Buscar por paciente, CPF, título do documento ou código ANA-..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Segmentado de Status */}
            <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
              {(
                [
                  { id: "ALL", label: "Todos", count: stats.total, dotClass: "" },
                  {
                    id: "completed",
                    label: "Assinados",
                    count: stats.completed,
                    dotClass: "bg-emerald-500",
                  },
                  {
                    id: "pending",
                    label: "Pendentes",
                    count: stats.pending,
                    dotClass: "bg-amber-500",
                  },
                ] as const
              ).map((tab) => {
                const isActive = selectedStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedStatus(tab.id)}
                    className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.dotClass && (
                      <span
                        className={`w-2 h-2 rounded-full ${tab.dotClass}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
                        isActive
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-200/70 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-4 h-4" />}
                className="text-slate-500 hover:text-rose-600"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Pílulas de Categoria */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2.5 overflow-x-auto pb-1">
          {CATEGORY_OPTIONS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const Icon = cat.Icon;
            const count = stats.byCategory[cat.id];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-10 px-4 rounded-xl text-xs sm:text-[13px] font-semibold inline-flex items-center gap-2 whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                    : "bg-slate-50/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200/80"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-emerald-100" : "text-slate-400"
                  }`}
                />
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-500 border border-slate-200/80"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabela Executiva de Documentos */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Cabeçalho Interno do Card da Tabela */}
        <div className="px-6 sm:px-7 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-800">
              Acervo de Documentos Emitidos
            </h2>
            <Badge variant="neutral" size="sm">
              {filteredDocuments.length}{" "}
              {filteredDocuments.length === 1 ? "documento" : "documentos"}
            </Badge>
          </div>

          <p className="text-xs text-slate-400 hidden sm:block">
            Clique no código autenticador para copiar ou no paciente para abrir o prontuário
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin w-9 h-9 rounded-full border-3 border-emerald-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">
              Carregando documentos clínicos...
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {hasActiveFilters
                ? "Nenhum documento encontrado para estes filtros"
                : "Nenhum documento emitido até o momento"}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? "Tente ajustar os termos de busca ou limpar os filtros ativos para visualizar todo o acervo clínico."
                : "Emita contratos Saúde 360®, termos TCLE, atestados, prescrições ou recibos diretamente vinculados ao prontuário."}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={resetFilters}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Limpar Filtros
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Emitir Novo Documento
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 sm:pl-7 pr-4">Documento</th>
                  <th className="py-4 px-4">Paciente &amp; Prontuário</th>
                  <th className="py-4 px-4">Código / QR</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Emissão</th>
                  <th className="py-4 pl-4 pr-6 sm:pr-7 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDocuments.map((doc) => {
                  const isCompleted = doc.status === "completed";
                  const isPartiallySigned = doc.status === "partially_signed";
                  const isPending = !isCompleted;
                  const patientSigner = doc.signers.find(
                    (s) => s.role === "PACIENTE"
                  );
                  const signedCount = doc.signers.filter(
                    (s) => s.status === "signed"
                  ).length;
                  const totalSigners = doc.signers.length;
                  const catMeta = getCategoryMeta(doc.category);
                  const CatIcon = catMeta.Icon;

                  const isPreviewLoading =
                    loadingAction?.id === doc.id &&
                    loadingAction.type === "preview";
                  const isDownloadLoading =
                    loadingAction?.id === doc.id &&
                    loadingAction.type === "download";

                  return (
                    <tr
                      key={doc.id}
                      className="group hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Coluna 1: Documento */}
                      <td className="py-4.5 pl-6 sm:pl-7 pr-4">
                        <div className="flex items-center gap-3.5 min-w-[240px]">
                          <div
                            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${catMeta.iconBoxClass}`}
                          >
                            <CatIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <button
                              type="button"
                              onClick={() => handlePreview(doc)}
                              className="font-bold text-slate-900 hover:text-emerald-800 text-left block truncate max-w-xs xl:max-w-md transition-colors cursor-pointer"
                              title={`Visualizar ${doc.title}`}
                            >
                              {doc.title}
                            </button>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant={catMeta.badgeVariant} size="sm">
                                {catMeta.shortLabel}
                              </Badge>

                              {doc.has_pades && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50/80 text-emerald-800 border border-emerald-200/70">
                                  ICP-Brasil PAdES
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: Paciente */}
                      <td className="py-4.5 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {getPatientInitials(doc.patient_name)}
                          </div>

                          <div className="min-w-0">
                            <Link
                              to="/patients/$patientId"
                              params={{ patientId: doc.patient_id }}
                              className="font-bold text-slate-800 hover:text-emerald-700 inline-flex items-center gap-1.5 transition-colors truncate max-w-[210px]"
                            >
                              <span className="truncate">{doc.patient_name}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-55 shrink-0" />
                            </Link>

                            {doc.patient_cpf && (
                              <span className="block font-mono text-xs text-slate-500 mt-0.5">
                                CPF: {formatCpfDisplay(doc.patient_cpf)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Coluna 3: Código Autenticador */}
                      <td className="py-4.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyVerificationCode(doc.verification_code)
                          }
                          title="Clique para copiar o código autenticador"
                          className="inline-flex items-center gap-2 font-mono text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-3 py-1.5 rounded-xl border border-slate-200/90 hover:border-emerald-200 transition-colors cursor-pointer"
                        >
                          {copiedCode === doc.verification_code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-3.5 h-3.5 text-slate-400" />
                              <span>{doc.verification_code}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Coluna 4: Status */}
                      <td className="py-4.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <Badge
                            variant={
                              isCompleted
                                ? "emerald"
                                : isPartiallySigned
                                  ? "sky"
                                  : "amber"
                            }
                            size="md"
                            dot
                          >
                            {isCompleted
                              ? "Assinado"
                              : isPartiallySigned
                                ? "Parcialmente Assinado"
                                : "Pendente"}
                          </Badge>

                          {totalSigners > 0 && (
                            <div className="text-[11px] font-medium text-slate-400 pl-1">
                              {signedCount}/{totalSigners}{" "}
                              {totalSigners === 1 ? "assinatura" : "assinaturas"}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Coluna 5: Data de Emissão */}
                      <td className="py-4.5 px-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(doc.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 pl-5">
                          às{" "}
                          {format(new Date(doc.created_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                      </td>

                      {/* Coluna 6: Ações */}
                      <td className="py-4.5 pl-4 pr-6 sm:pr-7 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Copiar Link de Assinatura se pendente */}
                          {patientSigner &&
                            isPending &&
                            patientSigner.remote_access_token && (
                              <Button
                                variant={
                                  copiedToken ===
                                  patientSigner.remote_access_token
                                    ? "success"
                                    : "outline"
                                }
                                size="xs"
                                onClick={() =>
                                  patientSigner.remote_access_token &&
                                  handleCopyLink(
                                    patientSigner.remote_access_token
                                  )
                                }
                                title="Copiar link de assinatura para enviar via WhatsApp"
                                leftIcon={
                                  copiedToken ===
                                  patientSigner.remote_access_token ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Share2 className="w-3.5 h-3.5" />
                                  )
                                }
                              >
                                {copiedToken ===
                                patientSigner.remote_access_token
                                  ? "Copiado!"
                                  : "Link"}
                              </Button>
                            )}

                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={isPreviewLoading}
                            onClick={() => handlePreview(doc)}
                            leftIcon={<Eye className="w-4 h-4 text-slate-600" />}
                            title="Visualizar PDF"
                          >
                            Ver PDF
                          </Button>

                          <Button
                            variant="secondary"
                            size="icon-sm"
                            isLoading={isDownloadLoading}
                            onClick={() => handleDownload(doc)}
                            title="Baixar PDF"
                            className="h-10 w-10 rounded-xl text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/60"
                          >
                            {!isDownloadLoading && (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Dedicado de Criação & Gestão de Documentos */}
      {isModalOpen && (
        <PatientDocumentsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            loadDocuments(true);
          }}
          defaultTab="create"
        />
      )}

      {/* Modal Executivo de Preview do PDF */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/90">
            <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-4.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                    {previewDoc?.title || "Visualização de Documento"}
                  </h3>
                  {previewDoc && (
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Paciente: {previewDoc.patient_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {previewDoc.verification_code}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {previewDoc && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(previewDoc)}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Baixar PDF
                  </Button>
                )}

                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar visualização"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100/90 p-3 sm:p-5">
              <iframe
                src={previewPdfUrl}
                title="PDF Preview"
                className="w-full h-full rounded-2xl border border-slate-200/90 bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
