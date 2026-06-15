import { dbTransaction } from "@/lib/db/sqlite";
import { protocolsRepository } from "../repositories/protocols.repository";
import type { Protocol, ProtocolItem, EvolutionTemplate } from "../types";

export interface SaveProtocolInput {
  protocol: Partial<Protocol>;
  items: Partial<ProtocolItem>[];
}

class ProtocolsService {
  async listProtocols(): Promise<Protocol[]> {
    return protocolsRepository.listAll();
  }

  async getProtocolWithItems(id: string): Promise<{ protocol: Protocol; items: ProtocolItem[] } | null> {
    const protocol = await protocolsRepository.findById(id);
    if (!protocol) return null;
    const items = await protocolsRepository.listItems(id);
    return { protocol, items };
  }

  async saveProtocol(input: SaveProtocolInput): Promise<void> {
    return dbTransaction(async () => {
      const isNew = !input.protocol.id;
      const protocolId = input.protocol.id || crypto.randomUUID();

      if (isNew) {
        await protocolsRepository.create({ ...input.protocol, id: protocolId });
      } else {
        await protocolsRepository.update(protocolId, input.protocol);
        // Remove existing items to replace with new ones
        const existingItems = await protocolsRepository.listItems(protocolId);
        for (const item of existingItems) {
          await protocolsRepository.deleteItem(item.id);
        }
      }

      for (const item of input.items) {
        const { id: _oldId, ...itemData } = item as any; // Strip ID to prevent PK constraint on soft-deleted items
        await protocolsRepository.createItem({
          ...itemData,
          protocolId
        });
      }
    });
  }

  async deleteProtocol(id: string): Promise<void> {
    return dbTransaction(async () => {
      await protocolsRepository.delete(id);
      const items = await protocolsRepository.listItems(id);
      for (const item of items) {
        await protocolsRepository.deleteItem(item.id);
      }
    });
  }

  async listTemplates(): Promise<EvolutionTemplate[]> {
    return protocolsRepository.listTemplates();
  }
}

export const protocolsService = new ProtocolsService();
