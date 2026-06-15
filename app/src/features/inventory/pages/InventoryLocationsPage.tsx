import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Edit2, Trash2, MapPin, Search } from "lucide-react";
import { locationsService } from "../services/locations.service";
import type { InventoryLocation } from "../types";

export default function InventoryLocationsPage() {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await locationsService.listLocations();
      setLocations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (loc?: InventoryLocation) => {
    if (loc) {
      setEditingLocation(loc);
      setFormData({ name: loc.name, description: loc.description || "" });
    } else {
      setEditingLocation(null);
      setFormData({ name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingLocation) {
        await locationsService.updateLocation(editingLocation.id, formData.name, formData.description);
      } else {
        await locationsService.createLocation(formData.name, formData.description);
      }
      setIsModalOpen(false);
      loadLocations();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar local");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o local "${name}"?`)) return;
    try {
      await locationsService.deleteLocation(id);
      loadLocations();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir local");
    }
  };

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header shrink-0 mb-6">
        <div>
          <h1 className="page-title flex items-center">
            <MapPin className="mr-2 text-primary-600" size={28} />
            Locais e Armários
          </h1>
          <p className="page-subtitle">Gerencie os locais físicos onde seus produtos estão armazenados</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory" search={{ success: undefined }} className="btn btn-secondary">
            Voltar ao Estoque
          </Link>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Novo Local
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar local..."
              className="form-control pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Carregando locais...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Nenhum local encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.map(loc => (
                <div key={loc.id} className="card border border-gray-200 p-5 hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center">
                      {loc.name}
                      {loc.is_default === 1 && (
                        <span className="ml-2 badge badge-primary text-xs">Padrão</span>
                      )}
                    </h3>
                    <div className="flex items-center">
                      <button className="btn btn-ghost btn-icon text-gray-400 hover:text-blue-600 h-8 w-8" onClick={() => handleOpenModal(loc)}>
                        <Edit2 size={16} />
                      </button>
                      {loc.is_default === 0 && (
                        <button className="btn btn-ghost btn-icon text-gray-400 hover:text-red-600 h-8 w-8" onClick={() => handleDelete(loc.id, loc.name)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{loc.description || "Sem descrição"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLocation ? "Editar Local" : "Novo Local de Estoque"}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                <div className="form-group">
                  <label className="form-label">Nome do Armário/Local *</label>
                  <input 
                    className="form-control" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    autoFocus 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição (Opcional)</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar Local"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
