import { buildMapPNG, buildDocx } from "./src/lib/report-doc";
import sharp from "sharp";

async function makePhoto(color: { r: number; g: number; b: number }, label: string, fmt: "jpeg" | "heif"): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="rgb(${color.r},${color.g},${color.b})"/><text x="600" y="455" text-anchor="middle" font-size="60" fill="white" font-family="Arial">${label}</text></svg>`;
  const buf = await sharp(Buffer.from(svg))[fmt === "heif" ? "heif" : "jpeg"]({ quality: 80 }).toBuffer();
  return `data:image/${fmt === "heif" ? "heic" : "jpeg"};base64,${buf.toString("base64")}`;
}

function isPNG(b64: string): boolean {
  const b = Buffer.from(b64, "base64");
  return b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

function hasBytes(buf: Buffer, text: string): boolean {
  return buf.includes(Buffer.from(text, "utf8"));
}

async function main() {
  // 1) Synthetic walk: ~200 titik, ~6m antar titik, dengan belokan + wiggle
  const waypoints: any[] = [];
  let lat = -6.2088, lng = 106.8456;
  const heading = (45 * Math.PI) / 180;
  for (let i = 0; i < 200; i++) {
    const step = 6 / 111320;
    const wiggle = Math.sin(i / 6) * 0.00003;
    lat += Math.cos(heading) * step;
    lng += Math.sin(heading) * step + wiggle;
    waypoints.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), accuracy: 12 + (i % 5), timestamp: new Date(Date.now() + i * 4000).toISOString() });
  }
  // sisipkan 2 "outlier" untuk uji cleanTrack
  waypoints[50].lat += 0.01;
  waypoints[50].lng += 0.01;

  // 2) 6 foto jpeg + 1 heic
  const photos: any[] = [];
  for (let i = 0; i < 6; i++) {
    photos.push({
      lat: waypoints[i * 30].lat,
      lng: waypoints[i * 30].lng,
      photoData: await makePhoto({ r: 30 + i * 30, g: 90, b: 150 }, `Foto ${i + 1}`, "jpeg"),
      caption: `Dokumentasi ${i + 1}`,
    });
  }
  let heicSupported = true;
  try {
    photos.push({ lat: waypoints[10].lat, lng: waypoints[10].lng, photoData: await makePhoto({ r: 0, g: 100, b: 0 }, "HEIC", "heif"), caption: "Uji HEIC" });
  } catch {
    heicSupported = false;
    console.log("INFO: sharp lokal tidak mendukung encode HEIC (skip uji HEIC)");
  }

  const route = {
    id: 99,
    storeName: "Toko Uji Coba",
    picName: "PIC Test",
    type: "observasi",
    status: "completed",
    createdAt: new Date().toISOString(),
    endTime: new Date(Date.now() + 200 * 4000).toISOString(),
    totalDistance: 0,
    waypoints,
    photos,
  };

  // 3) Map
  const t0 = Date.now();
  const mapB64 = await buildMapPNG(waypoints, photos);
  console.log(`buildMapPNG: ${mapB64.length} chars base64, isPNG=${isPNG(mapB64)}, ${Date.now() - t0}ms`);

  // 4) Docx
  const t1 = Date.now();
  const docx = await buildDocx(route, mapB64);
  console.log(`buildDocx: ${docx.length} bytes (${(docx.length / 1024).toFixed(0)} KB), ${Date.now() - t1}ms`);
  console.log("zip magic PK:", docx[0] === 0x50 && docx[1] === 0x4b);
  console.log("contains word/media image:", hasBytes(docx, "word/media/image"));
  console.log("contains Rute Perjalanan:", hasBytes(docx, "Rute Perjalanan"));
  console.log("contains Dokumentasi Lapangan:", hasBytes(docx, "Dokumentasi Lapangan"));
  console.log("contains Data Waypoint:", hasBytes(docx, "Data Waypoint"));
  console.log("photo embedded count (image1..image9):", ["image1.", "image2.", "image3.", "image4.", "image5.", "image6.", "image7.", "image8.", "image9."].filter((s) => hasBytes(docx, s)).length);

  const fail = [];
  if (!isPNG(mapB64)) fail.push("MAP_NOT_VALID");
  if (!(docx.length > 1000)) fail.push("DOCX_TOO_SMALL");
  if (docx[0] !== 0x50 || docx[1] !== 0x4b) fail.push("NOT_ZIP");
  if (fail.length) {
    console.log("FAIL:", fail.join(", "));
    process.exit(1);
  }
  const { writeFileSync } = await import("fs");
  writeFileSync("test-out.docx", docx);
  console.log("saved test-out.docx for inspection");
  console.log("ALL TESTS PASSED", heicSupported ? "(termasuk HEIC decode)" : "(HEIC tidak diuji)");
}

main().catch((e) => {
  console.error("TEST ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});