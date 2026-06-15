import { useState, useEffect } from "react";
import { X, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { externalSyncQueueRepository, type ExternalSyncQueueItem } from "../repositories/externalSyncQueue.repository";
import { externalSyncQueueService } from "../services/externalSyncQueue.service";

interface IntegrationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationLogsModal({ isOpen, onClose }: IntegrationLogsModalProps) {
  const [logs, setLogs] = useState<ExternalSyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await externalSyncQueueRepository.getAllLogs();
      setLogs(data);
    } catch (error) {
      console.error("Erro ao carregar logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetry = async (id: string) => {
    await externalSyncQueueService.retryManual(id);
    await loadLogs();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "800px", width: "90%" }}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            Fila de Sincronização Apps Script
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex justify-between items-center bg-gray-50 border-b">
          <p className="text-sm text-gray-600">Histórico de comunicação com a API externa.</p>
          <button onClick={loadLogs} className="btn btn-secondary text-sm" disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>

        <div className="p-4" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum registro encontrado.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-md p-3" style={{ borderColor: "var(--color-gray-200)" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === "synced" && <CheckCircle2 size={16} className="text-green-600" />}
                      {log.status === "failed" && <XCircle size={16} className="text-red-600" />}
                      {(log.status === "pending" || log.status === "processing") && <Clock size={16} className="text-yellow-600" />}
                      <span className="font-bold text-sm text-gray-800">{log.action}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-gray-500 block text-xs">Status</span>
                      <span className="font-medium capitalize">{log.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Tentativas</span>
                      <span>{log.attempts} / 5</span>
                    </div>
                  </div>

                  {log.last_error && (
                    <div className="mt-3 p-2 bg-red-50 text-red-800 text-xs rounded border border-red-100">
                      <strong>Erro:</strong> {log.last_error}
                    </div>
                  )}

                  {log.status === "failed" && log.attempts < 5 && (
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => handleRetry(log.id)} className="btn btn-secondary text-xs py-1">
                        Tentar Novamente Agora
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
