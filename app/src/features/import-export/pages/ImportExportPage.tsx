import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileClock, FileSpreadsheet, UploadCloud } from "lucide-react";
import { ExportPanel } from "../components/ExportPanel";
import { ImportWizard } from "../components/ImportWizard";
import { dataImportService } from "../services/dataImport.service";
import type { DataImportJob } from "../types/importExport.types";

type ImportExportTab = "dashboard" | "import" | "export" | "history";

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<ImportExportTab>("dashboard");
  const [jobs, setJobs] = useState<DataImportJob[]>([]);

  useEffect(() => {
    if (activeTab === "history" || activeTab === "dashboard") {
      dataImportService.listJobs(10).then(setJobs).catch(() => setJobs([]));
    }
  }, [activeTab]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="btn btn-ghost">
            <ArrowLeft size={16} /> Configuracoes
          </Link>
          <div>
            <h1 className="page-title">Importacao e Exportacao</h1>
            <p className="page-subtitle">Entrada e saida local de dados por CSV, com validacao, backup e auditoria.</p>
          </div>
        </div>
      </div>

      <div className="tabs mb-6">
        <button className={`tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Visao geral</button>
        <button className={`tab ${activeTab === "import" ? "active" : ""}`} onClick={() => setActiveTab("import")}>Importar</button>
        <button className={`tab ${activeTab === "export" ? "active" : ""}`} onClick={() => setActiveTab("export")}>Exportar e modelos</button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>Historico</button>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid-3">
            <button type="button" className="card text-left hover:shadow-md transition-shadow" onClick={() => setActiveTab("import")}>
              <div className="icon-box mb-4"><UploadCloud size={24} /></div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-gray-900)" }}>Importar CSV</h2>
              <p className="text-sm mt-2" style={{ color: "var(--color-gray-500)" }}>
                Revise colunas, erros e duplicidades antes de gravar qualquer dado.
              </p>
            </button>

            <button type="button" className="card text-left hover:shadow-md transition-shadow" onClick={() => setActiveTab("export")}>
              <div className="icon-box mb-4"><Download size={24} /></div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-gray-900)" }}>Exportar dados</h2>
              <p className="text-sm mt-2" style={{ color: "var(--color-gray-500)" }}>
                Gere CSVs locais de pacientes, estoque, fornecedores e protocolos.
              </p>
            </button>

            <button type="button" className="card text-left hover:shadow-md transition-shadow" onClick={() => setActiveTab("history")}>
              <div className="icon-box mb-4"><FileClock size={24} /></div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-gray-900)" }}>Historico</h2>
              <p className="text-sm mt-2" style={{ color: "var(--color-gray-500)" }}>
                Consulte jobs de importacao, status e contagens aplicadas.
              </p>
            </button>
          </div>

          <div className="card">
            <h3 className="text-base font-bold mb-3" style={{ color: "var(--color-gray-900)" }}>
              <FileSpreadsheet size={18} style={{ display: "inline", marginRight: 8 }} />
              Regras de seguranca
            </h3>
            <div className="grid-3">
              <div className="empty-state compact">
                <div className="empty-state-title">100% local</div>
                <div className="empty-state-description">Nenhum arquivo CSV e enviado para servidor externo.</div>
              </div>
              <div className="empty-state compact">
                <div className="empty-state-title">Backup antes de gravar</div>
                <div className="empty-state-description">Falhas criticas restauram o banco anterior automaticamente.</div>
              </div>
              <div className="empty-state compact">
                <div className="empty-state-title">Auditoria</div>
                <div className="empty-state-description">Validacoes, importacoes e exportacoes ficam registradas.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "import" && <ImportWizard onCancel={() => setActiveTab("dashboard")} />}
      {activeTab === "export" && <ExportPanel />}

      {activeTab === "history" && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--color-gray-900)" }}>Historico de importacoes</h2>
          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">Nenhuma importacao registrada</div>
              <div className="empty-state-description">Os jobs aparecem aqui depois da primeira validacao CSV.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Modulo</th>
                    <th>Status</th>
                    <th>Linhas</th>
                    <th>Criados</th>
                    <th>Atualizados</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id}>
                      <td>{job.fileName ?? "-"}</td>
                      <td>{job.importType}</td>
                      <td><span className="badge badge-info">{job.status}</span></td>
                      <td>{job.totalRows}</td>
                      <td>{job.createdCount}</td>
                      <td>{job.updatedCount}</td>
                      <td>{new Date(job.createdAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
