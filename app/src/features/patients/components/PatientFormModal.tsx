/**
 * PatientFormModal.tsx — Modal de criação/edição de paciente
 * React Hook Form + Zod
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, AlertTriangle, User, Phone, Mail, CalendarDays, FileText } from "lucide-react";
import { patientSchema, type PatientFormData, type Patient, type PatientFormInput } from "../schemas/patient.schema";
import { useCreatePatient, useUpdatePatient } from "../hooks/usePatients";

interface PatientFormModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export function PatientFormModal({ patient, onClose }: PatientFormModalProps) {
  const isEditing = !!patient;
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormInput, unknown, PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
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
        phone: patient.phone ?? "",
        email: patient.email ?? "",
        birth_date: patient.birth_date ?? "",
        notes: patient.notes ?? "",
        alert_notes: patient.alert_notes ?? "",
        is_active: !!patient.is_active,
      });
    }
  }, [patient, reset]);

  async function onSubmit(data: PatientFormData) {
    if (isEditing) {
      await updatePatient.mutateAsync({ id: patient.id, data });
    } else {
      await createPatient.mutateAsync(data);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-48px)]"
        style={{ backgroundColor: "var(--color-pure-white)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-gray-100)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--color-gray-900)" }}>
            {isEditing ? "Editar Paciente" : "Novo Paciente"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-gray-100)]"
            style={{ color: "var(--color-gray-400)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-2 flex-1 min-h-0 overflow-y-auto">

            {/* Nome */}
            <div className="form-group">
              <label className="form-label">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  {...register("full_name")}
                  placeholder="Nome completo do paciente"
                  className={`form-control ${errors.full_name ? "border-red-500" : ""}`}
                />
              </div>
              {errors.full_name && (
                <p className="text-xs mt-1 text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    {...register("phone")}
                    placeholder="(11) 99999-9999"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="email@exemplo.com"
                    className={`form-control ${errors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs mt-1 text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Data de nascimento */}
            <div className="form-group">
              <label className="form-label">Data de nascimento</label>
              <div className="input-with-icon">
                <CalendarDays size={18} />
                <input
                  {...register("birth_date")}
                  type="date"
                  className="form-control"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="form-group">
              <label className="form-label">
                <FileText size={16} />
                Observações
              </label>
              <textarea
                {...register("notes")}
                placeholder="Informações relevantes sobre o paciente..."
                className="form-control"
              />
            </div>

            {/* Alerta */}
            <div className="form-group mb-0">
              <label className="form-label text-amber-600">
                <AlertTriangle size={16} />
                Observações de alerta
              </label>
              <textarea
                {...register("alert_notes")}
                placeholder="Alergias, contraindicações, alertas importantes..."
                className="form-control bg-amber-50 border-amber-200 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex justify-end gap-3 px-6 py-4"
            style={{ borderTop: "1px solid var(--color-gray-100)", backgroundColor: "var(--color-gray-50)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg transition-colors"
              style={{ border: "1px solid var(--color-gray-200)", color: "var(--color-gray-700)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--color-green-deep)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-green-light)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--color-green-deep)")}
            >
              {isSubmitting
                ? "Salvando..."
                : isEditing ? "Salvar alterações" : "Cadastrar paciente"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
