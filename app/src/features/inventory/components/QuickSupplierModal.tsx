import { useState } from "react";
import { X } from "lucide-react";
import { inventoryService } from "../services/inventory.service";

interface QuickSupplierModalProps {
  onClose: () => void;
  onSuccess: (supplierId: string) => void;
}

export function QuickSupplierModal({ onClose, onSuccess }: QuickSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    contact_name: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const id = await inventoryService.createSupplier({ 
        name: formData.name,
        document: formData.document || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        contact_name: formData.contact_name || undefined,
      });
      onSuccess(id);
    } catch (err: any) {
      setError(err.message || "Erro ao criar fornecedor");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Novo Fornecedor</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <div className="form-group mb-3">
              <label className="form-label">Nome do Fornecedor *</label>
              <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">CNPJ/CPF</label>
                <input className="form-control" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} placeholder="Opcional" />
              </div>
              <div className="form-group">
                <label className="form-label">Contato (Pessoa)</label>
                <input className="form-control" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} placeholder="Nome do representante" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(XX) XXXXX-XXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-control" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contato@..." />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Mais detalhes como endereço e observações podem ser inseridos depois no painel da Biblioteca de Fornecedores.</p>
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
