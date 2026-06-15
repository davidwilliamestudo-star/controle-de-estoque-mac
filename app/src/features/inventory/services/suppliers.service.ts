import { dbTransaction } from "@/lib/db/sqlite";
import { auditService } from "@/features/audit/services/audit.service";
import { suppliersRepository } from "../repositories/suppliers.repository";
import type { Supplier, SupplierPurchaseHistory, SuppliedItem } from "../types";

export const suppliersService = {
  async listSuppliers(): Promise<Supplier[]> {
    return suppliersRepository.list();
  },

  async getSupplier(id: string): Promise<Supplier | null> {
    const all = await suppliersRepository.list();
    return all.find(s => s.id === id) || null;
  },

  async createSupplier(data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    contact_name?: string | null;
    address?: string | null;
    notes?: string | null;
  }): Promise<string> {
    const id = crypto.randomUUID();
    return dbTransaction(async () => {
      await suppliersRepository.createFull(id, data);
      await auditService.log({
        action: "supplier_created",
        entity_type: "supplier",
        entity_id: id,
        description: `Fornecedor "${data.name}" cadastrado.`,
        after_data: data,
      });
      return id;
    });
  },

  async updateSupplier(id: string, name: string, data: Partial<{
    name: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    contact_name?: string | null;
    address?: string | null;
    notes?: string | null;
  }>): Promise<void> {
    return dbTransaction(async () => {
      await suppliersRepository.update(id, data);
      await auditService.log({
        action: "supplier_updated",
        entity_type: "supplier",
        entity_id: id,
        description: `Fornecedor "${data.name || name}" atualizado.`,
        after_data: data,
      });
    });
  },

  async deleteSupplier(id: string, name: string): Promise<void> {
    return dbTransaction(async () => {
      const inUse = await suppliersRepository.isSupplierInUse(id);
      if (inUse) {
        throw new Error("Este fornecedor não pode ser excluído pois possui itens ou lotes vinculados. Você pode apenas inativá-lo ou atualizar seus dados.");
      }
      await suppliersRepository.softDelete(id);
      await auditService.log({
        action: "supplier_deleted",
        entity_type: "supplier",
        entity_id: id,
        description: `Fornecedor "${name}" removido.`,
      });
    });
  },

  async getSupplierDetails(id: string): Promise<{ history: SupplierPurchaseHistory[], items: SuppliedItem[] }> {
    const history = await suppliersRepository.getPurchaseHistory(id);
    const items = await suppliersRepository.getSuppliedItems(id);
    return { history, items };
  }
};
