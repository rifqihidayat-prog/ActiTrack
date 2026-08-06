export type LatLng = { lat: number; lng: number };
export type GpsPoint = LatLng & { accuracy?: number | null; timestamp?: string | null };

const ACC_MAX = 30;
const SPEED_MAX = 12;
const JUMP_MAX = 400;
const MIN_STEP = 5;

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toTs(ts?: string | null): number {
  if (!ts) return 0;
  const t = Date.parse(ts);
  return Number.isNaN(t) ? 0 : t;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Bersihkan jejak GPS: buang akurasi buruk, median filter (hilangkan jitter),
// buang lompatan outlier, down-sample >= MIN_STEP meter.
export function cleanTrack(points: GpsPoint[]): LatLng[] {
  const acc = points.filter(p => !(p.accuracy != null && p.accuracy > ACC_MAX));
  const n = acc.length;
  if (n < 2) return [];
  const lats: number[] = [];
  const lngs: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      lats.push(acc[i].lat);
      lngs.push(acc[i].lng);
    } else {
      const lo = Math.max(0, i - 2);
      const hi = Math.min(n - 1, i + 2);
      const w = acc.slice(lo, hi + 1);
      lats.push(median(w.map(p => p.lat)));
      lngs.push(median(w.map(p => p.lng)));
    }
  }
  const times = acc.map(p => toTs(p.timestamp));
  let hasTs = false;
  for (let i = 1; i < times.length; i++) {
    if (times[i] > times[i - 1]) { hasTs = true; break; }
  }
  const out: LatLng[] = [{ lat: lats[0], lng: lngs[0] }];
  let lastT = times[0];
  for (let i = 1; i < n; i++) {
    const prev = out[out.length - 1];
    const lat = lats[i], lng = lngs[i];
    const d = haversine(prev.lat, prev.lng, lat, lng);
    if (d > JUMP_MAX) continue;
    if (hasTs) {
      const dt = Math.max(1, (times[i] - lastT) / 1000);
      if (d / dt > SPEED_MAX) continue;
    }
    if (d >= MIN_STEP) {
      out.push({ lat, lng });
      lastT = times[i];
    }
  }
  out.push({ lat: lats[n - 1], lng: lngs[n - 1] });
  return out;
}

// Jarak tempuh (meter) dari jejak GPS mentah.
export function trackDistance(points: GpsPoint[]): number {
  const track = cleanTrack(points);
  if (track.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < track.length; i++) {
    dist += haversine(track[i - 1].lat, track[i - 1].lng, track[i].lat, track[i].lng);
  }
  return dist;
}

function decodePolyline6(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    let r2 = 0, s2 = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      r2 |= (b & 0x1f) << s2;
      s2 += 5;
    } while (b >= 0x20);
    lng += (r2 & 1) !== 0 ? ~(r2 >> 1) : (r2 >> 1);
    coords.push({ lat: lat / 1e6, lng: lng / 1e6 });
  }
  return coords;
}

// Snap jejak GPS ke jaringan jalan OSM (ala Strava) via Valhalla public demo.
// Fallback: null jika layanan gagal/mati.
export async function matchRouteToRoads(points: GpsPoint[], timeoutMs = 8000): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  const thin: LatLng[] = [];
  for (const p of points) {
    if (thin.length === 0 || haversine(thin[thin.length - 1].lat, thin[thin.length - 1].lng, p.lat, p.lng) >= 15) {
      thin.push({ lat: p.lat, lng: p.lng });
    }
  }
  if (thin.length < 2) return null;
  const shape = thin.slice(0, 150).map(p => ({ lat: p.lat, lon: p.lng }));
  try {
    const res = await fetch("https://valhalla.openstreetmap.de/trace_route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shape,
        costing: "pedestrian",
        shape_match: "map_match",
        trace_options: { gps_accuracy: 15, interpolation_distance: 30, search_radius: 100 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const shapeStr: string | undefined = data?.trip?.legs?.[0]?.shape;
    if (!shapeStr) return null;
    const coords = decodePolyline6(shapeStr);
    return coords.length >= 2 ? coords : null;
  } catch {
    return null;
  }
}
