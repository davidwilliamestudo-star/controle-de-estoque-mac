import { PackagePlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Edit, Package, Plus, Power, Printer, RotateCcw, Search, SlidersHorizontal, Trash2, Building2, DollarSign, MapPin, ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { inventoryService } from "../services/inventory.service";
import { InventoryAdminPanel } from "../components/InventoryAdminPanel";
import { StockAdjustmentModal } from "../components/StockAdjustmentModal";
import type { InventoryItem, InventoryItemType, InventoryItemUpdateInput, StockAdjustmentInput } from "../types";

function formatQuantity(value: number, unit: string) {
  return `${Number(value ?? 0).toLocaleString("pt-BR")} ${unit}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

import { useSearch } from "@tanstack/react-router";

function typeLabel(type: InventoryItemType) {
  const labels = {
    medication: "Medicamento",
    material: "Material",
    equipment: "Equipamento",
    other: "Outro",
  };
  return labels[type] ?? type;
}

export default function InventoryPage() {
  const search: any = useSearch({ strict: false });
  const queryClient = useQueryClient();
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | InventoryItemType>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryService.listInventory,
  });

  const invalidateInventory = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };



  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => inventoryService.setInventoryItemActive(id, isActive),
    onSuccess: invalidateInventory,
    onError: error => setActionError(error instanceof Error ? error.message : String(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryService.deleteInventoryItem,
    onSuccess: invalidateInventory,
    onError: error => setActionError(error instanceof Error ? error.message : String(error)),
  });

  const adjustMutation = useMutation({
    mutationFn: (data: StockAdjustmentInput) => inventoryService.adjustStock(data),
    onSuccess: async () => {
      setAdjustingItem(null);
      setActionError(null);
      await invalidateInventory();
    },
    onError: error => setActionError(error instanceof Error ? error.message : String(error)),
  });

  const items = inventoryQuery.data ?? [];
  const activeItems = items.filter(item => Number(item.is_active) === 1);
  const inactiveItems = items.filter(item => Number(item.is_active) === 0);
  const lowStock = activeItems.filter(item => Number(item.current_stock) <= Number(item.minimum_stock) && Number(item.minimum_stock) > 0).length;
  const expiringSoon = activeItems.filter(item => {
    if (!item.next_expiration_date) return false;
    const today = new Date();
    const expiration = new Date(`${item.next_expiration_date}T00:00:00`);
    const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Number(item.is_active) === 1) ||
        (statusFilter === "inactive" && Number(item.is_active) === 0);
      const matchesType = typeFilter === "all" || item.item_type === typeFilter;
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.category_name ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.supplier_name ?? "").toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [items, searchTerm, statusFilter, typeFilter]);



  return (
    <>
      {search.success && (
        <div className="badge badge-success mb-4 text-lg p-3">
          Entrada salva no estoque com sucesso!
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Itens, lotes, validade e saldo atual do estoque local.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory/financial" className="btn btn-secondary">
            <DollarSign size={16} />
            Financeiro
          </Link>
          <Link to="/inventory/locations" className="btn btn-secondary">
            <MapPin size={16} />
            Armários
          </Link>
          <Link to="/reports/purchase-plan" className="btn btn-secondary text-primary border-primary hover:bg-primary hover:text-white">
            <ShoppingCart size={16} />
            Sugerir Compras
          </Link>
          <Link to="/inventory/suppliers" className="btn btn-secondary">
            <Building2 size={16} />
            Fornecedores
          </Link>
          <Link to="/labels" search={{ jobId: undefined }} className="btn btn-secondary">
            <Printer size={16} />
            Etiquetas
          </Link>
          <Link to="/inventory/entry" className="btn btn-secondary">
            <PackagePlus size={16} />
            Entrada de Lote
          </Link>
          <Link to="/inventory/items/new" search={{ type: "medication" }} className="btn btn-primary">
            <Plus size={16} />
            Novo Item
          </Link>
        </div>
      </div>

      <div className="grid-4 mb-8">
        <div className="card summary-card">
          <div className="summary-card-header"><span>Itens cadastrados</span><Package size={20} /></div>
          <div className="summary-card-value">{activeItems.length}</div>
          <div className="summary-card-subtext">{inactiveItems.length} inativos</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Estoque baixo</span><AlertTriangle size={20} /></div>
          <div className="summary-card-value">{lowStock}</div>
          <div className="summary-card-subtext">Itens abaixo ou no minimo</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Vencem em 30 dias</span><AlertTriangle size={20} /></div>
          <div className="summary-card-value">{expiringSoon}</div>
          <div className="summary-card-subtext">Lotes ativos com validade proxima</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Lotes ativos</span><Package size={20} /></div>
          <div className="summary-card-value">{activeItems.reduce((sum, item) => sum + Number(item.active_batches ?? 0), 0)}</div>
          <div className="summary-card-subtext">Lotes registrados no estoque</div>
        </div>
      </div>

      {actionError && (
        <div className="badge badge-danger mb-4" style={{ padding: 12 }}>
          {actionError}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Itens de estoque</h3>
            <p className="card-description">Edite cadastros, inative itens, exclua logicamente e faça acertos de saldo com auditoria.</p>
          </div>
        </div>

        <div className="search-filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por item, categoria ou fornecedor..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
            <select className="form-control" style={{ width: 170 }} value={typeFilter} onChange={event => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value="all">Todos os tipos</option>
              <option value="medication">Medicamentos</option>
              <option value="material">Materiais</option>
              <option value="equipment">Equipamentos</option>
              <option value="other">Outros</option>
            </select>
          </div>
        </div>

        {inventoryQuery.isLoading ? (
          <div>Carregando estoque...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="Nenhum item no estoque"
            description="Cadastre a primeira entrada manual para criar item, lote e movimentacao de entrada."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="Nenhum item encontrado"
            description="Ajuste a busca ou os filtros para visualizar outros itens do estoque."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th>Saldo</th>
                  <th>Minimo</th>
                  <th>Lotes</th>
                  <th>Proxima validade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isLow = Number(item.minimum_stock) > 0 && Number(item.current_stock) <= Number(item.minimum_stock);
                  const isActive = Number(item.is_active) === 1;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="text-sm text-gray-500">
                          {item.category_name ?? "Sem categoria"}
                          {item.supplier_name ? ` · ${item.supplier_name}` : ""}
                        </div>
                      </td>
                      <td>{typeLabel(item.item_type)}</td>
                      <td>{formatQuantity(Number(item.current_stock), item.unit)}</td>
                      <td>{formatQuantity(Number(item.minimum_stock), item.unit)}</td>
                      <td>{item.active_batches ?? 0}</td>
                      <td>{formatDate(item.next_expiration_date)}</td>
                      <td>
                        {!isActive ? (
                          <span className="badge badge-neutral">Inativo</span>
                        ) : (
                          <span className={`badge ${isLow ? "badge-warning" : "badge-success"}`}>{isLow ? "Estoque baixo" : "Ok"}</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link to="/inventory/items/$itemId/edit" params={{ itemId: item.id }} className="btn btn-ghost btn-icon" title="Editar item">
                            <Edit size={16} />
                          </Link>
                          <button type="button" className="btn btn-ghost btn-icon" title="Acerto de estoque" onClick={() => setAdjustingItem(item)}>
                            <SlidersHorizontal size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            title={isActive ? "Inativar item" : "Reativar item"}
                            onClick={() => {
                              if (confirm(`${isActive ? "Inativar" : "Reativar"} o item "${item.name}"?`)) {
                                activeMutation.mutate({ id: item.id, isActive: !isActive });
                              }
                            }}
                          >
                            {isActive ? <Power size={16} /> : <RotateCcw size={16} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            title="Excluir item"
                            style={{ color: "var(--color-danger)" }}
                            onClick={() => {
                              if (confirm(`Excluir logicamente o item "${item.name}"? Ele deixara de aparecer nas listas ativas.`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InventoryAdminPanel />



      {adjustingItem && (
        <StockAdjustmentModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          isSaving={adjustMutation.isPending}
          onSubmit={async (data) => { await adjustMutation.mutateAsync(data); }}
        />
      )}
    </>
  );
}
