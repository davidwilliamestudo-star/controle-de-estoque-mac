import { evolutionTemplatesRepository } from "../repositories/evolutionTemplates.repository";
import type { EvolutionTemplate } from "../types";
import type { EvolutionTemplateFormData } from "../schemas/protocol.schema";

class EvolutionTemplatesService {
  async listAll(): Promise<EvolutionTemplate[]> {
    return evolutionTemplatesRepository.listAll();
  }

  async save(data: EvolutionTemplateFormData): Promise<EvolutionTemplate> {
    if (data.id) {
      await evolutionTemplatesRepository.update(data.id, data);
      return {
        id: data.id,
        name: data.name,
        templateText: data.templateText,
        appliesToProtocolId: data.appliesToProtocolId,
        isDefault: data.isDefault,
        isActive: data.isActive
      } as EvolutionTemplate;
    } else {
      const newId = `tmpl-${Math.random().toString(36).substring(2, 10)}`;
      await evolutionTemplatesRepository.create({
        id: newId,
        name: data.name,
        templateText: data.templateText,
        appliesToProtocolId: data.appliesToProtocolId,
        isDefault: data.isDefault,
        isActive: data.isActive
      });
      return {
        id: newId,
        name: data.name,
        templateText: data.templateText,
        appliesToProtocolId: data.appliesToProtocolId,
        isDefault: data.isDefault,
        isActive: data.isActive
      } as EvolutionTemplate;
    }
  }

  async delete(id: string): Promise<void> {
    await evolutionTemplatesRepository.delete(id);
  }
}

export const evolutionTemplatesService = new EvolutionTemplatesService();
