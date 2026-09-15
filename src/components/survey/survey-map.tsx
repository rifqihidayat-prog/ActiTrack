"use client";
import { useEffect, useRef } from "react";
import { cleanTrack } from "@/lib/gps";

interface Props {
  waypoints: { lat: number; lng: number }[];
  photos: { lat: number; lng: number; photoData: string; caption: string }[];
  className?: string;
}

export default function SurveyMap({ waypoints, photos, className = "" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const Lref = useRef<any>(null);

  useEffect(() => {
    if (mapInstance.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;
      Lref.current = L;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([-6.2, 106.8], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;
      drawRoute(map, L, waypoints, photos);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L) return;
    drawRoute(map, L, waypoints, photos);
  }, [waypoints, photos]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-inner ${className}`}
    />
  );
}

function drawRoute(
  map: any,
  L: any,
  waypoints: { lat: number; lng: number }[],
  photos: { lat: number; lng: number; photoData: string; caption: string }[]
) {
  // Bersihkan layer sebelumnya
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Polyline || layer instanceof L.Marker || layer instanceof L.CircleMarker) {
      map.removeLayer(layer);
    }
  });

  if (!waypoints || waypoints.length < 2) {
    if (waypoints && waypoints.length === 1) {
      const p = waypoints[0];
      L.marker([p.lat, p.lng]).addTo(map).bindPopup("Titik Awal");
      map.setView([p.lat, p.lng], 16);
    }
    return;
  }

  // Bersihkan jejak agar mengikuti langkah jalan asli (Strava style)
  const path = cleanTrack(waypoints);
  const track = path.length >= 2 ? path : waypoints;
  const coords = track.map((w) => [w.lat, w.lng]);

  // Garis rute gaya Strava (border putih/kontras + garis oranye tebal)
  L.polyline(coords, {
    color: "#ffffff",
    weight: 8,
    opacity: 0.9,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  L.polyline(coords, {
    color: "#fc5200", // Signature Strava Orange
    weight: 5,
    opacity: 0.95,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  // Auto-fit kamera ke rute
  map.fitBounds(L.latLngBounds(coords.map((c: any) => L.latLng(c[0], c[1]))), {
    padding: [30, 30],
  });

  // Marker Titik Start (Hijau)
  const startPt = track[0];
  const startIcon = L.divIcon({
    html: `<div style="background:#16a34a;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.35);">S</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  L.marker([startPt.lat, startPt.lng], { icon: startIcon }).addTo(map).bindPopup("<b>Titik Mulai (Start)</b>");

  // Marker Titik Finish (Merah/Checkered)
  if (track.length > 1) {
    const endPt = track[track.length - 1];
    const endIcon = L.divIcon({
      html: `<div style="background:#dc2626;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.35);">F</div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([endPt.lat, endPt.lng], { icon: endIcon }).addTo(map).bindPopup("<b>Titik Selesai (Finish)</b>");
  }

  // Marker Foto-foto dengan Nomor Berurut
  photos.forEach((p, idx) => {
    const photoNum = idx + 1;
    const photoIcon = L.divIcon({
      html: `
        <div style="background:#d93025;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);">
          ${photoNum}
        </div>
      `,
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker([p.lat, p.lng], { icon: photoIcon }).addTo(map);
    marker.bindPopup(`
      <div style="text-align:center;max-width:200px;font-family:Arial,sans-serif;">
        <img src="${p.photoData}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.2);" />
        <div style="font-weight:bold;font-size:12px;color:#1e293b;">Foto #${photoNum}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">${p.caption || "Dokumentasi Lapangan"}</div>
      </div>
    `);
  });
}