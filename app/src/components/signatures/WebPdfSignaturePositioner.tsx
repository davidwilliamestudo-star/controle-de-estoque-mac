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
    const generated: SignatureFieldPosition[] = [];
    const paciente = signers.find((s) => s.role === 'PACIENTE');
    const draAna = signers.find((s) => s.role === 'DRA_ANA');

    for (let p = 1; p < numPages; p++) {
      if (paciente) {
        generated.push({
          id: crypto.randomUUID(),
          signer_id: paciente.id,
          field_type: 'initials',
          page: p,
          x_percent: 68,
          y_percent: 91,
          width_percent: 13,
          height_percent: 5,
        });
      }
      if (draAna) {
        generated.push({
          id: crypto.randomUUID(),
          signer_id: draAna.id,
          field_type: 'initials',
          page: p,
          x_percent: 83,
          y_percent: 91,
          width_percent: 13,
          height_percent: 5,
        });
      }
    }

    if (paciente) {
      generated.push({
        id: crypto.randomUUID(),
        signer_id: paciente.id,
        field_type: 'signature',
        page: numPages,
        x_percent: 10,
        y_percent: 78,
        width_percent: 36,
        height_percent: 9,
      });
    }

    if (draAna) {
      generated.push({
        id: crypto.randomUUID(),
        signer_id: draAna.id,
        field_type: 'icp_seal',
        page: numPages,
        x_percent: 54,
        y_percent: 78,
        width_percent: 36,
        height_percent: 9,
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] w-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* PAINEL LATERAL DE CONTROLE */}
      <aside className="w-full lg:w-84 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto shrink-0">
        <div className="space-y-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Dra. Ana Morong • Web Signer
            </span>
            <h2 className="text-base font-bold text-white truncate mt-0.5">
              {documentTitle}
            </h2>
          </div>

          {/* 1. Signatários */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Quem vai assinar o campo?
            </label>
            <div className="space-y-1.5">
              {signers.map((s) => {
                const selected = s.id === activeSignerId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSignerId(s.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-3 ${
                      selected
                        ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.colorHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{s.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {s.role} • CPF: {s.cpf}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Botões de Inserção de Marcadores */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Inserir Caixa na Página {currentPage}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('signature')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium transition"
              >
                <PenTool className="w-4 h-4 text-sky-400" />
                Assinatura
              </button>
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('initials')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium transition"
              >
                <Stamp className="w-4 h-4 text-amber-400" />
                Rubrica
              </button>
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('icp_seal')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Selo ICP-Brasil
              </button>
              <button
                type="button"
                onClick={() => addFieldToCurrentPage('date_stamp')}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium transition"
              >
                <Calendar className="w-4 h-4 text-purple-400" />
                Data
              </button>
            </div>

            <button
              type="button"
              onClick={handleSmartTemplatePlacement}
              className="w-full py-2 px-3 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Posicionar Padrão Clínico Automático
            </button>
          </div>

          {/* 3. Lista de Marcadores Ativos */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Caixas Fixadas ({fields.length})
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {fields.map((f) => {
                const signer = signers.find((s) => s.id === f.signer_id);
                return (
                  <div
                    key={f.id}
                    onClick={() => setCurrentPage(f.page)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: signer?.colorHex || '#38bdf8' }}
                      />
                      <span className="truncate">
                        Pág. {f.page} • {getFieldTitle(f.field_type)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ações de Disparo Presencial ou Remoto */}
        <div className="space-y-2 pt-4 border-t border-slate-800 mt-4">
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
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
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
            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <Send className="w-3.5 h-3.5" />
            Gerar Link Remoto (/assinar/:token)
          </button>

          {onSaveDraft && (
            <button
              type="button"
              onClick={() => onSaveDraft(fields)}
              className="w-full py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Salvar Posições como Template
            </button>
          )}
        </div>
      </aside>

      {/* ÁREA DO VISUALIZADOR PDF + OVERLAY DE COORDENADAS PERCENTUAIS */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {/* Barra Superior de Paginação e Zoom */}
        <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-300">
              Página <strong className="text-white">{currentPage}</strong> de {numPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Área Rolável com a Folha Renderizada */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start">
          <div className="relative shadow-2xl border border-slate-700 bg-white select-none">
            <canvas ref={canvasRef} className="block" />

            {/* Overlay Interativo Normalizado (0 a 100%) */}
            <div
              ref={overlayRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(15, 23, 42, 0.14) 1px, transparent 0)',
                backgroundSize: '18px 18px',
              }}
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
                        backgroundColor: `${color}24`,
                      }}
                      className="absolute border-2 border-dashed rounded-lg cursor-grab active:cursor-grabbing touch-none flex flex-col justify-between p-1.5 shadow-md group"
                    >
                      {/* Cabeçalho da Caixa */}
                      <div className="flex items-center justify-between gap-1 pointer-events-none">
                        <span
                          style={{ backgroundColor: color }}
                          className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate"
                        >
                          {signer?.fullName || 'Signatário'}
                        </span>

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => removeField(field.id)}
                          className="pointer-events-auto bg-rose-600 hover:bg-rose-500 text-white rounded p-0.5"
                          title="Remover caixa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Rótulo Central */}
                      <div className="flex items-center justify-center gap-1 text-slate-900 font-bold text-[11px] pointer-events-none">
                        <GripHorizontal className="w-3.5 h-3.5 opacity-60" />
                        <span className="truncate">{getFieldTitle(field.field_type)}</span>
                      </div>

                      {/* Rodapé de Coordenadas + Handle de Redimensionamento */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-700 pointer-events-none">
                        <span>
                          X:{field.x_percent.toFixed(0)}% Y:{field.y_percent.toFixed(0)}%
                        </span>
                      </div>

                      {/* Alça de Redimensionamento (Canto Inferior Direito) */}
                      <div
                        onPointerDown={(e) => handleStartResize(e, field)}
                        style={{ backgroundColor: color }}
                        className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md cursor-nwse-resize touch-none flex items-center justify-center shadow"
                        title="Arraste para redimensionar"
                      >
                        <span className="w-1.5 h-1.5 border-r border-b border-white" />
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
