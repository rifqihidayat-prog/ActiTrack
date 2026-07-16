import { createClient } from "@libsql/client";

const url = process.env.TURSO_DB_URL;
const token = process.env.TURSO_DB_AUTH_TOKEN;

if (!url || !token) {
  console.error("Error: TURSO_DB_URL and TURSO_DB_AUTH_TOKEN must be set");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

const schema = `
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name TEXT NOT NULL,
  pic_name TEXT NOT NULL,
  proposed_date TEXT NOT NULL,
  activation_type TEXT NOT NULL,
  description_target TEXT NOT NULL DEFAULT '',
  objective_type TEXT NOT NULL DEFAULT 'REVENUE',
  last_month_sales REAL NOT NULL DEFAULT 0,
  last_month_transactions INTEGER NOT NULL DEFAULT 0,
  target_value REAL NOT NULL DEFAULT 0,
  target_transactions INTEGER NOT NULL DEFAULT 0,
  manager_target REAL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'Pending',
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submission_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  budget_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  estimated_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  actual_sales REAL NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  vouchers_distributed INTEGER NOT NULL DEFAULT 0,
  vouchers_redeemed INTEGER NOT NULL DEFAULT 0,
  actual_total_cost REAL NOT NULL DEFAULT 0,
  voucher_code TEXT DEFAULT '',
  promo_sales REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_cost_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL REFERENCES event_results(id) ON DELETE CASCADE,
  budget_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  actual_cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_promo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL REFERENCES event_results(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS survey_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'observasi',
  store_name TEXT NOT NULL,
  pic_name TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT (datetime('now')),
  end_time TEXT,
  total_distance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS survey_waypoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL REFERENCES survey_routes(id) ON DELETE CASCADE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  accuracy REAL
);

CREATE TABLE IF NOT EXISTS survey_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL REFERENCES survey_routes(id) ON DELETE CASCADE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  photo_data TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(approval_status);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(proposed_date);
CREATE INDEX IF NOT EXISTS idx_budgets_submission ON submission_budgets(submission_id);
CREATE INDEX IF NOT EXISTS idx_results_submission ON event_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_result ON event_cost_items(result_id);
`;

async function main() {
  console.log("Running migration...");
  const statements = schema.split(";").filter(s => s.trim());
  for (const stmt of statements) {
    try {
      await client.execute(stmt + ";");
      console.log("  OK:", stmt.trim().substring(0, 60) + "...");
    } catch (e: any) {
      console.error("  FAIL:", stmt.trim().substring(0, 60));
      console.error("  ", e.message);
    }
  }
  console.log("Migration complete!");
}

main().catch(console.error);
