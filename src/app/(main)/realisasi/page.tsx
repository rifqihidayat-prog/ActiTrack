import { getSubmissionsWithDetails } from "@/lib/actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight, TrendingUp, Target, CheckCircle, XCircle, Minus } from "lucide-react";

const objLabels: Record<string, string> = { REVENUE: "Pendapatan", TRAFFIC: "Kunjungan" };

export default async function RealisasiPage() {
  const all = await getSubmissionsWithDetails();
  const approved = all.filter(s => s.approvalStatus === "Approved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Realisasi Event</h1>
        <p className="text-sm text-slate-500 mt-1">Pantau hasil aktual setiap event aktivasi toko</p>
      </div>

      {approved.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Belum ada event yang disetujui</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tujuan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Rev</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Trans</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Rev</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Trans</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Trans</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Biaya</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Biaya</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((s: any, i: number) => {
                  const targetRev = s.managerTarget || s.targetValue || 0;
                  const targetTx = s.targetTransactions || 0;
                  const hasResult = !!s.eventResult;
                  const actualSales = hasResult ? s.eventResult.actualSales : 0;
                  const actualTx = hasResult ? (s.eventResult.transactionCount || 0) : 0;
                  const bep = hasResult ? actualSales >= s.eventResult.actualTotalCost : null;
                  const revPct = targetRev > 0 && hasResult ? (actualSales / targetRev * 100) : null;
                  const txPct = targetTx > 0 && hasResult ? (actualTx / targetTx * 100) : null;

                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link href={`/submissions/${s.id}`} className="text-sm font-medium text-ga-blue hover:underline">
                          {s.storeName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(s.proposedDate)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          {objLabels[s.objectiveType] || s.objectiveType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-medium text-slate-900">
                        {targetRev > 0 ? formatCurrency(targetRev) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-medium text-slate-900">
                        {targetTx > 0 ? targetTx.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: revPct !== null && revPct >= 100 ? "var(--ga-green)" : revPct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {hasResult ? formatCurrency(actualSales) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: revPct !== null && revPct >= 100 ? "var(--ga-green)" : revPct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {revPct !== null ? `${revPct.toFixed(0)}%` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: txPct !== null && txPct >= 100 ? "var(--ga-green)" : txPct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {hasResult ? actualTx.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right font-semibold"
                        style={{ color: txPct !== null && txPct >= 100 ? "var(--ga-green)" : txPct !== null ? "var(--ga-red)" : "var(--ga-text)" }}>
                        {txPct !== null ? `${txPct.toFixed(0)}%` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right text-slate-900">
                        {hasResult ? formatCurrency(s.eventResult.actualTotalCost) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {bep === true ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ga-green">
                            <CheckCircle size={14} /> Tercapai
                          </span>
                        ) : bep === false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ga-red">
                            <XCircle size={14} /> Belum Tercapai
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400"><Minus size={14} className="inline" /></span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link href={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: hasResult ? "var(--ga-blue-light)" : "var(--ga-green-bg)",
                            color: hasResult ? "var(--ga-blue)" : "var(--ga-green)"
                          }}>
                          {hasResult ? "Rincian" : "Input Hasil"}
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="ga-card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Approved</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--ga-text)" }}>{approved.length}</p>
        </div>
        <div className="ga-card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Sudah Diisi</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--ga-blue)" }}>{approved.filter(s => s.eventResult).length}</p>
        </div>
        <div className="ga-card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Tertutup</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--ga-green)" }}>{approved.filter(s => s.eventResult && s.eventResult.actualSales >= s.eventResult.actualTotalCost).length}</p>
        </div>
        <div className="ga-card p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Belum Input</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--ga-red)" }}>{approved.filter(s => !s.eventResult).length}</p>
        </div>
      </div>
    </div>
  );
}
