import { useState } from "react";
import { X } from "lucide-react";
import { inventoryService } from "../services/inventory.service";

interface QuickCategoryModalProps {
  onClose: () => void;
  onSuccess: (categoryId: string) => void;
}

export function QuickCategoryModal({ onClose, onSuccess }: QuickCategoryModalProps) {
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const id = await inventoryService.createCategory({ name, appliesTo });
      onSuccess(id);
    } catch (err: any) {
      setError(err.message || "Erro ao criar categoria");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Nova Categoria</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <div className="form-group">
              <label className="form-label">Nome da Categoria</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Aplica-se a</label>
              <select className="form-control" value={appliesTo} onChange={e => setAppliesTo(e.target.value)}>
                <option value="all">Todos</option>
                <option value="medication">Medicamentos</option>
                <option value="material">Materiais</option>
                <option value="equipment">Equipamentos</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
