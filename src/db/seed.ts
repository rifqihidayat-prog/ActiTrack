import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(import.meta.dirname, "actitrack.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

function seed() {
  console.log("Seeding database...");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, store_name TEXT NOT NULL, pic_name TEXT NOT NULL,
      proposed_date TEXT NOT NULL, activation_type TEXT NOT NULL,
      description_target TEXT NOT NULL DEFAULT "", approval_status TEXT NOT NULL DEFAULT "Pending",
      objective_type TEXT NOT NULL DEFAULT "REVENUE", last_month_sales REAL NOT NULL DEFAULT 0,
      last_month_transactions INTEGER NOT NULL DEFAULT 0,
      target_value REAL NOT NULL DEFAULT 0, target_transactions INTEGER NOT NULL DEFAULT 0,
      manager_target REAL DEFAULT 0, approved_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS submission_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      budget_category TEXT NOT NULL, item_description TEXT NOT NULL,
      estimated_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS event_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
      actual_sales REAL NOT NULL DEFAULT 0, transaction_count INTEGER NOT NULL DEFAULT 0,
      dealpos_ref TEXT DEFAULT '', vouchers_distributed INTEGER NOT NULL DEFAULT 0,
      vouchers_redeemed INTEGER NOT NULL DEFAULT 0, actual_total_cost REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT "", updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS event_cost_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, result_id INTEGER NOT NULL REFERENCES event_results(id) ON DELETE CASCADE,
      budget_category TEXT NOT NULL, item_description TEXT NOT NULL, actual_cost REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
      name TEXT NOT NULL, store_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS survey_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT 'observasi', store_name TEXT NOT NULL,
      pic_name TEXT NOT NULL, start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT, total_distance REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS survey_waypoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT, route_id INTEGER NOT NULL REFERENCES survey_routes(id) ON DELETE CASCADE,
      lat REAL NOT NULL, lng REAL NOT NULL, accuracy REAL, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS survey_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, route_id INTEGER NOT NULL REFERENCES survey_routes(id) ON DELETE CASCADE,
      lat REAL NOT NULL, lng REAL NOT NULL, photo_data TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const insertUser = sqlite.prepare(`INSERT OR IGNORE INTO users (username, password, name, store_name, role) VALUES (?, ?, ?, ?, ?)`);
  const insertSub = sqlite.prepare(`INSERT INTO submissions (store_name, pic_name, proposed_date, activation_type, description_target, objective_type, last_month_sales, last_month_transactions, target_value, target_transactions, manager_target, approval_status, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertBudget = sqlite.prepare(`INSERT INTO submission_budgets (submission_id, budget_category, item_description, estimated_cost) VALUES (?, ?, ?, ?)`);
  const insertResult = sqlite.prepare(`INSERT INTO event_results (submission_id, actual_sales, transaction_count, voucher_code, vouchers_distributed, vouchers_redeemed, actual_total_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertCostItem = sqlite.prepare(`INSERT INTO event_cost_items (result_id, budget_category, item_description, actual_cost) VALUES (?, ?, ?, ?)`);
  const insertRoute = sqlite.prepare(`INSERT INTO survey_routes (type, store_name, pic_name, start_time, end_time, total_distance, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertWaypoint = sqlite.prepare(`INSERT INTO survey_waypoints (route_id, lat, lng, accuracy) VALUES (?, ?, ?, ?)`);
  const insertPhoto = sqlite.prepare(`INSERT INTO survey_photos (route_id, lat, lng, photo_data, caption) VALUES (?, ?, ?, ?, ?)`);

  const adminPw = bcrypt.hashSync("admin", 10);
  const userPw = bcrypt.hashSync("123", 10);
  insertUser.run("admin", adminPw, "Super Admin", "ActiTrack HQ", "admin");
  insertUser.run("andi", userPw, "Andi Pratama", "Toko Maju Jaya", "user");

  const stores = [
    { store: "Toko Maju Jaya", pic: "Andi Pratama", type: "GRAND_OPENING", desc: "Grand Opening dengan target sales 50jt, undian berhadiah", obj: "REVENUE", lastSales: 45000000, lastTx: 120, status: "Approved", by: "Super Admin", date: "2026-07-15" },
    { store: "Toko Sejahtera Abadi", pic: "Siti Rahmawati", type: "REGULER", desc: "Promosi reguler produk baru, target 25jt", obj: "REVENUE", lastSales: 20000000, lastTx: 60, status: "Approved", by: "Super Admin", date: "2026-07-20" },
    { store: "Toko Bintang Terang", pic: "Budi Santoso", type: "POP_UP", desc: "Pop up event di area mall, target jangkauan 5000 orang", obj: "TRAFFIC", lastSales: 15000000, lastTx: 40, status: "Pending", by: null, date: "2026-08-05" },
    { store: "Toko Cemerlang", pic: "Dewi Lestari", type: "ROADSHOW", desc: "Roadshow keliling 5 titik, target sales 75jt", obj: "REVENUE", lastSales: 60000000, lastTx: 180, status: "Rejected", by: "Super Admin", date: "2026-07-10" },
    { store: "Toko Berkah Jaya", pic: "Ahmad Fauzi", type: "INSTORE", desc: "Instore event demo produk, target pengunjung 200 orang", obj: "TRAFFIC", lastSales: 12000000, lastTx: 35, status: "Approved", by: "Super Admin", date: "2026-07-25" },
    { store: "Toko Harapan Baru", pic: "Rina Wijaya", type: "GRAND_OPENING", desc: "Grand Opening cabang baru, target sales 100jt", obj: "REVENUE", lastSales: 80000000, lastTx: 200, status: "Pending", by: null, date: "2026-08-12" },
    { store: "Toko Sukses Makmur", pic: "Hendra Gunawan", type: "REGULER", desc: "Program diskon akhir bulan, target sales 20jt", obj: "REVENUE", lastSales: 15000000, lastTx: 50, status: "Approved", by: "Super Admin", date: "2026-07-28" },
  ];

  const budgetsPool = [
    [{ cat: "ATK", item: "Brosur & Katalog", cost: 500000 }, { cat: "CETAK", item: "Spanduk 3x2m", cost: 250000 }, { cat: "KONSUMSI", item: "Snack tamu", cost: 750000 }, { cat: "SEWA", item: "Sound system", cost: 1500000 }],
    [{ cat: "CETAK", item: "Poster A3", cost: 300000 }, { cat: "KONSUMSI", item: "Minuman", cost: 400000 }, { cat: "DOKUMENTASI", item: "Fotografer", cost: 800000 }],
    [{ cat: "SEWA", item: "Stand booth", cost: 3000000 }, { cat: "CETAK", item: "X-Banner", cost: 200000 }, { cat: "KONSUMSI", item: "Katering", cost: 1200000 }, { cat: "TRANSPORT", item: "Transportasi", cost: 500000 }, { cat: "ATK", item: "Stiker promosi", cost: 150000 }],
    [{ cat: "TRANSPORT", item: "Sewa mobil", cost: 2000000 }, { cat: "KONSUMSI", item: "Makan siang tim", cost: 1500000 }, { cat: "CETAK", item: "Brosur 5000 lbr", cost: 1000000 }, { cat: "LAINNYA", item: "Pulsa internet", cost: 300000 }],
    [{ cat: "ATK", item: "Kartu nama", cost: 150000 }, { cat: "DOKUMENTASI", item: "Dokumentasi video", cost: 500000 }, { cat: "KONSUMSI", item: "Snack", cost: 350000 }],
    [{ cat: "SEWA", item: "Tenda besar", cost: 5000000 }, { cat: "CETAK", item: "Backdrop", cost: 2000000 }, { cat: "KONSUMSI", item: "Prasmanan", cost: 3000000 }, { cat: "DOKUMENTASI", item: "Video & photo", cost: 1500000 }, { cat: "LAINNYA", item: "Dekorasi", cost: 2000000 }],
    [{ cat: "CETAK", item: "Flyer A5", cost: 200000 }, { cat: "ATK", item: "Ballpoint", cost: 100000 }, { cat: "KONSUMSI", item: "Air mineral", cost: 200000 }],
  ];

  const results = [
    { sales: 58700000, tx: 156, vc: "VC-MAJU-001", dist: 200, redeem: 145, cost: 3200000, notes: "Acara berjalan lancar, pengunjung ramai. Target tercapai 117%", items: [{ cat: "ATK", item: "Brosur & Katalog", cost: 450000 }, { cat: "CETAK", item: "Spanduk 3x2m", cost: 250000 }, { cat: "KONSUMSI", item: "Snack tamu", cost: 800000 }, { cat: "SEWA", item: "Sound system", cost: 1700000 }] },
    { sales: 28400000, tx: 89, vc: "VC-SEJAHTERA-001", dist: 100, redeem: 72, cost: 1500000, notes: "Promosi efektif, banyak pembeli baru", items: [{ cat: "CETAK", item: "Poster A3", cost: 280000 }, { cat: "KONSUMSI", item: "Minuman", cost: 450000 }, { cat: "DOKUMENTASI", item: "Fotografer", cost: 770000 }] },
    { sales: 16800000, tx: 55, vc: "VC-BERKAH-001", dist: 80, redeem: 55, cost: 1000000, notes: "Demo produk menarik minat pengunjung", items: [{ cat: "ATK", item: "Kartu nama", cost: 120000 }, { cat: "DOKUMENTASI", item: "Dokumentasi video", cost: 550000 }, { cat: "KONSUMSI", item: "Snack", cost: 330000 }] },
    { sales: 23200000, tx: 112, vc: "VC-SUKSES-001", dist: 120, redeem: 88, cost: 500000, notes: "Diskon akhir bulan cukup efektif", items: [{ cat: "CETAK", item: "Flyer A5", cost: 200000 }, { cat: "ATK", item: "Ballpoint", cost: 100000 }, { cat: "KONSUMSI", item: "Air mineral", cost: 200000 }] },
  ];

  const surveyRoutes = [
    { type: "observasi", store: "Toko Maju Jaya", pic: "Andi Pratama", start: "2026-07-11T08:00:00", end: "2026-07-11T09:30:00", dist: 3200, lat: -6.2088, lng: 106.8456 },
    { type: "mailer", store: "Toko Bintang Terang", pic: "Budi Santoso", start: "2026-07-10T10:00:00", end: "2026-07-10T11:15:00", dist: 1800, lat: -6.175, lng: 106.827 },
  ];

  const insertAll = sqlite.transaction(() => {
    let resultIdx = 0;
    for (let i = 0; i < stores.length; i++) {
      const s = stores[i];
      const budget = budgetsPool[i % budgetsPool.length];
      const totalBiaya = budget.reduce((sum, b) => sum + b.cost, 0);
      const targetRev = Math.round(s.lastSales + totalBiaya / 0.06);
      const targetTx = Math.round(s.lastTx * 1.5);
      const mgrTarget = s.obj === "TRAFFIC" ? 500 : 0;
      const info = insertSub.run(s.store, s.pic, s.date, s.type, s.desc, s.obj, s.lastSales, s.lastTx, targetRev, targetTx, mgrTarget, s.status, s.by);
      const subId = info.lastInsertRowid;

      for (const b of budget) insertBudget.run(subId, b.cat, b.item, b.cost);

      if (s.status === "Approved" && resultIdx < results.length) {
        const r = results[resultIdx++];
        const resInfo = insertResult.run(subId, r.sales, r.tx, r.vc, r.dist, r.redeem, r.cost, r.notes);
        const resId = resInfo.lastInsertRowid;
        for (const item of r.items) insertCostItem.run(resId, item.cat, item.item, item.cost);
      }
    }

    for (const r of surveyRoutes) {
      const info = insertRoute.run(r.type, r.store, r.pic, r.start, r.end, r.dist, "completed");
      const rid = info.lastInsertRowid;
      for (let w = 0; w < 10; w++) {
        const lat = r.lat + (Math.random() - 0.5) * 0.01;
        const lng = r.lng + (Math.random() - 0.5) * 0.01;
        insertWaypoint.run(rid, lat, lng, 10 + Math.random() * 15);
      }
      insertPhoto.run(rid, r.lat, r.lng, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "Foto toko");
    }
  });

  insertAll();
  console.log("Seed complete!");
  sqlite.close();
}

seed();
