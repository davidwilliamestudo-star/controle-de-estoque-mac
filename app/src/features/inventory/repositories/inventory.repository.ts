import { dbExecute, dbExecuteRequired, dbSelect } from "@/lib/db/sqlite";
import type { AdministrationRoute, InventoryCategory, InventoryItem, InventoryItemUpdateInput, Supplier } from "../types";
import { CLINIC_ID } from "../types";

export const inventoryRepository = {
  async listItems(): Promise<InventoryItem[]> {
    return dbSelect<InventoryItem>(`
      SELECT
        i.*,
        c.name AS category_name,
        s.name AS supplier_name,
        COUNT(b.id) AS active_batches,
        MIN(CASE WHEN b.current_quantity > 0 THEN b.expiration_date END) AS next_expiration_date,
        MAX(b.entry_date) AS last_entry_date
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      LEFT JOIN inventory_batches b ON b.inventory_item_id = i.id AND b.deleted_at IS NULL
      WHERE i.clinic_id = ? AND i.deleted_at IS NULL
      GROUP BY i.id
      ORDER BY i.name ASC
    `, [CLINIC_ID]);
  },

  async listItemsByType(itemType: string): Promise<InventoryItem[]> {
    return dbSelect<InventoryItem>(`
      SELECT
        i.*,
        c.name AS category_name,
        s.name AS supplier_name,
        COUNT(b.id) AS active_batches,
        MIN(CASE WHEN b.current_quantity > 0 THEN b.expiration_date END) AS next_expiration_date,
        MAX(b.entry_date) AS last_entry_date
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      LEFT JOIN inventory_batches b ON b.inventory_item_id = i.id AND b.deleted_at IS NULL
      WHERE i.clinic_id = ? AND i.deleted_at IS NULL AND i.item_type = ?
      GROUP BY i.id
      ORDER BY i.name ASC
    `, [CLINIC_ID, itemType]);
  },

  async listCategories(): Promise<InventoryCategory[]> {
    return dbSelect<InventoryCategory>(`
      SELECT id, name, description, applies_to
      FROM inventory_categories
      WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async createCategory(id: string, data: {
    name: string;
    description?: string | null;
    appliesTo?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO inventory_categories (id, clinic_id, name, description, applies_to, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [
      id,
      CLINIC_ID,
      data.name.trim(),
      data.description ?? null,
      data.appliesTo ?? "all",
    ]);
  },

  async updateCategory(id: string, data: {
    name?: string;
    description?: string | null;
    appliesTo?: string | null;
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.appliesTo !== undefined) { fields.push("applies_to = ?"); values.push(data.appliesTo); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id, CLINIC_ID);

    await dbExecute(`
      UPDATE inventory_categories
      SET ${fields.join(", ")}
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, values);
  },

  async softDeleteCategory(id: string): Promise<void> {
    await dbExecute(`
      UPDATE inventory_categories
      SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
  },

  async isCategoryInUse(id: string): Promise<boolean> {
    const rows = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count
      FROM inventory_items
      WHERE category_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    return (rows[0]?.count ?? 0) > 0;
  },

  async listAdministrationRoutes(): Promise<AdministrationRoute[]> {
    return dbSelect<AdministrationRoute>(`
      SELECT id, name, description
      FROM administration_routes
      WHERE clinic_id = ? AND is_active = 1 AND deleted_at IS NULL
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async createAdministrationRoute(id: string, name: string, description?: string | null): Promise<void> {
    await dbExecute(`
      INSERT INTO administration_routes (id, clinic_id, name, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [id, CLINIC_ID, name.trim(), description ?? null]);
  },

  async updateAdministrationRoute(id: string, name: string, description?: string | null): Promise<void> {
    await dbExecute(`
      UPDATE administration_routes
      SET name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [name.trim(), description ?? null, id, CLINIC_ID]);
  },

  async softDeleteAdministrationRoute(id: string): Promise<void> {
    await dbExecute(`
      UPDATE administration_routes
      SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
  },

  async isRouteInUse(id: string): Promise<boolean> {
    const items = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count FROM inventory_items WHERE administration_route_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    if ((items[0]?.count ?? 0) > 0) return true;

    const protocols = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count FROM protocols WHERE administration_route_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    return (protocols[0]?.count ?? 0) > 0;
  },

  async listBodyAreas(): Promise<any[]> {
    return dbSelect<any>(`
      SELECT *
      FROM body_areas
      WHERE clinic_id = ? AND is_active = 1
      ORDER BY display_name ASC, name ASC
    `, [CLINIC_ID]);
  },

  async updateBodyArea(id: string, data: { display_name?: string; description?: string }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name.trim()); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id, CLINIC_ID);

    await dbExecute(`
      UPDATE body_areas
      SET ${fields.join(", ")}
      WHERE id = ? AND clinic_id = ?
    `, values);
  },

  async softDeleteBodyArea(id: string): Promise<void> {
    await dbExecute(`
      UPDATE body_areas
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async isBodyAreaInUse(id: string): Promise<boolean> {
    const procedures = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count FROM procedures WHERE body_area_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    return (procedures[0]?.count ?? 0) > 0;
  },

  async findItemById(id: string): Promise<InventoryItem | null> {
    const rows = await dbSelect<InventoryItem>(`
      SELECT * FROM inventory_items
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
      LIMIT 1
    `, [id, CLINIC_ID]);
    return rows[0] ?? null;
  },

  async createItem(id: string, data: {
    name: string;
    itemType: string;
    categoryId?: string | null;
    administrationRouteId?: string | null;
    unit: string;
    minimumStock: number;
    requiresBatch: boolean;
    requiresExpiration: boolean;
    supplierId?: string | null;
    notes?: string | null;
    commercialName?: string | null;
    activePrinciple?: string | null;
    concentration?: string | null;
    presentation?: string | null;
    pharmaceuticalForm?: string | null;
    clinicalControlUnit?: string | null;
    unitConverter?: number | null;
    materialType?: string | null;
    usageInProtocol?: boolean;
    equipmentPatrimony?: string | null;
    equipmentSerial?: string | null;
    equipmentBrand?: string | null;
    equipmentModel?: string | null;
    equipmentAcquisitionDate?: string | null;
    equipmentNextMaintenance?: string | null;
    equipmentLocation?: string | null;
    equipmentMaintenanceStatus?: string | null;
    initialStock?: number;
    costPrice?: number;
    sellingPrice?: number;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO inventory_items (
        id, clinic_id, name, item_type, category_id, administration_route_id, unit,
        current_stock, minimum_stock, requires_batch, requires_expiration, supplier_id, notes, is_active,
        commercial_name, active_principle, concentration, presentation, pharmaceutical_form,
        clinical_control_unit, unit_converter, material_type, usage_in_protocol,
        equipment_patrimony, equipment_serial, equipment_brand, equipment_model,
        equipment_acquisition_date, equipment_next_maintenance, equipment_location, equipment_maintenance_status,
        cost_price, selling_price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.name,
      data.itemType,
      data.categoryId ?? null,
      data.administrationRouteId ?? null,
      data.unit,
      data.initialStock ?? 0,
      data.minimumStock,
      data.requiresBatch ? 1 : 0,
      data.requiresExpiration ? 1 : 0,
      data.supplierId ?? null,
      data.notes ?? null,
      data.commercialName ?? null,
      data.activePrinciple ?? null,
      data.concentration ?? null,
      data.presentation ?? null,
      data.pharmaceuticalForm ?? null,
      data.clinicalControlUnit ?? null,
      data.unitConverter ?? null,
      data.materialType ?? null,
      data.usageInProtocol ? 1 : 0,
      data.equipmentPatrimony ?? null,
      data.equipmentSerial ?? null,
      data.equipmentBrand ?? null,
      data.equipmentModel ?? null,
      data.equipmentAcquisitionDate ?? null,
      data.equipmentNextMaintenance ?? null,
      data.equipmentLocation ?? null,
      data.equipmentMaintenanceStatus ?? null,
      data.costPrice ?? 0,
      data.sellingPrice ?? 0,
    ]);
  },

  async incrementCurrentStock(id: string, quantity: number): Promise<void> {
    await dbExecuteRequired(`
      UPDATE inventory_items
      SET current_stock = current_stock + ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
        AND current_stock + ? >= 0
    `, [quantity, id, CLINIC_ID, quantity]);
  },

  async updateDefaultSupplier(id: string, supplierId?: string | null): Promise<void> {
    if (!supplierId) return;
    await dbExecute(`
      UPDATE inventory_items
      SET supplier_id = COALESCE(supplier_id, ?), updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [supplierId, id, CLINIC_ID]);
  },

  async updateItem(id: string, data: Partial<InventoryItemUpdateInput>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
    if (data.itemType !== undefined) { fields.push("item_type = ?"); values.push(data.itemType); }
    if (data.categoryId !== undefined) { fields.push("category_id = ?"); values.push(data.categoryId); }
    if (data.administrationRouteId !== undefined) { fields.push("administration_route_id = ?"); values.push(data.administrationRouteId); }
    if (data.unit !== undefined) { fields.push("unit = ?"); values.push(data.unit); }
    if (data.minimumStock !== undefined) { fields.push("minimum_stock = ?"); values.push(data.minimumStock); }
    if (data.requiresBatch !== undefined) { fields.push("requires_batch = ?"); values.push(data.requiresBatch ? 1 : 0); }
    if (data.requiresExpiration !== undefined) { fields.push("requires_expiration = ?"); values.push(data.requiresExpiration ? 1 : 0); }
    if (data.supplierId !== undefined) { fields.push("supplier_id = ?"); values.push(data.supplierId); }
    if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }
    if (data.isActive !== undefined) { fields.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
    if (data.costPrice !== undefined) { fields.push("cost_price = ?"); values.push(data.costPrice); }
    if (data.sellingPrice !== undefined) { fields.push("selling_price = ?"); values.push(data.sellingPrice); }

    if (data.commercialName !== undefined) { fields.push("commercial_name = ?"); values.push(data.commercialName); }
    if (data.activePrinciple !== undefined) { fields.push("active_principle = ?"); values.push(data.activePrinciple); }
    if (data.concentration !== undefined) { fields.push("concentration = ?"); values.push(data.concentration); }
    if (data.presentation !== undefined) { fields.push("presentation = ?"); values.push(data.presentation); }
    if (data.pharmaceuticalForm !== undefined) { fields.push("pharmaceutical_form = ?"); values.push(data.pharmaceuticalForm); }
    if (data.clinicalControlUnit !== undefined) { fields.push("clinical_control_unit = ?"); values.push(data.clinicalControlUnit); }
    if (data.unitConverter !== undefined) { fields.push("unit_converter = ?"); values.push(data.unitConverter); }

    if (data.materialType !== undefined) { fields.push("material_type = ?"); values.push(data.materialType); }
    if (data.usageInProtocol !== undefined) { fields.push("usage_in_protocol = ?"); values.push(data.usageInProtocol ? 1 : 0); }

    if (data.equipmentPatrimony !== undefined) { fields.push("equipment_patrimony = ?"); values.push(data.equipmentPatrimony); }
    if (data.equipmentSerial !== undefined) { fields.push("equipment_serial = ?"); values.push(data.equipmentSerial); }
    if (data.equipmentBrand !== undefined) { fields.push("equipment_brand = ?"); values.push(data.equipmentBrand); }
    if (data.equipmentModel !== undefined) { fields.push("equipment_model = ?"); values.push(data.equipmentModel); }
    if (data.equipmentAcquisitionDate !== undefined) { fields.push("equipment_acquisition_date = ?"); values.push(data.equipmentAcquisitionDate); }
    if (data.equipmentNextMaintenance !== undefined) { fields.push("equipment_next_maintenance = ?"); values.push(data.equipmentNextMaintenance); }
    if (data.equipmentLocation !== undefined) { fields.push("equipment_location = ?"); values.push(data.equipmentLocation); }
    if (data.equipmentMaintenanceStatus !== undefined) { fields.push("equipment_maintenance_status = ?"); values.push(data.equipmentMaintenanceStatus); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id, CLINIC_ID);

    await dbExecute(`
      UPDATE inventory_items
      SET ${fields.join(", ")}
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, values);
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await dbExecute(`
      UPDATE inventory_items
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [isActive ? 1 : 0, id, CLINIC_ID]);
  },

  async softDeleteItem(id: string): Promise<void> {
    await dbExecute(`
      UPDATE inventory_items
      SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
  },

  async setCurrentStock(id: string, quantity: number): Promise<void> {
    await dbExecuteRequired(`
      UPDATE inventory_items
      SET current_stock = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [quantity, id, CLINIC_ID]);
  },
};
