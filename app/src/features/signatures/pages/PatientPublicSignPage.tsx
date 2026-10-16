// src/features/signatures/pages/PatientPublicSignPage.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ShieldCheck,
  PenTool,
  Camera,
  MapPin,
  CheckCircle2,
  Eraser,
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
  Smartphone,
  Calendar,
  User,
  Eye,
  AlertCircle,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PublicSigningSession {
  document_id: string;
  document_title: string;
  verification_code: string;
  original_pdf_url: string;
  original_pdf_sha256: string;
  signer: {
    id: string;
    full_name: string;
    cpf: string;
    role: string;
    status: 'pending' | 'signed';
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

export default function PatientPublicSignPage({ token: propToken }: PatientPublicSignPageProps) {
  // Obtém o token por props ou pela URL (compatível com TanStack Router, Next.js e navegador puro)
  const [token, setToken] = useState<string>(propToken || '');

  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      const assinarIndex = parts.indexOf('assinar');
      if (assinarIndex !== -1 && parts[assinarIndex + 1]) {
        setToken(parts[assinarIndex + 1]);
      }
    }
  }, [token]);

  const [session, setSession] = useState<PublicSigningSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Controle de Etapas: 'read_pdf' -> 'capture_signature' -> 'completed'
  const [step, setStep] = useState<'read_pdf' | 'capture_signature' | 'completed'>('read_pdf');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Dados Coletados do Paciente
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Obtendo localização segura...');
  const [finalPdfBase64, setFinalPdfBase64] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Refs para PDF, Canvas de Assinatura e Vídeo da Câmera
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // 1. Carrega os dados da sessão pelo Token único
  useEffect(() => {
    if (!token) return;

    const fetchSession = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/assinar/${encodeURIComponent(token)}`);
        if (!res.ok) {
          throw new Error('Link de assinatura inválido, expirado ou já utilizado.');
        }
        const data: PublicSigningSession = await res.json();
        setSession(data);
        if (data.signer.status === 'signed') {
          setStep('completed');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Erro ao carregar documento.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [token]);

  // 2. Renderiza todas as páginas do PDF com qualidade nítida Retina/Mobile
  useEffect(() => {
    let isCancelled = false;
    const container = pdfContainerRef.current;
    if (!session?.original_pdf_url || !container) return;

    const renderAllPages = async () => {
      try {
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

        // Limpeza segura dos filhos
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (isCancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.4 });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'relative mb-6 shadow-md rounded-2xl overflow-hidden border border-slate-200/90 bg-white mx-auto max-w-full transition-all';

          // Cabeçalho da página com indicador discreto
          const pageHeader = document.createElement('div');
          pageHeader.className =
            'bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-500';
          pageHeader.innerHTML = `<span>Folha Oficial • Dra. Ana Morong</span><span>Página ${pageNum} de ${pdf.numPages}</span>`;
          pageWrapper.appendChild(pageHeader);

          const canvasWrapper = document.createElement('div');
          canvasWrapper.className = 'relative';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'w-full h-auto block';

          const ctx = canvas.getContext('2d')!;
          await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
          canvasWrapper.appendChild(canvas);

          // Destaca os locais onde a assinatura será aplicada
          const pageFields = session.fields.filter((f) => f.page === pageNum);
          for (const f of pageFields) {
            const badge = document.createElement('div');
            badge.style.left = `${f.x_percent}%`;
            badge.style.top = `${f.y_percent}%`;
            badge.style.width = `${f.width_percent}%`;
            badge.style.height = `${f.height_percent}%`;
            badge.className =
              'absolute border-2 border-emerald-600 border-dashed bg-emerald-500/15 rounded-xl flex items-center justify-center text-[10px] font-bold text-emerald-900 pointer-events-none shadow-xs backdrop-blur-[0.5px] animate-pulse';
            badge.innerHTML = `<span class="bg-emerald-700 text-white px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight shadow-xs">Sua Assinatura</span>`;
            canvasWrapper.appendChild(badge);
          }

          pageWrapper.appendChild(canvasWrapper);

          if (isCancelled) return;
          container.appendChild(pageWrapper);
        }
      } catch (err) {
        console.error('Erro ao renderizar PDF:', err);
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
  }, [session]);

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
            `Coordenadas autenticadas (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
        },
        () => {
          setGeoStatus('Localização validada via IP de rede e carimbo de tempo seguro');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGeoStatus('Localização validada via IP e carimbo de tempo ICP-Brasil');
    }
  }, [step]);

  // 4. Funções do Canvas Touch-Friendly de Assinatura
  const initCanvasCtx = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = signatureCanvasRef.current;
    const ctx = initCanvasCtx();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    isDrawingRef.current = true;
    setHasDrawnSignature(true);
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !signatureCanvasRef.current) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearSignaturePad = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  // 5. Captura de Selfie Biométrica Opcional (Câmera Frontal)
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setCameraActive(false);
    }
  };

  const takeSelfieSnapshot = () => {
    if (!videoRef.current) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = 360;
    offscreen.height = 360;
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, offscreen.width, offscreen.height);
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.85);
    setSelfieDataUrl(dataUrl);

    // Desliga os tracks da câmera após bater a foto
    const stream = videoRef.current.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  // 6. Submissão Final da Assinatura
  const handleFinalizeSignature = async () => {
    if (!session || !signatureCanvasRef.current || !hasDrawnSignature || !acceptedTerms) {
      return;
    }

    try {
      setSubmitting(true);
      const signaturePngBase64 = signatureCanvasRef.current.toDataURL('image/png');

      const res = await fetch(`/api/assinar/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_png_base64: signaturePngBase64,
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
      setDriveUrl(result.drive_file_url || null);
      setStep('completed');
    } catch (err: any) {
      alert(err?.message || 'Erro ao finalizar assinatura.');
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

  // Tela de Carregamento Elegante
  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-emerald-700 mb-4 animate-bounce">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          <span>Acessando ambiente seguro de assinatura...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 font-medium">
          Dra. Ana Carla Morong • Protocolo Criptográfico SHA-256
        </p>
      </div>
    );
  }

  // Tela de Erro / Indisponível
  if (errorMsg || !session) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800"
        style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
      >
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200/80 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Documento Indisponível
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMsg || 'Este link de assinatura é inválido ou já foi finalizado anteriormente.'}
          </p>
          <div className="pt-2">
            <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              Em caso de dúvidas, consulte a recepção da clínica
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col"
      style={{ fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)' }}
    >
      {/* ==================================================================== */}
      {/* TOPBAR ELEGANTE COM DESIGN SYSTEM CLÍNICO OFICIAL */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                Dra. Ana Carla Morong
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                • Medicina & Longevidade
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight mt-0.5">
              {session.document_title}
            </h1>
          </div>
        </div>

        {/* CÓDIGO DE VERIFICAÇÃO & SELO JURÍDICO */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Validade Jurídica Lei nº 14.063/2020</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 hidden sm:inline">
              Autenticação:
            </span>
            <span className="font-mono font-bold text-emerald-900 text-xs">
              {session.verification_code}
            </span>
            <button
              type="button"
              onClick={copyVerificationCode}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title="Copiar Código de Autenticação"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* STEPPER DINÂMICO MODERNO (INDICADOR VISUAL DE ETAPAS) */}
      {/* ==================================================================== */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          
          {/* ETAPA 1 */}
          <div
            onClick={() => step !== 'completed' && setStep('read_pdf')}
            className={`flex items-center gap-2.5 cursor-pointer group transition select-none ${
              step === 'read_pdf' ? 'opacity-100' : 'opacity-70 hover:opacity-90'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                step === 'read_pdf'
                  ? 'bg-emerald-700 text-white ring-4 ring-emerald-600/15'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {step === 'capture_signature' || step === 'completed' ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                '1'
              )}
            </div>
            <div>
              <p
                className={`text-xs font-bold ${
                  step === 'read_pdf' ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                1. Leitura do Contrato
              </p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Revisão de Cláusulas</p>
            </div>
          </div>

          {/* DIVISOR */}
          <div className="flex-1 mx-3 sm:mx-6 h-0.5 bg-slate-200 relative">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: step === 'read_pdf' ? '0%' : step === 'capture_signature' ? '50%' : '100%',
              }}
            />
          </div>

          {/* ETAPA 2 */}
          <div
            onClick={() => step === 'capture_signature' && setStep('capture_signature')}
            className={`flex items-center gap-2.5 select-none ${
              step === 'capture_signature' ? 'opacity-100' : 'opacity-70'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                step === 'capture_signature'
                  ? 'bg-emerald-700 text-white ring-4 ring-emerald-600/15'
                  : step === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step === 'completed' ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </div>
            <div>
              <p
                className={`text-xs font-bold ${
                  step === 'capture_signature' ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                2. Assinatura & Biometria
              </p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Coleta e Validação</p>
            </div>
          </div>

          {/* DIVISOR */}
          <div className="flex-1 mx-3 sm:mx-6 h-0.5 bg-slate-200 relative">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: step === 'completed' ? '100%' : '0%',
              }}
            />
          </div>

          {/* ETAPA 3 */}
          <div
            className={`flex items-center gap-2.5 select-none ${
              step === 'completed' ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                step === 'completed'
                  ? 'bg-emerald-700 text-white ring-4 ring-emerald-600/15'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <div>
              <p
                className={`text-xs font-bold ${
                  step === 'completed' ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                3. Certificado & Conclusão
              </p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Dossiê e Manifesto</p>
            </div>
          </div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* ETAPA 1: LEITURA DO DOCUMENTO PDF COM CARDS ESPAÇOSOS E PREVIEW REAL */}
      {/* ==================================================================== */}
      <div style={{ display: step === 'read_pdf' ? 'contents' : 'none' }}>
        <main className="flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto pb-36 space-y-6">
          
          {/* BANNER INFORMATIVO DO SIGNATÁRIO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 shadow-2xs">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                  Signatário Convidado
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {session.signer.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  CPF: <strong className="text-slate-700 font-mono">{session.signer.cpf}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-900">
              <PenTool className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{session.fields.length} local(is) demarcado(s) para assinatura</span>
            </div>
          </div>

          {/* DICA DE REVISÃO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Por favor, role para baixo e leia os termos deste contrato. Ao final da leitura, clique no botão para assinar digitalmente.
            </span>
          </div>

          {/* CONTÊINER ONDE AS PÁGINAS DO PDF SÃO RENDERIZADAS */}
          <div ref={pdfContainerRef} className="w-full space-y-4" />

        </main>

        {/* BARRA INFERIOR FLUTUANTE (CALL TO ACTION ESPAÇOSA E COM CONTRASTE) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-4 px-4 sm:px-8 shadow-2xl">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs text-center sm:text-left">
              <p className="font-extrabold text-slate-900 text-sm">
                Leu e compreendeu todas as cláusulas?
              </p>
              <p className="text-slate-500 text-xs">
                Ao avançar, você desenhará sua assinatura ou rubrica oficial.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('capture_signature');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-800/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>Prosseguir para Assinatura Eletrônica</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ETAPA 2: CANVAS DE ASSINATURA TOUCH + BIOMETRIA + ACEITE JURÍDICO */}
      {/* ==================================================================== */}
      {step === 'capture_signature' && (
        <main className="flex-1 p-4 sm:p-8 max-w-2xl w-full mx-auto space-y-6 pb-16">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            
            {/* CABEÇALHO DO FORMULÁRIO */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Etapa 2 de 3
                </span>
                <span className="text-xs text-slate-500 font-semibold">• Coleta de Consentimento</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                Desenhe sua Assinatura Oficial
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Utilize o dedo na tela do celular/tablet ou o mouse. Ela será incorporada com carimbo de tempo às páginas do contrato.
              </p>
            </div>

            {/* QUADRO DO CANVAS TOUCH-FRIENDLY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Área de Desenho da Assinatura:
                  </span>
                  {hasDrawnSignature && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Assinatura Capturada
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearSignaturePad}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 active:scale-95 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Eraser className="w-3.5 h-3.5 text-slate-500" />
                  Limpar Traço
                </button>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden border-2 border-emerald-600/80 shadow-md relative group">
                <canvas
                  ref={signatureCanvasRef}
                  width={640}
                  height={220}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-full h-48 touch-none cursor-crosshair block bg-slate-50/20"
                />

                {/* Linha guia suave de assinatura */}
                <div className="absolute bottom-8 inset-x-8 border-b-2 border-dashed border-slate-300/80 pointer-events-none flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-sans tracking-wide">
                    Assine sobre a linha
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">✕</span>
                </div>
              </div>
            </div>

            {/* VALIDAÇÃO BIOMÉTRICA FACIAL (SELFIE OPCIONAL PARA AUDITORIA) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Foto de Confirmação Biométrica (Opcional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Anexa uma foto frontal ao dossiê de auditoria jurídica.
                    </p>
                  </div>
                </div>

                {!cameraActive && !selfieDataUrl && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Abrir Câmera
                  </button>
                )}
              </div>

              {cameraActive && (
                <div className="space-y-3 text-center bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-44 h-44 object-cover rounded-2xl mx-auto border-2 border-sky-500 shadow-md"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={takeSelfieSnapshot}
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Capturar Foto Agora
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const stream = videoRef.current?.srcObject as MediaStream | null;
                        stream?.getTracks().forEach((t) => t.stop());
                        setCameraActive(false);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {selfieDataUrl && (
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={selfieDataUrl}
                      alt="Selfie Biométrica"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-600 shadow-xs"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Biometria Facial Anexada
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Integrada ao manifesto do contrato
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieDataUrl(null);
                      startCamera();
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refazer
                  </button>
                </div>
              )}
            </div>

            {/* STATUS DA GEOLOCALIZAÇÃO & CARIMBO DE TEMPO */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-medium">{geoStatus}</span>
            </div>

            {/* CHECKBOX DE ACEITE JURÍDICO CLARO E DESTACADO */}
            <label className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/90 cursor-pointer hover:bg-emerald-50/70 transition">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-normal">
                Confirmo expressamente minha identidade como{' '}
                <strong className="text-slate-900 font-bold">{session.signer.full_name}</strong>{' '}
                (portador(a) do CPF: <strong className="text-slate-900 font-mono">{session.signer.cpf}</strong>) e declaro que li, compreendi e concordo integralmente com todas as cláusulas do documento{' '}
                <strong className="text-slate-900 font-bold">{session.document_title}</strong>,
                assinando-o eletronicamente com plena validade jurídica conforme a{' '}
                <strong className="text-emerald-900 font-bold">Lei Federal nº 14.063/2020</strong>.
              </span>
            </label>

            {/* BOTÕES DE AÇÃO COM ESTILOS DE CONTRASTE E FEEDBACK */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('read_pdf');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="py-3 px-5 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-95 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar e Reler Contrato
              </button>

              <button
                type="button"
                disabled={!hasDrawnSignature || !acceptedTerms || submitting}
                onClick={handleFinalizeSignature}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-800/20 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Autenticando e Selando Documento...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Finalizar e Assinar com Selo Digital</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* ETAPA 3: CONFIRMAÇÃO DE CONCLUSÃO & MANIFESTO DE AUTENTICIDADE */}
      {/* ==================================================================== */}
      {step === 'completed' && (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
            
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Documento Oficial Selado
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Assinatura Registrada com Sucesso!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                O documento <strong className="text-slate-900">{session.document_title}</strong> foi
                autenticado digitalmente com carimbo de tempo inviolável e manifesto de auditoria.
              </p>
            </div>

            {/* CARD DO CÓDIGO DE VERIFICAÇÃO PÚBLICA */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Código de Autenticação Pública:
                </span>
                <span className="font-mono font-black text-base text-emerald-950">
                  {session.verification_code}
                </span>
              </div>
              <button
                type="button"
                onClick={copyVerificationCode}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar Código
                  </>
                )}
              </button>
            </div>

            {/* BOTÕES DE DOWNLOAD E VISUALIZAÇÃO */}
            <div className="space-y-3 pt-2">
              {finalPdfBase64 && (
                <a
                  href={`data:application/pdf;base64,${finalPdfBase64}`}
                  download={`${session.document_title.replace(/\s+/g, '_')}_ASSINADO.pdf`}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Contrato em PDF com Manifesto
                </a>
              )}

              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-5 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  Visualizar Cópia Arquivada no Google Drive
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>

            {/* NOTA DE SEGURANÇA */}
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              Uma via assinada também está salva com segurança no seu prontuário clínico junto à Dra. Ana Carla Morong.
            </p>

          </div>
        </main>
      )}

    </div>
  );
}
