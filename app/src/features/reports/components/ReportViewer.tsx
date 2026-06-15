import { ReactNode, useState } from "react";
import { Printer, X, FileText, Settings2 } from "lucide-react";

interface ReportViewerProps {
  onClose: () => void;
  orientation?: "portrait" | "landscape";
  onOrientationChange?: (orientation: "portrait" | "landscape") => void;
  children: ReactNode; // Deve ser um ReportDocumentLayout
}

export function ReportViewer({ onClose, orientation = "portrait", onOrientationChange, children }: ReportViewerProps) {
  const [internalOrientation, setInternalOrientation] = useState<"portrait" | "landscape">(orientation);

  const activeOrientation = onOrientationChange ? orientation : internalOrientation;
  const handleOrientationChange = (o: "portrait" | "landscape") => {
    if (onOrientationChange) {
      onOrientationChange(o);
    } else {
      setInternalOrientation(o);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex print:static print:bg-transparent print:block overflow-hidden print:overflow-visible print:h-auto">
      
      {/* SIDEBAR DE CONFIGURAÇÕES (Oculto na impressão) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col no-print shadow-xl h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold flex items-center gap-2 text-gray-800">
            <Settings2 size={18} />
            Exportar Relatório
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 space-y-6">
          {/* Rotação / Formato */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
              <FileText size={14} /> Formato da Página
            </h3>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeOrientation === "portrait" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => handleOrientationChange("portrait")}
              >
                Retrato (Vertical)
              </button>
              <button 
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeOrientation === "landscape" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => handleOrientationChange("landscape")}
              >
                Paisagem (Horiz.)
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={handlePrint}
            className="w-full btn btn-primary flex justify-center items-center py-2"
          >
            <Printer size={18} className="mr-2" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ÁREA DE PREVIEW (Visível e única na impressão) */}
      <div className="flex-1 overflow-y-auto bg-gray-200 flex justify-center p-8 print:p-0 print:bg-transparent print:block print:overflow-visible relative">
        {/* Folha A4 simulada */}
        <div className="bg-white shadow-2xl transition-all duration-300 print:shadow-none print:w-full print:max-w-none print:m-0" 
             style={{ 
               width: activeOrientation === "landscape" ? "297mm" : "210mm",
               minHeight: activeOrientation === "landscape" ? "210mm" : "297mm",
               margin: "0 auto"
             }}>
          {children}
        </div>
      </div>
      
      {/* Oculta scrollbars do body enquanto modal está aberto */}
      <style>{`
        body { overflow: hidden; }
        @media print {
          body { overflow: visible; }
          
          @page {
            size: A4 ${activeOrientation};
            margin: 10mm 15mm;
          }
          
          /* Garantir que o body e o html permitam ao layout usar o espaço físico da folha */
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .report-print-root {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
