import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateStatus {
  available: boolean;
  version?: string;
  body?: string;
  updateObj?: Update | null;
  error?: string;
}

export const updaterService = {
  async checkForUpdates(): Promise<UpdateStatus> {
    if (!isTauri()) {
      return { available: false, updateObj: null };
    }
    try {
      const update = await check();
      if (update && update.available) {
        return {
          available: true,
          version: update.version,
          body: update.body,
          updateObj: update,
        };
      }
      return { available: false, updateObj: null };
    } catch (err: any) {
      console.warn("Auto-updater check skipped or failed:", err?.message || err);
      return { available: false, error: String(err?.message || err) };
    }
  },

  async installUpdate(
    update: Update,
    onProgress?: (progress: { downloaded: number; contentLength?: number }) => void
  ): Promise<void> {
    let downloaded = 0;
    let contentLength: number | undefined = undefined;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength;
          if (onProgress) onProgress({ downloaded: 0, contentLength });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          if (onProgress) onProgress({ downloaded, contentLength });
          break;
        case "Finished":
          if (onProgress) onProgress({ downloaded, contentLength });
          break;
      }
    });

    await relaunch();
  },
};
