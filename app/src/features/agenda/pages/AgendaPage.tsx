import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, RefreshCw, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAppointmentsByDate, useUpdateAppointment } from "../hooks/useAppointments";
import { AppointmentModal } from "../components/AppointmentModal";
import { EmptyState } from "@/components/common/EmptyState";
import type { Appointment } from "../schemas/appointment.schema";

const statusMap: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "badge-neutral" },
  confirmed: { label: "Confirmado", className: "badge-primary" },
  done: { label: "Realizado", className: "badge-success" },
  missed: { label: "Faltou", className: "badge-danger" },
  canceled: { label: "Cancelado", className: "badge-warning" },
};

const typeMap: Record<string, string> = {
  application: "Aplicação",
  consultation: "Consulta",
  return: "Retorno",
  other: "Outro",
};

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const { data: appointments = [], isLoading } = useAppointmentsByDate(dateStr);
  const updateMutation = useUpdateAppointment();
  const navigate = useNavigate();

  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleStatusChange = (appointment: Appointment, newStatus: Appointment["status"]) => {
    if (newStatus === "done" && appointment.type === "application") {
      if (appointment.application_plan_id) {
        navigate({ to: `/procedures/execute/${appointment.application_plan_id}` });
        return;
      }
    }
    updateMutation.mutate({ id: appointment.id, data: { status: newStatus } });
  };

  const handleOpenModal = (appointment?: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(undefined);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Gerencie seus compromissos e aplicações diárias.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card mb-6 p-4 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost p-2" onClick={handlePrevDay}>
            <ChevronLeft size={20} />
          </button>
          <div className="text-center min-w-[200px]">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-green-deep)" }}>
              {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <span className="text-sm text-gray-500">{format(currentDate, "yyyy")}</span>
          </div>
          <button className="btn btn-ghost p-2" onClick={handleNextDay}>
            <ChevronRight size={20} />
          </button>
        </div>

        <button className="btn btn-secondary" onClick={handleToday}>
          Hoje
        </button>
      </div>

      {/* Timeline */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando agenda...</div>
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<Calendar />}
            title="Nenhum agendamento"
            description="Você não tem pacientes agendados para este dia."
            action={<button className="btn btn-primary" onClick={() => handleOpenModal()}>Criar agendamento</button>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {appointments.map(appointment => {
              const timeStr = format(new Date(appointment.appointment_date), "HH:mm");
              const status = statusMap[appointment.status];
              return (
                <div 
                  key={appointment.id} 
                  className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  style={{ backgroundColor: appointment.status === "done" ? "#f8fafc" : "#ffffff", opacity: appointment.status === "canceled" ? 0.6 : 1 }}
                >
                  {/* Time column */}
                  <div className="flex flex-col items-center md:items-end justify-start min-w-[80px] pt-1">
                    <span className="text-lg font-bold" style={{ color: "var(--color-green-deep)" }}>{timeStr}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> {appointment.duration_minutes} min</span>
                  </div>

                  {/* Content column */}
                  <div className="flex-1 border-l-2 pl-4" style={{ borderColor: appointment.status === "done" ? "var(--color-green-light)" : "var(--color-green-deep)" }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          {appointment.patient_name}
                        </h3>
                        <p className="text-sm text-gray-500">{typeMap[appointment.type]}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`badge ${status.className}`}>{status.label}</span>
                        {appointment.sync_status === "pending" && (
                          <span className="text-xs text-gray-400 flex items-center gap-1" title="Aguardando sincronização com calendário">
                            <RefreshCw size={10} /> Sync pendente
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <p className="text-sm bg-gray-50 p-3 rounded-lg text-gray-700 mt-2 italic">
                        {appointment.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                      {appointment.status !== "done" && appointment.status !== "canceled" && (
                        <>
                          <button className="btn btn-secondary text-xs py-1" onClick={() => handleStatusChange(appointment, "done")}>
                            {appointment.type === "application" ? "Iniciar Aplicação" : "Marcar Realizado"}
                          </button>
                          <button className="btn btn-secondary text-xs py-1" onClick={() => handleStatusChange(appointment, "confirmed")}>
                            Confirmar
                          </button>
                          <button className="btn btn-ghost text-xs py-1 text-red-500" onClick={() => handleStatusChange(appointment, "canceled")}>
                            Cancelar
                          </button>
                        </>
                      )}
                      <button className="btn btn-ghost text-xs py-1 ml-auto" onClick={() => handleOpenModal(appointment)}>
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <AppointmentModal
          initialDate={currentDate}
          appointment={selectedAppointment}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
