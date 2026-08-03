import { Tags, Plus, Search, Tag } from "lucide-react";
import { useState } from "react";
import { useFinancialCategories, useCreateFinancialCategory, useSetFinancialCategoryActive } from "../hooks/useFinancial";

export default function FinancialCategoriesPage() {
  const { data: categories = [], isLoading } = useFinancialCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setCategoryActiveMutation = useSetFinancialCategoryActive();

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleToggleActive = (id: string, currentStatus: number) => {
    setCategoryActiveMutation.mutate({ id, isActive: currentStatus === 1 ? false : true });
  };

  return (
    <div className="flex-col gap-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Tags size={28} /> Categorias Financeiras</h1>
          <p className="page-subtitle">Gerencie as categorias de receitas e despesas do sistema.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Nova Categoria
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Buscar Categoria</label>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="text"
              className="input"
              placeholder="Digite o nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-gray-500 py-4">Carregando categorias...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-6">
                      Nenhuma categoria encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(category => (
                    <tr key={category.id}>
                      <td className="font-medium flex items-center gap-2">
                        <Tag size={16} className={category.type === "income" ? "text-green-600" : category.type === "expense" ? "text-red-600" : "text-blue-600"} />
                        {category.name}
                      </td>
                      <td>
                        {category.type === "income" && <span className="badge badge-success">Receita</span>}
                        {category.type === "expense" && <span className="badge badge-danger">Despesa</span>}
                        {category.type === "both" && <span className="badge badge-info">Ambos</span>}
                      </td>
                      <td>
                        {category.is_active ? (
                          <span className="badge badge-success">Ativo</span>
                        ) : (
                          <span className="badge badge-gray">Inativo</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary text-sm"
                          onClick={() => handleToggleActive(category.id, category.is_active)}
                        >
                          {category.is_active ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateCategoryModal 
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function CreateCategoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense" | "both">("expense");
  const createCategoryMutation = useCreateFinancialCategory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCategoryMutation.mutate({ name, type }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Nova Categoria</h2>
            <p className="modal-subtitle">Crie uma nova categoria de classificação.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Nome da Categoria *</label>
            <input 
              type="text" 
              className="input form-control" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Consultas"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select 
              className="input form-control" 
              value={type} 
              onChange={e => setType(e.target.value as any)}
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
              <option value="both">Ambos (Receita e Despesa)</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? "Salvando..." : "Salvar Categoria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
