import { CalendarDays, CalendarPlus, FileText, PackagePlus, Tags, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function DashboardQuickActions() {
  return (
    <div className="card dashboard-panel">
      <div className="card-header">
        <div>
          <h3 className="card-title">Acoes rapidas</h3>
          <p className="card-description">Os 3 fluxos principais + atalhos uteis.</p>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <Link to="/inventory/entry" className="dashboard-action-tile">
          <PackagePlus size={18} />
          <span>Entrada de estoque</span>
        </Link>
        <Link to="/procedures/new" search={{ patientId: undefined, procedureId: undefined }} className="dashboard-action-tile">
          <CalendarPlus size={18} />
          <span>Nova aplicacao</span>
        </Link>
        <Link to="/resumo-mes" className="dashboard-action-tile">
          <CalendarDays size={18} />
          <span>Resumo do mes</span>
        </Link>
        <Link to="/patients" className="dashboard-action-tile">
          <UserPlus size={18} />
          <span>Pacientes</span>
        </Link>
        <Link to="/labels" search={{ jobId: undefined }} className="dashboard-action-tile">
          <Tags size={18} />
          <span>Etiquetas</span>
        </Link>
        <Link to="/reports" className="dashboard-action-tile">
          <FileText size={18} />
          <span>Relatorios</span>
        </Link>
      </div>
    </div>
  );
}
