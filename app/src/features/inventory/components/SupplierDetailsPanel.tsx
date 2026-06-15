import { useState, useEffect } from "react";
import { X, Edit2, Package, History, Trash2, Building2, IdCard, User, Phone, Mail, MapPin, AlignLeft } from "lucide-react";
import { suppliersService } from "../services/suppliers.service";
import { inventoryService } from "../services/inventory.service";
import type { Supplier, SupplierPurchaseHistory, SuppliedItem } from "../types";

interface SupplierDetailsPanelProps {
  supplierId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function SupplierDetailsPanel({ supplierId, onClose, onUpdate }: SupplierDetailsPanelProps) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [history, setHistory] = useState<SupplierPurchaseHistory[]>([]);
  const [items, setItems] = useState<SuppliedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "items" | "history">("info");
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  useEffect(() => {
    loadData();
  }, [supplierId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const s = await suppliersService.getSupplier(supplierId);
      setSupplier(s);
      if (s) {
        setFormData(s);
        const details = await suppliersService.getSupplierDetails(supplierId);
        setHistory(details.history);
        setItems(details.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await inventoryService.updateSupplier(supplierId, {
        name: formData.name,
        phone: formData.phone ?? undefined,
        email: formData.email ?? undefined,
        document: formData.document ?? undefined,
        contact_name: formData.contact_name ?? undefined,
        address: formData.address ?? undefined,
        notes: formData.notes ?? undefined,
      });
      setIsEditing(false);
      onUpdate();
      loadData();
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar fornecedor");
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;
    if (!confirm(`Tem certeza que deseja inativar/remover o fornecedor ${supplier.name}?`)) return;
    try {
      await inventoryService.deleteSupplier(supplierId);
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir fornecedor");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex items-center justify-center border-l border-gray-200">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transform transition-transform">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? "Editar Fornecedor" : supplier.name}
            </h2>
            {!isEditing && <p className="text-sm text-gray-500">Detalhes e histórico do fornecedor</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button className="btn btn-ghost btn-icon text-gray-500 hover:text-blue-600" onClick={() => setIsEditing(true)} title="Editar">
                <Edit2 size={18} />
              </button>
              <button className="btn btn-ghost btn-icon text-gray-500 hover:text-red-600" onClick={handleDelete} title="Excluir">
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-icon ml-2 bg-gray-100" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-white">
        <button 
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('info')}
        >
          Informações
        </button>
        <button 
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'items' ? 'border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('items')}
        >
          <Package size={16} />
          Itens Fornecidos ({items.length})
        </button>
        <button 
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          Histórico ({history.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Nome da Empresa / Fornecedor</label>
                  <div className="input-with-icon">
                    <Building2 size={18} />
                    <input className="form-control font-medium" value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">CNPJ/CPF</label>
                    <div className="input-with-icon">
                      <IdCard size={18} />
                      <input className="form-control" value={formData.document || ""} onChange={e => setFormData({...formData, document: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contato (Pessoa)</label>
                    <div className="input-with-icon">
                      <User size={18} />
                      <input className="form-control" value={formData.contact_name || ""} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <div className="input-with-icon">
                      <Phone size={18} />
                      <input className="form-control" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <div className="input-with-icon">
                      <Mail size={18} />
                      <input className="form-control" type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço Completo</label>
                  <div className="input-with-icon">
                    <MapPin size={18} />
                    <input className="form-control" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observações Internas</label>
                  <textarea className="form-control" rows={4} value={formData.notes || ""} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setFormData(supplier); }}>Cancelar</button>
                  <button className="btn btn-primary px-8" onClick={handleSave}>Salvar Alterações</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 flex gap-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="mt-0.5 text-gray-400"><IdCard size={20} /></div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">CNPJ/CPF</h4>
                      <p className="text-gray-900 font-medium">{supplier.document || "—"}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 flex gap-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="mt-0.5 text-gray-400"><User size={20} /></div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contato</h4>
                      <p className="text-gray-900 font-medium">{supplier.contact_name || "—"}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 flex gap-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="mt-0.5 text-gray-400"><Phone size={20} /></div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone</h4>
                      <p className="text-gray-900 font-medium">{supplier.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 flex gap-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="mt-0.5 text-gray-400"><Mail size={20} /></div>
                    <div className="break-all">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail</h4>
                      <p className="text-gray-900 font-medium">{supplier.email || "—"}</p>
                    </div>
                  </div>
                  <div className="col-span-2 bg-gray-50 rounded-xl p-4 flex gap-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="mt-0.5 text-gray-400"><MapPin size={20} /></div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço</h4>
                      <p className="text-gray-900 font-medium">{supplier.address || "—"}</p>
                    </div>
                  </div>
                  <div className="col-span-2 bg-amber-50/40 rounded-xl p-4 flex gap-3 border border-amber-100">
                    <div className="mt-0.5 text-amber-500"><AlignLeft size={20} /></div>
                    <div className="w-full">
                      <h4 className="text-[11px] font-bold text-amber-700/70 uppercase tracking-wider mb-1">Observações</h4>
                      <p className="text-gray-800 whitespace-pre-wrap">{supplier.notes || "Nenhuma observação cadastrada."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum item registrado para este fornecedor.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Tipo</th>
                    <th>Última Compra</th>
                    <th>Último Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td>
                        <span className="badge badge-secondary">{item.item_type}</span>
                      </td>
                      <td>{item.last_purchase_date ? new Date(item.last_purchase_date).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>{item.last_unit_cost ? `R$ ${item.last_unit_cost.toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum histórico de compras encontrado.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Custo Un.</th>
                    <th>Total</th>
                    <th>Nota Fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.entry_date).toLocaleDateString('pt-BR')}</td>
                      <td className="font-medium">{h.item_name}</td>
                      <td>{h.quantity} {h.unit}</td>
                      <td>{h.unit_cost ? `R$ ${h.unit_cost.toFixed(2)}` : '—'}</td>
                      <td>{h.total_cost ? `R$ ${h.total_cost.toFixed(2)}` : '—'}</td>
                      <td>{h.invoice_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
