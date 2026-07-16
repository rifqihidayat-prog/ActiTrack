import { getVoucherStoreBreakdown } from "@/lib/actions";
import Link from "next/link";
import { ArrowLeft, Ticket, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function VoucherPage() {
  const data = await getVoucherStoreBreakdown();
  const totalDistributed = data.reduce((s, d) => s + d.distributed, 0);
  const totalRedeemed = data.reduce((s, d) => s + d.redeemed, 0);
  const overallPct = totalDistributed > 0 ? Math.round(totalRedeemed / totalDistributed * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Redeem Voucher</h1>
        <p className="text-sm text-slate-500 mt-1">Rincian voucher per toko</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Ticket size={18} /></div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Disebar</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalDistributed.toLocaleString("id-ID")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={18} /></div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Diredeem</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{totalRedeemed.toLocaleString("id-ID")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Percent size={18} /></div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redeem Rate</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{overallPct}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Outlet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Voucher</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Disebar</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Diredeem</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Belum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Redeem</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{s.storeName}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 font-mono">{s.voucherCode || "-"}</td>
                  <td className="px-4 py-3.5 text-sm text-right text-slate-900 font-medium">{s.distributed.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3.5 text-sm text-right font-semibold text-emerald-600">{s.redeemed.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3.5 text-sm text-right text-slate-500">{s.remaining.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${s.pct >= 70 ? "text-emerald-700 bg-emerald-50" : s.pct >= 40 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50"}`}>
                      {s.pct}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada data voucher</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
