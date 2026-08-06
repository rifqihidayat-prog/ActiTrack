"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSurveyRoute, updateSurveyRoute, saveWaypoints, saveSurveyPhoto } from "@/lib/actions";
import Button from "@/components/ui/button";
import { Camera, Play, Square, Clock, Route, Navigation, MapPin, Store, User } from "lucide-react";

type Waypoint = { lat: number; lng: number; accuracy: number; timestamp: string };
type Photo = { lat: number; lng: number; photoData: string; caption: string };
type LatLng = { lat: number; lng: number };

export default function SurveyTracker({ userStoreName, userName }: { userStoreName?: string; userName?: string }) {
  const router = useRouter();
  const [routeId, setRouteId] = useState<number | null>(null);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [form, setForm] = useState({ storeName: userStoreName || "", picName: userName || "", type: "observasi" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [livePoints, setLivePoints] = useState<LatLng[]>([]);
  const [lastPos, setLastPos] = useState<LatLng | null>(null);
  const waypointsRef = useRef<Waypoint[]>([]);
  const lastPosRef = useRef<LatLng | null>(null);
  const distanceRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startTracking = async () => {
    if (!form.storeName) return;
    const id = await createSurveyRoute(form);
    setRouteId(id);
    setTracking(true);
    startTimeRef.current = Date.now();
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = Date.now();
        const wp: Waypoint = { lat, lng, accuracy: pos.coords.accuracy, timestamp: new Date(now).toISOString() };
        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
          distanceRef.current += d;
          setDistance(distanceRef.current);
          if (d >= 10 || now - lastSaveTimeRef.current >= 5000) {
            waypointsRef.current.push(wp);
            lastSaveTimeRef.current = now;
            setLivePoints(p => [...p, { lat, lng }]);
          }
        } else {
          waypointsRef.current.push(wp);
          lastSaveTimeRef.current = now;
          setLivePoints(p => [...p, { lat, lng }]);
        }
        lastPosRef.current = { lat, lng };
        setLastPos({ lat, lng });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setWatchId(wid);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
  };

  const stopTracking = async () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!routeId) return;
    try {
      await saveWaypoints(routeId, waypointsRef.current);
    } catch (e) {
      console.error("Gagal menyimpan waypoint:", e);
    }
    try {
      await updateSurveyRoute(routeId, { endTime: new Date().toISOString(), totalDistance: distanceRef.current, status: "completed" });
    } catch (e) {
      console.error("Gagal menyelesaikan survey:", e);
    }
    router.push(`/survey/${routeId}`);
    router.refresh();
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
      try {
        await saveSurveyPhoto(routeId, photo);
      } catch (err) {
        console.error("Gagal simpan foto:", err);
      }
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
        <div className="mb-4">
          <LiveMap points={livePoints} />
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

function LiveMap({ points, className = "" }: { points: LatLng[]; className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const Lref = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const pointsRef = useRef<LatLng[]>([]);
  pointsRef.current = points;

  useEffect(() => {
    if (mapInstance.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;
      Lref.current = L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([-6.2, 106.8], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
      mapInstance.current = map;
      const pts = pointsRef.current;
      if (pts.length >= 2) {
        lineRef.current = L.polyline(pts.map(p => [p.lat, p.lng]), { color: "#1a73e8", weight: 4, opacity: 0.85 }).addTo(map);
        map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng] as [number, number])), { padding: [20, 20] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L || points.length === 0) return;
    if (!lineRef.current) {
      lineRef.current = L.polyline(points.map(p => [p.lat, p.lng]), { color: "#1a73e8", weight: 4, opacity: 0.85 }).addTo(map);
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])), { padding: [20, 20] });
    } else {
      const last = points[points.length - 1];
      lineRef.current.addLatLng([last.lat, last.lng]);
    }
  }, [points]);

  return <div ref={mapRef} className={`w-full h-48 rounded-xl ${className}`} />;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}