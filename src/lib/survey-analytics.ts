import { haversine } from "./gps";

export interface SurveyPoint {
  lat: number;
  lng: number;
  source: "photo" | "waypoint";
  caption?: string;
  timestamp?: string;
}

export interface OverlapDetail {
  routeId: number;
  otherRouteId: number;
  storeName: string;
  routeDate: string;
  otherRouteDate: string;
  routeType: string;
  otherRouteType: string;
  picName: string;
  otherPicName: string;
  distanceMeters: number;
  lat: number;
  lng: number;
  category: "identik" | "berdekatan";
  message: string;
}

export interface StoreMonthlySummary {
  storeName: string;
  monthKey: string; // "YYYY-MM" or "all"
  monthLabel: string;
  mailerCount: number;
  observasiCount: number;
  totalSurveys: number;
  totalDistanceKm: number;
  totalPhotos: number;
  hasOverlap: boolean;
  overlapCount: number;
  overlapRoutes: number[];
  overlapRemarks: string[];
  lastSurveyAt: string | null;
}

export interface SurveyAnalyticsResult {
  selectedMonth: string;
  availableMonths: { key: string; label: string; count: number }[];
  overallStats: {
    totalSurveys: number;
    totalMailer: number;
    totalObservasi: number;
    totalDistanceKm: number;
    totalStores: number;
    totalOverlapIncidents: number;
  };
  storeSummaries: StoreMonthlySummary[];
  allOverlaps: OverlapDetail[];
  routeOverlapMap: Record<number, OverlapDetail[]>;
}

/**
 * Sampling titik rute agar komparasi cepat dan efisien.
 * Mengambil semua titik foto + sampling waypoint (awal, akhir, dan interval teratur).
 */
export function extractKeyPoints(
  waypoints: { lat: number; lng: number; timestamp?: string | null }[] = [],
  photos: { lat: number; lng: number; caption?: string | null; timestamp?: string | null }[] = []
): SurveyPoint[] {
  const points: SurveyPoint[] = [];

  // Semua titik foto sangat krusial karena ini tempat tim berhenti & mengambil bukti
  for (const p of photos) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      points.push({
        lat: p.lat,
        lng: p.lng,
        source: "photo",
        caption: p.caption || "",
        timestamp: p.timestamp || undefined,
      });
    }
  }

  // Downsample waypoints hingga maksimal ~25 titik per rute
  if (waypoints.length > 0) {
    const step = Math.max(1, Math.floor(waypoints.length / 25));
    for (let i = 0; i < waypoints.length; i += step) {
      const w = waypoints[i];
      if (Number.isFinite(w.lat) && Number.isFinite(w.lng)) {
        points.push({
          lat: w.lat,
          lng: w.lng,
          source: "waypoint",
          timestamp: w.timestamp || undefined,
        });
      }
    }
    // Pastikan titik terakhir waypoint juga masuk
    const lastW = waypoints[waypoints.length - 1];
    if (lastW && Number.isFinite(lastW.lat) && Number.isFinite(lastW.lng)) {
      points.push({
        lat: lastW.lat,
        lng: lastW.lng,
        source: "waypoint",
        timestamp: lastW.timestamp || undefined,
      });
    }
  }

  return points;
}

/**
 * Format string bulan "YYYY-MM" ke bahasa Indonesia (contoh: "September 2026")
 */
export function formatMonthLabel(monthKey: string): string {
  if (monthKey === "all") return "Semua Periode";
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const date = new Date(parseInt(yearStr, 10), monthIdx, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/**
 * Ekstraksi key "YYYY-MM" dari ISO date string
 */
export function getMonthKeyFromDate(dateStr: string): string {
  if (!dateStr) return "all";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "all";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Deteksi titik/tempat yang sama (tumpang tindih) antar survei.
 * Menggunakan ambang batas jarak <= 150 meter.
 */
export function analyzeRouteOverlaps(
  routes: {
    id: number;
    storeName: string;
    type: string;
    picName: string;
    createdAt: string;
    waypoints?: { lat: number; lng: number }[];
    photos?: { lat: number; lng: number; caption?: string }[];
  }[],
  maxDistanceMeters: number = 150
): {
  allOverlaps: OverlapDetail[];
  routeOverlapMap: Record<number, OverlapDetail[]>;
} {
  const allOverlaps: OverlapDetail[] = [];
  const routeOverlapMap: Record<number, OverlapDetail[]> = {};

  // Siapkan titik-titik untuk tiap rute
  const prepared = routes.map((r) => ({
    ...r,
    points: extractKeyPoints(r.waypoints, r.photos),
  }));

  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const r1 = prepared[i];
      const r2 = prepared[j];

      // Evaluasi overlap terutama untuk toko yang sama
      const sameStore = r1.storeName.trim().toLowerCase() === r2.storeName.trim().toLowerCase();
      if (!sameStore) continue; // Fokus utama: deteksi titik berulang per toko

      if (r1.points.length === 0 || r2.points.length === 0) continue;

      let minDistance = Infinity;
      let closestP1: SurveyPoint | null = null;
      let closestP2: SurveyPoint | null = null;

      for (const p1 of r1.points) {
        for (const p2 of r2.points) {
          const d = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
          if (d < minDistance) {
            minDistance = d;
            closestP1 = p1;
            closestP2 = p2;
          }
        }
      }

      if (minDistance <= maxDistanceMeters && closestP1 && closestP2) {
        const roundedDist = Math.round(minDistance);
        const category = roundedDist <= 40 ? "identik" : "berdekatan";
        const catText = category === "identik" ? "titik identik" : "area sangat berdekatan";

        const dateStr1 = new Date(r1.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const dateStr2 = new Date(r2.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const overlap1: OverlapDetail = {
          routeId: r1.id,
          otherRouteId: r2.id,
          storeName: r1.storeName,
          routeDate: r1.createdAt,
          otherRouteDate: r2.createdAt,
          routeType: r1.type,
          otherRouteType: r2.type,
          picName: r1.picName,
          otherPicName: r2.picName,
          distanceMeters: roundedDist,
          lat: closestP1.lat,
          lng: closestP1.lng,
          category,
          message: `Memiliki ${catText} (±${roundedDist}m) dengan Survei #${r2.id} (${dateStr2} - ${r2.picName || "PIC"}).`,
        };

        const overlap2: OverlapDetail = {
          routeId: r2.id,
          otherRouteId: r1.id,
          storeName: r2.storeName,
          routeDate: r2.createdAt,
          otherRouteDate: r1.createdAt,
          routeType: r2.type,
          otherRouteType: r1.type,
          picName: r2.picName,
          otherPicName: r1.picName,
          distanceMeters: roundedDist,
          lat: closestP2.lat,
          lng: closestP2.lng,
          category,
          message: `Memiliki ${catText} (±${roundedDist}m) dengan Survei #${r1.id} (${dateStr1} - ${r1.picName || "PIC"}).`,
        };

        allOverlaps.push(overlap1);

        if (!routeOverlapMap[r1.id]) routeOverlapMap[r1.id] = [];
        routeOverlapMap[r1.id].push(overlap1);

        if (!routeOverlapMap[r2.id]) routeOverlapMap[r2.id] = [];
        routeOverlapMap[r2.id].push(overlap2);
      }
    }
  }

  return { allOverlaps, routeOverlapMap };
}

/**
 * Menghitung rekapitulasi analitik bulanan per toko:
 * - Frekuensi sebar mailer
 * - Frekuensi observasi
 * - Total jarak tempuh
 * - Status titik berulang / keterangan tumpang tindih
 */
export function buildSurveyDashboardData(
  routes: {
    id: number;
    storeName: string;
    type: string;
    picName: string;
    createdAt: string;
    totalDistance?: number | null;
    status: string;
    waypoints?: { lat: number; lng: number; timestamp?: string | null }[];
    photos?: { lat: number; lng: number; caption?: string | null; timestamp?: string | null }[];
  }[],
  selectedMonth: string = "all"
): SurveyAnalyticsResult {
  // 1. Deteksi semua overlap koordinat
  const { allOverlaps, routeOverlapMap } = analyzeRouteOverlaps(routes);

  // 2. Kumpulkan daftar bulan yang tersedia dari data
  const monthCountMap: Record<string, number> = {};
  for (const r of routes) {
    const key = getMonthKeyFromDate(r.createdAt);
    if (key !== "all") {
      monthCountMap[key] = (monthCountMap[key] || 0) + 1;
    }
  }

  // Urutkan bulan dari terbaru ke terlama
  const availableMonths = Object.keys(monthCountMap)
    .sort()
    .reverse()
    .map((k) => ({
      key: k,
      label: formatMonthLabel(k),
      count: monthCountMap[k],
    }));

  // Tambahkan opsi "all" di paling depan
  availableMonths.unshift({
    key: "all",
    label: "Semua Bulan",
    count: routes.length,
  });

  // Filter rute berdasarkan selectedMonth jika bukan 'all'
  const filteredRoutes = selectedMonth === "all"
    ? routes
    : routes.filter((r) => getMonthKeyFromDate(r.createdAt) === selectedMonth);

  // 3. Kelompokkan per toko
  const storeMap: Record<string, StoreMonthlySummary> = {};

  for (const r of filteredRoutes) {
    const store = r.storeName || "Tanpa Nama Toko";
    if (!storeMap[store]) {
      storeMap[store] = {
        storeName: store,
        monthKey: selectedMonth,
        monthLabel: formatMonthLabel(selectedMonth),
        mailerCount: 0,
        observasiCount: 0,
        totalSurveys: 0,
        totalDistanceKm: 0,
        totalPhotos: 0,
        hasOverlap: false,
        overlapCount: 0,
        overlapRoutes: [],
        overlapRemarks: [],
        lastSurveyAt: null,
      };
    }

    const item = storeMap[store];
    item.totalSurveys += 1;

    if (r.type === "mailer") {
      item.mailerCount += 1;
    } else {
      item.observasiCount += 1;
    }

    if (r.totalDistance && r.totalDistance > 0) {
      item.totalDistanceKm += r.totalDistance / 1000;
    }

    if (r.photos) {
      item.totalPhotos += r.photos.length;
    }

    // Periksa apakah rute ini memiliki overlap
    const overlaps = routeOverlapMap[r.id];
    if (overlaps && overlaps.length > 0) {
      item.hasOverlap = true;
      for (const ov of overlaps) {
        if (!item.overlapRoutes.includes(ov.routeId)) {
          item.overlapRoutes.push(ov.routeId);
        }
        if (!item.overlapRemarks.includes(ov.message)) {
          item.overlapRemarks.push(ov.message);
        }
      }
    }

    // Update lastSurveyAt
    if (!item.lastSurveyAt || new Date(r.createdAt).getTime() > new Date(item.lastSurveyAt).getTime()) {
      item.lastSurveyAt = r.createdAt;
    }
  }

  // Hitung overlapCount untuk tiap toko
  for (const store of Object.values(storeMap)) {
    store.overlapCount = store.overlapRoutes.length;
    store.totalDistanceKm = Math.round(store.totalDistanceKm * 100) / 100;
  }

  // Urutkan ringkasan toko berdasarkan total survey terbanyak
  const storeSummaries = Object.values(storeMap).sort((a, b) => b.totalSurveys - a.totalSurveys);

  // 4. Hitung overall stats
  let totalSurveys = 0;
  let totalMailer = 0;
  let totalObservasi = 0;
  let totalDistanceKm = 0;
  let totalOverlapIncidents = 0;

  for (const s of storeSummaries) {
    totalSurveys += s.totalSurveys;
    totalMailer += s.mailerCount;
    totalObservasi += s.observasiCount;
    totalDistanceKm += s.totalDistanceKm;
    if (s.hasOverlap) totalOverlapIncidents += s.overlapCount;
  }

  return {
    selectedMonth,
    availableMonths,
    overallStats: {
      totalSurveys,
      totalMailer,
      totalObservasi,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalStores: storeSummaries.length,
      totalOverlapIncidents,
    },
    storeSummaries,
    allOverlaps,
    routeOverlapMap,
  };
}
