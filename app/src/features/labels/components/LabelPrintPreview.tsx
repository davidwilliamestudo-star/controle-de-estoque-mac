import { Printer } from "lucide-react";
import type { LabelPrintJobDetails, LabelTemplate } from "@/features/inventory/types";
import { LabelPreview } from "./LabelPreview";

interface LabelPrintPreviewProps {
  job?: LabelPrintJobDetails;
  template?: LabelTemplate;
  isTest?: boolean;
  startPosition?: number;
}

export function LabelPrintPreview({ job, template: propTemplate, isTest, startPosition = 1 }: LabelPrintPreviewProps) {
  const activeTemplate = job?.template || propTemplate;
  if (!activeTemplate) return null;

  // Max labels per sheet
  const maxLabels = activeTemplate.columns * activeTemplate.rows;
  
  // Create an array representing the sheet positions (1 to maxLabels)
  const sheetPositions = Array.from({ length: maxLabels }, (_, i) => i + 1);
  
  // Real items to print
  let itemsToPrint = job?.items.flatMap(item => 
    Array.from({ length: item.quantity }, (_, index) => ({
      key: `${item.id}-${index}`,
      item,
    }))
  ) || [];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{job ? job.job_name : "Folha de Teste"}</h3>
          <p className="card-description">
            {job 
              ? `${job.total_labels} etiqueta(s) usando ${activeTemplate.name}.` 
              : `Alinhamento para ${activeTemplate.name}.`
            }
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir
        </button>
      </div>

      <div className="label-print-container">
        <div
          className="label-sheet"
          style={{
            width: activeTemplate.paper_size === 'Letter' ? '215.9mm' : '210mm',
            height: activeTemplate.paper_size === 'Letter' ? '279.4mm' : '297mm',
            gridTemplateColumns: `repeat(${activeTemplate.columns}, ${activeTemplate.width_mm}mm)`,
            gridTemplateRows: `repeat(${activeTemplate.rows}, ${activeTemplate.height_mm}mm)`,
            columnGap: `${activeTemplate.gap_x_mm}mm`,
            rowGap: `${activeTemplate.gap_y_mm}mm`,
            paddingTop: `calc(${activeTemplate.margin_top_mm}mm + ${activeTemplate.calibration_y || 0}mm)`,
            paddingLeft: `calc(${activeTemplate.margin_left_mm}mm + ${activeTemplate.calibration_x || 0}mm)`,
          }}
        >
          {sheetPositions.map(pos => {
            if (isTest) {
              return <LabelPreview key={`pos-${pos}`} template={activeTemplate} isTest position={pos} />;
            }
            
            // Check if this position should have a label
            if (pos >= startPosition && itemsToPrint.length > 0) {
              const currentItem = itemsToPrint.shift()!;
              return <LabelPreview key={currentItem.key} item={currentItem.item} template={activeTemplate} />;
            }

            return <LabelPreview key={`pos-${pos}`} template={activeTemplate} item={null} />;
          })}
        </div>
      </div>
    </div>
  );
}

