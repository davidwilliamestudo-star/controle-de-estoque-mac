import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Activity, UserCircle } from "lucide-react";
import { inventoryService } from "../services/inventory.service";

export function InventoryAdminPanel() {
  const queryClient = useQueryClient();
  
  // States
  const [categoryName, setCategoryName] = useState("");
  const [categoryAppliesTo, setCategoryAppliesTo] = useState("all");
  
  const [supplierName, setSupplierName] = useState("");
  const [supplierDocument, setSupplierDocument] = useState("");

  const [routeName, setRouteName] = useState("");
  const [routeDesc, setRouteDesc] = useState("");

  // Queries
  const categoriesQuery = useQuery({ queryKey: ["inventory-categories"], queryFn: inventoryService.listCategories });
  const suppliersQuery = useQuery({ queryKey: ["inventory-suppliers"], queryFn: inventoryService.listSuppliers });
  const routesQuery = useQuery({ queryKey: ["inventory-routes"], queryFn: inventoryService.listAdministrationRoutes });
  const bodyAreasQuery = useQuery({ queryKey: ["inventory-body-areas"], queryFn: inventoryService.listBodyAreas });

  // Mutations
  const mutateCategory = useMutation({
    mutationFn: inventoryService.createCategory,
    onSuccess: () => {
      setCategoryName("");
      setCategoryAppliesTo("all");
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: inventoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const mutateSupplier = useMutation({
    mutationFn: inventoryService.createSupplier,
    onSuccess: () => {
      setSupplierName("");
      setSupplierDocument("");
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: inventoryService.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const mutateRoute = useMutation({
    mutationFn: inventoryService.createAdministrationRoute,
    onSuccess: () => {
      setRouteName("");
      setRouteDesc("");
      queryClient.invalidateQueries({ queryKey: ["inventory-routes"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const deleteRoute = useMutation({
    mutationFn: inventoryService.deleteAdministrationRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-routes"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-options"] });
    },
  });

  const deleteBodyArea = useMutation({
    mutationFn: inventoryService.deleteBodyArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-body-areas"] });
    },
  });

  // Handlers
  const confirmDelete = (type: string, fn: (id: string) => void, id: string) => {
    if (window.confirm(`Deseja excluir este(a) ${type}? Se já estiver em uso, será apenas inativado(a) para preservar o histórico.`)) {
      fn(id);
    }
  };

  return (
    <div className="grid-2 mt-8">
      {/* Categories */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Categorias</h3>
            <p className="card-description">Categorias personalizadas para itens de estoque.</p>
          </div>
        </div>

        <form className="inventory-inline-form" onSubmit={e => { e.preventDefault(); mutateCategory.mutate({ name: categoryName, appliesTo: categoryAppliesTo }); }}>
          <input className="form-control" placeholder="Nova categoria" value={categoryName} onChange={e => setCategoryName(e.target.value)} />
          <select className="form-control" value={categoryAppliesTo} onChange={e => setCategoryAppliesTo(e.target.value)}>
            <option value="all">Todos</option>
            <option value="medication">Medicamentos</option>
            <option value="material">Materiais</option>
            <option value="equipment">Equipamentos</option>
          </select>
          <button type="submit" className="btn btn-secondary" disabled={mutateCategory.isPending}><Plus size={16} /> Add</button>
        </form>

        <div className="compact-list mt-4">
          {(categoriesQuery.data ?? []).map(category => (
            <div key={category.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b border-gray-100">
              <div>
                <strong>{category.name}</strong>
                <span className="text-xs text-gray-500 ml-2">[{category.applies_to ?? "all"}]</span>
              </div>
              <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => confirmDelete("categoria", deleteCategory.mutate, category.id)} disabled={deleteCategory.isPending}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Suppliers */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Fornecedores</h3>
            <p className="card-description">Fornecedores usados nas entradas e lotes.</p>
          </div>
        </div>

        <form className="inventory-inline-form" onSubmit={e => { e.preventDefault(); mutateSupplier.mutate({ name: supplierName, document: supplierDocument }); }}>
          <input className="form-control" placeholder="Novo fornecedor" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
          <input className="form-control" placeholder="Documento opcional" value={supplierDocument} onChange={e => setSupplierDocument(e.target.value)} />
          <button type="submit" className="btn btn-secondary" disabled={mutateSupplier.isPending}><Plus size={16} /> Add</button>
        </form>

        <div className="compact-list mt-4">
          {(suppliersQuery.data ?? []).map(supplier => (
            <div key={supplier.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b border-gray-100">
              <div>
                <strong>{supplier.name}</strong>
                <span className="text-xs text-gray-500 ml-2">({supplier.document || supplier.email || "Sem documento"})</span>
              </div>
              <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => confirmDelete("fornecedor", deleteSupplier.mutate, supplier.id)} disabled={deleteSupplier.isPending}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Routes */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Activity className="text-primary" size={20} />
            <div>
              <h3 className="card-title">Vias de Aplicação</h3>
              <p className="card-description">Vias para uso em protocolos (EV, IM, SC).</p>
            </div>
          </div>
        </div>

        <form className="inventory-inline-form" onSubmit={e => { e.preventDefault(); mutateRoute.mutate({ name: routeName, description: routeDesc }); }}>
          <input className="form-control" placeholder="Nova via" value={routeName} onChange={e => setRouteName(e.target.value)} />
          <input className="form-control" placeholder="Descrição opcional" value={routeDesc} onChange={e => setRouteDesc(e.target.value)} />
          <button type="submit" className="btn btn-secondary" disabled={mutateRoute.isPending}><Plus size={16} /> Add</button>
        </form>

        <div className="compact-list mt-4">
          {(routesQuery.data ?? []).map(route => (
            <div key={route.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b border-gray-100">
              <div>
                <strong>{route.name}</strong>
                {route.description && <span className="text-xs text-gray-500 ml-2">({route.description})</span>}
              </div>
              <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => confirmDelete("via de aplicação", deleteRoute.mutate, route.id)} disabled={deleteRoute.isPending}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Body Areas */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <UserCircle className="text-primary" size={20} />
            <div>
              <h3 className="card-title">Áreas Corporais</h3>
              <p className="card-description">Áreas mapeadas para procedimentos estéticos.</p>
            </div>
          </div>
        </div>

        <div className="compact-list mt-4 max-h-[400px] overflow-y-auto pr-2">
          {(bodyAreasQuery.data ?? []).map(area => (
            <div key={area.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b border-gray-100">
              <div>
                <strong>{area.display_name || area.name}</strong>
                <span className="text-xs text-gray-500 ml-2">[{area.anatomical_region || area.slug}]</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
