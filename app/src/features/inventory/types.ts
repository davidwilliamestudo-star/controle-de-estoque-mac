export const CLINIC_ID = "ana-morong-clinic";

export type InventoryItemType = "medication" | "material" | "equipment" | "other";

export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  item_type: InventoryItemType;
  category_id?: string | null;
  category_name?: string | null;
  administration_route_id?: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  requires_batch: number;
  requires_expiration: number;
  supplier_id?: string | null;
  supplier_name?: string | null;
  notes?: string | null;
  is_active: number;
  cost_price: number;
  selling_price: number;
  active_batches?: number;
  next_expiration_date?: string | null;
  last_entry_date?: string | null;
  
  // Medicamentos
  commercial_name?: string | null;
  active_principle?: string | null;
  concentration?: string | null;
  presentation?: string | null;
  pharmaceutical_form?: string | null;
  clinical_control_unit?: string | null;
  unit_converter?: number | null;
  
  // Materiais
  material_type?: string | null;
  usage_in_protocol: number;
  
  // Equipamentos
  equipment_patrimony?: string | null;
  equipment_serial?: string | null;
  equipment_brand?: string | null;
  equipment_model?: string | null;
  equipment_acquisition_date?: string | null;
  equipment_next_maintenance?: string | null;
  equipment_location?: string | null;
  equipment_maintenance_status?: string | null;

  forecast?: StockForecast;
}

export interface InventoryCategory {
  id: string;
  name: string;
  applies_to?: string | null;
  description?: string | null;
}

export interface AdministrationRoute {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  contact_name?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface SupplierPurchaseHistory {
  id: string;
  entry_date: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  total_cost: number | null;
  invoice_number: string | null;
}

export interface SuppliedItem {
  id: string;
  name: string;
  item_type: string;
  unit: string;
  last_purchase_date: string | null;
  last_unit_cost: number | null;
}

export interface LabelTemplate {
  id: string;
  name: string;
  description?: string | null;
  width_mm: number;
  height_mm: number;
  paper_size: string;
  columns: number;
  rows: number;
  gap_x_mm: number;
  gap_y_mm: number;
  margin_top_mm: number;
  margin_left_mm: number;
  padding_mm: number;
  show_logo: number;
  show_item_name: number;
  show_batch: number;
  show_expiration: number;
  show_qrcode: number;
  show_barcode: number;
  show_supplier: number;
  is_default: number;
  calibration_x: number;
  calibration_y: number;
}

export interface InventoryOptions {
  items: InventoryItem[];
  categories: InventoryCategory[];
  administrationRoutes: AdministrationRoute[];
  suppliers: Supplier[];
  labelTemplates: LabelTemplate[];
  locations: InventoryLocation[];
}

export interface InventoryItemUpdateInput {
  name: string;
  itemType: InventoryItemType;
  categoryId?: string | null;
  administrationRouteId?: string | null;
  unit: string;
  minimumStock: number;
  requiresBatch: boolean;
  requiresExpiration: boolean;
  supplierId?: string | null;
  notes?: string | null;
  isActive: boolean;
  initialStock?: number;
  costPrice?: number;
  sellingPrice?: number;

  // Medicamentos
  commercialName?: string | null;
  activePrinciple?: string | null;
  concentration?: string | null;
  presentation?: string | null;
  pharmaceuticalForm?: string | null;
  clinicalControlUnit?: string | null;
  unitConverter?: number | null;
  
  // Materiais
  materialType?: string | null;
  usageInProtocol?: boolean;
  
  // Equipamentos
  equipmentPatrimony?: string | null;
  equipmentSerial?: string | null;
  equipmentBrand?: string | null;
  equipmentModel?: string | null;
  equipmentAcquisitionDate?: string | null;
  equipmentNextMaintenance?: string | null;
  equipmentLocation?: string | null;
  equipmentMaintenanceStatus?: string | null;
}

export interface StockAdjustmentInput {
  inventoryItemId: string;
  newQuantity: number;
  reason: string;
  notes?: string | null;
}

export interface ManualInventoryEntryInput {
  itemMode: "existing" | "new";
  itemType: InventoryItemType;
  itemName: string;
  supplierId?: string;
  supplierName: string;
  invoiceNumber?: string;
  invoiceKey?: string;
  entryDate: string;
  receiptNotes?: string;
  inventoryItemId?: string;
  categoryId?: string;
  administrationRouteId?: string;
  minimumStock: number;
  itemNotes?: string;
  commercialQuantity: number;
  commercialUnit: string;
  contentPerCommercialUnit: number;
  controlUnit: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  unitCost?: number | null;
  notes?: string | null;
  locationId?: string;
  
  // Gerar etiquetas
  generateLabels: boolean;
  labelTemplateId?: string;
  labelQuantity: number;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string | null;
  is_default: number;
}

export interface InventoryLocationStock {
  id: string;
  location_id: string;
  location_name: string;
  inventory_item_id: string;
  inventory_batch_id?: string | null;
  batch_number?: string | null;
  quantity: number;
}

export interface InventoryTransfer {
  id: string;
  inventory_item_id: string;
  inventory_batch_id?: string | null;
  from_location_id: string;
  from_location_name: string;
  to_location_id: string;
  to_location_name: string;
  quantity: number;
  transfer_date: string;
  user_id?: string | null;
  notes?: string | null;
}

export interface InventoryEntryResult {
  receiptId: string;
  receiptItemId: string;
  itemId: string;
  batchId: string;
  totalControlQuantity: number;
  labelJobId?: string;
}

export interface LabelPrintJobDetails {
  id: string;
  job_name: string;
  total_labels: number;
  status: string;
  template: LabelTemplate;
  items: LabelPrintItem[];
}

export interface LabelPrintItem {
  id: string;
  inventory_batch_id: string;
  quantity: number;
  qr_payload: string;
  barcode_value?: string | null;
  item_name: string;
  batch_number: string;
  expiration_date?: string | null;
  unit: string;
  total_quantity: number;
  supplier_name?: string | null;
}

export type PurchaseReason = 'abaixo_minimo' | 'lote_vencendo' | 'lote_vencido' | 'consumo_alto' | 'critico_sem_fornecedor';

export interface PurchaseRecommendation {
  inventoryItemId: string;
  itemName: string;
  itemType: string;
  unit: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  predictedConsumption: number;
  suggestedQuantity: number;
  unitCost: number;
  totalEstimatedCost: number;
  defaultSupplierId?: string | null;
  defaultSupplierName?: string | null;
  reasons: PurchaseReason[];
  reasonDescriptions: string[];
}

export interface PurchasePlan {
  generatedAt: string;
  recommendations: PurchaseRecommendation[];
  totalItems: number;
  totalEstimatedCost: number;
}

export type StockRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'insufficient_history';

export interface StockForecast {
  inventoryItemId: string;
  averageDailyConsumption: number;
  availableStock: number;
  daysUntilStockout: number | null;
  riskLevel: StockRiskLevel;
  estimatedStockoutDate: string | null;
}
