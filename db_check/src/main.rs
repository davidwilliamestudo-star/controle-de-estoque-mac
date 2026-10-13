use rusqlite::{params, Connection};
use std::fs;
use std::path::Path;

fn main() {
    let db_dir = r#"C:\Users\wilia\AppData\Roaming\com.anamorong.estoque"#;
    let db_path = format!(r"{}\estoque.db", db_dir);
    println!("Connecting to database at: {}", db_path);

    // Ensure the parent directory exists
    if !Path::new(db_dir).exists() {
        println!("Directory {} does not exist. Creating it...", db_dir);
        fs::create_dir_all(db_dir).unwrap();
    }

    let conn = Connection::open(&db_path).unwrap();

    // 1. Clean up existing clinical, stock and financial records
    println!("Cleaning up old clinical, stock and financial records...");
    conn.execute("DELETE FROM procedure_items_used", []).unwrap();
    conn.execute("DELETE FROM procedure_applications", []).unwrap();
    conn.execute("DELETE FROM procedures", []).unwrap();
    conn.execute("DELETE FROM appointments", []).unwrap();
    conn.execute("DELETE FROM patient_application_plans", []).unwrap();
    conn.execute("DELETE FROM patients", []).unwrap();
    conn.execute("DELETE FROM financial_payments", []).unwrap();
    conn.execute("DELETE FROM financial_receivables", []).unwrap();
    conn.execute("DELETE FROM financial_payables", []).unwrap();
    conn.execute("DELETE FROM financial_cash_movements", []).unwrap();
    conn.execute("DELETE FROM inventory_transfers", []).unwrap();
    conn.execute("DELETE FROM stock_movements", []).unwrap();
    conn.execute("DELETE FROM inventory_location_stocks", []).unwrap();
    conn.execute("DELETE FROM inventory_batches", []).unwrap();
    conn.execute("DELETE FROM protocol_items", []).unwrap();
    conn.execute("DELETE FROM protocols", []).unwrap();
    conn.execute("DELETE FROM inventory_items", []).unwrap();
    conn.execute("DELETE FROM suppliers", []).unwrap();

    // 2. Insert Supplier
    println!("Inserting test supplier...");
    conn.execute(
        "INSERT INTO suppliers (id, clinic_id, name, phone, email, document, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)",
        params![
            "sup-estetica-01",
            "ana-morong-clinic",
            "Distribuidora Estética Brasil",
            "11999999999",
            "contato@esteticabrasil.com.br",
            "12.345.678/0001-90"
        ],
    ).unwrap();

    // 3. Define and Insert Inventory Items
    println!("Inserting inventory items...");
    struct Item {
        id: &'static str,
        name: &'static str,
        item_type: &'static str,
        category_id: &'static str,
        route_id: &'static str,
        unit: &'static str,
        stock: f64,
        min_stock: f64,
        cost: f64,
        sell: f64,
    }

    let items = vec![
        Item {
            id: "item-vitc",
            name: "Vitamina C 1g/5ml (Ampola)",
            item_type: "medication",
            category_id: "cat-vit",
            route_id: "route-ev",
            unit: "ampola",
            stock: 100.0,
            min_stock: 20.0,
            cost: 12.50,
            sell: 25.00,
        },
        Item {
            id: "item-compb",
            name: "Complexo B 2ml (Ampola)",
            item_type: "medication",
            category_id: "cat-vit",
            route_id: "route-ev",
            unit: "ampola",
            stock: 100.0,
            min_stock: 20.0,
            cost: 8.00,
            sell: 16.00,
        },
        Item {
            id: "item-sorofisio",
            name: "Soro Fisiológico 0,9% 250ml (Frasco)",
            item_type: "medication",
            category_id: "cat-ev",
            route_id: "route-ev",
            unit: "frasco",
            stock: 50.0,
            min_stock: 10.0,
            cost: 5.50,
            sell: 15.00,
        },
        Item {
            id: "item-desoxi",
            name: "Desoxicolato de Sódio 10% (Ampola 2ml)",
            item_type: "medication",
            category_id: "cat-sc",
            route_id: "route-sc",
            unit: "ampola",
            stock: 30.0,
            min_stock: 5.0,
            cost: 45.00,
            sell: 120.00,
        },
        Item {
            id: "item-seringa10",
            name: "Seringa 10ml Luer Lock",
            item_type: "material",
            category_id: "cat-ser",
            route_id: "route-na",
            unit: "un",
            stock: 200.0,
            min_stock: 50.0,
            cost: 1.20,
            sell: 3.00,
        },
        Item {
            id: "item-seringa3",
            name: "Seringa 3ml Luer Lock",
            item_type: "material",
            category_id: "cat-ser",
            route_id: "route-na",
            unit: "un",
            stock: 200.0,
            min_stock: 50.0,
            cost: 0.90,
            sell: 2.50,
        },
        Item {
            id: "item-agulha22",
            name: "Agulha 30x0.7mm (22G)",
            item_type: "material",
            category_id: "cat-agulha",
            route_id: "route-na",
            unit: "un",
            stock: 300.0,
            min_stock: 50.0,
            cost: 0.30,
            sell: 1.00,
        },
        Item {
            id: "item-agulha30",
            name: "Agulha 13x0.3mm (30G - Insulina)",
            item_type: "material",
            category_id: "cat-agulha",
            route_id: "route-na",
            unit: "un",
            stock: 300.0,
            min_stock: 50.0,
            cost: 0.40,
            sell: 1.20,
        },
        Item {
            id: "item-equipo",
            name: "Equipo Macrogotas com Injetor Lateral",
            item_type: "material",
            category_id: "cat-desc",
            route_id: "route-na",
            unit: "un",
            stock: 100.0,
            min_stock: 20.0,
            cost: 2.50,
            sell: 6.00,
        },
        Item {
            id: "item-scalp",
            name: "Dispositivo de Infusão (Scalp) 23G",
            item_type: "material",
            category_id: "cat-desc",
            route_id: "route-na",
            unit: "un",
            stock: 100.0,
            min_stock: 20.0,
            cost: 1.10,
            sell: 3.50,
        },
    ];

    for item in &items {
        conn.execute(
            "INSERT INTO inventory_items (
                id, clinic_id, name, item_type, category_id, administration_route_id, unit,
                current_stock, minimum_stock, requires_batch, requires_expiration, supplier_id,
                is_active, cost_price, selling_price, usage_in_protocol
             ) VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, ?, ?, ?, 1, 1, 'sup-estetica-01', 1, ?, ?, 1)",
            params![
                item.id,
                item.name,
                item.item_type,
                item.category_id,
                item.route_id,
                item.unit,
                item.stock,
                item.min_stock,
                item.cost,
                item.sell,
            ],
        ).unwrap();
    }

    // 4. Insert Batches
    println!("Inserting inventory batches...");
    struct Batch {
        id: &'static str,
        item_id: &'static str,
        number: &'static str,
        qty: f64,
        expiration: &'static str,
        cost: f64,
    }

    let batches = vec![
        Batch { id: "batch-vitc-01", item_id: "item-vitc", number: "LOTE-VC-001", qty: 100.0, expiration: "2027-12-31", cost: 12.50 },
        Batch { id: "batch-compb-01", item_id: "item-compb", number: "LOTE-CB-001", qty: 100.0, expiration: "2027-11-30", cost: 8.00 },
        Batch { id: "batch-sorofisio-01", item_id: "item-sorofisio", number: "LOTE-SF-001", qty: 50.0, expiration: "2027-06-30", cost: 5.50 },
        Batch { id: "batch-desoxi-01", item_id: "item-desoxi", number: "LOTE-DX-001", qty: 30.0, expiration: "2027-03-31", cost: 45.00 },
        Batch { id: "batch-seringa10-01", item_id: "item-seringa10", number: "LOTE-SR10-001", qty: 200.0, expiration: "2028-12-31", cost: 1.20 },
        Batch { id: "batch-seringa3-01", item_id: "item-seringa3", number: "LOTE-SR3-001", qty: 200.0, expiration: "2028-12-31", cost: 0.90 },
        Batch { id: "batch-agulha22-01", item_id: "item-agulha22", number: "LOTE-AG22-001", qty: 300.0, expiration: "2028-12-31", cost: 0.30 },
        Batch { id: "batch-agulha30-01", item_id: "item-agulha30", number: "LOTE-AG30-001", qty: 300.0, expiration: "2028-12-31", cost: 0.40 },
        Batch { id: "batch-equipo-01", item_id: "item-equipo", number: "LOTE-EQ-001", qty: 100.0, expiration: "2028-12-31", cost: 2.50 },
        Batch { id: "batch-scalp-01", item_id: "item-scalp", number: "LOTE-SC-001", qty: 100.0, expiration: "2028-12-31", cost: 1.10 },
    ];

    for b in &batches {
        conn.execute(
            "INSERT INTO inventory_batches (
                id, clinic_id, inventory_item_id, batch_number, expiration_date, supplier_id,
                entry_date, initial_quantity, current_quantity, unit_cost
             ) VALUES (?, 'ana-morong-clinic', ?, ?, ?, 'sup-estetica-01', '2026-08-01', ?, ?, ?)",
            params![
                b.id,
                b.item_id,
                b.number,
                b.expiration,
                b.qty,
                b.qty,
                b.cost,
            ],
        ).unwrap();

        // Stock in main location
        conn.execute(
            "INSERT INTO inventory_location_stocks (
                id, clinic_id, location_id, inventory_item_id, inventory_batch_id, quantity
             ) VALUES (?, 'ana-morong-clinic', 'default-location', ?, ?, ?)",
            params![
                format!("loc-stk-{}", b.id),
                b.item_id,
                b.id,
                b.qty,
            ],
        ).unwrap();
    }

    // 5. Insert Protocols
    println!("Inserting protocols...");
    conn.execute(
        "INSERT INTO protocols (id, clinic_id, name, category_id, administration_route_id, description, is_active, base_price)
         VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, 1, ?)",
        params![
            "prot-soroterapia",
            "Soroterapia de Imunidade",
            "cat-vit",
            "route-ev",
            "Coquetel de vitaminas endovenoso para fortalecimento do sistema imunológico.",
            350.00
        ],
    ).unwrap();

    conn.execute(
        "INSERT INTO protocols (id, clinic_id, name, category_id, administration_route_id, description, is_active, base_price)
         VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, 1, ?)",
        params![
            "prot-lipo-papada",
            "Lipo Enzimática de Papada",
            "cat-sc",
            "route-sc",
            "Aplicação subcutânea de desoxicolato para redução da gordura submentoniana.",
            280.00
        ],
    ).unwrap();

    // 6. Insert Protocol Items
    println!("Inserting protocol items...");
    struct ProtItem {
        prot_id: &'static str,
        item_id: &'static str,
        role: &'static str,
        qty: f64,
        unit: &'static str,
    }

    let p_items = vec![
        // Soroterapia
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-vitc", role: "medication", qty: 2.0, unit: "ampola" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-compb", role: "medication", qty: 1.0, unit: "ampola" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-sorofisio", role: "medication", qty: 1.0, unit: "frasco" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-seringa10", role: "material", qty: 2.0, unit: "un" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-agulha22", role: "material", qty: 2.0, unit: "un" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-equipo", role: "material", qty: 1.0, unit: "un" },
        ProtItem { prot_id: "prot-soroterapia", item_id: "item-scalp", role: "material", qty: 1.0, unit: "un" },
        
        // Lipo Papada
        ProtItem { prot_id: "prot-lipo-papada", item_id: "item-desoxi", role: "medication", qty: 1.0, unit: "ampola" },
        ProtItem { prot_id: "prot-lipo-papada", item_id: "item-seringa3", role: "material", qty: 1.0, unit: "un" },
        ProtItem { prot_id: "prot-lipo-papada", item_id: "item-agulha30", role: "material", qty: 1.0, unit: "un" },
    ];

    for (idx, pi) in p_items.iter().enumerate() {
        conn.execute(
            "INSERT INTO protocol_items (
                id, clinic_id, protocol_id, inventory_item_id, item_role, default_quantity, unit, is_required
             ) VALUES (?, 'ana-morong-clinic', ?, ?, ?, ?, ?, 1)",
            params![
                format!("prot-item-{}", idx),
                pi.prot_id,
                pi.item_id,
                pi.role,
                pi.qty,
                pi.unit,
            ],
        ).unwrap();
    }

    println!("Database seeding completed successfully!");
}
