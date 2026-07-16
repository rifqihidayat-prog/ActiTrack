import { getComparisonDetail } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const type = sp.type === "transactions" ? "transactions" : "sales";
  const data = await getComparisonDetail(type);

  const totalLast = data.reduce((s, d) => s + d.lastValue, 0);
  const totalActual = data.reduce((s, d) => s + d.actualValue, 0);
  const title = type === "sales" ? "Sales" : "Transaksi";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perbandingan {title}</h1>
          <p className="text-sm text-slate-500 mt-1">Bulan Lalu vs Realisasi per toko</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bulan Lalu</p>
          <p className="text-lg font-bold mt-1 text-slate-600">
            {type === "sales" ? formatCurrency(totalLast) : totalLast.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Realisasi</p>
          <p className="text-lg font-bold mt-1 text-indigo-600">
            {type === "sales" ? formatCurrency(totalActual) : totalActual.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <Link href="/comparison?type=sales"
            className={`px-5 py-3 text-sm font-medium transition-colors ${type === "sales" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>
            Sales
          </Link>
          <Link href="/comparison?type=transactions"
            className={`px-5 py-3 text-sm font-medium transition-colors ${type === "transactions" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>
            Transaksi
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Toko</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulan Lalu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Realisasi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => {
                const pct = d.lastValue > 0 ? ((d.actualValue - d.lastValue) / d.lastValue * 100) : 0;
                const isUp = pct >= 0;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{d.storeName}</td>
                    <td className="px-4 py-3.5 text-sm text-right text-slate-600">
                      {type === "sales" ? formatCurrency(d.lastValue) : d.lastValue.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right font-semibold text-indigo-600">
                      {type === "sales" ? formatCurrency(d.actualValue) : d.actualValue.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right font-semibold"
                      style={{ color: isUp ? "var(--ga-green)" : "var(--ga-red)" }}>
                      {isUp ? "+" : ""}{pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
