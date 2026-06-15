import { useMemo } from "react";
import type { ReportData } from "@/features/integrations/apps-script/utils/reportEmailTemplates";
import { generateReportEmailHtml } from "@/features/integrations/apps-script/utils/reportEmailTemplates";

interface PatientApplicationReportPreviewProps {
  data: ReportData;
}

export function PatientApplicationReportPreview({ data }: PatientApplicationReportPreviewProps) {
  const htmlContent = useMemo(() => {
    return generateReportEmailHtml(data);
  }, [data]);

  return (
    <div className="report-preview-container" style={{
      border: '1px solid var(--color-gray-200)',
      borderRadius: '8px',
      overflow: 'hidden',
      height: '600px',
      maxHeight: '60vh',
      backgroundColor: '#f4f4f5'
    }}>
      <iframe
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent'
        }}
        title="Preview do Relatório"
      />
    </div>
  );
}
