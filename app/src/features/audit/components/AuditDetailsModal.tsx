import { X } from "lucide-react";
import type { AuditLogItem } from "../repositories/audit.repository";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditDetailsModalProps {
  log: AuditLogItem;
  onClose: () => void;
}

export function AuditDetailsModal({ log, onClose }: AuditDetailsModalProps) {
  const tryFormatJSON = (data: string | null) => {
    if (!data) return "N/A";
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box" style={{ maxWidth: 800 }}>
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <X size={20} />
        </button>
        
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--color-gray-900)" }}>Detalhes do Log</h3>
        
        <div className="grid-2 mb-4">
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-gray-500)" }}>Ação</label>
            <p className="font-semibold">{log.action}</p>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-gray-500)" }}>Data</label>
            <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-gray-500)" }}>Usuário</label>
            <p>{log.user_name || "Sistema"}</p>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-gray-500)" }}>Entidade</label>
            <p>{log.entity_type || "N/A"} {log.entity_id ? `(${log.entity_id.slice(0,8)})` : ""}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium" style={{ color: "var(--color-gray-500)" }}>Descrição</label>
          <p>{log.description || "Sem descrição"}</p>
        </div>

        <div className="grid-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "var(--color-gray-500)" }}>Antes (before_data)</label>
            <pre className="p-4 rounded-lg overflow-auto text-xs" style={{ backgroundColor: "var(--color-gray-50)", border: "1px solid var(--color-gray-200)", maxHeight: "300px" }}>
              {tryFormatJSON(log.before_data)}
            </pre>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "var(--color-gray-500)" }}>Depois (after_data)</label>
            <pre className="p-4 rounded-lg overflow-auto text-xs" style={{ backgroundColor: "var(--color-gray-50)", border: "1px solid var(--color-gray-200)", maxHeight: "300px" }}>
              {tryFormatJSON(log.after_data)}
            </pre>
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
