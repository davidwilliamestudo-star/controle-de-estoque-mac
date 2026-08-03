import { z } from "zod";

const nullableId = z.string().optional().nullable();

export const receivableSchema = z.object({
  patientId: nullableId,
  procedureId: nullableId,
  protocolId: nullableId,
  categoryId: nullableId,
  description: z.string().min(2, "Informe uma descricao."),
  amount: z.coerce.number().min(0, "Valor invalido."),
  dueDate: z.string().min(1, "Informe o vencimento."),
  paymentMethodId: nullableId,
  notes: z.string().optional().nullable(),
  createdByUserId: nullableId,
});

export const payableSchema = z.object({
  supplierId: nullableId,
  inventoryReceiptId: nullableId,
  categoryId: nullableId,
  description: z.string().min(2, "Informe uma descricao."),
  amount: z.coerce.number().min(0, "Valor invalido."),
  dueDate: z.string().min(1, "Informe o vencimento."),
  paymentMethodId: nullableId,
  notes: z.string().optional().nullable(),
  createdByUserId: nullableId,
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  paidAt: z.string().min(1, "Informe a data de pagamento."),
  paymentMethodId: nullableId,
  notes: z.string().optional().nullable(),
  createdByUserId: nullableId,
});

export const financialCategorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  type: z.enum(["income", "expense", "both"]),
  parentId: nullableId,
  isActive: z.boolean().optional(),
});

export type ReceivableFormData = z.infer<typeof receivableSchema>;
export type PayableFormData = z.infer<typeof payableSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type FinancialCategoryFormData = z.infer<typeof financialCategorySchema>;
