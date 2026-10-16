// src/components/signatures/DoctorCertificateVaultModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Upload,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  Eraser,
  Zap,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface VaultStatusResponse {
  configured: boolean;
  professionalName?: string;
  professionalTaxId?: string;
  crmRegister?: string;
  autoSignEnabled?: boolean;
  autoSignTrigger?: 'ON_PATIENT_SIGNED' | 'ON_DOCUMENT_CREATED';
  certSubjectCn?: string;
  certIssuerCn?: string;
  certSerialHex?: string;
  certThumbprintSha256?: string;
  certNotAfter?: string;
  daysRemaining?: number;
  isExpired?: boolean;
}

interface DoctorCertificateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DoctorCertificateVaultModal: React.FC<
  DoctorCertificateVaultModalProps
> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<VaultStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [pfxBase64, setPfxBase64] = useState<string>('');
  const [pfxFileName, setPfxFileName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [crmRegister, setCrmRegister] = useState<string>('CRM/SC');
  const [autoSignEnabled, setAutoSignEnabled] = useState<boolean>(true);
  const [autoSignTrigger, setAutoSignTrigger] = useState<
    'ON_PATIENT_SIGNED' | 'ON_DOCUMENT_CREATED'
  >('ON_PATIENT_SIGNED');

  const rubricCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const loadVaultStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/signatures/vault');
      const data: VaultStatusResponse = await res.json();
      setStatus(data);
      if (data.configured) {
        setCrmRegister(data.crmRegister || 'CRM/SC');
        setAutoSignEnabled(Boolean(data.autoSignEnabled));
        setAutoSignTrigger(data.autoSignTrigger || 'ON_PATIENT_SIGNED');
      }
    } catch {
      setErrorMsg('Não foi possível consultar o status do Cofre ICP-Brasil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVaultStatus();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePfxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPfxFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setPfxBase64(result.split(',')[1] || result);
    };
    reader.readAsDataURL(file);
  };

  const handleStartDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = rubricCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMoveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !rubricCanvasRef.current) return;
    const rect = rubricCanvasRef.current.getBoundingClientRect();
    const ctx = rubricCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
  };

  const clearRubricCanvas = () => {
    const canvas = rubricCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveCertificate = async () => {
    if (!pfxBase64 || !password) {
      setErrorMsg('Envie o arquivo .pfx/.p12 e digite a senha do certificado.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const rubricPng = rubricCanvasRef.current
        ? rubricCanvasRef.current.toDataURL('image/png')
        : undefined;

      const res = await fetch('/api/signatures/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfx_base64: pfxBase64,
          password,
          crm_register: crmRegister,
          auto_sign_enabled: autoSignEnabled,
          auto_sign_trigger: autoSignTrigger,
          default_rubric_png_base64: rubricPng,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Falha ao validar certificado digital.');
      }

      setSuccessMsg('Certificado ICP-Brasil validado e salvo com sucesso no cofre criptográfico!');
      await loadVaultStatus();
      setPassword('');
      setPfxBase64('');
      setPfxFileName('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar certificado no cofre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Cofre de Assinatura Automática ICP-Brasil (PAdES)
              </h2>
              <p className="text-xs text-slate-400">
                Dra. Ana Carla Morong • CNPJ: 54.811.772/0001-32
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            Verificando integridade do Cofre Criptográfico...
          </div>
        ) : (
          <>
            {/* Card de Certificado Ativo */}
            {status?.configured && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Certificado ICP-Brasil Configurado e Criptografado (AES-256-GCM)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                    {status.daysRemaining} dias restantes
                  </span>
                </div>
                <p className="text-white font-semibold">
                  Titular (CN): {status.certSubjectCn}
                </p>
                <p className="text-slate-300">
                  Autoridade Certificadora: {status.certIssuerCn}
                </p>
                <p className="text-slate-400 font-mono text-[11px]">
                  Série: {status.certSerialHex} | Expira em:{' '}
                  {status.certNotAfter ? new Date(status.certNotAfter).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            )}

            {/* Interruptor de Assinatura Automática */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      Assinar Automaticamente pela Dra. Ana Carla Morong
                    </p>
                    <p className="text-xs text-slate-400">
                      Quando o paciente assina o documento, o servidor aplica
                      instantaneamente a chancela visual e a assinatura PAdES da Dra. Ana.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSignEnabled}
                  onChange={(e) => setAutoSignEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Gatilho de Execução Automática
                  </label>
                  <select
                    value={autoSignTrigger}
                    onChange={(e) =>
                      setAutoSignTrigger(
                        e.target.value as 'ON_PATIENT_SIGNED' | 'ON_DOCUMENT_CREATED'
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="ON_PATIENT_SIGNED">
                      Contra-assinar assim que o Paciente assinar
                    </option>
                    <option value="ON_DOCUMENT_CREATED">
                      Assinar imediatamente ao gerar o documento
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Registro no Conselho (Exibido na Chancela)
                  </label>
                  <input
                    type="text"
                    value={crmRegister}
                    onChange={(e) => setCrmRegister(e.target.value)}
                    placeholder="Ex: CRM/SC 12345"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Upload de Arquivo .PFX e Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Arquivo Certificado A1 (.pfx / .p12)
                </label>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handlePfxUpload}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
                {pfxFileName && (
                  <p className="text-[11px] text-emerald-400 truncate">
                    Arquivo: {pfxFileName}
                  </p>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Senha de Desbloqueio do .PFX
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha do certificado A1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Protegida por criptografia autenticada AES-256-GCM.
                </p>
              </div>
            </div>

            {/* Rubrica Caligráfica Padrão da Médica */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-sky-400" />
                  Rubrica / Assinatura Caligráfica Padrão da Dra. Ana (Opcional)
                </label>
                <button
                  type="button"
                  onClick={clearRubricCanvas}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Eraser className="w-3.5 h-3.5" /> Limpar
                </button>
              </div>
              <div className="bg-white rounded-lg overflow-hidden border border-slate-700">
                <canvas
                  ref={rubricCanvasRef}
                  width={540}
                  height={110}
                  onPointerDown={handleStartDraw}
                  onPointerMove={handleMoveDraw}
                  onPointerUp={handleEndDraw}
                  className="w-full h-28 touch-none cursor-crosshair block"
                />
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCertificate}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validando Cadeia ICP-Brasil...
                  </>
                ) : (
                  'Validar e Salvar no Cofre Criptográfico'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
