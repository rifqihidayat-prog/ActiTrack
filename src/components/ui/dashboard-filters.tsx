"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i] }));
const actTypes = ["Semarak Hijrahfood", "Senam", "Lomba", "Lainnya"];
const typeLabels: Record<string, string> = {
  "Semarak Hijrahfood": "Semarak Hijrahfood", Senam: "Senam", Lomba: "Lomba", Lainnya: "Lainnya",
};

export default function DashboardFilters({ stores, showType }: { stores: string[]; showType?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const month = sp.get("month") || "";
  const year = sp.get("year") || "";
  const store = sp.get("store") || "";
  const type = sp.get("type") || "";
  const promo = sp.get("promo") || "";

  const apply = (key: string, val: string) => {
    const params = new URLSearchParams(sp.toString());
    if (val) params.set(key, val); else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter size={16} className="text-slate-400" />
      <select value={promo} onChange={e => apply("promo", e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
        <option value="">Semua</option>
        <option value="withoutPromo">Tanpa Promo Khusus</option>
      </select>
      {showType && (
        <select value={type} onChange={e => apply("type", e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
          <option value="">Semua Aktivitas</option>
          {actTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
        </select>
      )}
      <select value={month} onChange={e => apply("month", e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
        <option value="">Semua Bulan</option>
        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select value={year} onChange={e => apply("year", e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
        <option value="">Semua Tahun</option>
        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={store} onChange={e => apply("store", e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
        <option value="">Semua Toko</option>
        {stores.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
