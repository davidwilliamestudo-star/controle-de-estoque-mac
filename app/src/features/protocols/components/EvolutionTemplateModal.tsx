import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Save, AlertCircle } from "lucide-react";
import { evolutionTemplateSchema, type EvolutionTemplateFormData } from "../schemas/protocol.schema";
import { useSaveEvolutionTemplate } from "../hooks/useEvolutionTemplates";
import type { EvolutionTemplate } from "../types";
import { useEffect } from "react";

interface EvolutionTemplateModalProps {
  template: EvolutionTemplate | null;
  onClose: () => void;
}

const AVAILABLE_VARIABLES = [
  { tag: "{{paciente_nome}}", desc: "Nome do paciente" },
  { tag: "{{data_procedimento}}", desc: "Data da aplicação" },
  { tag: "{{protocolo_nome}}", desc: "Nome do protocolo executado" },
  { tag: "{{via_aplicacao}}", desc: "Via de administração utilizada" },
  { tag: "{{area_corporal}}", desc: "Área corporal selecionada" },
  { tag: "{{medicamentos}}", desc: "Lista de medicamentos com quant." },
  { tag: "{{materiais}}", desc: "Lista de materiais com quant." },
  { tag: "{{lotes}}", desc: "Lotes dos itens utilizados" },
  { tag: "{{validade_lotes}}", desc: "Validade dos lotes" },
  { tag: "{{intercorrencia}}", desc: "Status e detalhes de intercorrências" },
  { tag: "{{observacoes}}", desc: "Observações manuais inseridas" },
  { tag: "{{profissional}}", desc: "Profissional responsável" },
];

export function EvolutionTemplateModal({ template, onClose }: EvolutionTemplateModalProps) {
  const saveTemplate = useSaveEvolutionTemplate();
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<EvolutionTemplateFormData>({
    resolver: zodResolver(evolutionTemplateSchema) as any,
    defaultValues: {
      name: "",
      templateText: "",
      isDefault: 0,
      isActive: 1,
    }
  });

  const templateText = watch("templateText");

  useEffect(() => {
    if (template) {
      reset({
        id: template.id,
        name: template.name,
        templateText: template.templateText,
        appliesToProtocolId: template.appliesToProtocolId,
        isDefault: template.isDefault,
        isActive: template.isActive,
      });
    } else {
      reset({
        name: "",
        templateText: "Paciente: {{paciente_nome}}\nData: {{data_procedimento}}\nProtocolo: {{protocolo_nome}}\nÁrea Corporal: {{area_corporal}}\n\nMedicamentos Utilizados:\n{{medicamentos}}\n\nMateriais Utilizados:\n{{materiais}}\n\nLotes:\n{{lotes}}\n\nStatus: {{intercorrencia}}\nObservações: {{observacoes}}",
        isDefault: 0,
        isActive: 1,
      });
    }
  }, [template, reset]);

  const onSubmit = async (data: EvolutionTemplateFormData) => {
    try {
      await saveTemplate.mutateAsync(data);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar o modelo de evolução");
    }
  };

  const copyToClipboard = (tag: string) => {
    navigator.clipboard.writeText(tag);
  };

  // Safe dummy preview generator
  const getDummyPreview = (text: string | undefined) => {
    if (!text) return "";
    let preview = text;
    preview = preview.replace(/{{paciente_nome}}/g, "João da Silva");
    preview = preview.replace(/{{data_procedimento}}/g, "12/06/2026");
    preview = preview.replace(/{{protocolo_nome}}/g, "Toxina Botulínica Full Face");
    preview = preview.replace(/{{via_aplicacao}}/g, "Intramuscular");
    preview = preview.replace(/{{area_corporal}}/g, "Rosto - Terço Superior");
    preview = preview.replace(/{{medicamentos}}/g, "- Toxina Botulínica (50 U)\n- Soro Fisiológico (2 ml)");
    preview = preview.replace(/{{materiais}}/g, "- Seringa 1ml (1 UN)\n- Agulha 30G (1 UN)");
    preview = preview.replace(/{{lotes}}/g, "- Lote: TX2026\n- Lote: SF123");
    preview = preview.replace(/{{validade_lotes}}/g, "- Val: 12/2027\n- Val: 10/2028");
    preview = preview.replace(/{{intercorrencia}}/g, "SEM intercorrências");
    preview = preview.replace(/{{observacoes}}/g, "Paciente relatou leve desconforto.");
    preview = preview.replace(/{{profissional}}/g, "Dra. Ana Morong");
    return preview;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-5xl bg-gray-50 flex flex-col p-0 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg text-gray-900">
            {template ? "Editar Modelo de Evolução" : "Novo Modelo de Evolução"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Form Editor */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="form-group mb-4">
                <label className="form-label text-sm font-medium text-gray-700">Nome do Modelo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Evolução Padrão Preenchedor"
                  {...register("name")} 
                />
                {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" {...register("isDefault")} />
                  <span className="text-sm text-gray-700">Definir como Padrão Geral</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" {...register("isActive")} />
                  <span className="text-sm text-gray-700">Modelo Ativo</span>
                </label>
              </div>

              <div className="form-group mb-0">
                <div className="flex justify-between items-end mb-1">
                  <label className="form-label text-sm font-medium text-gray-700 mb-0">Texto Base da Evolução</label>
                </div>
                <p className="text-xs text-gray-500 mb-2">Utilize as tags da lista abaixo para preencher os dados dinamicamente.</p>
                <textarea 
                  className="form-control font-mono text-sm" 
                  rows={14}
                  placeholder="Escreva a evolução usando as tags..."
                  {...register("templateText")}
                ></textarea>
                {errors.templateText && <span className="text-red-500 text-xs mt-1">{errors.templateText.message}</span>}
              </div>
            </div>
          </div>

          {/* Right Column: Tags & Preview */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0">
            {/* Tags Panel */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex-1 max-h-[300px] flex flex-col">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-blue-500" /> Variáveis Disponíveis
              </h4>
              <p className="text-xs text-gray-500 mb-3">Clique em uma tag para copiar e cole no texto ao lado.</p>
              
              <div className="overflow-y-auto pr-2 space-y-2 flex-1">
                {AVAILABLE_VARIABLES.map(variable => (
                  <div key={variable.tag} className="flex flex-col border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(variable.tag)}
                      className="text-left font-mono text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors w-max"
                      title="Clique para copiar"
                    >
                      {variable.tag}
                    </button>
                    <span className="text-[10px] text-gray-500 mt-0.5 ml-1">{variable.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm flex-1 flex flex-col">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Pré-visualização (Exemplo)</h4>
              <div className="bg-white p-3 rounded border border-blue-200 text-xs text-gray-700 font-mono flex-1 overflow-y-auto whitespace-pre-wrap max-h-[250px]">
                {getDummyPreview(templateText)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn btn-ghost text-gray-600">
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSubmit(onSubmit)} 
            disabled={saveTemplate.isPending}
            className="btn btn-primary bg-green-600 hover:bg-green-700 text-white"
          >
            <Save size={16} />
            {saveTemplate.isPending ? "Salvando..." : "Salvar Modelo"}
          </button>
        </div>

      </div>
    </div>
  );
}
