import React, { useState, useEffect, useMemo } from "react";
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
  X,
  FileCheck,
  ShieldCheck,
  Calendar,
  DollarSign,
  Pill,
  Send,
  AlertCircle,
  Trash2,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SignatureDocumentsService,
  type PatientDocument,
} from "@/services/contracts/signatureDocuments.service";
import {
  ClinicalDocumentsEngine,
  type ClinicalDocumentType,
  type TcleFormData,
  type AtestadoFormData,
  type ReceituarioFormData,
  type ReciboFormData,
} from "@/services/contracts/clinicalDocumentsEngine.service";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { Button, Badge, Input, Select, Textarea } from "@/components/ui";

export interface PatientDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  patientCpf?: string;
  patientPhone?: string;
  patientEmail?: string;
  defaultTab?: "list" | "create";
  onOpenContractPreparation?: () => void;
}

export const PatientDocumentsModal: React.FC<PatientDocumentsModalProps> = ({
  isOpen,
  onClose,
  patientId: initialPatientId,
  patientName: initialPatientName,
  patientCpf: initialPatientCpf,
  patientPhone: initialPatientPhone,
  patientEmail: initialPatientEmail,
  defaultTab = "list",
  onOpenContractPreparation,
}) => {
  const [activeTab, setActiveTab] = useState<"list" | "create">(defaultTab);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || "");
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  // Pacientes para seleção (se não veio pré-selecionado)
  const { data: allPatients = [] } = usePatients();

  const currentPatient = useMemo(() => {
    if (selectedPatientId) {
      const found = allPatients.find((p) => p.id === selectedPatientId);
      if (found) {
        return {
          id: found.id,
          name: found.full_name,
          cpf: found.document || "",
          phone: found.phone || "",
          email: found.email || "",
          birthDate: found.birth_date || "",
        };
      }
    }
    return {
      id: initialPatientId || "",
      name: initialPatientName || "",
      cpf: initialPatientCpf || "",
      phone: initialPatientPhone || "",
      email: initialPatientEmail || "",
      birthDate: "",
    };
  }, [selectedPatientId, allPatients, initialPatientId, initialPatientName, initialPatientCpf, initialPatientPhone, initialPatientEmail]);

  // Form State para Criação
  const [docType, setDocType] = useState<ClinicalDocumentType>("TCLE");

  // Campos TCLE
  const [tcleData, setTcleData] = useState<TcleFormData>({
    procedureName: "Procedimento Injetável Estético / Metabólico",
    description: "Aplicação especializada conforme plano terapêutico individualizado registrado no prontuário.",
    risksAndGuidelines: "Podem ocorrer hiperemia temporária, leve edema e equimose no local da aplicação. Evitar exposição solar direta e manipulação excessiva da área tratada nas primeiras 48 horas.",
  });

  // Campos Atestado
  const [atestadoData, setAtestadoData] = useState<AtestadoFormData>({
    type: "comparecimento",
    daysCount: 1,
    periodText: "atendimento clínico ambulatorial",
    reasonOrCid: "",
    instructions: "Paciente clinicamente avaliado(a) e orientado(a).",
  });

  // Campos Receituário
  const [receitaItems, setReceitaItems] = useState<Array<{ name: string; dosage: string; instructions: string }>>([
    { name: "", dosage: "", instructions: "" },
  ]);
  const [receitaGeneralInstructions, setReceitaGeneralInstructions] = useState(
    "Em caso de dúvidas ou intercorrências, entre em contato imediatamente com a clínica."
  );

  // Campos Recibo
  const [reciboData, setReciboData] = useState<ReciboFormData>({
    amountBrl: 0,
    amountExtenso: "",
    paymentMethod: "PIX",
    servicesDescription: "Acompanhamento médico e aplicação de protocolo clínico",
    receiptNumber: `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  });

  const loadDocuments = async () => {
    if (!currentPatient.id) {
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    try {
      const docs = await SignatureDocumentsService.getDocumentsByPatient(currentPatient.id);
      setDocuments(docs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialPatientId) setSelectedPatientId(initialPatientId);
      setActiveTab(defaultTab);
    }
  }, [isOpen, initialPatientId, defaultTab]);

  useEffect(() => {
    if (isOpen && currentPatient.id) {
      loadDocuments();
    }
  }, [isOpen, currentPatient.id]);

  if (!isOpen) return null;

  const filteredDocuments = documents.filter((doc) => {
    const q = searchTerm.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.verification_code.toLowerCase().includes(q) ||
      (doc.category && doc.category.toLowerCase().includes(q))
    );
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleDownloadPdf = async (doc: PatientDocument) => {
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

  const handlePreviewPdf = async (doc: PatientDocument) => {
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

  const handleCreateDocument = async () => {
    if (!currentPatient.id || !currentPatient.name) {
      alert("Selecione um paciente para emitir o documento.");
      return;
    }

    if (docType === "CONTRATO") {
      if (onOpenContractPreparation) {
        onClose();
        onOpenContractPreparation();
      } else {
        alert("Utilize a ferramenta de Contrato Saúde 360 disponível no prontuário do paciente.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      let pdfBase64 = "";
      let title = "";
      let category = docType;

      if (docType === "TCLE") {
        title = `TCLE - ${tcleData.procedureName}`;
        const res = await ClinicalDocumentsEngine.generateTclePdf(currentPatient, tcleData);
        pdfBase64 = res.pdfBase64;
      } else if (docType === "ATESTADO") {
        title = `Atestado Médico - ${atestadoData.type === "repouso" ? "Repouso" : atestadoData.type === "comparecimento" ? "Comparecimento" : "Aptidão"}`;
        const res = await ClinicalDocumentsEngine.generateAtestadoPdf(currentPatient, atestadoData);
        pdfBase64 = res.pdfBase64;
      } else if (docType === "RECEITUARIO") {
        title = `Prescrição Médica - ${new Date().toLocaleDateString("pt-BR")}`;
        const validItems = receitaItems.filter((i) => i.name.trim() !== "");
        if (validItems.length === 0) {
          alert("Adicione pelo menos um item ou medicamento na receita.");
          setIsSubmitting(false);
          return;
        }
        const res = await ClinicalDocumentsEngine.generateReceituarioPdf(currentPatient, {
          items: validItems,
          generalInstructions: receitaGeneralInstructions,
        });
        pdfBase64 = res.pdfBase64;
      } else if (docType === "RECIBO") {
        title = `Recibo Financeiro - R$ ${reciboData.amountBrl.toFixed(2)}`;
        const res = await ClinicalDocumentsEngine.generateReciboPdf(currentPatient, reciboData);
        pdfBase64 = res.pdfBase64;
      }

      // Registra no banco de dados com signatários (Dra. Ana e Paciente)
      const patientSignerId = crypto.randomUUID();
      const doctorSignerId = crypto.randomUUID();

      await SignatureDocumentsService.createDocument({
        title,
        category,
        signing_mode: "hybrid",
        patient_id: currentPatient.id,
        patient_name: currentPatient.name,
        patient_cpf: currentPatient.cpf,
        patient_email: currentPatient.email || undefined,
        patient_phone: currentPatient.phone || undefined,
        original_pdf_base64: pdfBase64,
        signers: [
          {
            id: doctorSignerId,
            role: "DRA_ANA",
            fullName: "Dra. Ana Carla Morong",
            cpf: "00000000000",
            email: "ana@morong.med.br",
            colorHex: "#047857",
          },
          {
            id: patientSignerId,
            role: "PACIENTE",
            fullName: currentPatient.name,
            cpf: currentPatient.cpf,
            email: currentPatient.email || undefined,
            phoneWhatsapp: currentPatient.phone || undefined,
            colorHex: "#2563EB",
          },
        ],
        fields: [
          {
            id: crypto.randomUUID(),
            signer_id: doctorSignerId,
            field_type: "signature",
            page: 1,
            x_percent: 60,
            y_percent: 85,
            width_percent: 30,
            height_percent: 8,
          },
          {
            id: crypto.randomUUID(),
            signer_id: patientSignerId,
            field_type: "signature",
            page: 1,
            x_percent: 10,
            y_percent: 85,
            width_percent: 30,
            height_percent: 8,
          },
        ],
      });

      alert(`Documento "${title}" gerado e anexado ao prontuário com sucesso!`);
      setActiveTab("list");
      loadDocuments();
    } catch (err: any) {
      console.error("Erro ao emitir documento:", err);
      alert(`Falha ao emitir documento: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[var(--color-gray-200)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-green-soft)] flex items-center justify-center text-[var(--color-green-deep)]">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-gray-900)]">
                Documentos Clínicos & Contratos
              </h2>
              <p className="text-xs text-[var(--color-gray-500)]">
                {currentPatient.name ? (
                  <>
                    Prontuário de: <strong className="text-[var(--color-green-deep)]">{currentPatient.name}</strong>
                    {currentPatient.cpf && ` • CPF: ${currentPatient.cpf}`}
                  </>
                ) : (
                  "Emissão de documentos vinculados ao prontuário"
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)] rounded-lg hover:bg-[var(--color-gray-200)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seleção de Paciente caso não tenha vindo pré-definido */}
        {!initialPatientId && (
          <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200/60 flex items-center gap-3">
            <span className="text-xs font-semibold text-amber-900">Selecione o Paciente:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="text-xs rounded-lg border border-amber-300 bg-white px-3 py-1.5 focus:ring-2 focus:ring-[var(--color-green-deep)] flex-1 max-w-md"
            >
              <option value="">-- Escolha um paciente do sistema --</option>
              {allPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.document || "Sem CPF"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs de Navegação */}
        <div className="flex border-b border-[var(--color-gray-200)] px-6 bg-white">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "list"
                ? "border-[var(--color-green-deep)] text-[var(--color-green-deep)]"
                : "border-transparent text-[var(--color-gray-500)] hover:text-[var(--color-gray-800)]"
            }`}
          >
            <FileText size={16} />
            Documentos do Prontuário
            {documents.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-green-soft)] text-[var(--color-green-deep)]">
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "create"
                ? "border-[var(--color-green-deep)] text-[var(--color-green-deep)]"
                : "border-transparent text-[var(--color-gray-500)] hover:text-[var(--color-gray-800)]"
            }`}
          >
            <Plus size={16} />
            Emitir Novo Documento
          </button>
        </div>

        {/* Conteúdo da Modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-gray-50)]/40">
          {activeTab === "list" ? (
            <div className="space-y-4">
              {/* Barra de Filtro */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={16} className="absolute left-3 top-2.5 text-[var(--color-gray-400)]" />
                  <input
                    type="text"
                    placeholder="Buscar por título ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--color-gray-300)] bg-white focus:ring-1 focus:ring-[var(--color-green-deep)]"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab("create")}
                  className="gap-1.5"
                >
                  <Plus size={14} />
                  Novo Documento
                </Button>
              </div>

              {/* Lista */}
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin w-8 h-8 rounded-full border-2 border-[var(--color-green-deep)] border-t-transparent" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-gray-300)] bg-white">
                  <FileText size={40} className="mx-auto text-[var(--color-gray-300)] mb-3" />
                  <h3 className="text-sm font-semibold text-[var(--color-gray-700)]">
                    Nenhum documento encontrado neste prontuário
                  </h3>
                  <p className="text-xs text-[var(--color-gray-500)] mt-1 max-w-md mx-auto">
                    Você pode gerar contratos, termos de consentimento (TCLE), atestados, receitas e recibos timbrados.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab("create")}
                    className="mt-4 gap-1.5"
                  >
                    <Plus size={14} />
                    Criar Primeiro Documento
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredDocuments.map((doc) => {
                    const isCompleted = doc.status === "completed";
                    const isPending = doc.status === "pending" || doc.status === "partially_signed";
                    const patientSigner = doc.signers.find((s) => s.role === "PACIENTE");

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-[var(--color-gray-200)] bg-white shadow-sm hover:border-[var(--color-green-soft)] transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 p-2 rounded-lg ${isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {isCompleted ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[var(--color-gray-900)] truncate">
                                {doc.title}
                              </h4>
                              <Badge variant={isCompleted ? "emerald" : "amber"} size="sm">
                                {isCompleted ? "Assinado" : "Pendente"}
                              </Badge>
                              <Badge variant="neutral" size="sm">
                                {doc.category || "DOCUMENTO"}
                              </Badge>
                            </div>

                            <p className="text-xs text-[var(--color-gray-500)] mt-0.5">
                              Código: <span className="font-mono text-[var(--color-gray-700)]">{doc.verification_code}</span>
                              {" • "}Criado em: {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>

                            {patientSigner && isPending && patientSigner.remote_access_token && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] text-[var(--color-gray-500)] font-medium">Link do Paciente:</span>
                                <button
                                  onClick={() => patientSigner.remote_access_token && handleCopyLink(patientSigner.remote_access_token)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                                  title="Copiar link para enviar ao paciente"
                                >
                                  {copiedToken === patientSigner.remote_access_token ? (
                                    <>
                                      <Check size={12} className="text-emerald-600" />
                                      <span className="text-emerald-700">Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copiar Link de Assinatura</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handlePreviewPdf(doc)}
                            className="p-2 text-[var(--color-gray-600)] hover:text-[var(--color-green-deep)] rounded-lg hover:bg-[var(--color-gray-100)] transition-colors"
                            title="Visualizar PDF"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(doc)}
                            className="p-2 text-[var(--color-gray-600)] hover:text-[var(--color-green-deep)] rounded-lg hover:bg-[var(--color-gray-100)] transition-colors"
                            title="Baixar PDF"
                          >
                            <Download size={17} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB: CRIAR NOVO DOCUMENTO */
            <div className="space-y-6">
              {/* Seleção do Tipo de Documento */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-gray-700)] mb-2 uppercase tracking-wide">
                  1. Escolha o Tipo de Documento
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {[
                    { id: "TCLE", label: "Termo TCLE", icon: ShieldCheck, desc: "Consentimento informado" },
                    { id: "ATESTADO", label: "Atestado", icon: FileCheck, desc: "Repouso ou comparecimento" },
                    { id: "RECEITUARIO", label: "Prescrição", icon: Pill, desc: "Receita médica timbrada" },
                    { id: "RECIBO", label: "Recibo", icon: DollarSign, desc: "Comprovante de pagamento" },
                    { id: "CONTRATO", label: "Contrato 360", icon: FileText, desc: "Contrato Saúde 360" },
                  ].map((t) => {
                    const isSelected = docType === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDocType(t.id as ClinicalDocumentType)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-[var(--color-green-deep)] bg-[var(--color-green-soft)]/20 shadow-sm"
                            : "border-[var(--color-gray-200)] bg-white hover:border-[var(--color-gray-300)]"
                        }`}
                      >
                        <Icon size={20} className={isSelected ? "text-[var(--color-green-deep)]" : "text-[var(--color-gray-500)]"} />
                        <div className="mt-2 font-bold text-xs text-[var(--color-gray-900)]">{t.label}</div>
                        <div className="text-[10px] text-[var(--color-gray-500)] truncate">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulário Específico por Tipo */}
              <div className="p-5 bg-white rounded-xl border border-[var(--color-gray-200)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-gray-100)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--color-gray-900)]">
                    2. Dados do Documento: <span className="text-[var(--color-green-deep)]">{docType}</span>
                  </h3>
                  <Badge variant="neutral" size="sm">Papel Timbrado Oficial Dra. Ana Morong</Badge>
                </div>

                {docType === "CONTRATO" ? (
                  <div className="py-6 text-center space-y-3">
                    <FileText size={44} className="mx-auto text-[var(--color-green-deep)]" />
                    <h4 className="text-sm font-bold text-[var(--color-gray-800)]">
                      Contrato de Prestação de Serviços (Programa Saúde 360®)
                    </h4>
                    <p className="text-xs text-[var(--color-gray-600)] max-w-md mx-auto">
                      O sistema possui o gerador completo de contratos dos programas da Dra. Ana (Restart 3M, Evolution 6M, Signature 12M e Personalizado) com suporte a DOCX, PDF e carimbo de assinatura.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (onOpenContractPreparation) {
                          onClose();
                          onOpenContractPreparation();
                        } else {
                          alert("Acesse a aba 'Documentos e Contratos' no prontuário do paciente.");
                        }
                      }}
                      className="gap-2"
                    >
                      <Plus size={16} />
                      Abrir Preparador do Contrato Saúde 360
                    </Button>
                  </div>
                ) : docType === "TCLE" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Nome do Procedimento / Tratamento
                      </label>
                      <Input
                        value={tcleData.procedureName}
                        onChange={(e) => setTcleData({ ...tcleData, procedureName: e.target.value })}
                        placeholder="Ex: Toxina Botulínica, Preenchimento Facial, Soroterapia"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Descrição e Objetivos do Procedimento
                      </label>
                      <Textarea
                        rows={3}
                        value={tcleData.description}
                        onChange={(e) => setTcleData({ ...tcleData, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Riscos Potenciais e Orientações Pós-Procedimento
                      </label>
                      <Textarea
                        rows={3}
                        value={tcleData.risksAndGuidelines}
                        onChange={(e) => setTcleData({ ...tcleData, risksAndGuidelines: e.target.value })}
                      />
                    </div>
                  </div>
                ) : docType === "ATESTADO" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                          Finalidade do Atestado
                        </label>
                        <select
                          value={atestadoData.type}
                          onChange={(e) => setAtestadoData({ ...atestadoData, type: e.target.value as any })}
                          className="w-full text-xs rounded-lg border border-[var(--color-gray-300)] p-2 bg-white"
                        >
                          <option value="comparecimento">Atestado de Comparecimento</option>
                          <option value="repouso">Atestado de Repouso / Afastamento</option>
                          <option value="aptidao">Atestado de Aptidão Clínica</option>
                        </select>
                      </div>

                      {atestadoData.type === "repouso" ? (
                        <div>
                          <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                            Número de Dias de Repouso
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            value={atestadoData.daysCount || 1}
                            onChange={(e) => setAtestadoData({ ...atestadoData, daysCount: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                            Período / Horário de Comparecimento
                          </label>
                          <Input
                            value={atestadoData.periodText || ""}
                            onChange={(e) => setAtestadoData({ ...atestadoData, periodText: e.target.value })}
                            placeholder="Ex: das 14:00 às 16:30"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        CID / Justificativa Diagnóstica (Opcional - com anuência do paciente)
                      </label>
                      <Input
                        value={atestadoData.reasonOrCid || ""}
                        onChange={(e) => setAtestadoData({ ...atestadoData, reasonOrCid: e.target.value })}
                        placeholder="Ex: Z00.0 ou motivo clínico"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Instruções ou Observações Adicionais
                      </label>
                      <Input
                        value={atestadoData.instructions || ""}
                        onChange={(e) => setAtestadoData({ ...atestadoData, instructions: e.target.value })}
                      />
                    </div>
                  </div>
                ) : docType === "RECEITUARIO" ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[var(--color-gray-700)]">
                      Medicamentos e Itens Prescritos
                    </label>

                    {receitaItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[var(--color-gray-50)] rounded-lg border border-[var(--color-gray-200)] space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-green-deep)]">Item #{idx + 1}</span>
                          {receitaItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setReceitaItems(receitaItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remover item"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Nome do Medicamento / Suplemento"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...receitaItems];
                              updated[idx].name = e.target.value;
                              setReceitaItems(updated);
                            }}
                          />
                          <Input
                            placeholder="Dosagem / Concentração (Ex: 500mg, 1 ampola)"
                            value={item.dosage}
                            onChange={(e) => {
                              const updated = [...receitaItems];
                              updated[idx].dosage = e.target.value;
                              setReceitaItems(updated);
                            }}
                          />
                        </div>

                        <Input
                          placeholder="Posologia e Instruções de uso (Ex: Tomar 1 cápsula via oral após o café da manhã)"
                          value={item.instructions}
                          onChange={(e) => {
                            const updated = [...receitaItems];
                            updated[idx].instructions = e.target.value;
                            setReceitaItems(updated);
                          }}
                        />
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setReceitaItems([...receitaItems, { name: "", dosage: "", instructions: "" }])}
                      className="gap-1.5"
                    >
                      <Plus size={14} />
                      Adicionar Outro Medicamento
                    </Button>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Recomendações Gerais ao Paciente
                      </label>
                      <Input
                        value={receitaGeneralInstructions}
                        onChange={(e) => setReceitaGeneralInstructions(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  /* RECIBO */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                          Valor Cobrado (R$)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={reciboData.amountBrl || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setReciboData({
                              ...reciboData,
                              amountBrl: val,
                              amountExtenso: `${val.toFixed(2)} reais`,
                            });
                          }}
                          placeholder="0,00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                          Forma de Pagamento
                        </label>
                        <select
                          value={reciboData.paymentMethod}
                          onChange={(e) => setReciboData({ ...reciboData, paymentMethod: e.target.value })}
                          className="w-full text-xs rounded-lg border border-[var(--color-gray-300)] p-2 bg-white"
                        >
                          <option value="PIX">PIX</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Transferência Bancária">Transferência Bancária</option>
                          <option value="Dinheiro">Dinheiro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Valor por Extenso
                      </label>
                      <Input
                        value={reciboData.amountExtenso}
                        onChange={(e) => setReciboData({ ...reciboData, amountExtenso: e.target.value })}
                        placeholder="Ex: Mil e quinhentos reais"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-gray-700)] mb-1">
                        Discriminação dos Serviços Médicos Prestados
                      </label>
                      <Textarea
                        rows={2}
                        value={reciboData.servicesDescription}
                        onChange={(e) => setReciboData({ ...reciboData, servicesDescription: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ações de Emissão */}
              {docType !== "CONTRATO" && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("list")}
                  >
                    Cancelar
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateDocument}
                    disabled={isSubmitting || !currentPatient.id}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Gerando Documento...
                      </>
                    ) : (
                      <>
                        <FileCheck size={16} />
                        Gerar e Salvar no Prontuário
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Preview do PDF Embutido */}
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
                  <X size={18} />
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
    </div>
  );
};
