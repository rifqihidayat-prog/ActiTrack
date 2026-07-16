import { notFound } from "next/navigation";
import Link from "next/link";
import { getSurveyRouteById } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import SurveyMap from "@/components/survey/survey-map";
import { ArrowLeft, Clock, Route, MapPin, Camera, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await getSurveyRouteById(Number(id));
  if (!route) notFound();

  const waypoints = route.waypoints || [];
  const photos = route.photos || [];
  const distance = route.totalDistance ?? 0;
  const startTime = new Date(route.createdAt);
  const endTime = route.endTime ? new Date(route.endTime) : null;
  const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationMin = Math.floor(durationMs / 60000);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/survey" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: "var(--ga-text-secondary)" }}>
          <ArrowLeft size={16} /> Kembali
        </Link>
        <a href={`/api/survey/${id}/report`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "var(--ga-blue)", color: "white" }}>
          <Download size={16} /> Download Laporan (.doc)
        </a>
      </div>

      <div className="ga-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--ga-text)" }}>{route.storeName}</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ga-text-secondary)" }}>{route.picName}</p>
          </div>
          <Badge variant={route.status === "completed" ? "success" : route.status === "active" ? "warning" : "default"}>{route.status}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--ga-bg)" }}>
            <Clock size={16} className="mx-auto mb-1" style={{ color: "var(--ga-text-muted)" }} />
            <p className="text-lg font-semibold" style={{ color: "var(--ga-text)" }}>{endTime ? `${durationMin} mnt` : "-"}</p>
            <p className="text-[10px]" style={{ color: "var(--ga-text-muted)" }}>Durasi</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--ga-bg)" }}>
            <Route size={16} className="mx-auto mb-1" style={{ color: "var(--ga-text-muted)" }} />
            <p className="text-lg font-semibold" style={{ color: "var(--ga-text)" }}>{(distance / 1000).toFixed(2)} km</p>
            <p className="text-[10px]" style={{ color: "var(--ga-text-muted)" }}>Jarak</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--ga-bg)" }}>
            <MapPin size={16} className="mx-auto mb-1" style={{ color: "var(--ga-text-muted)" }} />
            <p className="text-lg font-semibold" style={{ color: "var(--ga-text)" }}>{waypoints.length}</p>
            <p className="text-[10px]" style={{ color: "var(--ga-text-muted)" }}>Waypoint</p>
          </div>
        </div>
      </div>

      <div className="ga-card p-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--ga-text)" }}>
          <MapPin size={16} /> Rute Perjalanan
        </h2>
        <div className="h-[400px] rounded-xl overflow-hidden">
          <SurveyMap waypoints={waypoints} photos={photos} className="w-full h-full" />
        </div>
      </div>

      {photos.length > 0 && (
        <div className="ga-card p-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--ga-text)" }}>
            <Camera size={16} /> Dokumentasi ({photos.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative group">
                <img src={p.photoData} alt={p.caption || `Foto ${i + 1}`} className="w-full h-40 object-cover rounded-xl border" style={{ borderColor: "var(--ga-border)" }} />
                {p.caption && (
                  <p className="absolute bottom-0 left-0 right-0 text-white text-xs p-2 rounded-b-xl" style={{ background: "rgba(0,0,0,0.6)" }}>
                    {p.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
