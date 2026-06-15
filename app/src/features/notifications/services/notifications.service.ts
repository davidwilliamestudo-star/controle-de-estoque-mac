import { getStoredAuthSession } from "@/features/auth/session";
import { notificationsRepository } from "../repositories/notifications.repository";

function formatQuantity(value: number, unit: string) {
  return `${Number(value).toLocaleString("pt-BR")} ${unit}`;
}

export const notificationsService = {
  list: notificationsRepository.list,
  countUnread: notificationsRepository.countUnread,
  markRead: notificationsRepository.markRead,
  markAllRead: notificationsRepository.markAllRead,
  resolve: notificationsRepository.resolve,

  async generateOperationalNotifications(): Promise<void> {
    const session = getStoredAuthSession();

    const [outOfStock, lowStock, expiredBatches, expiringBatches, syncFailures] = await Promise.all([
      notificationsRepository.listOutOfStockItems(),
      notificationsRepository.listLowStockItems(),
      notificationsRepository.listExpiredBatches(),
      notificationsRepository.listExpiringBatches(30),
      notificationsRepository.listAppointmentSyncFailures(),
    ]);

    await Promise.all([
      ...outOfStock.map(item => notificationsRepository.upsertActiveNotification({
        type: "stock_out",
        title: "Item sem estoque",
        message: `${item.name} esta com estoque zerado.`,
        entityType: "inventory_item",
        entityId: item.id,
        severity: "critical",
        actionUrl: "/inventory",
        metadata: item,
      }, session?.userId ?? null)),

      ...lowStock.map(item => notificationsRepository.upsertActiveNotification({
        type: "stock_low",
        title: "Estoque baixo",
        message: `${item.name} esta com ${formatQuantity(item.current_stock, item.unit)}. Minimo definido: ${formatQuantity(item.minimum_stock, item.unit)}.`,
        entityType: "inventory_item",
        entityId: item.id,
        severity: "high",
        actionUrl: "/inventory",
        metadata: item,
      }, session?.userId ?? null)),

      ...expiredBatches.map(batch => notificationsRepository.upsertActiveNotification({
        type: "batch_expired",
        title: "Lote vencido",
        message: `${batch.item_name}, lote ${batch.batch_number}, venceu em ${batch.expiration_date}.`,
        entityType: "inventory_batch",
        entityId: batch.id,
        severity: "critical",
        actionUrl: "/inventory",
        metadata: batch,
      }, session?.userId ?? null)),

      ...expiringBatches.map(batch => notificationsRepository.upsertActiveNotification({
        type: "batch_expiring",
        title: "Lote perto do vencimento",
        message: `${batch.item_name}, lote ${batch.batch_number}, vence em ${batch.expiration_date}.`,
        entityType: "inventory_batch",
        entityId: batch.id,
        severity: "medium",
        actionUrl: "/inventory",
        metadata: batch,
      }, session?.userId ?? null)),

      ...syncFailures.map(failure => notificationsRepository.upsertActiveNotification({
        type: "sync_failure",
        title: "Falha de sincronizacao",
        message: failure.sync_error || "Ha um agendamento com falha de sincronizacao.",
        entityType: "appointment",
        entityId: failure.id,
        severity: "medium",
        actionUrl: "/agenda",
        metadata: failure,
      }, session?.userId ?? null)),
    ]);
  },
};
