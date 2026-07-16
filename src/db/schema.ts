import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeName: text("store_name").notNull(),
  picName: text("pic_name").notNull(),
  proposedDate: text("proposed_date").notNull(),
  activationType: text("activation_type").notNull(),
  descriptionTarget: text("description_target").notNull().default(""),
  objectiveType: text("objective_type").notNull().default("REVENUE"),
  lastMonthSales: real("last_month_sales").notNull().default(0),
  lastMonthTransactions: integer("last_month_transactions").notNull().default(0),
  targetValue: real("target_value").notNull().default(0),
  targetTransactions: integer("target_transactions").notNull().default(0),
  managerTarget: real("manager_target").default(0),
  approvalStatus: text("approval_status").notNull().default("Pending"),
  approvedBy: text("approved_by"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const submissionBudgets = sqliteTable("submission_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  budgetCategory: text("budget_category").notNull(),
  itemDescription: text("item_description").notNull(),
  estimatedCost: real("estimated_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const eventResults = sqliteTable("event_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().unique().references(() => submissions.id, { onDelete: "cascade" }),
  actualSales: real("actual_sales").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  vouchersDistributed: integer("vouchers_distributed").notNull().default(0),
  vouchersRedeemed: integer("vouchers_redeemed").notNull().default(0),
  actualTotalCost: real("actual_total_cost").notNull().default(0),
  voucherCode: text("voucher_code").default(""),
  promoSales: real("promo_sales").notNull().default(0),
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const eventCostItems = sqliteTable("event_cost_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resultId: integer("result_id").notNull().references(() => eventResults.id, { onDelete: "cascade" }),
  budgetCategory: text("budget_category").notNull(),
  itemDescription: text("item_description").notNull(),
  actualCost: real("actual_cost").notNull().default(0),
});

export const eventPromoItems = sqliteTable("event_promo_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resultId: integer("result_id").notNull().references(() => eventResults.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  price: real("price").notNull().default(0),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  storeName: text("store_name").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const surveyRoutes = sqliteTable("survey_routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().default("observasi"),
  storeName: text("store_name").notNull(),
  picName: text("pic_name").notNull().default(""),
  startTime: text("start_time").notNull().default(sql`(datetime('now'))`),
  endTime: text("end_time"),
  totalDistance: real("total_distance").notNull().default(0),
  status: text("status").notNull().default("active"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const surveyWaypoints = sqliteTable("survey_waypoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeId: integer("route_id").notNull().references(() => surveyRoutes.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
  accuracy: real("accuracy"),
});

export const surveyPhotos = sqliteTable("survey_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeId: integer("route_id").notNull().references(() => surveyRoutes.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  photoData: text("photo_data").notNull(),
  caption: text("caption").notNull().default(""),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export const submissionsRelations = relations(submissions, ({ many, one }) => ({
  budgets: many(submissionBudgets), eventResult: one(eventResults, { fields: [submissions.id], references: [eventResults.submissionId] }),
}));
export const submissionBudgetsRelations = relations(submissionBudgets, ({ one }) => ({
  submission: one(submissions, { fields: [submissionBudgets.submissionId], references: [submissions.id] }),
}));
export const eventResultsRelations = relations(eventResults, ({ one, many }) => ({
  submission: one(submissions, { fields: [eventResults.submissionId], references: [submissions.id] }),
  costItems: many(eventCostItems),
  promoItems: many(eventPromoItems),
}));
export const eventCostItemsRelations = relations(eventCostItems, ({ one }) => ({
  result: one(eventResults, { fields: [eventCostItems.resultId], references: [eventResults.id] }),
}));
export const eventPromoItemsRelations = relations(eventPromoItems, ({ one }) => ({
  result: one(eventResults, { fields: [eventPromoItems.resultId], references: [eventResults.id] }),
}));
export const surveyRoutesRelations = relations(surveyRoutes, ({ many }) => ({
  waypoints: many(surveyWaypoints), photos: many(surveyPhotos),
}));
export const surveyWaypointsRelations = relations(surveyWaypoints, ({ one }) => ({
  route: one(surveyRoutes, { fields: [surveyWaypoints.routeId], references: [surveyRoutes.id] }),
}));
export const surveyPhotosRelations = relations(surveyPhotos, ({ one }) => ({
  route: one(surveyRoutes, { fields: [surveyPhotos.routeId], references: [surveyRoutes.id] }),
}));
