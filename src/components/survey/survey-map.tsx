"use client";
import { useEffect, useRef } from "react";

interface Props {
  waypoints: { lat: number; lng: number }[];
  photos: { lat: number; lng: number; photoData: string; caption: string }[];
  className?: string;
}

export default function SurveyMap({ waypoints, photos, className = "" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const Lref = useRef<any>(null);
  const routedCoordsRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (mapInstance.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;
      Lref.current = L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([-6.2, 106.8], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
      mapInstance.current = map;
      await drawRoute(map, L, waypoints, photos, routedCoordsRef);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L) return;
    routedCoordsRef.current = null;
    drawRoute(map, L, waypoints, photos, routedCoordsRef);
  }, [waypoints, photos]);

  return <div ref={mapRef} className={`w-full h-full min-h-[300px] rounded-xl ${className}`} />;
}

async function fetchRoute(waypoints: { lat: number; lng: number }[]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(";");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full&alternatives=false&steps=false`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) return null;
    return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch {
    return null;
  }
}

async function drawRoute(map: any, L: any, waypoints: { lat: number; lng: number }[], photos: { lat: number; lng: number; photoData: string; caption: string }[], routedRef: React.MutableRefObject<any[] | null>) {
  // Clear previous layers
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Polyline || layer instanceof L.Marker) map.removeLayer(layer);
  });

  if (waypoints.length < 2) return;

  // Try OSRM routing
  if (!routedRef.current) {
    routedRef.current = await fetchRoute(waypoints);
  }
  const routeCoords = routedRef.current;
  const drawCoords = routeCoords || waypoints.map(w => [w.lat, w.lng]);

  if (routeCoords) {
    L.polyline(drawCoords, { color: "#1a73e8", weight: 4, opacity: 0.8 }).addTo(map);
  } else {
    // Fallback: straight line (dashed to indicate not routed)
    const coords = waypoints.map(w => [w.lat, w.lng]);
    L.polyline(coords, { color: "#1a73e8", weight: 4, opacity: 0.6, dashArray: "8, 8" }).addTo(map);
  }

  const first = waypoints[0];
  L.circleMarker([first.lat, first.lng], { radius: 8, color: "#1a73e8", fillColor: "#1a73e8", fillOpacity: 1 }).addTo(map).bindPopup("Start");
  const last = waypoints[waypoints.length - 1];
  L.circleMarker([last.lat, last.lng], { radius: 8, color: "#34a853", fillColor: "#34a853", fillOpacity: 1 }).addTo(map).bindPopup("Finish");

  map.fitBounds(L.latLngBounds(drawCoords.map((c: number[]) => L.latLng(c[0], c[1]))), { padding: [20, 20] });

  const icon = L.divIcon({
    html: "<div style='background:#1a73e8;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2)'>&#128247;</div>",
    className: "", iconSize: [32, 32], iconAnchor: [16, 16],
  });

  photos.forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
    marker.bindPopup(`<div class="text-center"><img src="${p.photoData}" class="w-32 h-32 object-cover rounded-lg mb-1" /><p class="text-xs" style="color:#5f6368">${p.caption || "Foto"}</p></div>`);
  });
}
