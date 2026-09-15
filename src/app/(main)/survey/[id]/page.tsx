import { notFound } from "next/navigation";
import Link from "next/link";
import { getSurveyRouteById } from "@/lib/actions";
import { getAdministrativeAddress, checkStoreCoverage } from "@/lib/geo";
import { Badge } from "@/components/ui/badge";
import SurveyMap from "@/components/survey/survey-map";
import EmailReportButton from "@/components/survey/email-report-button";
import WhatsAppReportButton from "@/components/survey/whatsapp-report-button";
import { ArrowLeft, Clock, Route, MapPin, Camera, Download, ShieldCheck, Building2 } from "lucide-react";

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
  const durStr = durationMin >= 60 ? `${Math.floor(durationMin / 60)} jam ${durationMin % 60} menit` : `${durationMin} menit`;

  // Geocoding data wilayah awal survey & coverage
  let adminAddr: any = null;
  let coverage: any = null;
  if (waypoints.length > 0) {
    adminAddr = await getAdministrativeAddress(waypoints[0].lat, waypoints[0].lng);
    coverage = checkStoreCoverage(route.storeName, waypoints[0].lat, waypoints[0].lng);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Bar Navigasi & Aksi */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/survey"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali ke Riwayat
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppReportButton
            route={{
              id: Number(id),
              storeName: route.storeName,
              picName: route.picName,
              type: route.type,
              createdAt: route.createdAt,
              totalDistance: distance,
            }}
            summaryInfo={{
              durationStr: endTime ? durStr : "-",
              photoCount: photos.length,
              kelurahan: adminAddr?.kelurahan,
              kecamatan: adminAddr?.kecamatan,
              city: adminAddr?.city,
              coverageMessage: coverage?.message,
            }}
          />

          <EmailReportButton routeId={Number(id)} />

          <a
            href={`/api/survey/${id}/report`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Download size={16} /> Download Laporan (.docx)
          </a>
        </div>
      </div>

      {/* Card Header & Metrik */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{route.storeName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">PIC: {route.picName || "-"}</p>
          </div>
          <Badge variant={route.status === "completed" ? "success" : route.status === "active" ? "warning" : "default"}>
            {route.status === "completed" ? "Selesai" : route.status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl text-center bg-slate-50 border border-slate-100/80">
            <Clock size={18} className="mx-auto mb-1 text-blue-600" />
            <p className="text-base font-bold text-slate-800">{endTime ? durStr : "-"}</p>
            <p className="text-[11px] text-slate-500 font-medium">Durasi</p>
          </div>
          <div className="p-3.5 rounded-xl text-center bg-slate-50 border border-slate-100/80">
            <Route size={18} className="mx-auto mb-1 text-emerald-600" />
            <p className="text-base font-bold text-slate-800">{(distance / 1000).toFixed(2)} km</p>
            <p className="text-[11px] text-slate-500 font-medium">Jarak Tempuh</p>
          </div>
          <div className="p-3.5 rounded-xl text-center bg-slate-50 border border-slate-100/80">
            <Camera size={18} className="mx-auto mb-1 text-rose-500" />
            <p className="text-base font-bold text-slate-800">{photos.length} Titik</p>
            <p className="text-[11px] text-slate-500 font-medium">Dokumentasi Foto</p>
          </div>
        </div>

        {/* Info Wilayah & Coverage Area Toko */}
        <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100/80 space-y-1.5 text-xs text-slate-700">
          <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
            <Building2 size={15} className="text-blue-600" />
            Wilayah Administratif & Coverage Toko
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Kelurahan: </span>
              <span className="font-semibold text-slate-800">{adminAddr?.kelurahan || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500">Kecamatan: </span>
              <span className="font-semibold text-slate-800">{adminAddr?.kecamatan || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500">Kota: </span>
              <span className="font-semibold text-slate-800">{adminAddr?.city || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500">Coverage: </span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  coverage?.isWithinCoverage ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                <ShieldCheck size={13} />
                {coverage?.message || "Dalam Radius Toko"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Peta Rute Strava-Style */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Route size={16} className="text-orange-500" /> Rute Perjalanan Lapangan (Strava Style)
        </h2>
        <div className="h-[420px] rounded-xl overflow-hidden border border-slate-100">
          <SurveyMap waypoints={waypoints} photos={photos} className="w-full h-full" />
        </div>
      </div>

      {/* Galeri Dokumentasi Lapangan */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Camera size={16} className="text-rose-500" /> Dokumentasi Foto ({photos.length})
            </h2>
            <span className="text-xs text-slate-400">Maksimal 10 foto terbaik masuk laporan Word</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={p.photoData}
                  alt={p.caption || `Foto ${i + 1}`}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow">
                  #{i + 1}
                </div>
                {p.caption && (
                  <p className="absolute bottom-0 left-0 right-0 text-white text-[11px] p-2 bg-gradient-to-t from-black/80 to-transparent">
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
