"use server";
import { db } from "@/db";
import { submissions, submissionBudgets, eventResults, eventCostItems, eventPromoItems, users, surveyRoutes, surveyWaypoints, surveyPhotos } from "@/db/schema";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type SubmissionData = { storeName: string; picName: string; proposedDate: string; activationType: string; descriptionTarget: string; objectiveType: string; lastMonthSales: number; lastMonthTransactions: number; targetValue: number; targetTransactions: number; };
export type BudgetItemData = { budgetCategory: string; itemDescription: string; estimatedCost: number; };
export type EventResultData = { actualSales: number; transactionCount: number; voucherCode?: string; vouchersDistributed: number; vouchersRedeemed: number; actualTotalCost: number; promoSales: number; notes: string; };
export type CostItemData = { budgetCategory: string; itemDescription: string; actualCost: number; };
export type PromoItemData = { productName: string; quantity: number; price: number; };
export type DashboardFilters = { month?: string; year?: string; storeName?: string; activationType?: string; promoFilter?: "all" | "withoutPromo" };

function filterByDate(sub: { proposedDate: string }, filters: DashboardFilters) {
  if (filters.month && sub.proposedDate.substring(5, 7) !== filters.month.padStart(2, "0")) return false;
  if (filters.year && sub.proposedDate.substring(0, 4) !== filters.year) return false;
  return true;
}
function filterSubmissions(subs: any[], filters: DashboardFilters) {
  return subs.filter(s => {
    if (filters.storeName && s.storeName !== filters.storeName) return false;
    if (filters.activationType && s.activationType !== filters.activationType) return false;
    return filterByDate(s, filters);
  });
}

export async function createSubmission(data: SubmissionData, budgets: BudgetItemData[]) {
  const [sub] = await db.insert(submissions).values(data).returning({ id: submissions.id });
  if (budgets.length > 0) await db.insert(submissionBudgets).values(budgets.map(b => ({ ...b, submissionId: sub.id })));
  revalidatePath("/"); revalidatePath("/calendar"); revalidatePath("/admin"); return sub.id;
}

export async function updateSubmissionTarget(id: number, data: { targetValue?: number; targetTransactions?: number; managerTarget?: number }) {
  await db.update(submissions).set(data).where(eq(submissions.id, id));
  revalidatePath("/"); revalidatePath("/admin");
}
export async function getSubmissions() { return await db.query.submissions.findMany({ orderBy: [desc(submissions.createdAt)] }); }
export async function getPendingSubmissionCount() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(submissions).where(eq(submissions.approvalStatus, "Pending"));
  return row.count;
}
export async function getSubmissionById(id: number) { return await db.query.submissions.findFirst({ where: eq(submissions.id, id), with: { budgets: true, eventResult: { with: { costItems: true, promoItems: true } } } }); }
export async function getSubmissionsWithDetails() { return await db.query.submissions.findMany({ orderBy: [desc(submissions.createdAt)], with: { budgets: true, eventResult: true } }); }
export async function updateApprovalStatus(id: number, status: string, opts?: { approvedBy?: string; managerTarget?: number }) {
  const val: any = { approvalStatus: status }; if (opts?.approvedBy) val.approvedBy = opts.approvedBy; if (opts?.managerTarget) val.managerTarget = opts.managerTarget;
  await db.update(submissions).set(val).where(eq(submissions.id, id));
  revalidatePath("/"); revalidatePath("/calendar"); revalidatePath("/admin");
}
export async function submitEventResult(id: number, data: EventResultData, costItems?: CostItemData[], promoItems?: PromoItemData[]) {
  const totalPromo = (promoItems || []).reduce((s, p) => s + (p.quantity * p.price), 0);
  const existing = await db.select().from(eventResults).where(eq(eventResults.submissionId, id));
  if (existing.length > 0) {
    await db.update(eventResults).set({ ...data, promoSales: totalPromo, updatedAt: sql`(datetime('now'))` }).where(eq(eventResults.submissionId, id));
    if (costItems) {
      await db.delete(eventCostItems).where(eq(eventCostItems.resultId, existing[0].id));
      if (costItems.length > 0) await db.insert(eventCostItems).values(costItems.map(c => ({ ...c, resultId: existing[0].id })));
    }
    await db.delete(eventPromoItems).where(eq(eventPromoItems.resultId, existing[0].id));
    if (promoItems?.length) await db.insert(eventPromoItems).values(promoItems.map(p => ({ ...p, resultId: existing[0].id })));
  } else {
    const [res] = await db.insert(eventResults).values({ ...data, promoSales: totalPromo, submissionId: id }).returning({ id: eventResults.id });
    if (costItems?.length) await db.insert(eventCostItems).values(costItems.map(c => ({ ...c, resultId: res.id })));
    if (promoItems?.length) await db.insert(eventPromoItems).values(promoItems.map(p => ({ ...p, resultId: res.id })));
  }
  revalidatePath("/"); revalidatePath(`/submissions/${id}`);
}
export async function getCostItemsByResultId(resultId: number) {
  return await db.select().from(eventCostItems).where(eq(eventCostItems.resultId, resultId));
}
export async function getDashboardStats(filters: DashboardFilters = {}) {
  const all = await db.query.submissions.findMany({ with: { budgets: true, eventResult: { with: { costItems: true, promoItems: true } } } });
  const allSubs = filterSubmissions(all, filters);
  const approved = allSubs.filter(s => s.approvalStatus === "Approved");
  const totalBudget = allSubs.reduce((sum, s) => sum + (s.budgets?.reduce((b, bi) => b + bi.estimatedCost, 0) ?? 0), 0);
  const subtractPromo = filters.promoFilter === "withoutPromo";
  const totalSales = approved.reduce((sum, s) => sum + (subtractPromo ? (s.eventResult?.actualSales ?? 0) - (s.eventResult?.promoSales ?? 0) : (s.eventResult?.actualSales ?? 0)), 0);
  const totalActualCost = approved.reduce((sum, s) => sum + (s.eventResult?.actualTotalCost ?? 0), 0);
  const totalVouchers = approved.reduce((sum, s) => sum + (s.eventResult?.vouchersDistributed ?? 0), 0);
  const totalRedeemed = approved.reduce((sum, s) => sum + (s.eventResult?.vouchersRedeemed ?? 0), 0);
  const totalTransactions = approved.reduce((sum, s) => sum + (s.eventResult?.transactionCount ?? 0), 0);
  const withResults = approved.filter(s => s.eventResult);
  const bepCount = withResults.filter(s => {
    const effectiveSales = subtractPromo ? (s.eventResult!.actualSales - (s.eventResult!.promoSales ?? 0)) : s.eventResult!.actualSales;
    return effectiveSales >= s.eventResult!.actualTotalCost;
  }).length;
  const totalTargetRevenue = approved.reduce((sum, s) => sum + (s.managerTarget || s.targetValue || 0), 0);
  const totalRevenueAchieved = approved.reduce((sum, s) => sum + (subtractPromo ? (s.eventResult?.actualSales ?? 0) - (s.eventResult?.promoSales ?? 0) : (s.eventResult?.actualSales ?? 0)), 0);
  const totalPromoValue = approved.reduce((sum, s) => sum + (s.eventResult?.promoSales ?? 0), 0);
  return {
    totalBudget, totalSales, totalActualCost, totalVouchers, totalRedeemed,
    costEfficiency: totalActualCost > 0 ? ((totalSales - totalActualCost) / totalActualCost * 100) : 0,
    voucherRate: totalVouchers > 0 ? (totalRedeemed / totalVouchers * 100) : 0,
    bepRate: withResults.length > 0 ? (bepCount / withResults.length * 100) : 0,
    bepCount, bepTotal: withResults.length,
    totalTargetRevenue, totalRevenueAchieved, totalPromoValue,
    revenuePct: totalTargetRevenue > 0 ? (totalRevenueAchieved / totalTargetRevenue * 100) : 0,
    salesTrend: allSubs.filter(s => s.eventResult).sort((a, b) => a.proposedDate.localeCompare(b.proposedDate)).map(s => ({ name: s.storeName.substring(0, 10), sales: s.eventResult!.actualSales, date: s.proposedDate })),
    budgetComparison: allSubs.filter(s => s.budgets?.length > 0 && s.eventResult).slice(0, 10).map(s => ({ name: s.storeName.substring(0, 12), estimated: s.budgets!.reduce((sum, b) => sum + b.estimatedCost, 0), actual: s.eventResult!.actualTotalCost })),
    totalSubmissions: allSubs.length, approvedCount: approved.length, totalTransactions };
}
export async function getActivityBreakdown(filters: DashboardFilters = {}) {
  const all = filterSubmissions(await db.query.submissions.findMany({ with: { budgets: true, eventResult: true } }), filters);
  const map = new Map<string, { targetRev: number; actualSales: number; biaya: number; stores: { id: number; name: string; targetRev: number; actualSales: number; biaya: number; status: string }[] }>();
  for (const s of all) {
    const key = s.activationType;
    if (!map.has(key)) map.set(key, { targetRev: 0, actualSales: 0, biaya: 0, stores: [] });
    const entry = map.get(key)!;
    const tRev = s.managerTarget || s.targetValue || 0;
    const aSales = s.eventResult?.actualSales ?? 0;
    const biaya = s.eventResult?.actualTotalCost ?? s.budgets?.reduce((sum,b)=>sum+b.estimatedCost,0) ?? 0;
    entry.targetRev += tRev;
    entry.actualSales += aSales;
    entry.biaya += biaya;
    entry.stores.push({ id: s.id, name: s.storeName, targetRev: tRev, actualSales: aSales, biaya, status: s.approvalStatus });
  }
  return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
}

export async function getMonthlyActivity(filters: DashboardFilters = {}) {
  const all = filterSubmissions(await db.query.submissions.findMany({ with: { eventResult: true } }), filters);
  const map = new Map<string, { count: number; approved: number; withResult: number }>();
  for (const s of all) {
    const month = s.proposedDate.substring(0, 7);
    if (!map.has(month)) map.set(month, { count: 0, approved: 0, withResult: 0 });
    const entry = map.get(month)!;
    entry.count++;
    if (s.approvalStatus === "Approved") entry.approved++;
    if (s.eventResult) entry.withResult++;
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }));
}

export async function getStoreRanking(filters: DashboardFilters = {}) {
  const all = filterSubmissions(await db.query.submissions.findMany({ with: { eventResult: true } }), filters);
  const map = new Map<string, { storeName: string; totalEvents: number; targetHits: number; totalSales: number }>();
  for (const s of all) {
    if (!s.eventResult) continue;
    if (!map.has(s.storeName)) map.set(s.storeName, { storeName: s.storeName, totalEvents: 0, targetHits: 0, totalSales: 0 });
    const entry = map.get(s.storeName)!;
    entry.totalEvents++;
    entry.totalSales += s.eventResult.actualSales;
    const target = s.managerTarget || s.targetValue || 0;
    if (target > 0 && s.eventResult.actualSales >= target) entry.targetHits++;
  }
  return Array.from(map.values()).sort((a, b) => b.targetHits - a.targetHits);
}

export async function getStores() {
  const all = await db.select({ name: submissions.storeName }).from(submissions).groupBy(submissions.storeName).orderBy(submissions.storeName);
  return all.map(s => s.name);
}

export async function getFilteredSubmissions(filters: DashboardFilters = {}) {
  const all = await db.query.submissions.findMany({ with: { budgets: true, eventResult: true }, orderBy: [desc(submissions.proposedDate)] });
  return filterSubmissions(all, filters);
}

export async function getVoucherStoreBreakdown() {
  const all = await db.query.submissions.findMany({ with: { eventResult: true } });
  return all.filter(s => s.eventResult && s.eventResult.vouchersDistributed > 0).map(s => {
    const distributed = s.eventResult!.vouchersDistributed;
    const redeemed = s.eventResult!.vouchersRedeemed;
    return { storeName: s.storeName, distributed, redeemed, remaining: distributed - redeemed, pct: distributed > 0 ? Math.round(redeemed / distributed * 100) : 0, voucherCode: s.eventResult!.voucherCode || "" };
  }).sort((a, b) => b.distributed - a.distributed);
}

export async function getComparisonTotals() {
  const all = await db.query.submissions.findMany({
    where: eq(submissions.approvalStatus, "Approved"),
    with: { eventResult: true },
  });
  const withResult = all.filter(s => s.eventResult);
  return {
    totalLastSales: withResult.reduce((s, sub) => s + sub.lastMonthSales, 0),
    totalSales: withResult.reduce((s, sub) => s + (sub.eventResult?.actualSales ?? 0), 0),
    totalLastTx: withResult.reduce((s, sub) => s + sub.lastMonthTransactions, 0),
    totalTx: withResult.reduce((s, sub) => s + (sub.eventResult?.transactionCount ?? 0), 0),
  };
}
export async function getComparisonDetail(type: "sales" | "transactions") {
  const all = await db.query.submissions.findMany({
    where: eq(submissions.approvalStatus, "Approved"),
    with: { eventResult: true },
  });
  return all
    .filter(s => s.eventResult)
    .map(s => ({
      storeName: s.storeName,
      lastValue: type === "sales" ? s.lastMonthSales : s.lastMonthTransactions,
      actualValue: type === "sales" ? (s.eventResult?.actualSales ?? 0) : (s.eventResult?.transactionCount ?? 0),
    }))
    .sort((a, b) => b.actualValue - a.actualValue);
}
export async function getDashboardData(filters: DashboardFilters = {}) {
  const all = await db.query.submissions.findMany({
    with: { budgets: true, eventResult: { with: { costItems: true, promoItems: true } } },
  });
  const stores = [...new Set(all.map(s => s.storeName))].sort();
  const filtered = filterSubmissions(all, filters);
  const approved = filtered.filter(s => s.approvalStatus === "Approved");

  const totalBudget = filtered.reduce((sum, s) => sum + (s.budgets?.reduce((b, bi) => b + bi.estimatedCost, 0) ?? 0), 0);
  const subtractPromo = filters.promoFilter === "withoutPromo";
  const effSales = (s: typeof approved[0]) => subtractPromo ? (s.eventResult?.actualSales ?? 0) - (s.eventResult?.promoSales ?? 0) : (s.eventResult?.actualSales ?? 0);
  const totalSales = approved.reduce((s, sub) => s + effSales(sub), 0);
  const totalActualCost = approved.reduce((s, sub) => s + (sub.eventResult?.actualTotalCost ?? 0), 0);
  const totalVouchers = approved.reduce((s, sub) => s + (sub.eventResult?.vouchersDistributed ?? 0), 0);
  const totalRedeemed = approved.reduce((s, sub) => s + (sub.eventResult?.vouchersRedeemed ?? 0), 0);
  const totalTransactions = approved.reduce((s, sub) => s + (sub.eventResult?.transactionCount ?? 0), 0);
  const withResults = approved.filter(s => s.eventResult);
  const bepCount = withResults.filter(s => effSales(s) >= s.eventResult!.actualTotalCost).length;
  const totalTargetRevenue = approved.reduce((s, sub) => s + (sub.managerTarget || sub.targetValue || 0), 0);
  const totalRevenueAchieved = approved.reduce((s, sub) => s + effSales(sub), 0);

  const stats = {
    totalBudget, totalSales, totalActualCost, totalVouchers, totalRedeemed,
    costEfficiency: totalActualCost > 0 ? ((totalSales - totalActualCost) / totalActualCost * 100) : 0,
    voucherRate: totalVouchers > 0 ? (totalRedeemed / totalVouchers * 100) : 0,
    bepRate: withResults.length > 0 ? (bepCount / withResults.length * 100) : 0,
    bepCount, bepTotal: withResults.length,
    totalTargetRevenue, totalRevenueAchieved,
    totalPromoValue: approved.reduce((s, sub) => s + (sub.eventResult?.promoSales ?? 0), 0),
    revenuePct: totalTargetRevenue > 0 ? (totalRevenueAchieved / totalTargetRevenue * 100) : 0,
    salesTrend: filtered.filter(s => s.eventResult).sort((a, b) => a.proposedDate.localeCompare(b.proposedDate)).map(s => ({ name: s.storeName.substring(0, 10), sales: s.eventResult!.actualSales, date: s.proposedDate })),
    budgetComparison: filtered.filter(s => s.budgets?.length > 0 && s.eventResult).slice(0, 10).map(s => ({ name: s.storeName.substring(0, 12), estimated: s.budgets!.reduce((sum, b) => sum + b.estimatedCost, 0), actual: s.eventResult!.actualTotalCost })),
    totalSubmissions: filtered.length, approvedCount: approved.length, totalTransactions,
  };

  const actMap = new Map<string, { targetRev: number; actualSales: number; biaya: number; stores: { id: number; name: string; targetRev: number; actualSales: number; biaya: number; status: string }[] }>();
  for (const s of filtered) {
    const key = s.activationType;
    if (!actMap.has(key)) actMap.set(key, { targetRev: 0, actualSales: 0, biaya: 0, stores: [] });
    const entry = actMap.get(key)!;
    const tRev = s.managerTarget || s.targetValue || 0;
    entry.targetRev += tRev;
    entry.actualSales += effSales(s);
    entry.biaya += s.eventResult?.actualTotalCost ?? s.budgets?.reduce((sum, b) => sum + b.estimatedCost, 0) ?? 0;
    entry.stores.push({ id: s.id, name: s.storeName, targetRev: tRev, actualSales: effSales(s), biaya: s.eventResult?.actualTotalCost ?? s.budgets?.reduce((sum, b) => sum + b.estimatedCost, 0) ?? 0, status: s.approvalStatus });
  }
  const activityData = Array.from(actMap.entries()).map(([name, data]) => ({ name, ...data }));

  const monthMap = new Map<string, { count: number; approved: number; withResult: number }>();
  for (const s of filtered) {
    const month = s.proposedDate.substring(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { count: 0, approved: 0, withResult: 0 });
    const entry = monthMap.get(month)!;
    entry.count++;
    if (s.approvalStatus === "Approved") entry.approved++;
    if (s.eventResult) entry.withResult++;
  }
  const monthlyData = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }));

  const rankMap = new Map<string, { storeName: string; totalEvents: number; targetHits: number; totalSales: number }>();
  for (const s of filtered) {
    if (!s.eventResult) continue;
    if (!rankMap.has(s.storeName)) rankMap.set(s.storeName, { storeName: s.storeName, totalEvents: 0, targetHits: 0, totalSales: 0 });
    const entry = rankMap.get(s.storeName)!;
    entry.totalEvents++;
    entry.totalSales += effSales(s);
    const target = s.managerTarget || s.targetValue || 0;
    if (target > 0 && effSales(s) >= target) entry.targetHits++;
  }
  const rankingData = Array.from(rankMap.values()).sort((a, b) => b.targetHits - a.targetHits);

  const approvedWithResult = approved.filter(s => s.eventResult);
  const comparisonData = {
    totalLastSales: approvedWithResult.reduce((s, sub) => s + sub.lastMonthSales, 0),
    totalSales: approvedWithResult.reduce((s, sub) => s + effSales(sub), 0),
    totalLastTx: approvedWithResult.reduce((s, sub) => s + sub.lastMonthTransactions, 0),
    totalTx: approvedWithResult.reduce((s, sub) => s + (sub.eventResult?.transactionCount ?? 0), 0),
  };

  return { stats, activityData, monthlyData, rankingData, stores, comparisonData };
}
export async function getCalendarEvents() {
  const all = await db.query.submissions.findMany({ with: { budgets: true, eventResult: true } });
  return all.map(s => ({ id: s.id, title: `${s.storeName} - ${s.activationType}`, date: s.proposedDate, status: s.approvalStatus, picName: s.picName, description: s.descriptionTarget, totalBudget: s.budgets?.reduce((sum, b) => sum + b.estimatedCost, 0) ?? 0 }));
}

// === USER ACTIONS ===
export async function getUsers() {
  return await db.select({ id: users.id, username: users.username, name: users.name, storeName: users.storeName, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
}
export async function getStoreList() {
  const rows = await db.select({ storeName: users.storeName }).from(users);
  return [...new Set(rows.map(r => r.storeName))].filter(Boolean).sort();
}
export async function createUser(data: { username: string; password: string; name: string; storeName: string; role: string }) {
  const { hashPassword } = await import("@/lib/auth");
  await db.insert(users).values({ ...data, password: hashPassword(data.password) });
  revalidatePath("/admin/users");
}
export async function updateUser(id: number, data: { username?: string; password?: string; name?: string; storeName?: string; role?: string }) {
  const upd: any = { ...data };
  if (data.password) {
    const { hashPassword } = await import("@/lib/auth");
    upd.password = hashPassword(data.password);
  } else delete upd.password;
  await db.update(users).set(upd).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
export async function deleteSubmission(id: number) {
  await db.delete(submissions).where(eq(submissions.id, id));
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/calendar");
}

// === SURVEY ACTIONS ===
export async function createSurveyRoute(data: { type: string; storeName: string; picName: string }) {
  const [r] = await db.insert(surveyRoutes).values(data).returning({ id: surveyRoutes.id });
  return r.id;
}
export async function updateSurveyRoute(id: number, data: { endTime?: string; totalDistance?: number; status?: string; notes?: string }) {
  await db.update(surveyRoutes).set(data).where(eq(surveyRoutes.id, id));
}
export async function saveWaypoints(routeId: number, points: { lat: number; lng: number; accuracy?: number }[]) {
  for (const p of points) await db.insert(surveyWaypoints).values({ routeId, lat: p.lat, lng: p.lng, accuracy: p.accuracy ?? null });
}
export async function saveSurveyPhoto(routeId: number, data: { lat: number; lng: number; photoData: string; caption?: string }) {
  await db.insert(surveyPhotos).values({ routeId, ...data, caption: data.caption ?? "" });
}
export async function getSurveyRoutes() {
  return await db.query.surveyRoutes.findMany({ orderBy: [desc(surveyRoutes.createdAt)] });
}
export async function getSurveyRouteById(id: number) {
  return await db.query.surveyRoutes.findFirst({ where: eq(surveyRoutes.id, id), with: { waypoints: true, photos: true } });
}
