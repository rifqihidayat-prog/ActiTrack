"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Medal, Award, Target } from "lucide-react";

const icons = [Trophy, Medal, Award];

export default function StoreRanking({ data }: { data: { storeName: string; totalEvents: number; targetHits: number; totalSales: number }[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold text-slate-900">Ranking Store</h3></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((s, i) => {
            const Icon = icons[i] || Award;
            const pct = s.totalEvents > 0 ? Math.round(s.targetHits / s.totalEvents * 100) : 0;
            return (
              <div key={s.storeName} className="flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ background: i < 3 ? "var(--ga-blue-bg)" : "transparent" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#d97706" : "#f1f5f9", color: i < 3 ? "#fff" : "#94a3b8" }}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.storeName}</p>
                  <p className="text-xs text-slate-500">{s.targetHits}x capai target · {s.totalEvents} event</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-700">{pct}%</p>
                  <p className="text-xs text-slate-500">{formatCurrency(s.totalSales)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
