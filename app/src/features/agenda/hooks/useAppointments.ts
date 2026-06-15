import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentsService } from "../services/appointments.service";
import type { AppointmentFormData } from "../schemas/appointment.schema";

export const APPOINTMENTS_QUERY_KEY = ["appointments"] as const;

export function useAppointmentsByDate(date: string) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, "date", date],
    queryFn: () => appointmentsService.getAppointmentsByDate(date),
    staleTime: 30_000,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppointmentFormData) => appointmentsService.createAppointment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) =>
      appointmentsService.updateAppointment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsService.deleteAppointment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY }),
  });
}
