ALTER TABLE event_results ADD COLUMN transaction_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_results ADD COLUMN dealpos_ref TEXT DEFAULT '';

CREATE TABLE event_cost_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL REFERENCES event_results(id) ON DELETE CASCADE,
  budget_category TEXT NOT NULL,
  item_description TEXT NOT NULL,
  actual_cost REAL NOT NULL DEFAULT 0
);

CREATE INDEX idx_cost_items_result ON event_cost_items(result_id);
