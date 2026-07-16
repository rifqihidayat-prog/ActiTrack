"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import DateRangeFilter from "./date-range-filter";

const actTypes = ["Semarak Hijrahfood", "Senam", "Lomba", "Lainnya"];
const typeLabels: Record<string, string> = {
  "Semarak Hijrahfood": "Semarak Hijrahfood", Senam: "Senam", Lomba: "Lomba", Lainnya: "Lainnya",
};

export default function DashboardFilters({ stores, showType }: { stores: string[]; showType?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const startDate = sp.get("startDate") || "";
  const endDate = sp.get("endDate") || "";
  const store = sp.get("store") || "";
  const type = sp.get("type") || "";
  const promo = sp.get("promo") || "";

  const apply = (key: string, val: string) => {
    const params = new URLSearchParams(sp.toString());
    if (val) params.set(key, val); else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  const handleDateRange = (sd: string, ed: string) => {
    const params = new URLSearchParams(sp.toString());
    if (sd) params.set("startDate", sd); else params.delete("startDate");
    if (ed) params.set("endDate", ed); else params.delete("endDate");
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
      <DateRangeFilter startDate={startDate} endDate={endDate} onApply={handleDateRange} />
      <select value={store} onChange={e => apply("store", e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400">
        <option value="">Semua Toko</option>
        {stores.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
