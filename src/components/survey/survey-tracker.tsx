"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSurveyRoute, updateSurveyRoute, saveWaypoints, saveSurveyPhoto } from "@/lib/actions";
import Button from "@/components/ui/button";
import { Camera, Play, Square, Clock, Route, Navigation, MapPin, Store, User } from "lucide-react";

type Waypoint = { lat: number; lng: number; accuracy: number; timestamp: string };
type Photo = { lat: number; lng: number; photoData: string; caption: string };

export default function SurveyTracker({ userStoreName, userName }: { userStoreName?: string; userName?: string }) {
  const router = useRouter();
  const [routeId, setRouteId] = useState<number | null>(null);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [form, setForm] = useState({ storeName: userStoreName || "", picName: userName || "", type: "observasi" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number } | null>(null);
  const waypointsRef = useRef<Waypoint[]>([]);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startTracking = async () => {
    if (!form.storeName) return;
    const id = await createSurveyRoute(form);
    setRouteId(id);
    setTracking(true);
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const wp = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: new Date().toISOString() };
        waypointsRef.current.push(wp);
        if (lastPos) {
          const d = haversine(lastPos.lat, lastPos.lng, wp.lat, wp.lng);
          setDistance(prev => prev + d);
        }
        setLastPos({ lat: wp.lat, lng: wp.lng });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setWatchId(wid);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopTracking = async () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timerRef.current) clearInterval(timerRef.current);
    if (routeId) {
      await saveWaypoints(routeId, waypointsRef.current);
      await updateSurveyRoute(routeId, { endTime: new Date().toISOString(), totalDistance: distance, status: "completed" });
      router.push(`/survey/${routeId}`);
      router.refresh();
    }
  };

  const takePhoto = () => fileRef.current?.click();

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !routeId || !lastPos) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const photoData = ev.target?.result as string;
      const photo = { lat: lastPos.lat, lng: lastPos.lng, photoData, caption: "" };
      setPhotos(p => [...p, photo]);
      await saveSurveyPhoto(routeId, photo);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!tracking) {
    return (
      <div className="ga-card p-6 space-y-5 max-w-md mx-auto">
        <h2 className="text-lg font-semibold" style={{ color: "var(--ga-text)" }}>Mulai Survey Baru</h2>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5" style={{ color: "var(--ga-text-secondary)" }}>
            <MapPin size={14} /> Tipe
          </label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg outline-none text-sm bg-white transition-colors"
            style={{ border: "1px solid var(--ga-border)", color: "var(--ga-text)" }}
            onFocus={e => e.target.style.borderColor = "var(--ga-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--ga-border)"}>
            <option value="observasi">Observasi / Pengenalan Toko</option>
            <option value="mailer">Sebar Mailer / Brosur</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5" style={{ color: "var(--ga-text-secondary)" }}>
            <Store size={14} /> Nama Toko / Lokasi Tujuan
          </label>
          <input value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg outline-none text-sm bg-white transition-colors"
            style={{ border: "1px solid var(--ga-border)", color: "var(--ga-text)" }}
            onFocus={e => e.target.style.borderColor = "var(--ga-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--ga-border)"} />
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5" style={{ color: "var(--ga-text-secondary)" }}>
            <User size={14} /> Nama Tim / PIC
          </label>
          <input value={form.picName} onChange={e => setForm(p => ({ ...p, picName: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg outline-none text-sm bg-white transition-colors"
            style={{ border: "1px solid var(--ga-border)", color: "var(--ga-text)" }}
            onFocus={e => e.target.style.borderColor = "var(--ga-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--ga-border)"} />
        </div>
        <Button onClick={startTracking} disabled={!form.storeName} className="w-full" size="lg">
          <Play size={18} /> Mulai Tracking
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="ga-card p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--ga-text)" }}>Tracking Aktif</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-xl text-center" style={{ background: "var(--ga-blue-bg)" }}>
            <Clock size={20} className="mx-auto mb-1" style={{ color: "var(--ga-blue)" }} />
            <p className="text-2xl font-bold" style={{ color: "var(--ga-blue)" }}>{fmt(elapsed)}</p>
            <p className="text-xs" style={{ color: "var(--ga-text-muted)" }}>Durasi</p>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: "var(--ga-green-bg)" }}>
            <Route size={20} className="mx-auto mb-1" style={{ color: "var(--ga-green)" }} />
            <p className="text-2xl font-bold" style={{ color: "var(--ga-green)" }}>{(distance / 1000).toFixed(2)} km</p>
            <p className="text-xs" style={{ color: "var(--ga-text-muted)" }}>Jarak</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ga-text-secondary)" }}>
            <Navigation size={14} style={{ color: "var(--ga-blue)" }} /> {form.storeName}
          </p>
          {lastPos && (
            <p className="text-xs mt-1" style={{ color: "var(--ga-text-muted)" }}>
              Lat: {lastPos.lat.toFixed(6)}, Lng: {lastPos.lng.toFixed(6)}
            </p>
          )}
        </div>
        {photos.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--ga-text-muted)" }}>Foto ({photos.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((p, i) => (
                <img key={i} src={p.photoData} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border" style={{ borderColor: "var(--ga-border)" }} />
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={takePhoto} className="flex-1"><Camera size={16} /> Ambil Foto</Button>
          <Button variant="danger" onClick={stopTracking} className="flex-1"><Square size={16} /> Selesai</Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
      </div>
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
