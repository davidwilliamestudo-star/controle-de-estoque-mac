import { useState, useEffect } from "react";
import { HardDrive, Download, Upload, AlertTriangle, FileText, CheckCircle, RefreshCcw } from "lucide-react";
import { backupService, DatabaseInfo } from "../services/backup.service";

export default function BackupPage() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await backupService.getDatabaseInfo();
      setDbInfo(info);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar informacoes do banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccessMsg(null);
      const dest = await backupService.exportBackup();
      if (dest) {
        setSuccessMsg(`Backup exportado com sucesso para: ${dest}`);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao exportar backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    // Confirm first
    if (!window.confirm("ATENÇÃO: Restaurar um backup ira SOBRESCREVER todos os dados atuais do sistema. Tem certeza que deseja continuar?")) {
      return;
    }

    try {
      setIsRestoring(true);
      setError(null);
      setSuccessMsg(null);
      const success = await backupService.restoreBackup();
      if (success) {
        setRestoreSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao restaurar backup.");
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="text-green-700" size={28} />
            Backup do Sistema
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie a segurança dos dados locais do aplicativo.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-800 text-sm">Erro na operacao</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {successMsg && !restoreSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded flex items-start gap-3">
          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-800 text-sm">Operacao Concluida</h3>
            <p className="text-sm text-green-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Painel Esquerdo: Info do Banco */}
        <div className="card shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
            <FileText size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Status do Banco de Dados</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="splash-loader border-t-green-600" />
            </div>
          ) : dbInfo ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Arquivo</span>
                <p className="text-sm text-gray-800 font-mono bg-gray-50 p-2 rounded mt-1 border border-gray-100 overflow-x-auto">
                  {dbInfo.path}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Tamanho</span>
                  <p className="text-lg font-medium text-gray-900 mt-1">{formatBytes(dbInfo.sizeBytes)}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Ultima Modificacao</span>
                  <p className="text-sm text-gray-800 mt-1">
                    {dbInfo.lastModified 
                      ? dbInfo.lastModified.toLocaleString('pt-BR')
                      : 'Desconhecido'}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 mt-2 border-t border-gray-100">
                <button 
                  onClick={loadInfo} 
                  className="btn btn-ghost text-xs flex items-center gap-1 w-full justify-center"
                >
                  <RefreshCcw size={14} /> Atualizar Info
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nao foi possivel carregar as informacoes do banco.</p>
          )}
        </div>

        {/* Painel Direito: Acoes */}
        <div className="space-y-6">
          <div className="card shadow-sm border border-blue-100 bg-blue-50/30">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <Download size={20} className="text-blue-600" />
              Criar Backup
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Exporta uma copia completa e atualizada de todos os dados do sistema para um local seguro (pendrive, nuvem, etc).
            </p>
            <button 
              className="btn btn-primary w-full justify-center" 
              onClick={handleExport}
              disabled={isExporting || isLoading}
            >
              {isExporting ? "Exportando..." : "Criar Backup Agora"}
            </button>
          </div>

          <div className="card shadow-sm border border-orange-100 bg-orange-50/30">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <Upload size={20} className="text-orange-600" />
              Restaurar Backup
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Substitui os dados atuais do sistema por um arquivo de backup anterior. 
              <strong className="block mt-1 text-orange-800">Cuidado: essa acao e irreversivel.</strong>
            </p>
            <button 
              className="btn btn-secondary w-full justify-center border-orange-200 text-orange-800 hover:bg-orange-100" 
              onClick={handleRestore}
              disabled={isRestoring || isLoading}
            >
              {isRestoring ? "Restaurando..." : "Restaurar de um Arquivo"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Sucesso Obrigando Reinicio */}
      {restoreSuccess && (
        <div className="modal-overlay active bg-black/60 backdrop-blur-sm">
          <div className="modal-content shadow-xl max-w-md text-center p-8">
            <div className="mx-auto bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Backup Restaurado!</h2>
            <p className="text-gray-600 mb-6">
              O banco de dados foi substituido com sucesso. Para que o sistema carregue as novas informacoes sem falhas, <strong>voce deve fechar e abrir o aplicativo novamente agora.</strong>
            </p>
            <button 
              className="btn btn-primary w-full justify-center text-lg py-3"
              onClick={() => {
                // Not ideal, but best we can do if we don't have tauri process.exit bound.
                // In a browser context reload works, but here we explicitly ask the user.
                window.location.reload(); 
              }}
            >
              Recarregar Tela Inicial
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Se encontrar problemas de "banco ocupado", feche a janela principal no X.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
