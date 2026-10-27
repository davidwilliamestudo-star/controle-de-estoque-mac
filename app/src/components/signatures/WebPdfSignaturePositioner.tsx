// src/components/signatures/WebPdfSignaturePositioner.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  PenTool,
  Stamp,
  ShieldCheck,
  Calendar,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Send,
  TabletSmartphone,
  GripHorizontal,
  User,
  Check,
} from 'lucide-react';

// Configuração do Worker PDF.js para Next.js / Vite Web
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export type SignerRoleType = 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA';
export type SignatureFieldType = 'signature' | 'initials' | 'icp_seal' | 'date_stamp';

export interface WebSignerConfig {
  id: string;
  role: SignerRoleType;
  fullName: string;
  cpf: string;
  email?: string;
  phoneWhatsapp?: string;
  colorHex: string;
}

export interface SignatureFieldPosition {
  id: string;
  signer_id: string;
  field_type: SignatureFieldType;
  page: number;           // 1-based
  x_percent: number;      // 0.00 a 100.00
  y_percent: number;      // 0.00 a 100.00
  width_percent: number;  // 0.00 a 100.00
  height_percent: number; // 0.00 a 100.00
}

interface WebPdfSignaturePositionerProps {
  pdfUrlOrBase64: string;
  documentTitle: string;
  signers: WebSignerConfig[];
  initialFields?: SignatureFieldPosition[];
  onSaveDraft?: (fields: SignatureFieldPosition[]) => Promise<void>;
  onLaunchInPersonMode: (fields: SignatureFieldPosition[]) => Promise<void>;
  onDispatchRemoteLinks: (fields: SignatureFieldPosition[]) => Promise<void>;
}

type InteractionState =
  | {
      mode: 'drag';
      fieldId: string;
      pointerId: number;
      startX: number;
      startY: number;
      initialXPercent: number;
      initialYPercent: number;
    }
  | {
      mode: 'resize';
      fieldId: string;
      pointerId: number;
      startX: number;
      startY: number;
      initialWidthPercent: number;
      initialHeightPercent: number;
    }
  | null;

export const WebPdfSignaturePositioner: React.FC<WebPdfSignaturePositionerProps> = ({
  pdfUrlOrBase64,
  documentTitle,
  signers,
  initialFields = [],
  onSaveDraft,
  onLaunchInPersonMode,
  onDispatchRemoteLinks,
}) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [activeSignerId, setActiveSignerId] = useState<string>(signers[0]?.id || '');
  const [fields, setFields] = useState<SignatureFieldPosition[]>(initialFields);
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // 1. Carrega o documento PDF (aceita URL pública/R2 ou Base64)
  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      try {
        let loadingTask: pdfjsLib.PDFDocumentLoadingTask;

        if (
          pdfUrlOrBase64.startsWith('http://') ||
          pdfUrlOrBase64.startsWith('https://')
        ) {
          loadingTask = pdfjsLib.getDocument({ url: pdfUrlOrBase64 });
        } else {
          const cleanBase64 = pdfUrlOrBase64.replace(
            /^data:application\/pdf;base64,/,
            ''
          );
          const binary = window.atob(cleanBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        }

        const doc = await loadingTask.promise;
        if (!isMounted) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        renderPdfPage(1, scale, doc);
      } catch (error) {
        console.error('Erro ao carregar PDF no posicionador:', error);
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [pdfUrlOrBase64]);

  // 2. Renderiza a página atual considerando o devicePixelRatio (nitidez Retina/iPad)
  const renderPdfPage = useCallback(
    async (pageNumber: number, zoomScale: number, doc = pdfDocRef.current) => {
      if (!doc || !canvasRef.current) return;
      const page = await doc.getPage(pageNumber);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoomScale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
    },
    []
  );

  useEffect(() => {
    renderPdfPage(currentPage, scale);
  }, [currentPage, scale, renderPdfPage]);

  // 3. Adiciona novo campo na página ativa
  const addFieldToCurrentPage = (fieldType: SignatureFieldType) => {
    if (!activeSignerId) return;

    const presets: Record<SignatureFieldType, { w: number; h: number }> = {
      signature: { w: 28, h: 8.5 },
      initials: { w: 14, h: 5.5 },
      icp_seal: { w: 32, h: 9.5 },
      date_stamp: { w: 18, h: 5.0 },
    };

    const { w, h } = presets[fieldType];
    const newField: SignatureFieldPosition = {
      id: crypto.randomUUID(),
      signer_id: activeSignerId,
      field_type: fieldType,
      page: currentPage,
      x_percent: 36,
      y_percent: 76,
      width_percent: w,
      height_percent: h,
    };

    setFields((prev) => [...prev, newField]);
  };

  // 4. Posicionamento Inteligente (Rubricas nas páginas 1..N-1 e Assinaturas na página N)
  const handleSmartTemplatePlacement = () => {
    if (initialFields && initialFields.length > 0) {
      setFields(initialFields.map((f) => ({ ...f, id: crypto.randomUUID() })));
      const sigPage = initialFields.find((f) => f.field_type === 'signature')?.page ?? numPages;
      setCurrentPage(sigPage);
      return;
    }

    const generated: SignatureFieldPosition[] = [];
    const paciente = signers.find((s) => s.role === 'PACIENTE');
    const draAna = signers.find((s) => s.role === 'DRA_ANA');

    // Rubricas nas páginas anteriores posicionadas na zona segura de rodapé
    for (let p = 1; p < numPages; p++) {
      if (paciente) {
        generated.push({
          id: crypto.randomUUID(),
          signer_id: paciente.id,
          field_type: 'initials',
          page: p,
          x_percent: 74,
          y_percent: 86,
          width_percent: 11,
          height_percent: 3.2,
        });
      }
      if (draAna) {
        generated.push({
          id: crypto.randomUUID(),
          signer_id: draAna.id,
          field_type: 'initials',
          page: p,
          x_percent: 86,
          y_percent: 86,
          width_percent: 11,
          height_percent: 3.2,
        });
      }
    }

    // Assinaturas verticais centralizadas na página final com distanciamento generoso e sem colisão
    if (draAna) {
      generated.push({
        id: crypto.randomUUID(),
        signer_id: draAna.id,
        field_type: 'signature',
        page: numPages,
        x_percent: 28,
        y_percent: 38,
        width_percent: 44,
        height_percent: 6.8,
      });
    }

    if (paciente) {
      generated.push({
        id: crypto.randomUUID(),
        signer_id: paciente.id,
        field_type: 'signature',
        page: numPages,
        x_percent: 28,
        y_percent: 54,
        width_percent: 44,
        height_percent: 6.8,
      });
    }

    setFields(generated);
    setCurrentPage(numPages);
  };

  // 5. Início de Drag ou Resize (Suporte unificado Mouse + Touch / Apple Pencil)
  const handleStartDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    field: SignatureFieldPosition
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteraction({
      mode: 'drag',
      fieldId: field.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialXPercent: field.x_percent,
      initialYPercent: field.y_percent,
    });
  };

  const handleStartResize = (
    e: React.PointerEvent<HTMLDivElement>,
    field: SignatureFieldPosition
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteraction({
      mode: 'resize',
      fieldId: field.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialWidthPercent: field.width_percent,
      initialHeightPercent: field.height_percent,
    });
  };

  // 6. Movimento em Tempo Real Convertido para Percentual (0 a 100%)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interaction || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - interaction.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - interaction.startY) / rect.height) * 100;

    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== interaction.fieldId) return field;

        if (interaction.mode === 'drag') {
          const nextX = Math.max(
            0,
            Math.min(100 - field.width_percent, interaction.initialXPercent + deltaXPercent)
          );
          const nextY = Math.max(
            0,
            Math.min(100 - field.height_percent, interaction.initialYPercent + deltaYPercent)
          );
          return {
            ...field,
            x_percent: Number(nextX.toFixed(2)),
            y_percent: Number(nextY.toFixed(2)),
          };
        } else {
          const nextW = Math.max(
            8,
            Math.min(100 - field.x_percent, interaction.initialWidthPercent + deltaXPercent)
          );
          const nextH = Math.max(
            4,
            Math.min(100 - field.y_percent, interaction.initialHeightPercent + deltaYPercent)
          );
          return {
            ...field,
            width_percent: Number(nextW.toFixed(2)),
            height_percent: Number(nextH.toFixed(2)),
          };
        }
      })
    );
  };

  const handlePointerUp = () => {
    if (interaction) {
      setInteraction(null);
    }
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const getFieldTitle = (type: SignatureFieldType) => {
    switch (type) {
      case 'signature':
        return 'Assinatura';
      case 'initials':
        return 'Rubrica / Visto';
      case 'icp_seal':
        return 'Chancela ICP-Brasil';
      case 'date_stamp':
        return 'Carimbo de Data';
    }
  };

  return (
    <div
      className="flex flex-row h-full w-full bg-slate-100/70 text-slate-900 overflow-hidden"
      style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}
    >
      {/* ================================================================== */}
      {/* PAINEL LATERAL DE CONTROLE (SIDEBAR CLARA, ESPAÇOSA E LUXUOSA) */}
      {/* ================================================================== */}
      <aside
        className="w-[380px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden z-10 shadow-xs"
        style={{ width: '380px', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* CABEÇALHO FIXO DO PAINEL */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Web Signer ICP-Brasil
            </span>
            <span className="text-[11px] font-bold text-slate-600 font-mono">
              Etapa 2 de 3
            </span>
          </div>
          <h2 className="text-sm font-extrabold text-slate-900 mt-2 truncate leading-snug" title={documentTitle}>
            {documentTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Posicione as assinaturas e rubricas sobre o contrato.
          </p>
        </div>

        {/* CORPO ROLÁVEL COM CONTROLES */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 min-h-0">
          {/* 1. SELEÇÃO DO SIGNATÁRIO ATIVO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                1. Quem vai assinar?
              </label>
              <span className="text-[10px] text-slate-600 font-medium">Selecione para vincular</span>
            </div>

            <div className="space-y-2">
              {signers.map((s) => {
                const selected = s.id === activeSignerId;
                const initials = s.fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSignerId(s.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      selected
                        ? 'bg-emerald-50/80 border-emerald-600 shadow-xs ring-4 ring-emerald-600/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: s.colorHex }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            selected ? 'text-emerald-950 font-extrabold' : 'text-slate-900'
                          }`}
                        >
                          {s.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {s.role === 'DRA_ANA'
                            ? 'Médica Contratada'
                            : s.role === 'PACIENTE'
                            ? 'Paciente Contratante'
                            : 'Testemunha'}{' '}
                          • CPF: {s.cpf}
                        </p>
                      </div>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. INSERIR CAIXA NA PÁGINA ATUAL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                2. Inserir na Página {currentPage}
              </label>
              <span className="text-[10px] text-slate-600 font-medium">Clique para adicionar</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Assinatura */}
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('signature')}
                className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 transition-all flex items-center gap-2.5 text-left group shadow-2xs cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors shadow-2xs">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-sky-950 leading-tight">Assinatura</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Manuscrita</p>
                </div>
              </button>

              {/* Rubrica */}
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('initials')}
                className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 transition-all flex items-center gap-2.5 text-left group shadow-2xs cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs">
                  <Stamp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-950 leading-tight">Rubrica</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Visto em folha</p>
                </div>
              </button>

              {/* Selo ICP-Brasil */}
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('icp_seal')}
                className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 transition-all flex items-center gap-2.5 text-left group shadow-2xs cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 leading-tight">Selo ICP</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Certificado</p>
                </div>
              </button>

              {/* Data */}
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('date_stamp')}
                className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-purple-50/80 border border-slate-200 hover:border-purple-300 transition-all flex items-center gap-2.5 text-left group shadow-2xs cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-purple-950 leading-tight">Data</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Carimbo</p>
                </div>
              </button>
            </div>

            {/* BOTÃO DE PADRÃO CLÍNICO AUTOMÁTICO */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSmartTemplatePlacement}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                Posicionar Padrão Clínico Automático
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-1.5 leading-tight">
                Aplica automaticamente rubricas nas páginas 1 a {Math.max(1, numPages - 1)} e assinaturas na folha final.
              </p>
            </div>
          </div>

          {/* 3. LISTA DE CAIXAS FIXADAS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Caixas Fixadas ({fields.length})
              </label>
              {fields.length > 0 && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {fields.filter((f) => f.page === currentPage).length} nesta pág.
                </span>
              )}
            </div>

            {fields.length === 0 ? (
              <div className="py-5 px-3 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
                <PenTool className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-500">Nenhum campo inserido</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Clique nos botões acima para inserir.</p>
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {fields.map((f) => {
                  const signer = signers.find((s) => s.id === f.signer_id);
                  const isThisPage = f.page === currentPage;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setCurrentPage(f.page)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isThisPage
                          ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: signer?.colorHex || '#0284c7' }}
                        />
                        <span className="font-semibold text-slate-800 truncate text-[11px]">
                          Pág. {f.page} • {getFieldTitle(f.field_type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {signer?.fullName.split(' ')[0]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(f.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remover caixa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DA SIDEBAR: AÇÕES DE DISPARO (SEMPRE VISÍVEIS) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 space-y-2 shrink-0">
          <button
            type="button"
            disabled={fields.length === 0 || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onLaunchInPersonMode(fields);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer active:scale-98"
          >
            <TabletSmartphone className="w-4 h-4" />
            Coletar no Tablet / Consultório Agora
          </button>

          <button
            type="button"
            disabled={fields.length === 0 || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onDispatchRemoteLinks(fields);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
          >
            <Send className="w-3.5 h-3.5 text-sky-600" />
            Gerar Link Remoto (/assinar/:token)
          </button>

          {onSaveDraft && (
            <button
              type="button"
              onClick={() => onSaveDraft(fields)}
              className="w-full py-0.5 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition cursor-pointer text-center block"
            >
              Salvar Posições como Modelo Padrão
            </button>
          )}
        </div>
      </aside>

      {/* ================================================================== */}
      {/* ÁREA PRINCIPAL DO VISUALIZADOR PDF + OVERLAY INTERATIVO */}
      {/* ================================================================== */}
      <main className="flex-1 flex flex-col bg-slate-100/90 overflow-hidden min-w-0">
        {/* BARRA SUPERIOR DE PAGINAÇÃO E ZOOM */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs z-10">
          {/* Paginação */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer shadow-2xs"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-1 select-none">
              Página <strong className="text-slate-900 font-extrabold">{currentPage}</strong> de <strong className="text-slate-900 font-extrabold">{numPages}</strong>
            </span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer shadow-2xs"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dica Central */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full select-none">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Arraste ou redimensione as caixas diretamente sobre o documento</span>
          </div>

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 w-12 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* WORKSPACE COM A FOLHA RENDERIZADA */}
        <div
          className="flex-1 overflow-auto p-6 md:p-10 flex justify-center items-start"
          style={{
            backgroundImage: 'radial-gradient(rgba(100, 116, 139, 0.22) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundColor: '#f1f5f9',
          }}
        >
          <div className="relative shadow-2xl rounded-xs border border-slate-300 bg-white select-none">
            <canvas ref={canvasRef} className="block shadow-xs" />

            {/* Overlay Interativo Normalizado (0 a 100%) */}
            <div
              ref={overlayRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0"
            >
              {fields
                .filter((f) => f.page === currentPage)
                .map((field) => {
                  const signer = signers.find((s) => s.id === field.signer_id);
                  const color = signer?.colorHex || '#0284c7';

                  return (
                    <div
                      key={field.id}
                      onPointerDown={(e) => handleStartDrag(e, field)}
                      style={{
                        left: `${field.x_percent}%`,
                        top: `${field.y_percent}%`,
                        width: `${field.width_percent}%`,
                        height: `${field.height_percent}%`,
                        borderColor: color,
                        backgroundColor: `${color}18`,
                      }}
                      className="absolute border-2 border-dashed rounded-lg cursor-grab active:cursor-grabbing touch-none flex flex-col justify-between p-1.5 shadow-md group backdrop-blur-[0.5px] select-none transition-shadow hover:shadow-lg"
                    >
                      {/* Cabeçalho da Caixa */}
                      <div className="flex items-center justify-between gap-1 pointer-events-none">
                        <span
                          style={{ backgroundColor: color }}
                          className="text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-xs truncate max-w-[85%]"
                        >
                          {signer?.fullName || 'Signatário'}
                        </span>

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => removeField(field.id)}
                          className="pointer-events-auto bg-rose-600 hover:bg-rose-500 text-white rounded p-1 shadow-xs transition cursor-pointer"
                          title="Remover caixa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Rótulo Central */}
                      <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold text-[11px] pointer-events-none">
                        <GripHorizontal className="w-3.5 h-3.5 opacity-50" />
                        <span className="truncate">{getFieldTitle(field.field_type)}</span>
                      </div>

                      {/* Rodapé de Coordenadas + Handle de Redimensionamento */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 font-semibold pointer-events-none px-0.5">
                        <span>
                          {field.x_percent.toFixed(0)}%, {field.y_percent.toFixed(0)}%
                        </span>
                        <span className="text-[8px] uppercase tracking-wider text-slate-600">
                          {field.width_percent.toFixed(0)}x{field.height_percent.toFixed(0)}
                        </span>
                      </div>

                      {/* Alça de Redimensionamento (Canto Inferior Direito) */}
                      <div
                        onPointerDown={(e) => handleStartResize(e, field)}
                        style={{ backgroundColor: color }}
                        className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md cursor-nwse-resize touch-none flex items-center justify-center shadow-xs"
                        title="Arraste para redimensionar"
                      >
                        <span className="w-1.5 h-1.5 border-r-2 border-b-2 border-white" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
