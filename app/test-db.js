import sqlite3 from 'sqlite3';

const dbPath = 'C:\\Users\\wilia\\AppData\\Roaming\\com.anamorong.estoque\\estoque.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
    process.exit(1);
  }
});

const startDate = '2026-06-01';
const endDate = '2026-06-30';
const CLINIC_ID = 'ana-morong-clinic';

const queries = [
  {
    sql: `SELECT
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS active_patients,
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 0) AS inactive_patients,
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND date(created_at) BETWEEN date(?) AND date(?)) AS new_patients,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) BETWEEN date(?) AND date(?)) AS procedures_total,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) = date('now')) AS procedures_today,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('draft','ready_to_finalize')) AS pending_procedures,
        (SELECT COUNT(*) FROM protocols WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS active_protocols,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS inventory_items,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1 AND minimum_stock > 0 AND current_stock > 0 AND current_stock <= minimum_stock) AS low_stock_items,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1 AND current_stock <= 0) AS out_stock_items,
        (SELECT COUNT(*) FROM inventory_batches WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0 AND expiration_date IS NOT NULL AND date(expiration_date) < date('now')) AS expired_batches,
        (SELECT COUNT(*) FROM inventory_batches WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0 AND expiration_date IS NOT NULL AND date(expiration_date) BETWEEN date('now') AND date('now', '+30 days')) AS expiring_batches,
        (SELECT COALESCE(SUM(total_labels), 0) FROM label_print_jobs WHERE clinic_id = ? AND date(created_at) BETWEEN date(?) AND date(?)) AS labels_generated,
        (SELECT COUNT(*) FROM appointments WHERE clinic_id = ? AND deleted_at IS NULL AND sync_status = 'failed') AS sync_failures`,
    args: [
      CLINIC_ID, CLINIC_ID, CLINIC_ID, startDate, endDate, CLINIC_ID, startDate, endDate,
      CLINIC_ID, CLINIC_ID, CLINIC_ID, CLINIC_ID, CLINIC_ID, CLINIC_ID, CLINIC_ID,
      CLINIC_ID, startDate, endDate, CLINIC_ID
    ]
  },
  {
    sql: `SELECT strftime('%d/%m', performed_at) AS name, COUNT(*) AS value FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) BETWEEN date(?) AND date(?) GROUP BY date(performed_at) ORDER BY date(performed_at) ASC`,
    args: [CLINIC_ID, startDate, endDate]
  },
  {
    sql: `SELECT CASE piu.item_type WHEN 'medication' THEN 'Medicamentos' WHEN 'material' THEN 'Materiais' WHEN 'equipment' THEN 'Equipamentos' ELSE 'Outros' END AS name, COALESCE(SUM(piu.quantity_used), 0) AS value FROM procedure_items_used piu JOIN procedures p ON p.id = piu.procedure_id WHERE piu.clinic_id = ? AND p.deleted_at IS NULL AND date(p.performed_at) BETWEEN date(?) AND date(?) GROUP BY piu.item_type ORDER BY value DESC`,
    args: [CLINIC_ID, startDate, endDate]
  },
  {
    sql: `SELECT COALESCE(pr.name, 'Sem protocolo') AS name, COUNT(*) AS value FROM procedures p LEFT JOIN protocols pr ON pr.id = p.protocol_id WHERE p.clinic_id = ? AND p.deleted_at IS NULL AND date(p.performed_at) BETWEEN date(?) AND date(?) GROUP BY COALESCE(pr.name, 'Sem protocolo') ORDER BY value DESC, name ASC LIMIT 5`,
    args: [CLINIC_ID, startDate, endDate]
  },
  {
    sql: `SELECT COALESCE(ar.name, 'Sem rota') AS name, COUNT(*) AS value FROM procedures p LEFT JOIN protocols pr ON pr.id = p.protocol_id LEFT JOIN administration_routes ar ON ar.id = pr.administration_route_id WHERE p.clinic_id = ? AND p.deleted_at IS NULL AND date(p.performed_at) BETWEEN date(?) AND date(?) GROUP BY COALESCE(ar.name, 'Sem rota') ORDER BY value DESC LIMIT 6`,
    args: [CLINIC_ID, startDate, endDate]
  },
  {
    sql: `SELECT COALESCE(c.name, 'Sem categoria') AS name, COUNT(i.id) AS value FROM inventory_items i LEFT JOIN inventory_categories c ON c.id = i.category_id WHERE i.clinic_id = ? AND i.deleted_at IS NULL AND i.is_active = 1 GROUP BY COALESCE(c.name, 'Sem categoria') ORDER BY value DESC, name ASC LIMIT 8`,
    args: [CLINIC_ID]
  },
  {
    sql: `SELECT bucket AS name, COUNT(*) AS value FROM (SELECT CASE WHEN expiration_date IS NULL THEN 'Sem validade' WHEN date(expiration_date) < date('now') THEN 'Vencidos' WHEN date(expiration_date) <= date('now', '+30 days') THEN 'Ate 30 dias' WHEN date(expiration_date) <= date('now', '+90 days') THEN '31 a 90 dias' ELSE 'Mais de 90 dias' END AS bucket FROM inventory_batches WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0) GROUP BY bucket ORDER BY CASE bucket WHEN 'Vencidos' THEN 1 WHEN 'Ate 30 dias' THEN 2 WHEN '31 a 90 dias' THEN 3 WHEN 'Mais de 90 dias' THEN 4 ELSE 5 END`,
    args: [CLINIC_ID]
  },
  {
    sql: `SELECT CASE severity WHEN 'critical' THEN 'Criticos' WHEN 'high' THEN 'Altos' WHEN 'medium' THEN 'Medios' WHEN 'low' THEN 'Baixos' ELSE 'Informativos' END AS name, COUNT(*) AS value FROM notifications WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('unread','read') GROUP BY severity ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
    args: [CLINIC_ID]
  },
  {
    sql: `SELECT id, action, COALESCE(description, action) AS description, entity_type AS entityType, entity_id AS entityId, created_at AS createdAt FROM audit_logs WHERE clinic_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [CLINIC_ID, 8]
  },
  {
    sql: `SELECT id, title, message, severity, entity_type AS entityType, entity_id AS entityId, action_url AS actionUrl, created_at AS createdAt FROM notifications WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('unread','read') ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at DESC LIMIT ?`,
    args: [CLINIC_ID, 8]
  }
];

let hasErrors = false;

db.serialize(() => {
  queries.forEach((q, i) => {
    db.all(q.sql, q.args, (err, rows) => {
      if (err) {
        console.error(`Query ${i} failed:`, err.message);
        hasErrors = true;
      } else {
        console.log(`Query ${i} success: ${rows.length} rows`);
      }
    });
  });
});
