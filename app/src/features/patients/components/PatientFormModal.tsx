/**
 * PatientFormModal.tsx — Modal de criação/edição de paciente
 * Padronizado com o Design System Oficial da Clínica Dra. Ana Morong.
 */
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import {
  Modal,
  FormField,
  Input,
  Textarea,
  Button,
} from "@/components/ui";

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

export function PatientFormModal({ patient, onClose }: PatientFormModalProps) {
  const isEditing = !!patient;
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
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

  const isSaving = isSubmitting || createPatient.isPending || updatePatient.isPending;

  async function onSubmit(data: PatientFormData) {
    setErrorMessage(null);
    try {
      if (isEditing && patient) {
        await updatePatient.mutateAsync({ id: patient.id, data });
      } else {
        await createPatient.mutateAsync(data);
      }
      onClose();
    } catch (err) {
      console.error("Erro ao salvar paciente:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar paciente. Tente novamente.";
      setErrorMessage(msg);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="2xl"
      icon={isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
      title={isEditing ? "Editar Paciente" : "Novo Paciente"}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="patient-form"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
          >
            {isEditing ? "Salvar Alterações" : "Cadastrar Paciente"}
          </Button>
        </div>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50/90 text-rose-800 shadow-2xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-0.5">
                Falha ao salvar
              </p>
              <p className="text-xs leading-relaxed text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* SEÇÃO 1: Dados de Identificação */}
        <section className="form-section-card">
          <div className="form-section-header">
            <span className="form-section-title">
              <User className="w-4 h-4 text-emerald-700" />
              Dados de Identificação
            </span>
          </div>

          <div className="space-y-4">
            {/* Nome Completo */}
            <FormField
              label="Nome Completo"
              required
              error={errors.full_name?.message}
            >
              <Input
                {...register("full_name")}
                leftIcon={<User className="w-4 h-4" />}
                placeholder="Ex: Maria Aparecida da Silva"
                hasError={Boolean(errors.full_name)}
                autoFocus={!isEditing}
              />
            </FormField>

            <div className="form-grid-2">
              {/* CPF / Documento */}
              <FormField
                label="CPF / Documento"
                error={errors.document?.message}
              >
                <Controller
                  name="document"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(formatCpf(e.target.value))}
                      leftIcon={<IdCard className="w-4 h-4" />}
                      placeholder="000.000.000-00"
                      mono
                      hasError={Boolean(errors.document)}
                    />
                  )}
                />
              </FormField>

              {/* Data de Nascimento */}
              <FormField
                label="Data de Nascimento"
                error={errors.birth_date?.message}
              >
                <Input
                  {...register("birth_date")}
                  type="date"
                  leftIcon={<CalendarDays className="w-4 h-4" />}
                  hasError={Boolean(errors.birth_date)}
                />
              </FormField>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: Canais de Contato */}
        <section className="form-section-card">
          <div className="form-section-header">
            <span className="form-section-title">
              <Contact className="w-4 h-4 text-emerald-700" />
              Canais de Contato
            </span>
          </div>

          <div className="form-grid-2">
            {/* Telefone */}
            <FormField
              label="Telefone / WhatsApp"
              error={errors.phone?.message}
            >
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    leftIcon={<Phone className="w-4 h-4" />}
                    placeholder="(11) 99999-9999"
                    hasError={Boolean(errors.phone)}
                  />
                )}
              />
            </FormField>

            {/* E-mail */}
            <FormField
              label="E-mail"
              error={errors.email?.message}
            >
              <Input
                {...register("email")}
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="paciente@exemplo.com"
                hasError={Boolean(errors.email)}
              />
            </FormField>
          </div>
        </section>

        {/* SEÇÃO 3: Prontuário & Observações Clínicas */}
        <section className="form-section-card">
          <div className="form-section-header">
            <span className="form-section-title">
              <FileText className="w-4 h-4 text-emerald-700" />
              Prontuário & Observações
            </span>
          </div>

          <div className="space-y-4">
            {/* Observações Gerais */}
            <FormField label="Observações Clínicas Gerais">
              <Textarea
                {...register("notes")}
                rows={3}
                placeholder="Observações do histórico do paciente..."
              />
            </FormField>

            {/* Observações de Alerta / Alergias */}
            <div className="rounded-2xl p-4.5 border border-amber-300/80 bg-amber-50/80 shadow-2xs space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Observações de Alerta / Alergias</span>
              </label>
              <Textarea
                {...register("alert_notes")}
                rows={2}
                placeholder="Alergias a medicamentos, contraindicações importantes, restrições clínicas..."
                className="bg-white border-amber-300 text-amber-950 focus-within:border-amber-600 focus-within:ring-amber-600/15"
              />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}
