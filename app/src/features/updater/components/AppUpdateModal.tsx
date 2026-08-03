import { useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles, AlertCircle, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";
import { updaterService } from "../services/updater.service";

/** Evento global: dispara verificação manual (ex.: botão em Backup/Configurações) */
export const UPDATE_CHECK_EVENT = "voltq:check-updates";

export function AppUpdateModal() {
  const [updateObj, setUpdateObj] = useState<Update | null>(null);
  const [version, setVersion] = useState<string>("");
  const [releaseNotes, setReleaseNotes] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function runCheck(options?: { manual?: boolean }) {
    setIsChecking(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const status = await updaterService.checkForUpdates();
      if (status.available && status.updateObj) {
        setUpdateObj(status.updateObj);
        setVersion(status.version || "");
        setReleaseNotes(status.body || "");
        setIsOpen(true);
      } else if (options?.manual) {
        setInfoMsg(
          status.error
            ? `Não foi possível verificar: ${status.error}`
            : "Você já está na versão mais recente.",
        );
        setIsOpen(true);
      }
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    // Verificação automática ~4s após abrir (produção com endpoint configurado)
    const timer = setTimeout(() => {
      void runCheck({ manual: false });
    }, 4000);

    const onManual = () => {
      void runCheck({ manual: true });
    };
    window.addEventListener(UPDATE_CHECK_EVENT, onManual);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(UPDATE_CHECK_EVENT, onManual);
    };
  }, []);

  async function handleStartUpdate() {
    if (!updateObj) return;
    setIsInstalling(true);
    setErrorMsg(null);

    try {
      await updaterService.installUpdate(updateObj, ({ downloaded, contentLength }) => {
        if (contentLength && contentLength > 0) {
          const percent = Math.min(100, Math.round((downloaded / contentLength) * 100));
          setProgressPercent(percent);
        } else {
          setProgressPercent(50);
        }
      });
    } catch (err: any) {
      setIsInstalling(false);
      setErrorMsg("Não foi possível concluir a instalação automática: " + (err?.message || String(err)));
    }
  }

  if (!isOpen && !isChecking) return null;

  const hasUpdate = !!updateObj;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {hasUpdate ? "Nova atualização disponível" : isChecking ? "Verificando atualizações..." : "Atualizações"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasUpdate
                  ? `Versão ${version} pronta para instalação`
                  : "Controle de Estoque — Dra. Ana Morong"}
              </p>
            </div>
          </div>
          {!isInstalling && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setInfoMsg(null);
                setErrorMsg(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isChecking && !hasUpdate && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600">
              <RefreshCw size={18} className="animate-spin text-emerald-600" />
              Consultando servidor de atualizações...
            </div>
          )}

          {releaseNotes && hasUpdate && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 max-h-40 overflow-y-auto">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
                Novidades desta versão:
              </span>
              <p className="whitespace-pre-line leading-relaxed">{releaseNotes}</p>
            </div>
          )}

          {isInstalling ? (
            <div className="py-4 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
                <RefreshCw size={18} className="animate-spin text-emerald-600" />
                <span>Baixando e instalando atualização...</span>
              </div>

              {progressPercent !== null && (
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{progressPercent}%</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400">O aplicativo será reiniciado automaticamente ao concluir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && !hasUpdate && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  {infoMsg}
                </div>
              )}

              {hasUpdate && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Atualize agora para receber correções e melhorias. O banco de dados e os cadastros da
                  doutora são preservados. Recomendamos fazer um backup antes (menu Backup).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isInstalling && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setInfoMsg(null);
                setErrorMsg(null);
              }}
              className="btn btn-secondary text-xs px-4 py-2"
            >
              {hasUpdate ? "Lembrar mais tarde" : "Fechar"}
            </button>
            {hasUpdate && (
              <button
                type="button"
                onClick={handleStartUpdate}
                className="btn btn-primary text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2"
              >
                <Download size={15} /> Atualizar agora
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
