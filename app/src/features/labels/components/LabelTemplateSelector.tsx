import type { LabelTemplate } from "@/features/inventory/types";

interface LabelTemplateSelectorProps {
  templates: LabelTemplate[];
  value: string;
  onChange: (templateId: string) => void;
}

export function LabelTemplateSelector({ templates, value, onChange }: LabelTemplateSelectorProps) {
  return (
    <div className="form-group">
      <label className="form-label">Modelo de etiqueta</label>
      <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {templates.map(template => (
          <option key={template.id} value={template.id}>
            {template.name} - {template.width_mm} x {template.height_mm} mm
          </option>
        ))}
      </select>
    </div>
  );
}

