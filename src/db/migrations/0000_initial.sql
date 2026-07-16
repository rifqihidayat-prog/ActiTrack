CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name TEXT NOT NULL,
  pic_name TEXT NOT NULL,
  proposed_date TEXT NOT NULL,
  activation_type TEXT NOT NULL,
  description_target TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK(approval_status IN ('Pending','Approved','Rejected')),
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE submission_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  budget_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  estimated_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE event_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  actual_sales REAL NOT NULL DEFAULT 0,
  vouchers_distributed INTEGER NOT NULL DEFAULT 0,
  vouchers_redeemed INTEGER NOT NULL DEFAULT 0,
  actual_total_cost REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_submissions_status ON submissions(approval_status);
CREATE INDEX idx_submissions_date ON submissions(proposed_date);
CREATE INDEX idx_budgets_submission ON submission_budgets(submission_id);
CREATE INDEX idx_results_submission ON event_results(submission_id);
