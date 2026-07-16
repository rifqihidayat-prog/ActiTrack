ALTER TABLE submissions ADD COLUMN last_month_sales REAL NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN last_month_transactions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN target_transactions INTEGER NOT NULL DEFAULT 0;
