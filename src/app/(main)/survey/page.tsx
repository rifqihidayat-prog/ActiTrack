import Link from "next/link";
import { getSurveyRoutes } from "@/lib/actions";
import { MapIcon, Plus, Clock, Route, Store, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const routes = await getSurveyRoutes();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ga-text)" }}>Survey & Tracking</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ga-text-secondary)" }}>Rekam rute kunjungan dan dokumentasi lapangan</p>
        </div>
        <Link href="/survey/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-sm"
          style={{ background: "var(--ga-blue)" }}>
          <Plus size={16} /> Baru
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="ga-card text-center py-20">
          <div className="p-3 rounded-full w-fit mx-auto mb-4" style={{ background: "var(--ga-blue-bg)" }}>
            <MapIcon size={28} style={{ color: "var(--ga-blue)" }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--ga-text)" }}>Belum Ada Survey</h3>
          <p className="text-sm mt-1" style={{ color: "var(--ga-text-secondary)" }}>Mulai rekam rute kunjungan pertamamu</p>
          <Link href="/survey/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "var(--ga-blue)" }}>
            Mulai Tracking
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => (
            <Link key={r.id} href={`/survey/${r.id}`} className="ga-card ga-card-hover block p-5 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--ga-text)" }}>{r.storeName}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ga-text-secondary)" }}>{r.picName}</p>
                </div>
                <Badge variant={r.status === "completed" ? "success" : r.status === "active" ? "warning" : "default"}>{r.status}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--ga-text-secondary)" }}>
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(r.createdAt).toLocaleDateString("id-ID")}</span>
                <span className="flex items-center gap-1"><Route size={12} /> {r.totalDistance ? `${(r.totalDistance / 1000).toFixed(1)} km` : "-"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
