// src/features/signatures/pages/PublicVerifySignaturePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Lock,
  ExternalLink,
  AlertTriangle,
  Building2,
  FileText,
  UserCheck,
  Clock,
  Fingerprint,
} from 'lucide-react';

interface SignerItem {
  id: string;
  role: string;
  full_name: string;
  cpf?: string;
  cpf_cnpj?: string;
  council_register?: string;
  council_id?: string;
  auth_method?: string;
  auth_type?: string;
  legal_level?: string;
  legal_standard?: string;
  status: string;
  signed_at?: string;
  icp_subject_cn?: string;
  icp_issuer_cn?: string;
  icp_serial_hex?: string;
  icp_thumbprint_sha256?: string;
}

interface AuditItem {
  event_type?: string;
  event_name?: string;
  event_description: string;
  actor_name: string;
  occurred_at_brt: string;
  current_trail_hash: string;
}

interface DocVerifyData {
  valid: boolean;
  verification_code: string;
  document_title: string;
  category: string;
  status: string;
  patient_name: string;
  patient_cpf: string;
  original_sha256: string;
  signed_sha256: string;
  has_pades: boolean;
  completed_at: string;
  drive_file_url?: string;
  signers: SignerItem[];
  audit_trails: AuditItem[];
}

export default function PublicVerifySignaturePage() {
  const params = useParams({ strict: false }) as { code?: string };
  const code = params.code || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DocVerifyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Código verificador não informado na URL.');
      setLoading(false);
      return;
    }

    const fetchVerification = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/verificar/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Documento não localizado ou inválido.');
        }
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Erro ao consultar autenticidade do documento.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [code]);

  return (
    <div className="h-dvh w-full overflow-y-auto overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 py-8 font-sans">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
        {/* Cabeçalho Oficial Clínico */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-0.5">
                Central de Autenticidade ICP-Brasil & Lei 14.063/2020
              </span>
              <h1 className="text-lg font-bold text-white leading-tight">
                Dra. Ana Carla Morong — Validador Público
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                CNPJ: 54.811.772/0001-32 • Florianópolis - SC
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-right self-end sm:self-auto">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Código</span>
            <span className="font-mono text-xs font-bold text-emerald-400">{code || '—'}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            Verificando integridade das chaves criptográficas e hashes SHA-256...
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Documento Não Encontrado
            </div>
            <p className="text-slate-300">
              {error}
            </p>
            <p className="text-[11px] text-slate-400 pt-1 border-t border-rose-900/50">
              Certifique-se de que o link ou QR Code escaneado corresponde à via original emitida pela Dra. Ana Carla Morong.
            </p>
          </div>
        ) : data ? (
          <>
            {/* Status de Autenticidade */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-white">
                  Documento Autêntico e Criptograficamente Íntegro
                </p>
                <p className="text-slate-300">
                  Documento: <strong className="text-white">{data.document_title}</strong> ({data.category})
                </p>
                <p className="text-slate-400 text-[11px]">
                  Paciente: <span className="text-slate-200 font-medium">{data.patient_name}</span> • Status:{' '}
                  <span className="text-emerald-400 font-semibold uppercase">{data.status}</span>
                </p>
              </div>
            </div>

            {/* Dossiê de Signatários */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Signatários e Certificação
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {data.signers.map((signer) => {
                  const isDoctor = signer.role === 'DRA_ANA' || signer.legal_level === 'QUALIFIED_ICP' || signer.legal_standard === 'QUALIFIED_ICP';
                  return (
                    <div
                      key={signer.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isDoctor
                          ? 'bg-slate-950 border-emerald-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {signer.full_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isDoctor
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {isDoctor ? 'Qualificada ICP-Brasil' : 'Avançada Lei 14.063'}
                        </span>
                      </div>

                      {isDoctor ? (
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <p>
                            Certificado ICP-Brasil: <strong className="text-emerald-300">{signer.icp_subject_cn || signer.full_name}</strong>
                          </p>
                          <p className="text-slate-400">
                            Emissor: {signer.icp_issuer_cn || 'Autoridade Certificadora ICP-Brasil'} • Registro: {signer.council_register || signer.council_id || 'CRM/SC'}
                          </p>
                          {signer.icp_serial_hex && (
                            <p className="text-slate-500 font-mono text-[10px]">
                              Série: {signer.icp_serial_hex}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          <p>
                            Identificação do Paciente • Assinado eletronicamente via biometria e assinatura manuscrita avançada.
                          </p>
                        </div>
                      )}

                      {signer.signed_at && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-900">
                          <Clock className="w-3 h-3" />
                          Data/Hora de Registro: {new Date(signer.signed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hashes Criptográficos */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                Resumos Criptográficos SHA-256 (PAdES / PKCS#7)
              </span>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                  Hash SHA-256 do Documento Original:
                </span>
                <span className="font-mono text-[11px] text-slate-300 break-all select-all">
                  {data.original_sha256}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                  Hash SHA-256 Final Selado com Assinaturas:
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold break-all select-all">
                  {data.signed_sha256}
                </span>
              </div>
            </div>

            {/* Instruções do Validador ITI Oficial */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-sky-400" />
                Como conferir no Validador Oficial do Governo Federal (ITI):
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                <li>Baixe a via original do PDF assinado enviada para o seu e-mail.</li>
                <li>
                  Acesse o portal oficial do Instituto Nacional de Tecnologia da Informação:{' '}
                  <a
                    href="https://validar.iti.gov.br"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline font-semibold hover:text-emerald-300 inline-flex items-center gap-0.5"
                  >
                    validar.iti.gov.br <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </li>
                <li>
                  Submeta o arquivo PDF. O validador atestará a conformidade plena da cadeia ICP-Brasil da{' '}
                  <strong className="text-slate-200">Dra. Ana Carla Morong (CNPJ 54.811.772/0001-32)</strong> e a inviolabilidade da assinatura PAdES.
                </li>
              </ol>
            </div>

            {/* Ações / Download se disponível */}
            {data.drive_file_url && (
              <div className="flex justify-center pt-2">
                <a
                  href={data.drive_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
                >
                  <FileText className="w-4 h-4" />
                  Visualizar Via Original no Google Drive
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </>
        ) : null}

        {/* Rodapé com conformidade jurídica */}
        <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            Protegido por SHA-256 & PKCS#7 CMS Detached
          </span>
          <span>Dúvidas: financeiro@draanamorong.com.br • (48) 98857-2882</span>
        </div>
      </div>
    </div>
  );
}
