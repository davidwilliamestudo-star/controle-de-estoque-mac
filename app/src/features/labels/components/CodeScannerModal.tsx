/**
 * CodeScannerModal.tsx
 *
 * Modal reutilizável com câmera ao vivo para leitura de QR Codes e/ou
 * códigos de barras. Usa o hook useCodeScanner internamente.
 *
 * Props:
 *   isOpen           → controla visibilidade
 *   onClose          → callback ao fechar (câmera é parada automaticamente)
 *   onScan           → callback com { text, format } quando um código é lido
 *   mode             → "qr" | "barcode" | "any" (padrão: "qr")
 *   preferredDeviceId→ deviceId salvo nas settings (opcional)
 *   title            → título exibido no modal (opcional)
 */

import { useEffect, useRef, useState } from "react";
import { Camera, Square, X, ChevronDown } from "lucide-react";
import { useCodeScanner, type ScannerMode, type ScannedCode } from "../hooks/useCodeScanner";

interface CodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: ScannedCode) => void;
  mode?: ScannerMode;
  preferredDeviceId?: string;
  title?: string;
}

export function CodeScannerModal({
  isOpen,
  onClose,
  onScan,
  mode = "qr",
  preferredDeviceId,
  title,
}: CodeScannerModalProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState(preferredDeviceId ?? "");
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    videoRef,
    isScanning,
    isLoading,
    statusMessage,
    cameras,
    startScanner,
    stopScanner,
  } = useCodeScanner({
    mode,
    deviceId: selectedDeviceId || undefined,
    onDecode: (code) => {
      onScan(code);
      onClose();
    },
  });

  // ESC fecha o modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Parar câmera ao fechar modal
  function handleClose() {
    stopScanner();
    onClose();
  }

  // Click fora fecha modal
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  }

  const modeLabel =
    mode === "qr"
      ? "QR Code"
      : mode === "barcode"
      ? "Código de Barras"
      : "QR Code ou Código de Barras";

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-white, #fff)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-gray-100, #f0f0f0)",
            background: "linear-gradient(135deg, var(--color-green-deep, #1e6b4a) 0%, #2d8a60 100%)",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Camera size={20} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {title ?? `Leitor de ${modeLabel}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              color: "#fff",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Fechar leitor"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video area */}
        <div style={{ position: "relative", background: "#0a0a0a" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              display: "block",
              objectFit: "cover",
            }}
          />

          {/* Mira animada — só visível durante scan */}
          {isScanning && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ position: "relative", width: 220, height: 220 }}>
                {/* Cantos da mira */}
                {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map((corner) => (
                  <div
                    key={corner}
                    style={{
                      position: "absolute",
                      width: 32,
                      height: 32,
                      borderColor: "var(--color-green-deep, #1e6b4a)",
                      borderStyle: "solid",
                      borderWidth: 0,
                      ...(corner === "topLeft" && { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }),
                      ...(corner === "topRight" && { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }),
                      ...(corner === "bottomLeft" && { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }),
                      ...(corner === "bottomRight" && { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }),
                    }}
                  />
                ))}
                {/* Linha de scan animada */}
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    right: 8,
                    height: 2,
                    background: "linear-gradient(90deg, transparent, var(--color-green-deep, #1e6b4a), transparent)",
                    animation: "scanLine 2s ease-in-out infinite",
                    top: "50%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Estado de câmera desligada */}
          {!isScanning && !isLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <Camera size={48} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 14 }}>Câmera desligada</span>
            </div>
          )}
        </div>

        {/* Controles */}
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Seletor de câmera (aparece só quando há > 1 câmera disponível) */}
          {cameras.length > 1 && (
            <div style={{ position: "relative" }}>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (isScanning) stopScanner();
                }}
                style={{
                  width: "100%",
                  padding: "8px 36px 8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-gray-200, #e5e5e5)",
                  fontSize: 14,
                  appearance: "none",
                  backgroundColor: "var(--color-gray-50, #fafafa)",
                  cursor: "pointer",
                }}
              >
                <option value="">Câmera padrão do sistema</option>
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--color-gray-400, #9ca3af)",
                }}
              />
            </div>
          )}

          {/* Status */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "var(--color-gray-50, #fafafa)",
              border: "1px solid var(--color-gray-100, #f0f0f0)",
              fontSize: 13,
              color: "var(--color-gray-600, #4b5563)",
              minHeight: 36,
              display: "flex",
              alignItems: "center",
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--color-green-deep)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Iniciando câmera...
              </span>
            ) : (
              statusMessage
            )}
          </div>

          {/* Ações */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => void startScanner()}
              disabled={isScanning || isLoading}
            >
              <Camera size={16} />
              {isLoading ? "Iniciando..." : "Iniciar leitura"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={stopScanner}
              disabled={!isScanning && !isLoading}
            >
              <Square size={14} />
              Parar
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
            >
              <X size={14} />
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Animações CSS inline */}
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-80px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
