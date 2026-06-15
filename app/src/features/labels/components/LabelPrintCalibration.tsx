import { useState } from "react";
import { Printer, Settings, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LabelTemplate } from "@/features/inventory/types";
import { labelsService } from "../services/labels.service";

interface LabelPrintCalibrationProps {
  template: LabelTemplate;
  onTestPrint: () => void;
}

export function LabelPrintCalibration({ template, onTestPrint }: LabelPrintCalibrationProps) {
  const queryClient = useQueryClient();
  const [offsetX, setOffsetX] = useState(template.calibration_x || 0);
  const [offsetY, setOffsetY] = useState(template.calibration_y || 0);

  const mutation = useMutation({
    mutationFn: () => labelsService.updateTemplateCalibration(template.id, offsetX, offsetY),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      // Também poderíamos invalidar o job se necessário, mas o job já tem o template atrelado
    },
  });

  const handleSave = () => {
    mutation.mutate();
  };

  const hasChanges = offsetX !== (template.calibration_x || 0) || offsetY !== (template.calibration_y || 0);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title flex-row gap-2">
            <Settings size={18} />
            Calibração de Impressão
          </h3>
          <p className="card-description">
            Ajuste o deslocamento para evitar cortes na impressora.
          </p>
        </div>
      </div>
      
      <div className="flex-row gap-4 items-end mt-4">
        <div className="form-group flex-1">
          <label>Deslocamento Horizontal X (mm)</label>
          <input
            type="number"
            step="0.5"
            className="input"
            value={offsetX}
            onChange={(e) => setOffsetX(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="form-group flex-1">
          <label>Deslocamento Vertical Y (mm)</label>
          <input
            type="number"
            step="0.5"
            className="input"
            value={offsetY}
            onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
          />
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={handleSave} 
          disabled={!hasChanges || mutation.isPending}
        >
          <Save size={16} />
          Salvar
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-4">
          Imprima uma folha de teste para verificar o alinhamento. Certifique-se de configurar a escala para <strong>100%</strong> ou <strong>Padrão</strong> nas configurações da sua impressora.
        </p>
        <button className="btn btn-secondary w-full justify-center" onClick={onTestPrint}>
          <Printer size={16} />
          Imprimir Folha de Teste
        </button>
      </div>
    </div>
  );
}
