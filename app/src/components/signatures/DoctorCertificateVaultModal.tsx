// src/components/signatures/DoctorCertificateVaultModal.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Lock,
  RefreshCw,
  FileCheck,
  Calendar,
  Building,
} from 'lucide-react';
import {
  Modal,
  FormField,
  Input,
  Select,
  Button,
  Badge,
  SignaturePad,
} from '@/components/ui';

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
  const [rubricDataUrl, setRubricDataUrl] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      localStorage.getItem('dra_ana_auth_token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadVaultStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/signatures/vault', {
        headers: getAuthHeaders(),
      });
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

  const handleSaveCertificate = async () => {
    if (!pfxBase64 || !password) {
      setErrorMsg('Envie o arquivo .pfx/.p12 e digite a senha do certificado.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/signatures/vault', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pfx_base64: pfxBase64,
          password,
          crm_register: crmRegister,
          auto_sign_enabled: autoSignEnabled,
          auto_sign_trigger: autoSignTrigger,
          default_rubric_png_base64: rubricDataUrl || undefined,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      icon={<ShieldCheck className="w-5 h-5" />}
      title="Cofre de Assinatura Automática ICP-Brasil (PAdES)"
      subtitle="Dra. Ana Carla Morong • CNPJ: 54.811.772/0001-32 • Certificação Digital Inviolável"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            isLoading={saving}
            onClick={handleSaveCertificate}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            {saving ? 'Validando Cadeia ICP-Brasil...' : 'Validar e Salvar no Cofre'}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="font-semibold text-slate-700">
            Consultando integridade do Cofre Criptográfico...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* MENSAGENS DE SUCESSO / ERRO */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* STATUS ATUAL DO CERTIFICADO */}
          {status?.configured ? (
            <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Certificado ICP-Brasil Ativo & Criptografado (AES-256-GCM)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Titular: <strong>{status.certSubjectCn}</strong>
                    </span>
                  </div>
                </div>

                <Badge
                  variant={status.isExpired ? 'rose' : (status.daysRemaining ?? 0) < 30 ? 'amber' : 'emerald'}
                  size="md"
                  dot
                >
                  {status.daysRemaining} dias restantes
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Autoridade Certificadora
                  </span>
                  <span className="font-medium text-slate-800">{status.certIssuerCn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Validade Até
                  </span>
                  <span className="font-medium text-slate-800">
                    {status.certNotAfter
                      ? new Date(status.certNotAfter).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950">Nenhum certificado ICP-Brasil ativo</h4>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Faça o upload do seu certificado digital modelo A1 (.pfx/.p12) abaixo para habilitar assinaturas PAdES automáticas com validade jurídica perante o CFM e MP 2.200-2/2001.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: Configuração da Assinatura Automática */}
            <section className="form-section-card space-y-4">
              <div className="form-section-header">
                <span className="form-section-title">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  Regras de Automação
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSignEnabled}
                    onChange={(e) => setAutoSignEnabled(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Assinar Automaticamente pela Dra. Ana Carla Morong
                    </span>
                    <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                      Aplica instantaneamente a chancela visual e a assinatura digital PAdES com carimbo do tempo.
                    </span>
                  </div>
                </label>
              </div>

              <FormField
                label="Gatilho de Execução"
                helperText="Momento em que a assinatura da médica é aplicada ao documento."
              >
                <Select
                  value={autoSignTrigger}
                  onChange={(e) =>
                    setAutoSignTrigger(
                      e.target.value as 'ON_PATIENT_SIGNED' | 'ON_DOCUMENT_CREATED'
                    )
                  }
                >
                  <option value="ON_PATIENT_SIGNED">
                    Contra-assinar assim que o Paciente assinar
                  </option>
                  <option value="ON_DOCUMENT_CREATED">
                    Assinar imediatamente ao gerar o contrato
                  </option>
                </Select>
              </FormField>

              <FormField
                label="Registro no Conselho Profissional"
                helperText="Aparecerá estampado na chancela visual do documento."
              >
                <Input
                  value={crmRegister}
                  onChange={(e) => setCrmRegister(e.target.value)}
                  placeholder="Ex: CRM/SC 28412"
                  mono
                />
              </FormField>
            </section>

            {/* CARD 2: Upload de Certificado e Senha */}
            <section className="form-section-card space-y-4">
              <div className="form-section-header">
                <span className="form-section-title">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  Upload do Certificado A1 (.pfx)
                </span>
              </div>

              <FormField
                label="Arquivo Certificado A1"
                required
                helperText="O arquivo é cifrado em repouso no cofre D1 com chave mestra AES-256."
              >
                <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handlePfxUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Upload className="w-6 h-6 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      {pfxFileName ? pfxFileName : 'Clique para selecionar o arquivo .pfx / .p12'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Tamanho máximo suportado: 5MB
                    </span>
                  </div>
                </div>
              </FormField>

              <FormField
                label="Senha de Desbloqueio do Certificado"
                required
                helperText="A senha é verificada pontualmente para carregar a chave privada."
              >
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha do certificado A1"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </FormField>
            </section>
          </div>

          {/* CARD 3: Rubrica Caligráfica Padrão */}
          <section className="form-section-card">
            <div className="form-section-header">
              <span className="form-section-title">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Rubrica Caligráfica Padrão da Médica
              </span>
              <span className="text-[11px] text-slate-500">
                Usada nas chancelas visuais sobre o carimbo PAdES
              </span>
            </div>

            <SignaturePad
              signerName="Dra. Ana Carla Morong"
              signerCpf="CRM/SC 28412"
              height={160}
              onChange={(dataUrl) => setRubricDataUrl(dataUrl)}
            />
          </section>
        </div>
      )}
    </Modal>
  );
};
