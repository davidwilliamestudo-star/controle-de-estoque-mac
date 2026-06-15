/**
 * useCodeScanner.ts
 *
 * Hook reutilizável para leitura de QR Codes e códigos de barras via câmera.
 *
 * Usa BrowserMultiFormatReader do @zxing/browser — suporta todos os formatos:
 * QR Code, EAN-13, EAN-8, Code128, Code39, Data Matrix, PDF417, Aztec, etc.
 *
 * Modos:
 *   "qr"      → filtra apenas QR_CODE e DATA_MATRIX
 *   "barcode" → filtra lineares (EAN, Code128, Code39, ITF, etc.)
 *   "any"     → aceita qualquer formato decodificado
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";

export type ScannerMode = "qr" | "barcode" | "any";

export interface ScannedCode {
  text: string;
  format: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseScannerOptions {
  mode?: ScannerMode;
  deviceId?: string;
  onDecode: (code: ScannedCode) => void;
  onError?: (message: string) => void;
}

// Mapeamento de formatos ZXing por modo
const QR_FORMATS = new Set([
  "QR_CODE",
  "DATA_MATRIX",
  "AZTEC",
  "PDF_417",
]);

const BARCODE_FORMATS = new Set([
  "EAN_13",
  "EAN_8",
  "CODE_128",
  "CODE_39",
  "CODE_93",
  "ITF",
  "CODABAR",
  "UPC_A",
  "UPC_E",
  "RSS_14",
  "RSS_EXPANDED",
]);

function formatMatchesMode(formatName: string, mode: ScannerMode): boolean {
  if (mode === "any") return true;
  if (mode === "qr") return QR_FORMATS.has(formatName);
  if (mode === "barcode") return BARCODE_FORMATS.has(formatName);
  return true;
}

export function useCodeScanner({
  mode = "qr",
  deviceId,
  onDecode,
  onError,
}: UseScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDecodedRef = useRef("");
  const mountedRef = useRef(true);

  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Câmera desligada.");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);

  // Garante cleanup ao desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Libera os tracks da câmera e desconecta o elemento de vídeo.
   */
  function stopActiveStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  /**
   * Para o scanner e libera todos os recursos da câmera.
   */
  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    stopActiveStream();
    if (mountedRef.current) {
      setIsScanning(false);
      setStatusMessage("Câmera desligada.");
    }
  }, []);

  /**
   * Converte erros de MediaDevices em mensagens amigáveis.
   */
  function friendlyError(error: unknown): string {
    if (!(error instanceof Error)) return "Não foi possível iniciar a câmera.";

    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Permissão da câmera negada. Vá em Configurações > Leitor de Códigos e verifique se o acesso está liberado.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Nenhuma câmera encontrada. Conecte uma webcam ou configure o iPhone como câmera do sistema (Continuity Camera).";
      case "NotReadableError":
      case "TrackStartError":
        return "A câmera está em uso por outro aplicativo. Feche-o e tente novamente.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "A câmera não suporta a resolução solicitada. O sistema tentará com configuração padrão.";
      case "SecurityError":
        return "A câmera foi bloqueada pela segurança do sistema. Tente atualizar o instalador do app.";
      default:
        return error.message || "Não foi possível iniciar a câmera.";
    }
  }

  /**
   * Solicita acesso ao stream de vídeo, com fallback para constraints básicas.
   */
  async function requestStream(preferredDeviceId?: string): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Este sistema não suporta captura de câmera (getUserMedia indisponível).");
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: preferredDeviceId
        ? { deviceId: { exact: preferredDeviceId } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")
      ) {
        // Fallback: sem constraints avançadas
        return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      throw err;
    }
  }

  /**
   * Enumera os dispositivos de câmera disponíveis.
   * Deve ser chamado APÓS o usuário ter concedido permissão (labels ficam disponíveis só depois).
   */
  async function listCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Câmera ${idx + 1}`,
      }));
  }

  /**
   * Inicia o scanner de câmera.
   */
  const startScanner = useCallback(async () => {
    if (!videoRef.current || isScanning || isLoading) return;

    setIsLoading(true);
    setStatusMessage("Solicitando acesso à câmera...");
    lastDecodedRef.current = "";
    stopActiveStream();

    try {
      const stream = await requestStream(deviceId);

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      // Enumerar câmeras disponíveis (agora que temos permissão)
      const found = await listCameras();
      if (mountedRef.current) setCameras(found);

      // Importar lazy para não aumentar o bundle principal
      const { BrowserMultiFormatReader } = await import("@zxing/browser");

      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 200,
        delayBetweenScanSuccess: 800,
      });

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, _err, activeControls) => {
          if (!result) return;

          const text = result.getText().trim();
          const formatName = BarcodeFormat[result.getBarcodeFormat()] ?? "UNKNOWN";

          // Filtrar por modo antes de processar
          if (!formatMatchesMode(formatName, mode)) return;

          // Evitar disparar o mesmo código repetidamente
          if (!text || text === lastDecodedRef.current) return;

          lastDecodedRef.current = text;

          // Parar scanner automaticamente após leitura bem-sucedida
          activeControls.stop();
          controlsRef.current = null;
          stopActiveStream();

          if (mountedRef.current) {
            setIsScanning(false);
            setStatusMessage(`Código lido: ${formatName}`);
          }

          onDecode({ text, format: formatName });
        }
      );

      controlsRef.current = controls;

      if (mountedRef.current) {
        setIsScanning(true);
        const modeLabel =
          mode === "qr" ? "QR Code" : mode === "barcode" ? "código de barras" : "QR Code ou código de barras";
        setStatusMessage(`Aponte a câmera para o ${modeLabel}.`);
      }
    } catch (error) {
      if (!mountedRef.current) return;

      const msg = friendlyError(error);
      setStatusMessage(msg);
      onError?.(msg);

      controlsRef.current = null;
      stopActiveStream();
      setIsScanning(false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, mode, isScanning, isLoading, onDecode, onError]);

  return {
    videoRef,
    isScanning,
    isLoading,
    statusMessage,
    cameras,
    startScanner,
    stopScanner,
  };
}
