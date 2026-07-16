import { getFilteredSubmissions, getStores } from "@/lib/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import DashboardFilters from "@/components/ui/dashboard-filters";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const typeLabels: Record<string, string> = {
  "Semarak Hijrahfood": "Semarak Hijrahfood", Senam: "Senam", Lomba: "Lomba", Lainnya: "Lainnya",
};
const objLabels: Record<string, string> = { REVENUE: "Pendapatan", TRAFFIC: "Kunjungan" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; type?: string }> }) {
  const sp = await searchParams;
  const filters = { startDate: sp.startDate, endDate: sp.endDate, storeName: sp.store, activationType: sp.type };
  const subs = await getFilteredSubmissions(filters);
  const stores = await getStores();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Riwayat Aktivitas</h1>
        <p className="text-sm text-slate-500 mt-1">Semua data aktivasi toko dalam satu tampilan</p>
      </div>

      <DashboardFilters stores={stores} showType />

      {subs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-sm">Tidak ada data dengan filter tersebut</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktivitas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tujuan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Realisasi</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s: any) => {
                  const target = s.managerTarget || s.targetValue || 0;
                  const sales = s.eventResult?.actualSales ?? 0;
                  const pct = target > 0 && sales > 0 ? (sales / target * 100) : null;
                  const badgeColor = { Pending: "amber" as const, Approved: "emerald" as const, Rejected: "rose" as const }[s.approvalStatus] || "slate";
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{s.storeName}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{typeLabels[s.activationType] || s.activationType}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(s.proposedDate)}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{objLabels[s.objectiveType] || s.objectiveType}</td>
                      <td className="px-4 py-3.5"><Badge color={badgeColor}>{s.approvalStatus}</Badge></td>
                      <td className="px-4 py-3.5 text-sm text-right font-medium text-slate-900">{target > 0 ? formatCurrency(target) : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: pct !== null && pct >= 100 ? "var(--ga-green)" : pct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {sales > 0 ? formatCurrency(sales) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: pct !== null && pct >= 100 ? "var(--ga-green)" : pct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {pct !== null ? `${pct.toFixed(0)}%` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link href={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-all">
                          Detail <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-sm text-slate-500 border-t border-slate-100">
            Menampilkan {subs.length} aktivitas
          </div>
        </div>
      )}
    </div>
  );
}
