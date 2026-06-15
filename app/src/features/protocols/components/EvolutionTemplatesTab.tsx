import { useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { useEvolutionTemplates, useDeleteEvolutionTemplate } from "../hooks/useEvolutionTemplates";
import { EvolutionTemplateModal } from "./EvolutionTemplateModal";
import type { EvolutionTemplate } from "../types";

export function EvolutionTemplatesTab() {
  const { data: templates = [], isLoading } = useEvolutionTemplates();
  const deleteTemplate = useDeleteEvolutionTemplate();
  
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EvolutionTemplate | null>(null);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleEdit = (template: EvolutionTemplate) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este modelo de evolução?")) {
      deleteTemplate.mutate(id);
    }
  };

  if (isLoading) return <div className="p-4 text-gray-500">Carregando modelos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Modelos de Evolução</h2>
          <p className="text-sm text-gray-500">Crie textos pré-formatados com variáveis para preencher a evolução clínica automaticamente.</p>
        </div>
        <button className="btn btn-primary bg-green-600 hover:bg-green-700 text-white" onClick={handleCreateNew}>
          <Plus size={16} /> Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(template)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(template.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="mb-3">
              {template.isDefault === 1 && (
                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium mb-2">
                  Modelo Padrão
                </span>
              )}
              {template.isActive === 0 && (
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium mb-2 ml-2">
                  Inativo
                </span>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-hidden relative">
              {template.templateText}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-2">Nenhum modelo de evolução encontrado.</p>
            <button className="btn btn-secondary text-sm" onClick={handleCreateNew}>
              Criar o Primeiro Modelo
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <EvolutionTemplateModal
          template={editingTemplate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
