import { haversine } from "./gps";

export interface AdministrativeAddress {
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  formatted: string;
}

export interface StoreCoordinate {
  name: string;
  lat: number;
  lng: number;
  coverageRadiusKm: number;
}

// Master Titik Koordinat Toko Hijrahfood (Dapat diperluas atau disesuaikan)
export const KNOWN_STORES: Record<string, StoreCoordinate> = {
  "Hijrahfood Cimuning": {
    name: "Hijrahfood Cimuning",
    lat: -6.3218,
    lng: 107.0315,
    coverageRadiusKm: 5.0,
  },
  "Hijrahfood Galaxy": {
    name: "Hijrahfood Galaxy",
    lat: -6.2625,
    lng: 106.9745,
    coverageRadiusKm: 5.0,
  },
  "Hijrahfood Depok": {
    name: "Hijrahfood Depok",
    lat: -6.3725,
    lng: 106.8322,
    coverageRadiusKm: 5.0,
  },
  "Hijrahfood Cakung": {
    name: "Hijrahfood Cakung",
    lat: -6.1825,
    lng: 106.945,
    coverageRadiusKm: 5.0,
  },
  "Toko Maju Jaya": {
    name: "Toko Maju Jaya",
    lat: -6.2088,
    lng: 106.8456,
    coverageRadiusKm: 5.0,
  },
  "Toko Bintang Terang": {
    name: "Toko Bintang Terang",
    lat: -6.175,
    lng: 106.827,
    coverageRadiusKm: 5.0,
  },
};

/**
 * Mencari koordinat acuan toko berdasarkan kecocokan nama
 */
export function getStoreCoordinate(storeName: string): StoreCoordinate | null {
  if (!storeName) return null;
  const clean = storeName.toLowerCase().trim();
  for (const [key, val] of Object.entries(KNOWN_STORES)) {
    if (key.toLowerCase() === clean || clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) {
      return val;
    }
  }
  return null;
}

/**
 * Menghitung sudut bearing (derajat 0-360) dari titik 1 ke titik 2
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Mengelompokkan sudut bearing ke 4 mata angin utama:
 * - Utara   : 315° s.d. 45°
 * - Timur   : 45° s.d. 135°
 * - Selatan : 135° s.d. 225°
 * - Barat   : 225° s.d. 315°
 */
export function getCardinalDirection(bearing: number): "Utara" | "Timur" | "Selatan" | "Barat" {
  if (bearing >= 45 && bearing < 135) return "Timur";
  if (bearing >= 135 && bearing < 225) return "Selatan";
  if (bearing >= 225 && bearing < 315) return "Barat";
  return "Utara";
}

/**
 * Cek apakah koordinat survei berada dalam radius coverage toko (5 km per 4 mata angin: Utara, Timur, Selatan, Barat)
 */
export function checkStoreCoverage(
  storeName: string,
  lat: number,
  lng: number,
  customStore?: StoreCoordinate | null,
  defaultRadiusKm = 5.0
) {
  const store = customStore || getStoreCoordinate(storeName);
  if (!store) {
    return {
      hasStoreCoord: false,
      distanceKm: 0,
      direction: "-",
      bearing: 0,
      isWithinCoverage: true,
      message: `Koordinat acuan untuk "${storeName}" belum terdaftar (Radius acuan standar 5 km di 4 arah mata angin)`,
      sectors: [
        { name: "Utara", limitKm: defaultRadiusKm, active: false },
        { name: "Timur", limitKm: defaultRadiusKm, active: false },
        { name: "Selatan", limitKm: defaultRadiusKm, active: false },
        { name: "Barat", limitKm: defaultRadiusKm, active: false },
      ],
    };
  }

  const distMeters = haversine(store.lat, store.lng, lat, lng);
  const distanceKm = Math.round((distMeters / 1000) * 100) / 100;
  const radius = store.coverageRadiusKm || defaultRadiusKm;
  const isWithinCoverage = distanceKm <= radius;
  const bearing = calculateBearing(store.lat, store.lng, lat, lng);
  const direction = getCardinalDirection(bearing);

  const message = isWithinCoverage
    ? `Masuk Coverage Area: Sektor ${direction} (${distanceKm} km dari toko, batas ${radius} km)`
    : `Di Luar Coverage: Sektor ${direction} (${distanceKm} km > batas ${radius} km dari toko)`;

  return {
    hasStoreCoord: true,
    storeName: store.name,
    storeLat: store.lat,
    storeLng: store.lng,
    distanceKm,
    radiusKm: radius,
    bearing: Math.round(bearing),
    direction,
    isWithinCoverage,
    message,
    sectors: [
      { name: "Utara", limitKm: radius, active: direction === "Utara" },
      { name: "Timur", limitKm: radius, active: direction === "Timur" },
      { name: "Selatan", limitKm: radius, active: direction === "Selatan" },
      { name: "Barat", limitKm: radius, active: direction === "Barat" },
    ],
  };
}

/**
 * Reverse Geocoding OSM Nominatim untuk mendapatkan Kelurahan & Kecamatan di Indonesia
 */
export async function getAdministrativeAddress(lat: number, lng: number, timeoutMs = 5000): Promise<AdministrativeAddress> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ActiTrack-Retail/1.0 (survey-tracking-module)",
        "Accept-Language": "id,en",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Nominatim returned status ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    const kelurahan =
      addr.village ||
      addr.quarter ||
      addr.neighbourhood ||
      addr.hamlet ||
      addr.residential ||
      addr.suburb ||
      "";

    const kecamatan =
      addr.city_district ||
      addr.district ||
      addr.subdistrict ||
      addr.municipality ||
      (addr.village && addr.suburb && addr.suburb !== addr.village ? addr.suburb : "") ||
      "";

    const city =
      addr.city ||
      addr.county ||
      addr.regency ||
      addr.town ||
      "";

    const province = addr.state || "";

    const parts: string[] = [];
    if (kelurahan) parts.push(`Kel. ${kelurahan}`);
    if (kecamatan) parts.push(`Kec. ${kecamatan}`);
    if (city) parts.push(city);

    return {
      kelurahan: kelurahan || "-",
      kecamatan: kecamatan || "-",
      city: city || "-",
      province: province || "-",
      formatted: parts.length > 0 ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(",") || "-"),
    };
  } catch (err: any) {
    console.warn("Geocoding failed, using fallback:", err?.message);
    return {
      kelurahan: "-",
      kecamatan: "-",
      city: "-",
      province: "-",
      formatted: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
    };
  }
}
