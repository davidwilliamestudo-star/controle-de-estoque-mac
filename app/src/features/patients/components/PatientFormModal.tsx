/**
 * PatientFormModal.tsx — Modal de criação/edição de paciente
 * Design visual amplo, respirável e card-based alinhado à identidade da clínica.
 */
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  AlertTriangle,
  User,
  Phone,
  Mail,
  CalendarDays,
  FileText,
  IdCard,
  UserPlus,
  UserCheck,
  Check,
  Loader2,
  Sparkles,
  Contact,
  ShieldAlert,
} from "lucide-react";
import {
  patientSchema,
  type PatientFormData,
  type Patient,
  type PatientFormInput,
} from "../schemas/patient.schema";
import { useCreatePatient, useUpdatePatient } from "../hooks/usePatients";

interface PatientFormModalProps {
  patient: Patient | null;
  onClose: () => void;
}

/** Máscara CPF: 000.000.000-00 */
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Máscara telefone BR: (00) 00000-0000 ou (00) 0000-0000 */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

const fieldShell =
  "flex items-center gap-3.5 h-12 px-4 rounded-xl border bg-white transition-all " +
  "border-[#E5DEC9] hover:border-[#D4AF37]/70 " +
  "focus-within:border-[#1A5347] focus-within:ring-4 focus-within:ring-[#1A5347]/10 " +
  "focus-within:shadow-xs";

const fieldShellError =
  "flex items-center gap-3.5 h-12 px-4 rounded-xl border bg-white transition-all " +
  "border-red-300 hover:border-red-400 " +
  "focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10";

const inputClass =
  "flex-1 min-w-0 h-full bg-transparent border-0 outline-none text-sm text-[#111827] " +
  "placeholder:text-[#B8A083] font-medium";

const labelClass =
  "block text-xs font-bold uppercase tracking-wider text-[#5C4033] mb-2.5 flex items-center gap-1.5";

export function PatientFormModal({ patient, onClose }: PatientFormModalProps) {
  const isEditing = !!patient;
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormInput, unknown, PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      document: "",
      birth_date: "",
      notes: "",
      alert_notes: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (patient) {
      reset({
        full_name: patient.full_name,
        phone: patient.phone ? formatPhone(patient.phone) : "",
        email: patient.email ?? "",
        document: patient.document ? formatCpf(patient.document) : "",
        birth_date: patient.birth_date ?? "",
        notes: patient.notes ?? "",
        alert_notes: patient.alert_notes ?? "",
        is_active: !!patient.is_active,
      });
    } else {
      reset({
        full_name: "",
        phone: "",
        email: "",
        document: "",
        birth_date: "",
        notes: "",
        alert_notes: "",
        is_active: true,
      });
    }
  }, [patient, reset]);

  async function onSubmit(data: PatientFormData) {
    try {
      if (isEditing && patient) {
        await updatePatient.mutateAsync({ id: patient.id, data });
      } else {
        await createPatient.mutateAsync(data);
      }
      onClose();
    } catch (err) {
      console.error("Erro ao salvar paciente:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-form-title"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl border border-[#E8E0D2] shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden transition-all transform duration-200"
      >
        {/* ── Header Espaçoso ──────────────────────────────── */}
        <div
          className="relative px-8 py-7 shrink-0 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #F7F4EE 0%, #FFFFFF 60%, #F0EBE0 100%)",
            borderBottom: "1px solid #E8E0D2",
          }}
        >
          {/* decoração de brilho sutil */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-35"
            style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
          />

          <div className="relative flex items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
                style={{
                  backgroundColor: "#1A5347",
                  borderColor: "#164539",
                  color: "#F7F4EE",
                }}
              >
                {isEditing ? <UserCheck size={24} strokeWidth={2} /> : <UserPlus size={24} strokeWidth={2} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h2
                    id="patient-form-title"
                    className="text-2xl font-bold tracking-tight truncate text-[#111827]"
                  >
                    {isEditing ? "Editar Paciente" : "Novo Paciente"}
                  </h2>
                  {!isEditing && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full"
                      style={{ backgroundColor: "#1A5347", color: "#F7F4EE" }}
                    >
                      <Sparkles size={11} /> Cadastro Clínico
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-[#5C4033]">
                  {isEditing
                    ? "Atualize as informações cadastrais e clínicas do paciente."
                    : "Preencha as informações necessárias para cadastrar o paciente no sistema."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all border text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E5DEC9",
              }}
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Formulário Arejado & Card-Based ─────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 space-y-7 flex-1 min-h-0 overflow-y-auto custom-scrollbar">

            {/* CARD 1: Dados de Identificação */}
            <div className="bg-[#FAF8F4] p-6 rounded-2xl border border-[#E8E0D2]/80 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8E0D2]">
                <User size={18} className="text-[#1A5347]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">Dados de Identificação</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Nome Completo (span 2) */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    <span>Nome completo</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className={errors.full_name ? fieldShellError : fieldShell}>
                    <User size={18} className="shrink-0 text-[#B8A083]" />
                    <input
                      {...register("full_name")}
                      placeholder="Ex: Maria Aparecida da Silva"
                      className={inputClass}
                      autoFocus={!isEditing}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-xs mt-2 text-red-500 font-medium">{errors.full_name.message}</p>
                  )}
                </div>

                {/* CPF / Documento */}
                <div>
                  <label className={labelClass}>
                    <IdCard size={15} className="text-[#B8A083]" />
                    <span>CPF / Documento</span>
                  </label>
                  <div className={errors.document ? fieldShellError : fieldShell}>
                    <IdCard size={18} className="shrink-0 text-[#B8A083]" />
                    <Controller
                      name="document"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(formatCpf(e.target.value))}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          autoComplete="off"
                          className={inputClass}
                        />
                      )}
                    />
                  </div>
                  {errors.document && (
                    <p className="text-xs mt-2 text-red-500 font-medium">{errors.document.message}</p>
                  )}
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className={labelClass}>
                    <CalendarDays size={15} className="text-[#B8A083]" />
                    <span>Data de nascimento</span>
                  </label>
                  <div className={fieldShell}>
                    <CalendarDays size={18} className="shrink-0 text-[#B8A083]" />
                    <input
                      {...register("birth_date")}
                      type="date"
                      className={`${inputClass} [color-scheme:light]`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Canais de Contato */}
            <div className="bg-[#FAF8F4] p-6 rounded-2xl border border-[#E8E0D2]/80 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8E0D2]">
                <Contact size={18} className="text-[#1A5347]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">Canais de Contato</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Telefone */}
                <div>
                  <label className={labelClass}>
                    <Phone size={15} className="text-[#B8A083]" />
                    <span>Telefone / WhatsApp</span>
                  </label>
                  <div className={fieldShell}>
                    <Phone size={18} className="shrink-0 text-[#B8A083]" />
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          inputMode="tel"
                          className={inputClass}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label className={labelClass}>
                    <Mail size={15} className="text-[#B8A083]" />
                    <span>E-mail</span>
                  </label>
                  <div className={errors.email ? fieldShellError : fieldShell}>
                    <Mail size={18} className="shrink-0 text-[#B8A083]" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="paciente@exemplo.com"
                      className={inputClass}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs mt-2 text-red-500 font-medium">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 3: Observações & Alertas Clínicos */}
            <div className="bg-[#FAF8F4] p-6 rounded-2xl border border-[#E8E0D2]/80 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8E0D2]">
                <FileText size={18} className="text-[#1A5347]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">Prontuário & Observações</h3>
              </div>

              {/* Observações Gerais */}
              <div>
                <label className={labelClass}>
                  <FileText size={15} className="text-[#B8A083]" />
                  <span>Observações clínicas</span>
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Preferências do paciente, histórico relevante, observações gerais de atendimento..."
                  className="w-full min-h-[105px] p-4 rounded-xl border text-sm font-medium resize-y outline-none transition-all placeholder:text-[#B8A083] border-[#E5DEC9] text-[#111827] bg-white focus:border-[#1A5347] focus:ring-4 focus:ring-[#1A5347]/10"
                />
              </div>

              {/* Observações de Alerta / Alergias */}
              <div className="rounded-2xl p-5 border border-amber-300/80 bg-amber-50/90 shadow-xs space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                  <ShieldAlert size={17} className="text-amber-600 shrink-0" />
                  <span>Observações de alerta / Alergias</span>
                </label>
                <textarea
                  {...register("alert_notes")}
                  rows={3}
                  placeholder="Alergias a medicamentos, contraindicações importantes, restrições clínicas..."
                  className="w-full min-h-[105px] p-4 rounded-xl border text-sm font-medium resize-y outline-none transition-all border-amber-300 text-amber-950 bg-white placeholder:text-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20"
                />
                <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5 pt-1">
                  <AlertTriangle size={13} className="text-amber-600" />
                  Alertas cadastrados ficam em evidência nos prontuários de aplicação da clínica.
                </p>
              </div>
            </div>

          </div>

          {/* ── Footer Espaçoso ─────────────────────────────── */}
          <div
            className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-4 px-8 py-6 shrink-0"
            style={{
              borderTop: "1px solid #E8E0D2",
              background: "linear-gradient(180deg, #FAF8F4 0%, #F7F4EE 100%)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="h-13 sm:min-w-[140px] px-7 text-sm font-semibold rounded-xl border transition-all active:scale-[0.98] text-[#4A3328] bg-white border-[#D7CBB5] hover:bg-[#F7F4EE] shadow-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-13 sm:min-w-[230px] px-9 text-sm font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white bg-[#1A5347] hover:bg-[#236a5b] shadow-lg shadow-[#1A5347]/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check size={19} strokeWidth={2.5} />
                  <span>{isEditing ? "Salvar Alterações" : "Cadastrar Paciente"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

