import { Calendar } from "lucide-react";
import { UnderConstructionPage } from "@/components/common/UnderConstructionPage";

export default function AppointmentsPage() {
  return (
    <UnderConstructionPage
      title="Agenda"
      subtitle="Organizacao local dos atendimentos"
      description="Este modulo vai reunir agendamentos locais, status de atendimento e futura sincronizacao opcional com Google Calendar."
      icon={<Calendar />}
    />
  );
}
