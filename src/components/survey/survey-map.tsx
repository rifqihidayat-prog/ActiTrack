"use client";
import { useEffect, useRef } from "react";
import { matchRouteToRoads, cleanTrack } from "@/lib/gps";

interface Props {
  waypoints: { lat: number; lng: number }[];
  photos: { lat: number; lng: number; photoData: string; caption: string }[];
  className?: string;
}

export default function SurveyMap({ waypoints, photos, className = "" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const Lref = useRef<any>(null);
  const pathPromiseRef = useRef<Promise<{ lat: number; lng: number }[]> | null>(null);

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
      drawRoute(map, L, waypoints, photos, pathPromiseRef);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L) return;
    drawRoute(map, L, waypoints, photos, pathPromiseRef);
  }, [waypoints, photos]);

  return <div ref={mapRef} className={`w-full h-full min-h-[300px] rounded-xl ${className}`} />;
}

async function drawRoute(
  map: any,
  L: any,
  waypoints: { lat: number; lng: number }[],
  photos: { lat: number; lng: number; photoData: string; caption: string }[],
  pathPromiseRef: { current: Promise<{ lat: number; lng: number }[]> | null }
) {
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Polyline || layer instanceof L.Marker) map.removeLayer(layer);
  });
  if (waypoints.length < 2) return;
  if (!pathPromiseRef.current) {
    pathPromiseRef.current = (async () => {
      const matched = await matchRouteToRoads(waypoints);
      if (matched && matched.length >= 2) return matched;
      return cleanTrack(waypoints);
    })();
  }
  const path = await pathPromiseRef.current;
  if (path.length >= 2) {
    const coords = path.map(w => [w.lat, w.lng]);
    L.polyline(coords, { color: "#1a73e8", weight: 4, opacity: 0.8 }).addTo(map);
    map.fitBounds(L.latLngBounds(coords.map((c: number[]) => L.latLng(c[0], c[1]))), { padding: [20, 20] });
  }

  const first = waypoints[0];
  L.circleMarker([first.lat, first.lng], { radius: 8, color: "#1a73e8", fillColor: "#1a73e8", fillOpacity: 1 }).addTo(map).bindPopup("Start");
  if (waypoints.length > 1) {
    const last = waypoints[waypoints.length - 1];
    L.circleMarker([last.lat, last.lng], { radius: 8, color: "#34a853", fillColor: "#34a853", fillOpacity: 1 }).addTo(map).bindPopup("Finish");
  }

  const icon = L.divIcon({
    html: "<div style='background:#1a73e8;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2)'>&#128247;</div>",
    className: "", iconSize: [32, 32], iconAnchor: [16, 16],
  });

  photos.forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
    marker.bindPopup(`<div class="text-center"><img src="${p.photoData}" class="w-32 h-32 object-cover rounded-lg mb-1" /><p class="text-xs" style="color:#5f6368">${p.caption || "Foto"}</p></div>`);
  });
}