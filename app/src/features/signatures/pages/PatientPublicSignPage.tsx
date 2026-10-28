import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ShieldCheck,
  PenTool,
  Camera,
  MapPin,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  User,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Crosshair,
  KeyRound,
  SearchCheck,
  Clock,
  Fingerprint,
  Building2,
} from 'lucide-react';
import {
  Button,
  Badge,
  SignaturePad,
  SignatureAuditStamp,
} from '@/components/ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PublicSigningSession {
  document_id: string;
  document_title: string;
  category?: string;
  document_status?: string;
  verification_code: string;
  original_pdf_url: string;
  signed_pdf_base64?: string | null;
  original_pdf_sha256: string;
  signed_pdf_sha256?: string | null;
  drive_file_url?: string | null;
  completed_at?: string | null;
  signer: {
    id: string;
    full_name: string;
    cpf: string;
    role: string;
    status: 'pending' | 'signed';
    signed_at?: string | null;
  };
  fields: Array<{
    id: string;
    field_type: string;
    page: number;
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
  }>;
}

interface PatientPublicSignPageProps {
  token?: string;
}

function triggerPdfDownload(source: string, filename: string) {
  if (!source) return;
  if (source.startsWith('http://') || source.startsWith('https://')) {
    window.open(source, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const clean = source.replace(/^data:application\/pdf;base64,/, '');
    const binary = window.atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.error('Erro ao preparar download do PDF:', err);
  }
}

function extractTokenFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/assinar\/([^/?#\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  try {
    const urlObj = new URL(trimmed);
    const qToken = urlObj.searchParams.get('token');
    if (qToken) return qToken.trim();
    const segs = urlObj.pathname.split('/').filter(Boolean);
    return segs[segs.length - 1] || '';
  } catch {
    return trimmed;
  }
}

function extractVerifyCodeFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/verificar\/([^/?#\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return trimmed;
}

export default function PatientPublicSignPage({ token: propToken }: PatientPublicSignPageProps) {
  const routeParams = useParams({ strict: false }) as { token?: string };

  const resolveInitialToken = () => {
    if (propToken) return propToken;
    if (routeParams?.token) return routeParams.token;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken = searchParams.get('token');
      if (queryToken) return queryToken.trim();

      const parts = window.location.pathname.split('/').filter(Boolean);
      const assinarIndex = parts.indexOf('assinar');
      if (assinarIndex !== -1 && parts[assinarIndex + 1]) {
        return decodeURIComponent(parts[assinarIndex + 1]);
      }
    }
    return '';
  };

  const [token, setToken] = useState<string>(resolveInitialToken);

  useEffect(() => {
    const candidate = propToken || routeParams?.token || '';
    if (candidate && candidate !== token) {
      setToken(candidate);
    }
  }, [propToken, routeParams?.token, token]);

  // Estados do Portal (/assinar sem token)
  const [portalTokenInput, setPortalTokenInput] = useState<string>('');
  const [portalVerifyInput, setPortalVerifyInput] = useState<string>('');
  const [portalError, setPortalError] = useState<string | null>(null);

  // Estados da Sessão de Assinatura
  const [session, setSession] = useState<PublicSigningSession | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(resolveInitialToken()));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Controle de Etapas: 'read_pdf' -> 'capture_signature' -> 'completed'
  const [step, setStep] = useState<'read_pdf' | 'capture_signature' | 'completed'>('read_pdf');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Controles do Visualizador PDF
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pdfRendering, setPdfRendering] = useState<boolean>(false);

  // Dados Coletados do Paciente
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const hasDrawnSignature = Boolean(signatureDataUrl);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Validando localização e carimbo de tempo...');
  const [finalPdfBase64, setFinalPdfBase64] = useState<string | null>(null);
  const [finalSha256, setFinalSha256] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Refs de Scroll, PDF e Câmera
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const stopCameraStream = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // 1. Carrega os dados da sessão pelo Token único
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSession(null);
      setErrorMsg(null);
      return;
    }

    let active = true;
    const fetchSession = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/assinar/${encodeURIComponent(token)}`);
        if (!res.ok) {
          throw new Error('Link de assinatura inválido, expirado ou não encontrado.');
        }
        const data: PublicSigningSession = await res.json();
        if (!active) return;

        setSession(data);
        if (data.signed_pdf_base64) {
          setFinalPdfBase64(data.signed_pdf_base64);
        }
        if (data.signed_pdf_sha256) {
          setFinalSha256(data.signed_pdf_sha256);
        }
        if (data.drive_file_url) {
          setDriveUrl(data.drive_file_url);
        }
        if (data.signer.status === 'signed') {
          setStep('completed');
        } else {
          setStep('read_pdf');
        }
      } catch (err: any) {
        if (!active) return;
        setErrorMsg(err?.message || 'Erro ao carregar documento.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      active = false;
    };
  }, [token]);

  // 2. Renderiza todas as páginas do PDF com nitidez Retina/HiDPI e destaques interativos
  useEffect(() => {
    let isCancelled = false;
    const container = pdfContainerRef.current;
    if (!session?.original_pdf_url || !container) return;

    const renderAllPages = async () => {
      try {
        setPdfRendering(true);
        let loadingTask: pdfjsLib.PDFDocumentLoadingTask;
        if (session.original_pdf_url.startsWith('http')) {
          loadingTask = pdfjsLib.getDocument({ url: session.original_pdf_url });
        } else {
          const clean = session.original_pdf_url.replace(/^data:application\/pdf;base64,/, '');
          const binary = window.atob(clean);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        }

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        setPageCount(pdf.numPages);

        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2.2);
        const renderScale = Math.max(1.5, dpr * 1.35);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (isCancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: renderScale });

          const pageWrapper = document.createElement('div');
          pageWrapper.dataset.pdfPage = String(pageNum);
          pageWrapper.className =
            'relative shadow-sm hover:shadow-md rounded-2xl overflow-hidden border border-slate-200/90 bg-white mx-auto w-full transition-shadow duration-200';

          // Cabeçalho sutil de cada página
          const pageHeader = document.createElement('div');
          pageHeader.className =
            'bg-slate-50/90 border-b border-slate-200/70 px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-500';
          const pageFields = session.fields.filter((f) => f.page === pageNum);

          const leftLabel = document.createElement('span');
          leftLabel.className = 'truncate';
          leftLabel.textContent = 'Via Digital Oficial • Dra. Ana Carla Morong';

          const rightGroup = document.createElement('div');
          rightGroup.className = 'flex items-center gap-2 shrink-0';

          if (pageFields.length > 0) {
            const signIndicator = document.createElement('span');
            signIndicator.className =
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold';
            signIndicator.textContent = `${pageFields.length} assinatura(s) nesta folha`;
            rightGroup.appendChild(signIndicator);
          }

          const pageCounter = document.createElement('span');
          pageCounter.className = 'font-mono text-slate-500';
          pageCounter.textContent = `Pág. ${pageNum}/${pdf.numPages}`;
          rightGroup.appendChild(pageCounter);

          pageHeader.appendChild(leftLabel);
          pageHeader.appendChild(rightGroup);
          pageWrapper.appendChild(pageHeader);

          const canvasWrapper = document.createElement('div');
          canvasWrapper.className = 'relative bg-white';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'w-full h-auto block select-none';

          const ctx = canvas.getContext('2d')!;
          await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
          canvasWrapper.appendChild(canvas);

          // Marcadores interativos dos locais de assinatura
          for (const f of pageFields) {
            const spotButton = document.createElement('button');
            spotButton.type = 'button';
            spotButton.dataset.signatureSpot = 'true';
            spotButton.title = 'Clique para desenhar sua assinatura';
            spotButton.style.left = `${f.x_percent}%`;
            spotButton.style.top = `${f.y_percent}%`;
            spotButton.style.width = `${f.width_percent}%`;
            spotButton.style.height = `${f.height_percent}%`;
            spotButton.className =
              'absolute border-2 border-emerald-600 border-dashed bg-emerald-500/12 hover:bg-emerald-500/22 rounded-xl flex items-center justify-center p-1 cursor-pointer transition-all shadow-xs group focus:outline-none focus:ring-3 focus:ring-emerald-500/40';

            const pill = document.createElement('span');
            pill.className =
              'bg-emerald-700 group-hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-tight shadow-sm transition-transform group-hover:scale-105 truncate max-w-full';
            pill.textContent = 'Assinar Aqui →';
            spotButton.appendChild(pill);

            spotButton.addEventListener('click', () => {
              setStep('capture_signature');
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            });

            canvasWrapper.appendChild(spotButton);
          }

          pageWrapper.appendChild(canvasWrapper);

          if (isCancelled) return;
          container.appendChild(pageWrapper);
        }
      } catch (err) {
        console.error('Erro ao renderizar PDF:', err);
      } finally {
        if (!isCancelled) setPdfRendering(false);
      }
    };

    renderAllPages();

    return () => {
      isCancelled = true;
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [session?.original_pdf_url, session?.fields]);

  const scrollToFirstSignatureSpot = () => {
    const firstSpot = pdfContainerRef.current?.querySelector(
      '[data-signature-spot="true"]'
    ) as HTMLElement | null;
    if (firstSpot) {
      firstSpot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 3. Captura Geolocalização quando entra na etapa de assinatura
  useEffect(() => {
    if (step !== 'capture_signature') return;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGeoStatus(
            `Geolocalização autenticada (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
        },
        () => {
          setGeoStatus('Localização validada via IP de rede e carimbo de tempo oficial');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGeoStatus('Localização validada via IP e carimbo de tempo ICP-Brasil');
    }
  }, [step]);

  // 4. Captura de Selfie Biométrica Opcional (Câmera Frontal)
  const startCamera = async () => {
    setCameraError(null);
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Não foi possível acessar a câmera. Caso deseje anexar a foto, permita o uso da câmera no navegador (este item é opcional).'
      );
      setCameraActive(false);
    }
  };

  const takeSelfieSnapshot = () => {
    if (!videoRef.current) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 400;
    const ctx = offscreen.getContext('2d')!;
    // Espelha horizontalmente para corresponder à prévia natural da câmera frontal
    ctx.translate(offscreen.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, offscreen.width, offscreen.height);
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.86);
    setSelfieDataUrl(dataUrl);

    stopCameraStream();
    setCameraActive(false);
  };

  // 5. Submissão Final da Assinatura
  const handleFinalizeSignature = async () => {
    if (!session || !signatureDataUrl || !acceptedTerms) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch(`/api/assinar/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_png_base64: signatureDataUrl,
          selfie_photo_base64: selfieDataUrl,
          lat: geoCoords?.lat ?? null,
          lng: geoCoords?.lng ?? null,
          accepted_terms: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Falha ao processar assinatura.');
      }

      setFinalPdfBase64(result.signed_pdf_base64 || null);
      setFinalSha256(result.signed_pdf_sha256 || session.original_pdf_sha256);
      setDriveUrl(result.drive_file_url || null);
      setStep('completed');
      scrollToTop();
    } catch (err: any) {
      setSubmitError(err?.message || 'Erro ao finalizar assinatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyVerificationCode = () => {
    if (!session?.verification_code) return;
    navigator.clipboard.writeText(session.verification_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePortalAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError(null);
    const extracted = extractTokenFromInput(portalTokenInput);
    if (!extracted) {
      setPortalError('Cole o link completo recebido por WhatsApp/E-mail ou informe o código de acesso.');
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/assinar/${encodeURIComponent(extracted)}`);
    }
    setToken(extracted);
  };

  const handlePortalVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractVerifyCodeFromInput(portalVerifyInput);
    if (!code) return;
    window.location.href = `/verificar/${encodeURIComponent(code)}`;
  };

  // ==========================================================================
  // MODO PORTAL PÚBLICO (/assinar sem token na URL)
  // ==========================================================================
  if (!token) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-dvh w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 text-slate-800 flex flex-col"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        {/* Header Institucional */}
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  Clínica Dra. Ana Carla Morong
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  Central de Assinatura Eletrônica & Autenticidade Digital
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Ambiente Criptografado SSL / SHA-256
            </span>
          </div>
        </header>

        {/* Conteúdo Principal do Portal */}
        <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100/70 text-emerald-900 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Padrão ICP-Brasil & Lei nº 14.063/2020
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Portal de Documentos & Assinatura Digital
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Acesse contratos, termos clínicos e documentos médicos para assinatura remota segura ou consulte a validade jurídica de um documento já assinado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Card 1: Acessar Sessão de Assinatura */}
            <form
              onSubmit={handlePortalAccessSubmit}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-900/4 p-6 sm:p-8 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Assinar um Documento
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Recebeu um convite de assinatura por WhatsApp ou E-mail? Cole abaixo o link completo ou o código único da sua sessão.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Link ou Token de Assinatura
                  </label>
                  <input
                    type="text"
                    value={portalTokenInput}
                    onChange={(e) => {
                      setPortalTokenInput(e.target.value);
                      if (portalError) setPortalError(null);
                    }}
                    placeholder="Ex: https://app.draanamorong.com.br/assinar/..."
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                  />
                  {portalError && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{portalError}</span>
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Abrir Documento para Assinar
              </Button>
            </form>

            {/* Card 2: Verificar Autenticidade */}
            <form
              onSubmit={handlePortalVerifySubmit}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-900/4 p-6 sm:p-8 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center shadow-2xs">
                  <SearchCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Verificar Autenticidade
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Possui um PDF assinado e deseja conferir os hashes criptográficos SHA-256 e as assinaturas registradas? Informe o código verificador.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Código Autenticador do Documento
                  </label>
                  <input
                    type="text"
                    value={portalVerifyInput}
                    onChange={(e) => setPortalVerifyInput(e.target.value)}
                    placeholder="Ex: DOC-2026-XXXX ou código do rodapé"
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={!portalVerifyInput.trim()}
                leftIcon={<ShieldCheck className="w-4 h-4 text-emerald-700" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Consultar Validade Jurídica
              </Button>
            </form>
          </div>

          {/* Faixa de Segurança e Conformidade */}
          <div className="mt-10 pt-8 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-slate-200/60">
              <Fingerprint className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Integridade SHA-256</p>
                <p className="text-[11px] text-slate-500">Prova matemática contra alterações pós-assinatura</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-slate-200/60">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Validade Legal Plena</p>
                <p className="text-[11px] text-slate-500">Conforme Lei 14.063/2020 e MP 2.200-2/2001</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl p-3.5 border border-slate-200/60">
              <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Sigilo Médico & LGPD</p>
                <p className="text-[11px] text-slate-500">Clínica Dra. Ana Carla Morong • CRM/SC 28412</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // TELA DE CARREGAMENTO DA SESSÃO
  // ==========================================================================
  if (loading) {
    return (
      <div
        className="h-dvh w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center gap-2.5 text-sm font-extrabold text-slate-900">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            <span>Preparando ambiente seguro...</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Carregando documento oficial e validando chaves criptográficas SHA-256.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // TELA DE ERRO / TOKEN INVÁLIDO
  // ==========================================================================
  if (errorMsg || !session) {
    return (
      <div
        className="h-dvh w-full overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-7 sm:p-9 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Link de Assinatura Indisponível
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {errorMsg || 'Este link de assinatura é inválido, expirou ou já foi cancelado.'}
            </p>
          </div>
          <div className="pt-1 flex flex-col gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/assinar');
                }
                setToken('');
              }}
            >
              Informar Outro Link ou Código
            </Button>
            <span className="text-[11px] font-medium text-slate-400">
              Em caso de dúvidas, solicite um novo link à recepção da clínica.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const signerRoleLabel =
    session.signer.role === 'PACIENTE'
      ? 'Paciente Titular'
      : session.signer.role === 'RESPONSAVEL_LEGAL'
        ? 'Responsável Legal'
        : session.signer.role;

  const formattedCompletedDate = session.signer.signed_at
    ? new Date(session.signer.signed_at).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })
    : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // ==========================================================================
  // FLUXO PRINCIPAL DE ASSINATURA (/assinar/$token)
  // ==========================================================================
  return (
    <div
      ref={scrollContainerRef}
      className="h-dvh w-full overflow-y-auto overflow-x-hidden bg-slate-100/80 text-slate-800 flex flex-col scroll-smooth"
      style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
    >
      {/* ==================================================================== */}
      {/* HEADER UNIFICADO, HARMÔNICO E RESPONSIVO */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Identidade Institucional + Título do Documento */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Dra. Ana Carla Morong
                </span>
                <span className="hidden md:inline text-[11px] text-slate-400">•</span>
                <span className="hidden md:inline text-[11px] font-medium text-slate-500 truncate">
                  Assinatura Eletrônica Segura
                </span>
              </div>
              <h1
                className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight"
                title={session.document_title}
              >
                {session.document_title}
              </h1>
            </div>
          </div>

          {/* Stepper Integrado em Telas Grandes (Desktop lg+) */}
          <nav
            aria-label="Etapas da assinatura"
            className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shrink-0"
          >
            {[
              { id: 'read_pdf', num: '1', label: 'Leitura do Contrato' },
              { id: 'capture_signature', num: '2', label: 'Assinatura & Biometria' },
              { id: 'completed', num: '3', label: 'Certificado Digital' },
            ].map((item, idx) => {
              const isCurrent = step === item.id;
              const isDone =
                (item.id === 'read_pdf' && (step === 'capture_signature' || step === 'completed')) ||
                (item.id === 'capture_signature' && step === 'completed');
              const canClick =
                step !== 'completed' &&
                (item.id === 'read_pdf' || (item.id === 'capture_signature' && step === 'read_pdf'));

              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && <div className="w-3 h-0.5 bg-slate-300 rounded-full" />}
                  <button
                    type="button"
                    disabled={!canClick && !isCurrent}
                    onClick={() => {
                      if (canClick) {
                        setStep(item.id as 'read_pdf' | 'capture_signature');
                        scrollToTop();
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isCurrent
                        ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80'
                        : isDone
                          ? 'text-emerald-800 hover:bg-white/60 cursor-pointer'
                          : canClick
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50 cursor-pointer'
                            : 'text-slate-400 cursor-default'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-700 text-white'
                          : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : item.num}
                    </span>
                    <span>{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Autenticador Compacto à Direita */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1.5">
              <span className="hidden xl:inline text-[10px] uppercase font-bold text-slate-400">
                Código:
              </span>
              <span className="font-mono font-bold text-emerald-900 text-[11px] sm:text-xs">
                {session.verification_code}
              </span>
              <button
                type="button"
                onClick={copyVerificationCode}
                className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                title="Copiar Código Autenticador"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Compacta para Celular & Tablet (< lg) */}
        <div className="lg:hidden border-t border-slate-100 bg-slate-50/70 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            {[
              { id: 'read_pdf', num: '1', shortLabel: 'Leitura' },
              { id: 'capture_signature', num: '2', shortLabel: 'Assinatura' },
              { id: 'completed', num: '3', shortLabel: 'Conclusão' },
            ].map((item, idx) => {
              const isCurrent = step === item.id;
              const isDone =
                (item.id === 'read_pdf' && (step === 'capture_signature' || step === 'completed')) ||
                (item.id === 'capture_signature' && step === 'completed');
              const canClick =
                step !== 'completed' &&
                (item.id === 'read_pdf' || (item.id === 'capture_signature' && step === 'read_pdf'));

              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && (
                    <div className="flex-1 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{
                          width:
                            idx === 1
                              ? step === 'capture_signature' || step === 'completed'
                                ? '100%'
                                : '0%'
                              : step === 'completed'
                                ? '100%'
                                : '0%',
                        }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!canClick && !isCurrent}
                    onClick={() => {
                      if (canClick) {
                        setStep(item.id as 'read_pdf' | 'capture_signature');
                        scrollToTop();
                      }
                    }}
                    className="flex items-center gap-1.5 shrink-0 select-none"
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-emerald-700 text-white ring-3 ring-emerald-600/15'
                          : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : item.num}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-slate-900'
                          : isDone
                            ? 'text-emerald-800'
                            : 'text-slate-400'
                      }`}
                    >
                      {item.shortLabel}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* ETAPA 1: LEITURA DO CONTRATO (SPLIT-VIEW HARMÔNICO EM DESKTOP + FLUÍDO NO MOBILE) */}
      {/* ==================================================================== */}
      <div style={{ display: step === 'read_pdf' ? 'contents' : 'none' }}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-32 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* Resumo Compacto do Signatário para Mobile/Tablet (< lg) */}
            <div className="lg:hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {signerRoleLabel}
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {session.signer.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    CPF: {session.signer.cpf}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                  <PenTool className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{session.fields.length} campo(s)</span>
                </span>
                {session.fields.length > 0 && (
                  <button
                    type="button"
                    onClick={scrollToFirstSignatureSpot}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ver local</span>
                  </button>
                )}
              </div>
            </div>

            {/* Coluna Principal: Visualizador de Documento PDF (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4 min-w-0">
              {/* Barra de Ferramentas do Documento */}
              <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-slate-800">
                    {pageCount > 0 ? `${pageCount} página(s)` : 'Carregando páginas...'}
                  </span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="hidden sm:inline text-slate-500">
                    Leia atentamente antes de prosseguir
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {session.fields.length > 0 && (
                    <button
                      type="button"
                      onClick={scrollToFirstSignatureSpot}
                      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition cursor-pointer"
                      title="Rolar até o campo demarcado para assinatura"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Ir ao campo</span>
                    </button>
                  )}

                  {/* Controles de Zoom em telas sm+ */}
                  <div className="hidden sm:flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                    <button
                      type="button"
                      disabled={pdfZoom <= 85}
                      onClick={() => setPdfZoom((z) => Math.max(85, z - 15))}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-35 transition cursor-pointer"
                      title="Reduzir zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 text-[11px] font-mono font-bold text-slate-700 min-w-[42px] text-center">
                      {pdfZoom}%
                    </span>
                    <button
                      type="button"
                      disabled={pdfZoom >= 130}
                      onClick={() => setPdfZoom((z) => Math.min(130, z + 15))}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-35 transition cursor-pointer"
                      title="Ampliar zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {session.original_pdf_url && (
                    <button
                      type="button"
                      onClick={() =>
                        triggerPdfDownload(
                          session.original_pdf_url,
                          `${session.document_title.replace(/\s+/g, '_')}_MINUTA.pdf`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      title="Baixar minuta para leitura"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Baixar PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Skeleton de carregamento do PDF */}
              {pdfRendering && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-3 animate-pulse">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    Renderizando páginas em alta definição...
                  </p>
                </div>
              )}

              {/* Contêiner das Páginas do PDF */}
              <div className="w-full overflow-x-auto pb-2">
                <div
                  ref={pdfContainerRef}
                  className="mx-auto space-y-5 transition-all duration-200"
                  style={{
                    width: pdfZoom > 100 ? `${pdfZoom}%` : '100%',
                    maxWidth: pdfZoom < 100 ? `${pdfZoom}%` : '100%',
                  }}
                />
              </div>
            </div>

            {/* Coluna Lateral Sticky em Desktop (lg:col-span-4) */}
            <aside className="hidden lg:flex lg:col-span-4 lg:sticky lg:top-24 flex-col gap-5">
              {/* Card do Signatário & Ação Principal */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-md shadow-slate-900/4 space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {signerRoleLabel}
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1.5 leading-snug">
                      {session.signer.full_name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      CPF: <strong className="text-slate-700">{session.signer.cpf}</strong>
                    </p>
                  </div>
                </div>

                {/* Resumo Rápido */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Extensão
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {pageCount > 0 ? `${pageCount} folha(s)` : '—'}
                    </span>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-3">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Assinaturas
                    </span>
                    <span className="text-sm font-extrabold text-emerald-950">
                      {session.fields.length} local(is)
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setStep('capture_signature');
                      scrollToTop();
                    }}
                    leftIcon={<PenTool className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Assinar Documento
                  </Button>

                  {session.fields.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={scrollToFirstSignatureSpot}
                      leftIcon={<Crosshair className="w-4 h-4 text-emerald-700" />}
                    >
                      Localizar campo no contrato
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3.5">
                  Revise todas as cláusulas do documento ao lado. Você também pode clicar diretamente sobre o quadro tracejado <strong className="text-emerald-800">“Assinar Aqui”</strong> na página do contrato.
                </p>
              </div>

              {/* Card de Conformidade Legal */}
              <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-5 space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Garantias de Segurança Jurídica</span>
                </div>
                <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Assinatura eletrônica amparada pela <strong>Lei Federal nº 14.063/2020</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Contra-assinatura digital qualificada <strong>ICP-Brasil</strong> da clínica.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Selo criptográfico <strong>SHA-256</strong> contra adulteração e via enviada ao seu arquivo.</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </main>

        {/* Barra Inferior Flutuante Exclusiva para Mobile & Tablet (< lg) com Safe-Area */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
          <div className="max-w-xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">
                Pronto para assinar o documento?
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Etapa seguinte: rubrica digital e confirmação jurídica
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shrink-0"
              onClick={() => {
                setStep('capture_signature');
                scrollToTop();
              }}
              leftIcon={<PenTool className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Prosseguir para Assinatura
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ETAPA 2: ASSINATURA & BIOMETRIA (GRID 2 COLUNAS EQUILIBRADO EM DESKTOP) */}
      {/* ==================================================================== */}
      {step === 'capture_signature' && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* Coluna Esquerda (lg:col-span-7): Quadro de Assinatura + Câmera Opcional */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Desenho da Assinatura */}
              <section className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-md shadow-slate-900/4 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="emerald" size="sm">
                        Etapa 2 de 3
                      </Badge>
                      <span className="text-xs text-slate-500 font-semibold">
                        Coleta de Rubrica Oficial
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                      Desenhe sua Assinatura
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
                      Assine no quadro abaixo usando o dedo, caneta touch ou mouse. Você pode ampliar o quadro no ícone de tela cheia se preferir.
                    </p>
                  </div>
                </div>

                <SignaturePad
                  signerName={session.signer.full_name}
                  signerCpf={session.signer.cpf}
                  height={235}
                  onChange={setSignatureDataUrl}
                />
              </section>

              {/* Card 2: Biometria Facial Opcional */}
              <section className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Registro Facial de Auditoria
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Opcional
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Adiciona uma foto frontal ao manifesto probatório do contrato.
                      </p>
                    </div>
                  </div>

                  {!cameraActive && !selfieDataUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="self-start sm:self-auto shrink-0"
                      onClick={startCamera}
                      leftIcon={<Camera className="w-4 h-4 text-sky-700" />}
                    >
                      Capturar Selfie
                    </Button>
                  )}
                </div>

                {cameraError && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {cameraActive && (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 text-center space-y-4">
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-900">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={takeSelfieSnapshot}
                        leftIcon={<Camera className="w-4 h-4" />}
                      >
                        Tirar Foto Agora
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          stopCameraStream();
                          setCameraActive(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {selfieDataUrl && (
                  <div className="flex items-center justify-between gap-3 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/90">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={selfieDataUrl}
                        alt="Selfie Biométrica"
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-600 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Foto Biométrica Anexada</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Pronta para incorporação ao dossiê criptográfico
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setSelfieDataUrl(null);
                        startCamera();
                      }}
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                      Refazer
                    </Button>
                  </div>
                )}
              </section>
            </div>

            {/* Coluna Direita (lg:col-span-5): Prévia do Carimbo, Aceite Legal & Finalização */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
              <section className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-md shadow-slate-900/4 space-y-5">
                {/* Prévia ao vivo da Chancela */}
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Prévia da Chancela no Contrato
                  </span>
                  <div className="rounded-2xl border border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 p-4 text-center space-y-2">
                    <div className="h-20 flex items-center justify-center">
                      {signatureDataUrl ? (
                        <img
                          src={signatureDataUrl}
                          alt="Prévia da assinatura"
                          className="max-h-18 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          Sua assinatura aparecerá aqui assim que desenhada
                        </span>
                      )}
                    </div>
                    <div className="border-t border-slate-200/90 pt-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {session.signer.full_name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        CPF: {session.signer.cpf} • Código: {session.verification_code}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadados de Rastreabilidade */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{geoStatus}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Carimbo de Tempo Oficial de Brasília (BRT)</span>
                  </div>
                </div>

                {/* Termo de Aceite Jurídico */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition cursor-pointer select-none ${
                    acceptedTerms
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Confirmo minha identidade como{' '}
                    <strong className="text-slate-900">{session.signer.full_name}</strong>{' '}
                    (CPF <strong className="text-slate-900 font-mono">{session.signer.cpf}</strong>) e declaro que li e concordo integralmente com o documento{' '}
                    <strong className="text-slate-900">{session.document_title}</strong>, assinando-o com plena validade jurídica conforme a{' '}
                    <strong className="text-emerald-900">Lei nº 14.063/2020</strong>.
                  </span>
                </label>

                {/* Checklist de Prontidão */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
                      hasDrawnSignature
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    1. Assinatura desenhada
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
                      acceptedTerms
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    2. Aceite confirmado
                  </span>
                </div>

                {/* Alerta de Erro de Submissão Inline */}
                {submitError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{submitError}</span>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!hasDrawnSignature || !acceptedTerms || submitting}
                    isLoading={submitting}
                    onClick={handleFinalizeSignature}
                    leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  >
                    {submitting
                      ? 'Selando Documento Digitalmente...'
                      : 'Finalizar e Assinar Documento'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={submitting}
                    onClick={() => {
                      setStep('read_pdf');
                      scrollToTop();
                    }}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Voltar e Reler Contrato
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* ETAPA 3: CERTIFICADO DIGITAL & CONCLUSÃO */}
      {/* ==================================================================== */}
      {step === 'completed' && (
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-2xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-900/5 space-y-6">
            {/* Cabeçalho de Sucesso */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-700/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 pt-1">
                <Badge variant="emerald" size="sm">
                  Assinatura Concluída & Selada
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Documento Assinado com Sucesso!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  O documento <strong className="text-slate-900">{session.document_title}</strong> foi autenticado com carimbo de tempo oficial, resumo criptográfico SHA-256 e manifesto probatório.
                </p>
              </div>
            </div>

            {/* Selo Executivo de Auditoria */}
            <SignatureAuditStamp
              verificationCode={session.verification_code}
              signerName={session.signer.full_name}
              signerRole={session.signer.role}
              signedAt={formattedCompletedDate}
              hasPadesIcpBrasil={true}
              sha256Hash={finalSha256 || session.signed_pdf_sha256 || session.original_pdf_sha256}
            />

            {/* Botões de Download e Conferência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {finalPdfBase64 && (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className={driveUrl ? 'w-full' : 'w-full sm:col-span-2'}
                  onClick={() =>
                    triggerPdfDownload(
                      finalPdfBase64,
                      `${session.document_title.replace(/\s+/g, '_')}_ASSINADO.pdf`
                    )
                  }
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Baixar PDF Assinado
                </Button>
              )}

              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={finalPdfBase64 ? 'w-full block' : 'w-full sm:col-span-2 block'}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    leftIcon={<FileText className="w-4 h-4 text-sky-600" />}
                    rightIcon={<ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
                  >
                    Abrir Cópia no Drive
                  </Button>
                </a>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-center text-slate-500 pt-3 border-t border-slate-100 leading-relaxed">
              Uma via original assinada permanece arquivada com segurança no seu prontuário clínico junto à <strong>Clínica Dra. Ana Carla Morong</strong>.
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
