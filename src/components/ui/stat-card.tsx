import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, sub, trend }: { icon: LucideIcon; label: string; value: string; sub?: string; trend?: { up: boolean; pct: string } }) {
  return (
    <div className="ga-card p-5 hover:ga-card-hover transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg" style={{ background: "var(--ga-blue-bg)", color: "var(--ga-blue)" }}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", trend.up ? "text-ga-green" : "text-ga-red")}
            style={{ background: trend.up ? "var(--ga-green-bg)" : "var(--ga-red-bg)" }}>
            {trend.up ? "↑" : "↓"} {trend.pct}
          </span>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ga-text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--ga-text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--ga-text-muted)" }}>{sub}</p>}
    </div>
  );
}
