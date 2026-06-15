import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, PackagePlus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { inventoryService } from "../services/inventory.service";
import type { InventoryItemType, InventoryItemUpdateInput, InventoryItem } from "../types";
import { InventoryTransferModal } from "./InventoryTransferModal";
import { ArrowRightLeft } from "lucide-react";

interface InventoryTypePageProps {
  itemType: InventoryItemType;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
}

function formatQuantity(value: number, unit: string) {
  return `${Number(value ?? 0).toLocaleString("pt-BR")} ${unit}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function InventoryTypePage({
  itemType,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  icon: Icon,
}: InventoryTypePageProps) {
  const queryClient = useQueryClient();
  const [transferItem, setTransferItem] = useState<{id: string, name: string, unit: string} | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["inventory", itemType],
    queryFn: () => inventoryService.listInventoryByType(itemType),
  });

  const items = itemsQuery.data ?? [];
  const lowStock = items.filter(item => Number(item.minimum_stock) > 0 && Number(item.current_stock) <= Number(item.minimum_stock)).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory/entry" className="btn btn-secondary">
            <PackagePlus size={16} />
            Entrada de Lote
          </Link>
          <Link to="/inventory/items/new" search={{ type: itemType }} className="btn btn-primary">
            <Plus size={16} />
            Novo {title.replace(/s$/, "")}
          </Link>
        </div>
      </div>

      <div className="grid-4 mb-8">
        <div className="card summary-card">
          <div className="summary-card-header"><span>Itens</span><Icon size={20} /></div>
          <div className="summary-card-value">{items.length}</div>
          <div className="summary-card-subtext">Cadastrados no SQLite</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Estoque baixo</span><Icon size={20} /></div>
          <div className="summary-card-value">{lowStock}</div>
          <div className="summary-card-subtext">Abaixo ou no minimo</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Saldo total</span><Icon size={20} /></div>
          <div className="summary-card-value">{items.reduce((sum, item) => sum + Number(item.current_stock ?? 0), 0).toLocaleString("pt-BR")}</div>
          <div className="summary-card-subtext">Na unidade de cada item</div>
        </div>
        <div className="card summary-card">
          <div className="summary-card-header"><span>Lotes</span><Icon size={20} /></div>
          <div className="summary-card-value">{items.reduce((sum, item) => sum + Number(item.active_batches ?? 0), 0)}</div>
          <div className="summary-card-subtext">Ativos registrados</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{title} cadastrados</h3>
            <p className="card-description">Dados reais vindos das entradas de estoque.</p>
          </div>
        </div>

        {itemsQuery.isLoading ? (
          <div>Carregando...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Icon />} title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Saldo</th>
                  <th>Minimo</th>
                  <th>Lotes</th>
                  <th>Proxima validade</th>
                  <th>Fornecedor</th>
                  <th>Duração Prev.</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = Number(item.minimum_stock) > 0 && Number(item.current_stock) <= Number(item.minimum_stock);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.category_name ?? "-"}</td>
                      <td>{formatQuantity(Number(item.current_stock), item.unit)}</td>
                      <td>{formatQuantity(Number(item.minimum_stock), item.unit)}</td>
                      <td>{item.active_batches ?? 0}</td>
                      <td>{formatDate(item.next_expiration_date)}</td>
                      <td>{item.supplier_name ?? "-"}</td>
                      <td>
                        {item.forecast?.daysUntilStockout !== null && item.forecast?.daysUntilStockout !== undefined ? (
                          <div className="text-xs font-medium">
                            {item.forecast.daysUntilStockout} dias
                            <div className="text-gray-400" style={{ fontSize: "10px" }}>~{item.forecast.averageDailyConsumption.toFixed(1)}/dia</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sem histórico</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className={`badge ${isLow ? "badge-warning" : "badge-success"}`}>{isLow ? "Baixo" : "Ok"}</span>
                          {item.forecast?.riskLevel === "critical" && <span className="badge badge-danger text-[10px]">Crítico</span>}
                          {item.forecast?.riskLevel === "high" && <span className="badge badge-warning text-[10px]">Alto</span>}
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-icon text-gray-500 hover:text-blue-600"
                          title="Transferir Estoque"
                          onClick={() => setTransferItem({id: item.id, name: item.name, unit: item.unit})}
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {transferItem && (
        <InventoryTransferModal
          inventoryItemId={transferItem.id}
          itemName={transferItem.name}
          unit={transferItem.unit}
          onClose={() => setTransferItem(null)}
          onSuccess={() => {
            setTransferItem(null);
            itemsQuery.refetch();
          }}
        />
      )}
    </>
  );
}
