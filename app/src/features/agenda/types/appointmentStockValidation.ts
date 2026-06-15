export interface StockValidationItem {
  protocolItemId: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  requiredQuantity: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  suggestedBatchId?: string | null;
  suggestedBatchNumber?: string | null;
  suggestedBatchExpiration?: string | null;
  status: "sufficient" | "warning" | "insufficient";
}

export interface StockValidationResult {
  isSufficient: boolean;
  hasWarnings: boolean;
  items: StockValidationItem[];
}
