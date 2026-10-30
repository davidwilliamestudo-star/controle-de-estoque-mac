import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { Settings, Save, Building2, Package, ShieldCheck, CalendarSync, ArrowRightLeft, PlayCircle, Camera, ScanSearch, KeyRound, CheckCircle2 } from "lucide-react";

import { settingsSchema, type SettingsFormData, type SettingsFormInput } from "../schemas/settings.schema";
import { useOnboarding } from "@/features/onboarding/OnboardingContext";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { IntegrationLogsModal } from "@/features/integrations/apps-script/components/IntegrationLogsModal";
import { DoctorCertificateVaultModal } from "@/components/signatures/DoctorCertificateVaultModal";
import { appScriptIntegrationService } from "@/features/integrations/apps-script/services/appScriptIntegration.service";
import { checkinSyncService } from "@/features/integrations/apps-script/services/checkinSync.service";
import { brevoSyncService, type BrevoSyncConfig, type BrevoAccountInfo } from "@/features/plans/services/brevoSync.service";

export default function SettingsPage() {
  const { data: initialData, isLoading, error } = useSettings();
  const mutation = useUpdateSettings();
  const onboarding = useOnboarding();
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isSyncingCheckins, setIsSyncingCheckins] = useState(false);

  // Configuração Brevo CRM
  const [brevoConfig, setBrevoConfig] = useState<BrevoSyncConfig>(() => brevoSyncService.getConfig());
  const [isTestingBrevo, setIsTestingBrevo] = useState(false);
  const [brevoAccount, setBrevoAccount] = useState<BrevoAccountInfo | null>(null);
  const [brevoTestError, setBrevoTestError] = useState<string | null>(null);
  const [brevoSaveSuccess, setBrevoSaveSuccess] = useState(false);

  const handleTestBrevo = async () => {
    setIsTestingBrevo(true);
    setBrevoTestError(null);
    setBrevoAccount(null);
    try {
      const res = await brevoSyncService.testConnection(brevoConfig.apiKey);
      if (res.success && res.account) {
        setBrevoAccount(res.account);
        brevoSyncService.saveConfig(brevoConfig);
      } else {
        setBrevoTestError(res.error || "Falha ao validar conta Brevo.");
      }
    } finally {
      setIsTestingBrevo(false);
    }
  };

  const handleSaveBrevo = () => {
    brevoSyncService.saveConfig(brevoConfig);
    setBrevoSaveSuccess(true);
    setTimeout(() => setBrevoSaveSuccess(false), 3000);
  };

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SettingsFormInput, unknown, SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = (data: SettingsFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset(data);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title" style={{ color: "var(--color-danger)" }}>Erro ao carregar configurações</div>
        <div className="empty-state-description">{String(error)}</div>
      </div>
    );
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const currentUrl = getValues("appscript_api_url");
      const currentKey = getValues("appscript_api_key");
      await appScriptIntegrationService.testConnection({
        url: currentUrl,
        apiKey: currentKey,
      });
      
      const currentData = getValues() as SettingsFormData;
      mutation.mutate({
         ...currentData,
         appscript_last_health_check_status: "ok",
         appscript_last_health_check_at: new Date().toISOString()
      }, {
         onSuccess: () => {
            alert("Conexão bem-sucedida! Apps Script respondeu OK.");
         }
      });
    } catch (error) {
      alert(`Falha na conexão: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestEmail = async () => {
    const email = prompt("Digite o e-mail de destino para o teste:");
    if (!email) return;

    setIsTestingEmail(true);
    try {
      const currentUrl = getValues("appscript_api_url");
      const currentKey = getValues("appscript_api_key");
      await appScriptIntegrationService.sendTestEmail(email, {
        url: currentUrl,
        apiKey: currentKey,
      });
      alert(`E-mail de teste enviado com sucesso para ${email}!`);
    } catch (error) {
      alert(`Falha ao enviar e-mail: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSyncCheckins = async () => {
    setIsSyncingCheckins(true);
    try {
      await checkinSyncService.syncCheckinResponses();
      alert("Sincronização manual de check-ins executada com sucesso!");
    } catch (error) {
      alert(`Falha na sincronização: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncingCheckins(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Settings size={24} style={{ display: 'inline', marginRight: 8, color: 'var(--color-green-deep)', verticalAlign: 'text-bottom' }}/> Configurações</h1>
          <p className="page-subtitle">Preferências locais do sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl" style={{ paddingBottom: '3rem' }}>
        {/* Clínica & Profissional */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <Building2 size={20} /> Clínica e Profissional
          </h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome da Clínica</label>
              <input type="text" className="form-control" {...register("clinic_name")} />
              {errors.clinic_name && <span className="form-error">{errors.clinic_name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Profissional Responsável</label>
              <input type="text" className="form-control" {...register("professional_name")} />
              {errors.professional_name && <span className="form-error">{errors.professional_name.message}</span>}
            </div>
          </div>
        </div>

        {/* Estoque e Validades */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <Package size={20} /> Estoque e Validades
          </h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Alerta de Vencimento (Dias)</label>
              <input type="number" className="form-control" {...register("expiration_alert_days")} />
              <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Avisa quando itens estiverem próximos de vencer.</p>
              {errors.expiration_alert_days && <span className="form-error">{errors.expiration_alert_days.message}</span>}
            </div>
            <div className="form-group flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("block_expired_items")} className="checkbox" style={{ width: 20, height: 20 }} />
                <span className="font-medium" style={{ color: "var(--color-gray-700)" }}>Bloquear uso de itens vencidos</span>
              </label>
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <ShieldCheck size={20} /> Segurança e Backup
          </h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bloqueio por Inatividade (Minutos)</label>
              <input type="number" className="form-control" {...register("lock_after_minutes")} />
              <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Tempo antes de pedir a senha novamente.</p>
              {errors.lock_after_minutes && <span className="form-error">{errors.lock_after_minutes.message}</span>}
            </div>
            <div className="form-group flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("auto_backup_enabled")} className="checkbox" style={{ width: 20, height: 20 }} />
                <span className="font-medium" style={{ color: "var(--color-gray-700)" }}>Backup Automático ao Fechar</span>
              </label>
            </div>
          </div>
        </div>

        {/* Assinatura Digital & Cofre ICP-Brasil */}
        <div className="card" id="icp-brasil-vault">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
              <ShieldCheck size={20} className="text-emerald-600" />
              Cofre de Assinatura Automática ICP-Brasil (PAdES)
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              MP 2.200-2/2001 & Lei 14.063
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            Gerencie o Certificado Digital A1 (.pfx/.p12) e a rubrica caligráfica da Dra. Ana Carla Morong (CNPJ 54.811.772/0001-32).
            Quando o paciente assina o contrato ou TCLE, o sistema contra-assina automaticamente com validade jurídica plena e carimbo PAdES.
          </p>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Cofre Criptográfico com Proteção AES-256-GCM</p>
                <p className="text-[11px] text-gray-500">Chave privada e senha criptografadas em repouso no Cloudflare D1</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVaultModalOpen(true)}
              className="btn btn-secondary text-xs font-semibold py-2 px-4 shadow-sm hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              Configurar Certificado A1 & Rubrica
            </button>
          </div>
        </div>

        {/* Integrações Avançadas Apps Script */}
        <div className="card" id="appscript-integration">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <CalendarSync size={20} /> Integração Avançada Apps Script
          </h2>
          
          <div className="form-group flex items-center mb-6">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border" style={{ borderColor: "var(--color-green-deep)", backgroundColor: "var(--color-green-100)" }}>
              <input type="checkbox" {...register("appscript_enabled")} className="checkbox" style={{ width: 24, height: 24, accentColor: "var(--color-green-deep)" }} />
              <div>
                <span className="font-bold block" style={{ color: "var(--color-green-deep)" }}>Ativar Integração Apps Script</span>
                <p className="text-xs" style={{ color: "var(--color-gray-700)" }}>Requer deploy do backend no Google Apps Script. Salve primeiro as credenciais.</p>
              </div>
            </label>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">URL do Google Apps Script</label>
              <input 
                type="url" 
                placeholder="https://script.google.com/macros/s/.../exec"
                className="form-control" 
                {...register("appscript_api_url")} 
              />
              {errors.appscript_api_url && <span className="form-error">{errors.appscript_api_url.message}</span>}
            </div>
            
            <div className="form-group">
              <label className="form-label">API Key (Opcional se não configurado no backend)</label>
              <input 
                type="password" 
                placeholder="Ex: ch4v3_s3cr3t4"
                className="form-control" 
                {...register("appscript_api_key")} 
              />
            </div>
          </div>
          
          <h3 className="font-semibold text-sm mb-3 mt-4" style={{ color: "var(--color-gray-800)" }}>Serviços Ativados</h3>
          <div className="grid-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("appscript_email_enabled")} className="checkbox" />
              <span className="text-sm font-medium">E-mails Automáticos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("appscript_calendar_enabled")} className="checkbox" />
              <span className="text-sm font-medium">Google Calendar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("appscript_checkin_enabled")} className="checkbox" />
              <span className="text-sm font-medium">Check-ins Automáticos</span>
            </label>
          </div>

          <div className="grid-2">
             <div className="form-group">
              <label className="form-label">Dias de atraso para Check-in</label>
              <input type="number" className="form-control" {...register("appscript_checkin_delay_days")} />
              <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Quantos dias após o procedimento o formulário é enviado.</p>
            </div>
             <div className="form-group">
              <label className="form-label">Duração padrão Agendamento (Minutos)</label>
              <input type="number" className="form-control" {...register("appscript_default_duration_minutes")} />
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
            <CalendarSync size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Sincronização Apps Script</h3>
              <p className="text-xs text-gray-500 mt-1">
                Integração com Google Sheets para check-ins e leads.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={handleTestConnection} disabled={isTestingConnection} className="btn btn-secondary text-xs py-1">
                  {isTestingConnection ? "Testando..." : "Testar Conexão"}
                </button>
                <button type="button" onClick={handleTestEmail} disabled={isTestingEmail} className="btn btn-secondary text-xs py-1">
                  {isTestingEmail ? "Enviando..." : "E-mail de Teste"}
                </button>
                <button type="button" onClick={handleSyncCheckins} disabled={isSyncingCheckins} className="btn btn-secondary text-xs py-1">
                  {isSyncingCheckins ? "Sincronizando..." : "Sincronizar Check-ins"}
                </button>
                <button type="button" onClick={() => setIsLogsModalOpen(true)} className="btn btn-ghost text-xs py-1">
                  Ver Logs
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <ArrowRightLeft size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Importação e Exportação (CSV)</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Importe ou exporte dados de pacientes, materiais e estoque em massa com resolução de duplicidades.
              </p>
              <Link to="/settings/import-export" className="btn btn-secondary text-xs py-1 inline-flex items-center gap-1">
                Acessar Módulo
              </Link>
            </div>
          </div>
        </div>

        {/* Integração Brevo (CRM & E-mails Transacionais) */}
        <div className="card" id="brevo-integration">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
              <CheckCircle2 size={20} className="text-emerald-700" /> Brevo CRM & E-mails de Planos
            </h2>
            {brevoAccount && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                Conectado: {brevoAccount.email} ({brevoAccount.planType})
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-5">
            Sincroniza os contatos do funil de vendas, etapas de propostas e envia e-mails transacionais (ativação, renovação e lembretes de acompanhamento).
          </p>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label text-sm font-medium">Chave de API do Brevo (v3 API Key)</label>
              <input
                type="password"
                placeholder="xkeysib-..."
                value={brevoConfig.apiKey || ""}
                onChange={(e) => setBrevoConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                className="form-control font-mono text-xs"
              />
              <p className="text-xs text-gray-400 mt-1">
                Obtida em Brevo &gt; Configurações da Conta &gt; Chaves SMTP e API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label text-sm font-medium">Nome do Remetente</label>
                <input
                  type="text"
                  value={brevoConfig.senderName || ""}
                  onChange={(e) => setBrevoConfig((prev) => ({ ...prev, senderName: e.target.value }))}
                  placeholder="Dra. Ana Carla Morong"
                  className="form-control text-xs"
                />
              </div>
              <div className="form-group">
                <label className="form-label text-sm font-medium">E-mail do Remetente</label>
                <input
                  type="email"
                  value={brevoConfig.senderEmail || ""}
                  onChange={(e) => setBrevoConfig((prev) => ({ ...prev, senderEmail: e.target.value }))}
                  placeholder="contato@draanamorong.com.br"
                  className="form-control text-xs"
                />
              </div>
            </div>

            {brevoTestError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200">
                {brevoTestError}
              </div>
            )}

            {brevoSaveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-semibold">
                Configurações do Brevo salvas com sucesso!
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestBrevo}
                disabled={isTestingBrevo}
                className="btn btn-secondary text-xs py-1.5"
              >
                {isTestingBrevo ? "Testando Credencial..." : "Testar Conexão Brevo"}
              </button>
              <button
                type="button"
                onClick={handleSaveBrevo}
                className="btn btn-primary text-xs py-1.5 bg-emerald-800 text-white"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>

        {/* Leitor de Códigos (Câmera) */}
        <div className="card" id="scanner-settings">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <Camera size={20} /> Leitor de Códigos (Câmera)
          </h2>

          <div className="form-group flex items-center mb-6">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border w-full" style={{ borderColor: "var(--color-green-deep)", backgroundColor: "var(--color-green-100)" }}>
              <input
                type="checkbox"
                {...register("scanner_enabled")}
                className="checkbox"
                style={{ width: 24, height: 24, accentColor: "var(--color-green-deep)", flexShrink: 0 }}
              />
              <div>
                <span className="font-bold block" style={{ color: "var(--color-green-deep)" }}>
                  Ativar Leitor de Câmera
                </span>
                <p className="text-xs" style={{ color: "var(--color-gray-700)" }}>
                  Permite escanear QR Codes e códigos de barras nas telas de Etiquetas e Estoque.
                </p>
              </div>
            </label>
          </div>

          <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--color-gray-800)" }}>
            Modo padrão de leitura
          </h3>
          <div className="flex flex-col gap-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border" style={{ borderColor: "var(--color-gray-200)" }}>
              <input
                type="radio"
                value="qr"
                {...register("scanner_mode")}
                style={{ width: 18, height: 18, accentColor: "var(--color-green-deep)" }}
              />
              <div>
                <span className="font-medium text-sm flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
                  <ScanSearch size={16} style={{ color: "var(--color-green-deep)" }} />
                  Apenas QR Code
                </span>
                <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                  Padrão. Lê QR Code, Data Matrix e Aztec das etiquetas do sistema.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border" style={{ borderColor: "var(--color-gray-200)" }}>
              <input
                type="radio"
                value="barcode"
                {...register("scanner_mode")}
                style={{ width: 18, height: 18, accentColor: "var(--color-green-deep)" }}
              />
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--color-gray-900)" }}>
                  Apenas Código de Barras
                </span>
                <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                  Lê EAN-13, EAN-8, Code128, Code39 e similares. Útil para produtos com código de barras impresso na embalagem.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md border" style={{ borderColor: "var(--color-gray-200)" }}>
              <input
                type="radio"
                value="any"
                {...register("scanner_mode")}
                style={{ width: 18, height: 18, accentColor: "var(--color-green-deep)" }}
              />
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--color-gray-900)" }}>
                  QR Code + Código de Barras (automático)
                </span>
                <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
                  Detecta qualquer formato automaticamente. Use se trabalha com ambos os tipos de etiqueta.
                </p>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Camera size={14} />
              ID da Câmera Preferida
              <span className="text-xs font-normal" style={{ color: "var(--color-gray-400)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Deixe em branco para usar a câmera padrão do sistema"
              {...register("scanner_preferred_camera_id")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>
              Se o sistema escolher a câmera errada (ex: webcam frontal em vez de uma câmera USB), 
              abra o leitor de QR Code, clique em "Iniciar leitura" e o sistema listará as câmeras disponíveis.
              Copie o ID da câmera desejada e cole aqui.
            </p>
          </div>
        </div>

        {/* Experiência e Onboarding */}

        <div className="card" id="experience-onboarding">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gray-900)" }}>
            <PlayCircle size={20} /> Experiência e Onboarding
          </h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: "var(--color-gray-200)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--color-gray-900)" }}>Rever Intro da VoltQ</h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Apresentação cinematográfica do estúdio desenvolvedor.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary text-sm"
                onClick={() => window.location.reload()}
              >
                Rever Intro
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: "var(--color-gray-200)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--color-gray-900)" }}>Rever Onboarding do Sistema</h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Revise a apresentação inicial das funcionalidades do sistema.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary text-sm"
                onClick={() => onboarding.replayOnboarding()}
              >
                Rever Onboarding
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: "var(--color-gray-200)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--color-gray-900)" }}>Áudio do Onboarding</h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Ativar ou desativar a locução de boas-vindas.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox" 
                  style={{ width: 20, height: 20, accentColor: "var(--color-green-deep)" }} 
                  checked={onboarding.audioEnabled}
                  onChange={() => onboarding.toggleAudio()}
                />
                <span className="font-medium" style={{ color: "var(--color-gray-700)" }}>{onboarding.audioEnabled ? "Ativado" : "Desativado"}</span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: "var(--color-gray-200)", backgroundColor: "var(--color-gray-50)" }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--color-gray-900)" }}>Resetar Experiência Inicial</h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-gray-500)" }}>Remove a flag de conclusão e mostra o onboarding novamente no próximo acesso.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost text-sm text-[var(--color-danger)]"
                onClick={() => {
                  onboarding.resetOnboarding();
                  alert("Experiência resetada. O onboarding aparecerá na próxima vez ou agora mesmo.");
                }}
              >
                Resetar
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          {mutation.isSuccess && !isDirty && (
            <span className="flex items-center text-sm font-medium" style={{ color: "var(--color-success)" }}>
              Configurações salvas!
            </span>
          )}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!isDirty || mutation.isPending}
          >
            <Save size={16} />
            {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
      
      <IntegrationLogsModal 
        isOpen={isLogsModalOpen} 
        onClose={() => setIsLogsModalOpen(false)} 
      />

      <DoctorCertificateVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />
    </>
  );
}
