/**
 * LabelQrScanner.tsx — v2
 *
 * Leitor de QR Code de etiquetas refatorado.
 *
 * Melhorias v2:
 * - Usa o hook useCodeScanner (BrowserMultiFormatReader) em vez de BrowserQRCodeReader
 * - Respeita as configurações scanner_enabled / scanner_mode / scanner_preferred_camera_id
 * - Usa CodeScannerModal para o preview de câmera
 * - Mostra dropdown de câmeras disponíveis após primeira permissão
 * - Mantém a busca manual por payload como fallback
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, ExternalLink, Search, AlertTriangle } from "lucide-react";
import { labelsService, type ResolvedBatchQr } from "../services/labels.service";
import { CodeScannerModal } from "./CodeScannerModal";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { ScannedCode } from "../hooks/useCodeScanner";

export function LabelQrScanner() {
  const { data: settings } = useSettings();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  const [decodedPayload, setDecodedPayload] = useState("");
  const [resolvedBatch, setResolvedBatch] = useState<ResolvedBatchQr | null>(null);
  const [status, setStatus] = useState("");

  // Configurações do scanner lidas das settings (com fallbacks seguros)
  const scannerEnabled = settings?.scanner_enabled ?? true;
  const scannerMode = settings?.scanner_mode ?? "qr";
  const preferredDeviceId = settings?.scanner_preferred_camera_id ?? "";

  async function resolvePayload(payload: string) {
    const normalized = payload.trim();
    if (!normalized) return;

    setDecodedPayload(normalized);
    setManualPayload(normalized);
    setResolvedBatch(null);
    setIsResolving(true);
    setStatus("Consultando lote no estoque...");

    try {
      const batch = await labelsService.resolveBatchQr(normalized);
      setResolvedBatch(batch);
      if (batch) {
        await navigate({ to: "/labels", search: { qr: normalized } });
      }
      setStatus(batch ? "Código lido — lote encontrado." : "Código lido, mas lote não encontrado no estoque.");
    } catch (error) {
      console.error("Erro ao resolver código de etiqueta", error);
      setStatus(error instanceof Error ? error.message : "Não foi possível consultar o código.");
    } finally {
      setIsResolving(false);
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolvePayload(manualPayload);
  }

  function handleScanSuccess(code: ScannedCode) {
    setStatus(`Código ${code.format} capturado com sucesso.`);
    void resolvePayload(code.text);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Leitor de QR Code</h3>
          <p className="card-description">
            Leia uma etiqueta impressa e consulte o lote no estoque.
          </p>
        </div>
        <Camera size={22} />
      </div>

      <div className="flex-col gap-4 mt-4">
        {/* Aviso quando leitor desativado nas configurações */}
        {!scannerEnabled ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 10,
              backgroundColor: "var(--color-warning-bg, #fffbeb)",
              border: "1px solid var(--color-warning-border, #fde68a)",
            }}
          >
            <AlertTriangle size={18} style={{ color: "var(--color-warning, #d97706)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--color-warning, #d97706)" }}>
                Leitor de câmera desativado
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-gray-600)" }}>
                Ative o leitor em{" "}
                <Link
                  to="/settings"
                  hash="scanner-settings"
                  style={{ color: "var(--color-green-deep)", textDecoration: "underline" }}
                >
                  Configurações → Leitor de Códigos
                </Link>{" "}
                para usar a câmera.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Botão de abrir câmera */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Camera size={18} />
              Escanear com câmera
            </button>

            {/* Modal de câmera */}
            <CodeScannerModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onScan={handleScanSuccess}
              mode={scannerMode}
              preferredDeviceId={preferredDeviceId}
              title="Leitor de Etiqueta"
            />
          </>
        )}

        {/* Busca manual por payload */}
        <form className="flex-row gap-2" onSubmit={handleManualSubmit}>
          <input
            className="input"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder="CESTQ:BATCH:{id_do_lote}"
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={isResolving || !manualPayload.trim()}
          >
            <Search size={18} />
            Consultar
          </button>
        </form>

        {/* Status */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <span className="text-sm text-gray-500">Status</span>
          <p className="font-semibold">
            {isResolving ? "Consultando..." : (status || "Aguardando leitura ou consulta manual.")}
          </p>
          {decodedPayload ? (
            <code className="text-sm text-gray-500 break-all">{decodedPayload}</code>
          ) : null}
        </div>

        {/* Resultado encontrado */}
        {resolvedBatch ? (
          <div className="grid-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <span className="text-sm text-gray-500">Item</span>
              <p className="font-semibold">{resolvedBatch.item_name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Lote</span>
              <p className="font-semibold">{resolvedBatch.batch_number}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Saldo</span>
              <p className="font-semibold">
                {resolvedBatch.current_quantity} {resolvedBatch.unit}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Validade</span>
              <p className="font-semibold">{resolvedBatch.expiration_date || "Sem validade"}</p>
            </div>
            <Link
              to="/labels"
              search={{ qr: decodedPayload }}
              className="btn btn-secondary"
            >
              <ExternalLink size={18} />
              Abrir consulta
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
