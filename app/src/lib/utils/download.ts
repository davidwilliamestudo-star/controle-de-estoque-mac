import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export interface DownloadOptions {
  filename: string;
  content: string;
  mimeType?: string;
  filters?: { name: string; extensions: string[] }[];
}

/**
 * Baixa um arquivo com segurança, suportando tanto o ambiente Desktop (Tauri)
 * quanto o ambiente Web puro (Browser / Cloudflare Pages).
 */
export async function downloadFile({
  filename,
  content,
  mimeType = "text/plain;charset=utf-8",
  filters = [{ name: "Arquivo", extensions: ["*"] }],
}: DownloadOptions): Promise<string | null> {
  if (isTauri()) {
    try {
      const filePath = await save({
        title: "Salvar Arquivo",
        defaultPath: filename,
        filters,
      });

      if (!filePath) return null;
      await writeTextFile(filePath, content);
      return filePath;
    } catch (error) {
      console.warn("Falha ao salvar via Tauri dialog, tentando fallback do navegador:", error);
    }
  }

  // Fallback seguro para Web pura
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return filename;
  } catch (error) {
    console.error("Erro ao realizar download no navegador:", error);
    throw new Error("Não foi possível realizar o download do arquivo.");
  }
}
