import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Building2, Phone, Mail, FileText, ChevronRight, MapPin, User as UserIcon } from "lucide-react";
import { suppliersService } from "../services/suppliers.service";
import type { Supplier } from "../types";
import { SupplierDetailsPanel } from "../components/SupplierDetailsPanel";
import { QuickSupplierModal } from "../components/QuickSupplierModal";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await suppliersService.listSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error("Erro ao carregar fornecedores", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.document && s.document.includes(searchTerm)) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header shrink-0 mb-6">
        <div>
          <h1 className="page-title">Biblioteca de Fornecedores</h1>
          <p className="page-subtitle">Gerencie os fornecedores, histórico de compras e produtos fornecidos</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/inventory" search={{ success: undefined }} className="btn btn-secondary">
            Voltar ao Estoque
          </Link>
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar fornecedor por nome, CNPJ ou email..."
              className="form-control pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Carregando fornecedores...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Building2 size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum fornecedor encontrado</h3>
              <p>Não há fornecedores cadastrados que correspondam à sua busca.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center transition-colors"
                  onClick={() => setSelectedSupplierId(supplier.id)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                    <Building2 size={24} />
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 truncate">{supplier.name}</h4>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <FileText size={12} className="mr-1" />
                        {supplier.document || "Sem CNPJ/CPF"}
                      </div>
                    </div>
                    
                    <div className="hidden md:block">
                      {supplier.contact_name ? (
                        <div className="text-sm text-gray-700 flex items-center">
                          <UserIcon size={14} className="mr-2 text-gray-400" />
                          <span className="truncate">{supplier.contact_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Sem contato definido</span>
                      )}
                      {supplier.phone && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Phone size={12} className="mr-1" />
                          {supplier.phone}
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block">
                       {supplier.email && (
                        <div className="text-sm text-gray-700 flex items-center truncate">
                          <Mail size={14} className="mr-2 text-gray-400" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="text-xs text-gray-500 flex items-center mt-1 truncate">
                          <MapPin size={12} className="mr-1 shrink-0" />
                          <span className="truncate">{supplier.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 text-gray-400 shrink-0">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <QuickSupplierModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(id) => {
            setIsCreateModalOpen(false);
            loadSuppliers();
            setSelectedSupplierId(id);
          }}
        />
      )}

      {selectedSupplierId && (
        <SupplierDetailsPanel 
          supplierId={selectedSupplierId}
          onClose={() => setSelectedSupplierId(null)}
          onUpdate={() => loadSuppliers()}
        />
      )}
    </div>
  );
}
