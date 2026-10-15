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
  const [geoStatus, setGeoStatus] = useState<string>('Aguardando localização...');
  const [finalPdfBase64, setFinalPdfBase64] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);

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

  // 2. Renderiza todas as páginas do PDF para leitura fluida no celular/iPad
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
          const viewport = page.getViewport({ scale: 1.3 });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'relative mb-4 shadow-xl rounded-lg overflow-hidden border border-slate-700 bg-white mx-auto max-w-full';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'w-full h-auto block';

          const ctx = canvas.getContext('2d')!;
          await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
          pageWrapper.appendChild(canvas);

          // Destaca os locais onde a assinatura será aplicada
          const pageFields = session.fields.filter((f) => f.page === pageNum);
          for (const f of pageFields) {
            const badge = document.createElement('div');
            badge.style.left = `${f.x_percent}%`;
            badge.style.top = `${f.y_percent}%`;
            badge.style.width = `${f.width_percent}%`;
            badge.style.height = `${f.height_percent}%`;
            badge.className =
              'absolute border-2 border-emerald-500 bg-emerald-500/15 rounded flex items-center justify-center text-[10px] font-bold text-emerald-900 pointer-events-none';
            badge.innerText = 'Local da sua Assinatura';
            pageWrapper.appendChild(badge);
          }

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

  // 3. Captura Geolocalização quando entra no modal de assinatura
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
            `Localização validada (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
        },
        () => {
          setGeoStatus('Localização aproximada via IP de rede');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [step]);

  // 4. Funções do Canvas Touch-Friendly de Assinatura
  const initCanvasCtx = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.0;
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
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.82);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-slate-300">Carregando ambiente seguro de assinatura...</p>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-10 h-10 text-rose-400 mb-3" />
        <h1 className="text-lg font-bold">Documento Indisponível</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-md">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER FIXO MOBILE-FIRST */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Clínica Dra. Ana Morong
            </p>
            <h1 className="text-sm font-bold text-white truncate">
              {session.document_title}
            </h1>
          </div>
        </div>
        <span className="text-[11px] font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-300 shrink-0">
          {session.verification_code}
        </span>
      </header>

      {/* ETAPA 1: LEITURA DO DOCUMENTO PDF */}
      <div style={{ display: step === 'read_pdf' ? 'contents' : 'none' }}>
        <main className="flex-1 p-3 md:p-6 max-w-3xl w-full mx-auto pb-28">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-300">
                Signatário: <strong className="text-white">{session.signer.full_name}</strong>
              </p>
              <p className="text-slate-400">CPF: {session.signer.cpf}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
              {session.fields.length} campo(s) para assinar
            </span>
          </div>

          <div ref={pdfContainerRef} className="w-full" />
        </main>

        {/* Barra Inferior Flutuante para Iniciar Assinatura */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs hidden sm:block">
              <p className="font-semibold text-white">Pronto para assinar?</p>
              <p className="text-slate-400">
                Revise o documento acima antes de prosseguir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('capture_signature')}
              className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition"
            >
              <PenTool className="w-4 h-4" />
              Assinar Documento Agora
            </button>
          </div>
        </div>
      </div>

      {/* ETAPA 2: CANVAS TOUCH DE ASSINATURA + SELFIE + GEOLOCALIZAÇÃO */}
      {step === 'capture_signature' && (
        <main className="flex-1 p-4 max-w-xl w-full mx-auto space-y-5 pb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Desenhe sua Assinatura ou Rubrica
                </h2>
                <p className="text-xs text-slate-400">
                  Use o dedo na tela do celular/tablet ou o mouse.
                </p>
              </div>
              <button
                type="button"
                onClick={clearSignaturePad}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1.5 text-slate-200"
              >
                <Eraser className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>

            {/* Quadro do Canvas Touch-Friendly */}
            <div className="bg-white rounded-xl overflow-hidden border-2 border-emerald-500 shadow-inner">
              <canvas
                ref={signatureCanvasRef}
                width={600}
                height={220}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-48 touch-none cursor-crosshair block"
              />
            </div>

            {/* Captura Opcional de Selfie Biométrica */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-white">
                    Foto de Confirmação Biométrica (Opcional)
                  </span>
                </div>
                {!cameraActive && !selfieDataUrl && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-medium"
                  >
                    Abrir Câmera
                  </button>
                )}
              </div>

              {cameraActive && (
                <div className="space-y-2 text-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-48 h-48 object-cover rounded-xl mx-auto border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={takeSelfieSnapshot}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold"
                  >
                    Capturar Foto
                  </button>
                </div>
              )}

              {selfieDataUrl && (
                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={selfieDataUrl}
                      alt="Selfie Biométrica"
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-500"
                    />
                    <span className="text-xs text-emerald-400 font-medium">
                      Biometria facial anexada ao dossiê
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieDataUrl(null);
                      startCamera();
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refazer
                  </button>
                </div>
              )}
            </div>

            {/* Status da Geolocalização */}
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{geoStatus}</span>
            </div>

            {/* Checkbox de Aceite Jurídico */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                Confirmo minha identidade como <strong>{session.signer.full_name}</strong> (CPF:{' '}
                {session.signer.cpf}) e declaro que li e concordo com os termos do documento{' '}
                <strong>{session.document_title}</strong>, assinando-o eletronicamente com plena
                validade jurídica conforme a <strong>Lei nº 14.063/2020</strong>.
              </span>
            </label>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('read_pdf')}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Voltar ao Texto
              </button>
              <button
                type="button"
                disabled={!hasDrawnSignature || !acceptedTerms || submitting}
                onClick={handleFinalizeSignature}
                className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Selando Documento e Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar e Assinar
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ETAPA 3: CONFIRMAÇÃO DE DOCUMENTO ASSINADO */}
      {step === 'completed' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Documento Assinado com Sucesso!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O documento <strong>{session.document_title}</strong> foi selado com Manifesto de
              Auditoria e QR Code (Código: <strong>{session.verification_code}</strong>). Uma cópia
              também foi enviada para seu e-mail e arquivada no prontuário da clínica.
            </p>

            {finalPdfBase64 && (
              <a
                href={`data:application/pdf;base64,${finalPdfBase64}`}
                download={`${session.document_title.replace(/\s+/g, '_')}_ASSINADO.pdf`}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <Download className="w-4 h-4" />
                Baixar PDF Assinado com Manifesto
              </a>
            )}

            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                Visualizar Cópia Arquivada no Google Drive
              </a>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
