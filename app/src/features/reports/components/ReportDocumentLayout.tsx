import { ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrandLogo } from "@/components/common/BrandLogo";

interface ReportDocumentLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ReportDocumentLayout({ title, subtitle, children }: ReportDocumentLayoutProps) {
  const currentDate = new Date();
  
  return (
    <div className="report-print-root bg-white relative font-sans text-gray-900 w-full max-w-full print:max-w-none print:w-full">
      {/* HEADER */}
      <header className="border-b-2 border-gray-100 pb-6 mb-6 flex justify-between items-start">
        <div className="flex flex-col">
          <BrandLogo variant="expanded" className="h-10 mb-2" />
          <p className="text-xs text-gray-500 max-w-sm mt-2">
            Clínica Dra. Ana Morong<br />
            Controle de Estoque e Prontuários
          </p>
        </div>
        
        <div className="text-right">
          <h1 className="text-xl font-bold" style={{ color: "var(--color-green-deep)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Gerado em: {format(currentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mb-12 w-full max-w-full">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="print-footer pt-4 border-t border-gray-100 text-center text-xs text-gray-400 bg-white">
        Documento gerado pelo sistema VOLTQ - Controle de Estoque
      </footer>
    </div>
  );
}
