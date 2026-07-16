import { getDashboardStats, getActivityBreakdown, getMonthlyActivity, getStoreRanking, getStores } from "@/lib/actions";
import { StatCard } from "@/components/ui/stat-card";
import ActivityBarChart from "@/components/charts/activity-bar";
import MonthlyActivityChart from "@/components/charts/monthly-activity";
import VoucherDonutChart from "@/components/charts/voucher-donut";
import StoreRanking from "@/components/charts/store-ranking";
import DashboardFilters from "@/components/ui/dashboard-filters";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, PiggyBank, Percent, Store, BarChart3, History } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string; store?: string; type?: string; promo?: string }> }) {
  const sp = await searchParams;
  const filters = { month: sp.month, year: sp.year, storeName: sp.store, activationType: sp.type, promoFilter: sp.promo as "withoutPromo" | undefined };
  const stats = await getDashboardStats(filters);
  const activityData = await getActivityBreakdown(filters);
  const monthlyData = await getMonthlyActivity(filters);
  const rankingData = await getStoreRanking(filters);
  const stores = await getStores();
  const costRatio = stats.totalRevenueAchieved > 0 ? (stats.totalActualCost / stats.totalRevenueAchieved * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Overview pencapaian aktivasi toko</p>
        </div>
        <Link href="/activity"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
          <History size={16} /> Riwayat Aktivitas
        </Link>
      </div>

      <DashboardFilters stores={stores} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Target Sales" value={formatCurrency(stats.totalTargetRevenue)} sub={`${stats.approvedCount} event approved`} />
        <StatCard icon={TrendingUp} label="Realisasi Sales" value={formatCurrency(stats.totalRevenueAchieved)} sub={`${stats.revenuePct.toFixed(0)}% dari target`} />
        <StatCard icon={Percent} label="Cost Ratio" value={`${costRatio.toFixed(1)}%`} sub={`Biaya ${formatCurrency(stats.totalActualCost)} / Realisasi ${formatCurrency(stats.totalRevenueAchieved)}`} trend={{ up: costRatio <= 20, pct: costRatio <= 20 ? "Efisien" : "Boros" }} />
        <StatCard icon={PiggyBank} label="Biaya Riil" value={formatCurrency(stats.totalActualCost)} sub={`${stats.totalActualCost > 0 ? ((stats.totalBudget - stats.totalActualCost) / stats.totalBudget * 100).toFixed(0) : 0}% dari estimasi`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityBarChart data={activityData} />
        <MonthlyActivityChart data={monthlyData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VoucherDonutChart distributed={stats.totalVouchers} redeemed={stats.totalRedeemed} />
        <StoreRanking data={rankingData} />
      </div>
    </div>
  );
}
