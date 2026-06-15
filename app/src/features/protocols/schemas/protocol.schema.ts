import { z } from "zod";

export const protocolSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome e obrigatorio"),
  categoryId: z.string().optional().nullable(),
  administrationRouteId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  defaultEvolutionTemplateId: z.string().optional().nullable(),
  isActive: z.number().default(1),
});

export const protocolItemSchema = z.object({
  id: z.string().optional(),
  inventoryItemId: z.string().min(1, "Item e obrigatorio"),
  itemRole: z.enum(["medication", "material", "equipment", "other"]),
  defaultQuantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
  unit: z.string().min(1, "Unidade e obrigatoria"),
  isRequired: z.number().default(1),
  notes: z.string().optional().nullable(),
  itemName: z.string().optional(), // Just for UI display
});

export const evolutionTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome e obrigatorio"),
  templateText: z.string().min(1, "Texto do modelo e obrigatorio"),
  appliesToProtocolId: z.string().optional().nullable(),
  isDefault: z.number().default(0),
  isActive: z.number().default(1),
});

export type ProtocolFormData = z.infer<typeof protocolSchema>;
export type ProtocolItemFormData = z.infer<typeof protocolItemSchema>;
export type EvolutionTemplateFormData = z.infer<typeof evolutionTemplateSchema>;
