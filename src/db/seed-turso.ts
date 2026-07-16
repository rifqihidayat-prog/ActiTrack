import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const url = process.env.TURSO_DB_URL;
const token = process.env.TURSO_DB_AUTH_TOKEN;

if (!url || !token) {
  console.error("Error: TURSO_DB_URL and TURSO_DB_AUTH_TOKEN must be set");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

async function seed() {
  console.log("Seeding Turso database...");

  const adminPw = bcrypt.hashSync("admin", 10);
  const userPw = bcrypt.hashSync("123", 10);

  const existing = await client.execute("SELECT id FROM users WHERE username = 'admin'");
  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO users (username, password, name, store_name, role) VALUES (?, ?, ?, ?, ?)",
      args: ["admin", adminPw, "Super Admin", "ActiTrack HQ", "admin"],
    });
    await client.execute({
      sql: "INSERT INTO users (username, password, name, store_name, role) VALUES (?, ?, ?, ?, ?)",
      args: ["andi", userPw, "Andi Pratama", "Toko Maju Jaya", "user"],
    });
    console.log("  Users created: admin/admin, andi/123");
  } else {
    console.log("  Users already exist, skipping");
  }

  const subCount = await client.execute("SELECT COUNT(*) as cnt FROM submissions");
  if (Number(subCount.rows[0].cnt) === 0) {
    const stores = [
      { store: "Toko Maju Jaya", pic: "Andi Pratama", type: "GRAND_OPENING", desc: "Grand Opening dengan target sales 50jt, undian berhadiah", obj: "REVENUE", lastSales: 45000000, lastTx: 120, date: "2026-07-15", status: "Approved", by: "Super Admin" },
      { store: "Toko Sejahtera Abadi", pic: "Siti Rahmawati", type: "REGULER", desc: "Promosi reguler produk baru, target 25jt", obj: "REVENUE", lastSales: 20000000, lastTx: 60, date: "2026-07-20", status: "Approved", by: "Super Admin" },
      { store: "Toko Bintang Terang", pic: "Budi Santoso", type: "POP_UP", desc: "Pop up event di area mall", obj: "TRAFFIC", lastSales: 15000000, lastTx: 40, date: "2026-08-05", status: "Pending", by: null },
      { store: "Toko Cemerlang", pic: "Dewi Lestari", type: "ROADSHOW", desc: "Roadshow keliling 5 titik, target sales 75jt", obj: "REVENUE", lastSales: 60000000, lastTx: 180, date: "2026-07-10", status: "Rejected", by: "Super Admin" },
      { store: "Toko Berkah Jaya", pic: "Ahmad Fauzi", type: "INSTORE", desc: "Instore event demo produk", obj: "TRAFFIC", lastSales: 12000000, lastTx: 35, date: "2026-07-25", status: "Approved", by: "Super Admin" },
      { store: "Toko Harapan Baru", pic: "Rina Wijaya", type: "GRAND_OPENING", desc: "Grand Opening cabang baru", obj: "REVENUE", lastSales: 80000000, lastTx: 200, date: "2026-08-12", status: "Pending", by: null },
      { store: "Toko Sukses Makmur", pic: "Hendra Gunawan", type: "REGULER", desc: "Program diskon akhir bulan", obj: "REVENUE", lastSales: 15000000, lastTx: 50, date: "2026-07-28", status: "Approved", by: "Super Admin" },
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
      { sales: 58700000, tx: 156, vc: "VC-MAJU-001", dist: 200, redeem: 145, cost: 3200000, notes: "Acara berjalan lancar, pengunjung ramai", items: [{ cat: "ATK", item: "Brosur", cost: 450000 }, { cat: "CETAK", item: "Spanduk", cost: 250000 }, { cat: "KONSUMSI", item: "Snack", cost: 800000 }, { cat: "SEWA", item: "Sound", cost: 1700000 }] },
      { sales: 28400000, tx: 89, vc: "VC-SEJAHTERA-001", dist: 100, redeem: 72, cost: 1500000, notes: "Promosi efektif", items: [{ cat: "CETAK", item: "Poster", cost: 280000 }, { cat: "KONSUMSI", item: "Minuman", cost: 450000 }, { cat: "DOKUMENTASI", item: "Fotografer", cost: 770000 }] },
      { sales: 16800000, tx: 55, vc: "VC-BERKAH-001", dist: 80, redeem: 55, cost: 1000000, notes: "Demo produk menarik", items: [{ cat: "ATK", item: "Kartu nama", cost: 120000 }, { cat: "DOKUMENTASI", item: "Video", cost: 550000 }, { cat: "KONSUMSI", item: "Snack", cost: 330000 }] },
      { sales: 23200000, tx: 112, vc: "VC-SUKSES-001", dist: 120, redeem: 88, cost: 500000, notes: "Diskon efektif", items: [{ cat: "CETAK", item: "Flyer", cost: 200000 }, { cat: "ATK", item: "Ballpoint", cost: 100000 }, { cat: "KONSUMSI", item: "Air", cost: 200000 }] },
    ];

    let resultIdx = 0;
    for (let i = 0; i < stores.length; i++) {
      const s = stores[i];
      const budget = budgetsPool[i % budgetsPool.length];
      const totalBiaya = budget.reduce((sum, b) => sum + b.cost, 0);
      const targetRev = Math.round(s.lastSales + totalBiaya / 0.06);
      const targetTx = Math.round(s.lastTx * 1.5);
      const mgrTarget = s.obj === "TRAFFIC" ? 500 : 0;

      const subRes = await client.execute({
        sql: `INSERT INTO submissions (store_name, pic_name, proposed_date, activation_type, description_target, objective_type, last_month_sales, last_month_transactions, target_value, target_transactions, manager_target, approval_status, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [s.store, s.pic, s.date, s.type, s.desc, s.obj, s.lastSales, s.lastTx, targetRev, targetTx, mgrTarget, s.status, s.by],
      });
      const subId = Number(subRes.lastInsertRowid);

      for (const b of budget) {
        await client.execute({
          sql: "INSERT INTO submission_budgets (submission_id, budget_category, item_description, estimated_cost) VALUES (?, ?, ?, ?)",
          args: [subId, b.cat, b.item, b.cost],
        });
      }

      if (s.status === "Approved" && resultIdx < results.length) {
        const r = results[resultIdx++];
        const resRes = await client.execute({
          sql: "INSERT INTO event_results (submission_id, actual_sales, transaction_count, voucher_code, vouchers_distributed, vouchers_redeemed, actual_total_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [subId, r.sales, r.tx, r.vc, r.dist, r.redeem, r.cost, r.notes],
        });
        const resId = Number(resRes.lastInsertRowid);
        for (const item of r.items) {
          await client.execute({
            sql: "INSERT INTO event_cost_items (result_id, budget_category, item_description, actual_cost) VALUES (?, ?, ?, ?)",
            args: [resId, item.cat, item.item, item.cost],
          });
        }
      }
    }
    console.log(`  Created ${stores.length} submissions with budgets and results`);
  } else {
    console.log("  Submissions already exist, skipping");
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
