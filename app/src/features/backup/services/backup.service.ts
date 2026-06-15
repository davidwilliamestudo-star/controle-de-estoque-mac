import { appDataDir, join } from '@tauri-apps/api/path';
import { stat, copyFile } from '@tauri-apps/plugin-fs';
import { save, open } from '@tauri-apps/plugin-dialog';

export interface DatabaseInfo {
  path: string;
  sizeBytes: number;
  lastModified?: Date;
}

const DB_FILENAME = "estoque.db";

export const backupService = {
  /**
   * Retrieves information about the current SQLite database file.
   */
  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const dataDir = await appDataDir();
    const dbPath = await join(dataDir, DB_FILENAME);
    
    try {
      const fileStat = await stat(dbPath);
      return {
        path: dbPath,
        sizeBytes: fileStat.size,
        lastModified: fileStat.mtime ? new Date(fileStat.mtime) : undefined,
      };
    } catch (error) {
      console.error("Error reading db stat:", error);
      throw new Error("Não foi possivel obter informacoes do banco de dados local.");
    }
  },

  /**
   * Prompts the user to select a destination, then copies the database file to it.
   */
  async exportBackup(): Promise<string | null> {
    try {
      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, DB_FILENAME);

      const destination = await save({
        title: "Salvar Backup do Sistema",
        defaultPath: `backup_anamorong_${new Date().toISOString().split('T')[0]}.db`,
        filters: [{
          name: "Banco de Dados SQLite",
          extensions: ["db", "sqlite"]
        }]
      });

      if (!destination) {
        return null; // User cancelled
      }

      await copyFile(dbPath, destination);
      return destination;
    } catch (error) {
      console.error("Error exporting backup:", error);
      throw new Error("Falha ao exportar o backup. Verifique as permissoes do diretorio.");
    }
  },

  /**
   * Prompts the user to select a backup file, then copies it over the current database.
   */
  async restoreBackup(): Promise<boolean> {
    try {
      const source = await open({
        title: "Selecionar arquivo de Backup",
        multiple: false,
        filters: [{
          name: "Banco de Dados SQLite",
          extensions: ["db", "sqlite"]
        }]
      });

      if (!source || Array.isArray(source)) {
        return false; // User cancelled or selected multiple
      }

      // Verify if the selected file is valid
      const sourceStat = await stat(source);
      if (sourceStat.size === 0) {
        throw new Error("O arquivo de backup esta vazio.");
      }

      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, DB_FILENAME);

      await copyFile(source, dbPath);
      return true;
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      throw new Error(error.message || "Falha ao restaurar o backup.");
    }
  },

  /**
   * Cria um backup silencioso (sem dialogs) para rollback de importacoes falhas.
   */
  async createSilentBackup(): Promise<string> {
    try {
      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, DB_FILENAME);
      const backupPath = await join(dataDir, `${DB_FILENAME}.import_backup`);
      
      await copyFile(dbPath, backupPath);
      return backupPath;
    } catch (error) {
      console.error("Error creating silent backup:", error);
      throw new Error("Falha ao criar backup de seguranca.");
    }
  },

  /**
   * Restaura silenciosamente o backup gerado por createSilentBackup.
   */
  async restoreSilentBackup(backupPath: string): Promise<void> {
    try {
      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, DB_FILENAME);
      
      await copyFile(backupPath, dbPath);
    } catch (error) {
      console.error("Error restoring silent backup:", error);
      throw new Error("Falha critica ao tentar reverter importacao via backup.");
    }
  }
};
