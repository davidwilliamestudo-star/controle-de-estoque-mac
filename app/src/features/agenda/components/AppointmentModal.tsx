import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useCreateAppointment, useUpdateAppointment } from "../hooks/useAppointments";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { patientApplicationsService } from "@/features/patients/services/patientApplications.service";
import { StockValidationPanel } from "./StockValidationPanel";
import type { Appointment, AppointmentFormData } from "../schemas/appointment.schema";

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
    <div className="modal-overlay active">
      <div className="modal-content" style={{ maxWidth: 720, maxHeight: "90vh" }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? "Editar Agendamento" : "Novo Agendamento"}</h2>
          <button className="btn btn-ghost" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="modal-body flex flex-col gap-4 overflow-y-auto">
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Paciente</label>
                <select 
                  className="form-control" 
                  value={form.patient_id} 
                  onChange={e => setForm({ ...form, patient_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Consulta</label>
                <select 
                  className="form-control" 
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as any })}
                >
                  <option value="application">Aplicação</option>
                  <option value="consultation">Consulta</option>
                  <option value="return">Retorno</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            {form.type === "application" && form.patient_id && (
              <div className="card p-3" style={{ background: "var(--bg-secondary)" }}>
                <h3 className="text-sm font-semibold mb-2">Vínculo de Aplicação</h3>
                
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="appMode" 
                      checked={applicationMode === "existing"}
                      onChange={() => setApplicationMode("existing")}
                    />
                    <span className="text-sm font-medium">Usar aplicação já planejada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="appMode" 
                      checked={applicationMode === "new"}
                      onChange={() => setApplicationMode("new")}
                    />
                    <span className="text-sm font-medium">Criar nova aplicação</span>
                  </label>
                </div>

                {applicationMode === "existing" && (
                  <div className="form-group">
                    <select 
                      className="form-control"
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
                    </select>
                    {availablePlans.length === 0 && (
                      <p className="text-xs text-red mt-1">Este paciente não possui aplicações planejadas. Crie uma nova.</p>
                    )}
                  </div>
                )}

                {applicationMode === "new" && (
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label text-xs">Protocolo</label>
                      <select 
                        className="form-control"
                        value={form.new_plan_protocol_id || ""}
                        onChange={e => {
                          const protocolId = e.target.value;
                          const protocol = protocols.find(p => p.id === protocolId);
                          setForm({ 
                            ...form, 
                            new_plan_protocol_id: protocolId,
                            new_plan_route_id: protocol?.administrationRouteId || ""
                          });
                        }}
                        required={applicationMode === "new"}
                      >
                        <option value="">Selecione o protocolo...</option>
                        {protocols.filter(p => p.isActive === 1).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">Via Padrão (automático)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        disabled 
                        value={selectedProtocol?.administrationRouteId || "Via de administração..."} 
                      />
                    </div>
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

            <div className="grid-2 mt-2">
              <div className="form-group">
                <label className="form-label">Data e Hora</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={form.appointment_date}
                  onChange={e => setForm({ ...form, appointment_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duração (minutos)</label>
                <select 
                  className="form-control" 
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1 hora e meia</option>
                  <option value="120">2 horas</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-control" 
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="done">Realizado</option>
                  <option value="missed">Faltou</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  placeholder="Observações administrativas..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

          </div>

          <div className="modal-footer flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              <Save size={16} />
              {isPending ? "Salvando..." : "Salvar Agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
