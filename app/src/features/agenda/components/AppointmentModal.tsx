import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useCreateAppointment, useUpdateAppointment } from "../hooks/useAppointments";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { patientApplicationsService } from "@/features/patients/services/patientApplications.service";
import { StockValidationPanel } from "./StockValidationPanel";
import type { Appointment, AppointmentFormData } from "../schemas/appointment.schema";
import { Modal, FormField, Input, Select, Textarea, Button } from "@/components/ui";

interface AppointmentModalProps {
  initialDate: Date;
  appointment?: Appointment;
  defaultPatientId?: string;
  defaultApplicationPlanId?: string;
  onClose: () => void;
}

export function AppointmentModal({ initialDate, appointment, defaultPatientId, defaultApplicationPlanId, onClose }: AppointmentModalProps) {
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const isEditing = !!appointment;

  const [form, setForm] = useState<AppointmentFormData>({
    patient_id: defaultPatientId || "",
    type: "application",
    appointment_date: format(initialDate, "yyyy-MM-dd'T'09:00"),
    duration_minutes: 30,
    status: "scheduled",
    notes: "",
    application_plan_id: defaultApplicationPlanId || "",
    new_plan_protocol_id: "",
    new_plan_route_id: "",
  });

  const [applicationMode, setApplicationMode] = useState<"existing" | "new">(defaultApplicationPlanId ? "existing" : "existing");
  const [isStockSufficient, setIsStockSufficient] = useState<boolean>(true);

  const { data: patients = [] } = usePatients("", true);
  const { data: protocols = [] } = useProtocols();

  const selectedPatientId = form.patient_id;
  const { data: patientPlans = [] } = useQuery({
    queryKey: ["patient-application-plans", selectedPatientId],
    queryFn: () => patientApplicationsService.getByPatientId(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  const availablePlans = patientPlans.filter(p => p.status === "planned" || p.id === form.application_plan_id);
  const selectedProtocol = protocols.find(p => p.id === form.new_plan_protocol_id);

  useEffect(() => {
    if (appointment) {
      setForm({
        patient_id: appointment.patient_id,
        type: appointment.type,
        appointment_date: appointment.appointment_date,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        notes: appointment.notes ?? "",
        application_plan_id: appointment.application_plan_id ?? "",
      });
      if (appointment.application_plan_id) {
        setApplicationMode("existing");
      }
    }
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: AppointmentFormData = { ...form };
    if (form.type === "application") {
      if (applicationMode === "existing" && !form.application_plan_id) {
        alert("Por favor, selecione uma aplicação planejada existente.");
        return;
      }
      if (applicationMode === "new") {
        if (!form.new_plan_protocol_id) {
          alert("Por favor, selecione um protocolo para a nova aplicação.");
          return;
        }
        submitData.application_plan_id = ""; // Clear existing selection just in case
      }

      if (!isStockSufficient) {
        if (!window.confirm("Atenção! Não há estoque suficiente para este protocolo. Deseja agendar mesmo assim?")) {
          return;
        }
      }
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: appointment.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onClose();
    } catch (error) {
      alert(String(error));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Editar Agendamento" : "Novo Agendamento Clínico"}
      description={
        isEditing
          ? "Atualize as informações do agendamento ou protocolo vinculado."
          : "Agende consultas, sessões de aplicação de protocolos e retornos."
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isPending} type="button">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="appointment-form"
            variant="primary"
            isLoading={isPending}
            leftIcon={<Save size={16} />}
          >
            {isEditing ? "Salvar Alterações" : "Confirmar Agendamento"}
          </Button>
        </div>
      }
    >
      <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Paciente" required>
            <Select
              value={form.patient_id}
              onChange={e => setForm({ ...form, patient_id: e.target.value })}
              required
            >
              <option value="">Selecione o paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tipo de Agendamento" required>
            <Select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="application">Aplicação de Protocolo</option>
              <option value="consultation">Consulta Médica</option>
              <option value="return">Retorno Clínico</option>
              <option value="other">Outro Procedimento</option>
            </Select>
          </FormField>
        </div>

        {form.type === "application" && form.patient_id && (
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 space-y-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <h3 className="text-sm font-semibold text-emerald-950">Vínculo de Aplicação de Protocolo</h3>
              </div>
              <span className="text-xs text-emerald-700 font-medium">Controle de Estoque & Baixa</span>
            </div>

            <div className="flex items-center gap-2 p-1 bg-white rounded-lg border border-emerald-100 w-fit">
              <button
                type="button"
                onClick={() => setApplicationMode("existing")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  applicationMode === "existing"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                }`}
              >
                Aplicação já planejada
              </button>
              <button
                type="button"
                onClick={() => setApplicationMode("new")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  applicationMode === "new"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                }`}
              >
                Criar nova aplicação
              </button>
            </div>

            {applicationMode === "existing" && (
              <FormField
                label="Aplicação Planejada do Paciente"
                required
                helperText={availablePlans.length > 0 ? "Selecione o plano em aberto para vincular a esta sessão." : undefined}
                error={availablePlans.length === 0 ? "Este paciente não possui aplicações em aberto. Selecione 'Criar nova aplicação' acima." : undefined}
              >
                <Select
                  value={form.application_plan_id || ""}
                  onChange={e => setForm({ ...form, application_plan_id: e.target.value })}
                  required={applicationMode === "existing"}
                >
                  <option value="">Selecione a aplicação...</option>
                  {availablePlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.protocolName} - {plan.routeName}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {applicationMode === "new" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Protocolo Clínico" required>
                  <Select
                    value={form.new_plan_protocol_id || ""}
                    onChange={e => {
                      const protocolId = e.target.value;
                      const protocol = protocols.find(p => p.id === protocolId);
                      setForm({
                        ...form,
                        new_plan_protocol_id: protocolId,
                        new_plan_route_id: protocol?.administrationRouteId || "",
                      });
                    }}
                    required={applicationMode === "new"}
                  >
                    <option value="">Selecione o protocolo...</option>
                    {protocols.filter(p => p.isActive === 1).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Via de Administração (Automática)">
                  <Input
                    type="text"
                    disabled
                    value={selectedProtocol?.administrationRouteId || "Preenchimento automático..."}
                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </FormField>
              </div>
            )}

            <StockValidationPanel
              applicationPlanId={applicationMode === "existing" ? form.application_plan_id : undefined}
              protocolId={applicationMode === "new" ? form.new_plan_protocol_id : undefined}
              excludeAppointmentId={appointment?.id}
              onValidationChange={setIsStockSufficient}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Data e Hora" required>
            <Input
              type="datetime-local"
              value={form.appointment_date}
              onChange={e => setForm({ ...form, appointment_date: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Duração Estimada" required>
            <Select
              value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1 hora e meia</option>
              <option value="120">2 horas</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Status" required>
            <Select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="done">Realizado</option>
              <option value="missed">Faltou</option>
              <option value="canceled">Cancelado</option>
            </Select>
          </FormField>

          <FormField label="Observações Clínicas / Administrativas" optional>
            <Textarea
              rows={2}
              placeholder="Orientações de preparo, notas de recepção..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
