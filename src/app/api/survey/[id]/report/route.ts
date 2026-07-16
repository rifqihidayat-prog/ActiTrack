import { NextRequest, NextResponse } from "next/server";
import { getSurveyRouteById } from "@/lib/actions";
import sharp from "sharp";

function worldPx(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = (lng + 180) / 360 * n * 256;
  const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256;
  return { x, y };
}

function calcZoom(waypoints: any[], imgW: number, imgH: number): number {
  const lats = waypoints.map((w: any) => w.lat);
  const lngs = waypoints.map((w: any) => w.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latD = maxLat - minLat || 0.001;
  const lngD = maxLng - minLng || 0.001;
  const zLat = Math.log2(0.9 * imgH / ((latD / 360) * 256));
  const zLng = Math.log2(0.9 * imgW / ((lngD / 360) * 256));
  const z = Math.floor(Math.min(zLat, zLng));
  return Math.max(13, Math.min(19, z));
}

async function fetchOSMTile(z: number, x: number, y: number): Promise<Buffer | null> {
  try {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 200) return buf;
    }
  } catch {}
  return null;
}

async function fetchOSRMRoute(waypoints: any[]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map((w: any) => `${w.lng},${w.lat}`).join(";");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) return null;
    return data.routes[0].geometry.coordinates;
  } catch {
    return null;
  }
}

async function buildMapPNG(waypoints: any[], photos: any[]): Promise<string> {
  const W = 700, H = 400;
  if (waypoints.length < 2) return "";

  const lats = waypoints.map((w: any) => w.lat);
  const lngs = waypoints.map((w: any) => w.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const zoom = calcZoom(waypoints, W, H);

  // Viewport in world pixel coords (centered on mid-point)
  const c = worldPx(centerLat, centerLng, zoom);
  const vpLeft = c.x - W / 2;
  const vpTop = c.y - H / 2;
  const vpRight = c.x + W / 2;
  const vpBottom = c.y + H / 2;

  // Tile range covering the viewport
  const minTX = Math.floor(vpLeft / 256);
  const maxTX = Math.floor((vpRight - 1) / 256);
  const minTY = Math.floor(vpTop / 256);
  const maxTY = Math.floor((vpBottom - 1) / 256);

  // Fetch all tiles in range
  const tilePromises: Promise<Buffer | null>[] = [];
  const tileCoords: { tx: number; ty: number }[] = [];
  for (let tx = minTX; tx <= maxTX; tx++) {
    for (let ty = minTY; ty <= maxTY; ty++) {
      tileCoords.push({ tx, ty });
      tilePromises.push(fetchOSMTile(zoom, tx, ty));
    }
  }
  const tileResults = await Promise.all(tilePromises);

  // Composite tiles into a single image
  const tileW = (maxTX - minTX + 1) * 256;
  const tileH = (maxTY - minTY + 1) * 256;
  const layers: any[] = [];
  let idx = 0;
  for (const { tx, ty } of tileCoords) {
    const buf = tileResults[idx++];
    if (buf) {
      const img = await sharp(buf).resize(256, 256).png().toBuffer();
      layers.push({ input: img, top: (ty - minTY) * 256, left: (tx - minTX) * 256 });
    }
  }
  let tileImg: Buffer;
  if (layers.length > 0) {
    const bg = await sharp({
      create: { width: tileW, height: tileH, channels: 3, background: { r: 248, g: 249, b: 250 } }
    }).png().toBuffer();
    tileImg = await sharp(bg).composite(layers).png().toBuffer();
  } else {
    tileImg = await sharp({
      create: { width: tileW, height: tileH, channels: 3, background: { r: 248, g: 249, b: 250 } }
    }).png().toBuffer();
  }

  // Crop to exact viewport
  const cropped = await sharp(tileImg)
    .extract({
      left: Math.round(vpLeft - minTX * 256),
      top: Math.round(vpTop - minTY * 256),
      width: W,
      height: H,
    })
    .png().toBuffer();

  // SVG overlay dimensions match viewport
  function svgCoord(lat: number, lng: number) {
    const p = worldPx(lat, lng, zoom);
    return { x: p.x - vpLeft, y: p.y - vpTop };
  }

  const osrmCoords = await fetchOSRMRoute(waypoints);
  let routeCoords: { lat: number; lng: number }[];
  if (osrmCoords) {
    routeCoords = osrmCoords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
  } else {
    routeCoords = waypoints;
  }
  const pts = routeCoords.map((w: any) => {
    const p = svgCoord(w.lat, w.lng);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");

  const waypointDots = waypoints.map((w: any) => {
    const p = svgCoord(w.lat, w.lng);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#222" opacity="0.5"/>`;
  }).join("");

  let photoMarkers = "";
  photos.forEach((ph: any, i: number) => {
    const p = svgCoord(ph.lat, ph.lng);
    photoMarkers += `<g>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="#d93025" stroke="white" stroke-width="2.5"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="white" font-weight="bold" font-family="Arial">${i + 1}</text>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 24).toFixed(1)}" text-anchor="middle" font-size="9" fill="#333" font-weight="bold" font-family="Arial">Foto ${i + 1}</text>
    </g>`;
  });

  const sp = svgCoord(waypoints[0].lat, waypoints[0].lng);
  const ep = svgCoord(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng);

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <polyline points="${pts}" fill="none" stroke="#1a73e8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" stroke-dasharray=""/>
    <circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="10" fill="#1a73e8" stroke="white" stroke-width="3"/>
    <text x="${sp.x.toFixed(1)}" y="${(sp.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">S</text>
    <text x="${sp.x.toFixed(1)}" y="${(sp.y - 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#1a73e8" font-weight="bold" font-family="Arial">Start</text>
    <circle cx="${ep.x.toFixed(1)}" cy="${ep.y.toFixed(1)}" r="10" fill="#34a853" stroke="white" stroke-width="3"/>
    <text x="${ep.x.toFixed(1)}" y="${(ep.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">F</text>
    <text x="${ep.x.toFixed(1)}" y="${(ep.y - 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#34a853" font-weight="bold" font-family="Arial">Finish</text>
    ${waypointDots}
    ${photoMarkers}
    <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#888" font-family="Arial">OpenStreetMap &#169; kontributor — Zoom ${zoom}</text>
  </svg>`;

  const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  const composite = await sharp(cropped).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toBuffer();
  return composite.toString("base64");
}

function buildDoc(route: any, mapB64: string): string {
  const waypoints = route.waypoints || [];
  const photos = route.photos || [];
  const distance = route.totalDistance ?? 0;
  const startTime = new Date(route.createdAt);
  const endTime = route.endTime ? new Date(route.endTime) : null;
  const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const dateStr = startTime.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Google Maps directions URL
  const waypointStr = waypoints.map((w: any) => `${w.lat},${w.lng}`).join("/");
  const lats = waypoints.map((w: any) => w.lat);
  const lngs = waypoints.map((w: any) => w.lng);
  const cLat = ((Math.min(...lats) + Math.max(...lats)) / 2).toFixed(6);
  const cLng = ((Math.min(...lngs) + Math.max(...lngs)) / 2).toFixed(6);
  const gmapsUrl = `https://www.google.com/maps/dir/${waypointStr}/@${cLat},${cLng},15z`;

  let photoRows = "";
  if (photos.length > 0) {
    const cols = 2;
    for (let r = 0; r < Math.ceil(photos.length / cols); r++) {
      const row = photos.slice(r * cols, r * cols + cols);
      photoRows += `<tr>${row.map((p: any) => `
      <td style="border:none;padding:0 15px 15px 0;text-align:left;vertical-align:top;width:50%">
        <img src="${p.photoData}" width="315" height="267" style="width:236pt;height:200pt;border:1pt solid #999" />
        <p>${p.caption || "Foto dokumentasi"}</p>
        <p class="loc">Lokasi: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</p>
      </td>`).join("")}
    </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 20mm 15mm; color: #222; }
  .header { text-align: center; margin-bottom: 30pt; page-break-after: avoid; }
  .header h1 { font-size: 24pt; font-weight: bold; margin: 0 0 6pt 0; letter-spacing: 0.5pt; }
  .header p { font-size: 11pt; color: #444; margin: 0; }
  .header hr { border: none; border-top: 2.5pt solid #222; margin: 12pt auto 0 auto; width: 70%; }
  .section-title { font-size: 14pt; font-weight: bold; border-bottom: 1.5pt solid #333; padding-bottom: 5pt; margin-top: 24pt; margin-bottom: 12pt; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 11pt; page-break-inside: avoid; }
  table.info td { border: 1pt solid #222; padding: 6pt 10pt; vertical-align: top; }
  table.info td:first-child { width: 30%; font-weight: bold; background: #f5f5f5; }
  table.stats td { border: 1pt solid #222; padding: 12pt 8pt; width: 33%; text-align: center; }
  table.stats .num { font-size: 20pt; font-weight: bold; }
  table.stats .lbl { font-size: 10pt; color: #444; margin-top: 3pt; }
  table.waypoint th { background: #333; color: white; padding: 6pt 10pt; text-align: left; font-weight: bold; font-size: 10pt; border: 1pt solid #333; }
  table.waypoint td { border: 1pt solid #999; padding: 5pt 10pt; font-size: 10pt; }
  .map-container { text-align: center; margin: 14pt 0; page-break-inside: avoid; }
  .map-container img { width: 471pt; height: 269pt; border: 1pt solid #999; mso-width-percent: 24%; mso-height-percent: 24%; }
  .map-link { text-align: center; font-size: 10pt; margin-top: 6pt; }
  .map-link a { color: #1a73e8; }
  .photo-wrapper { page-break-inside: avoid; }
  .photo-table { border: none; width: 100%; border-collapse: collapse; }
  .photo-table td { border: none; padding: 0 15px 15px 0; text-align: left; vertical-align: top; width: 50%; }
  .photo-table td img { width: 236pt; height: 200pt; border: 1pt solid #999; }
  .photo-table td p { margin: 3pt 0 0 0; font-size: 10pt; font-family: 'Times New Roman', Times, serif; }
  .photo-table td .loc { font-size: 9pt; color: #666; margin: 2pt 0 0 0; }
  .footer { text-align: center; margin-top: 36pt; padding-top: 12pt; border-top: 1pt solid #333; font-size: 10pt; color: #666; }
  .footer .page-num { font-size: 9pt; color: #888; }
  @page { size: A4; margin: 20mm 15mm; }
</style>
</head>
<body>

<div class="header">
  <h1>LAPORAN SURVEY LAPANGAN</h1>
  <p>ActiTrack &mdash; Sistem Manajemen Aktivasi Toko</p>
  <p>No. Laporan: SRV-${String(route.id).padStart(4, "0")} / ${startTime.getFullYear()}</p>
  <hr/>
</div>

<div class="section-title">I. Informasi Umum</div>
<table class="info">
  <tr><td>Tanggal Survey</td><td>${dateStr}</td></tr>
  <tr><td>Tipe Survey</td><td>${route.type === "observasi" ? "Observasi / Pengenalan Toko" : route.type === "mailer" ? "Sebar Mailer / Brosur" : route.type}</td></tr>
  <tr><td>Nama Toko / Tujuan</td><td>${route.storeName}</td></tr>
  <tr><td>PIC / Tim Pelaksana</td><td>${route.picName}</td></tr>
  <tr><td>Status</td><td>${route.status === "completed" ? "Selesai" : route.status}</td></tr>
</table>

<div class="section-title">II. Ringkasan Perjalanan</div>
<table class="stats">
  <tr>
    <td><div class="num">${endTime ? durationMin + " menit" : "-"}</div><div class="lbl">Durasi Perjalanan</div></td>
    <td><div class="num">${(distance / 1000).toFixed(2)} km</div><div class="lbl">Total Jarak Tempuh</div></td>
    <td><div class="num">${waypoints.length}</div><div class="lbl">Jumlah Titik Waypoint</div></td>
  </tr>
</table>

${mapB64 ? `
<div class="section-title">III. Rute Perjalanan</div>
<div class="map-container">
  <img src="data:image/png;base64,${mapB64}" alt="Peta Rute Perjalanan" width="629" height="359" />
  <div class="map-link">
    <a href="${gmapsUrl}">Buka rute ini di Google Maps &rarr;</a>
  </div>
</div>` : `
<div class="section-title">III. Rute Perjalanan</div>
<p style="color:#666;font-size:11pt">Data rute perjalanan tidak tersedia (minimal 2 titik waypoint diperlukan).</p>`}

<div class="section-title">${mapB64 ? "IV" : "III"}. Data Waypoint</div>
${waypoints.length > 0 ? `
<table class="waypoint">
  <thead>
    <tr><th style="width:10%">No</th><th style="width:30%">Latitude</th><th style="width:30%">Longitude</th><th style="width:30%">Akurasi (m)</th></tr>
  </thead>
  <tbody>
    ${waypoints.map((w: any, i: number) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${w.lat.toFixed(6)}</td>
        <td>${w.lng.toFixed(6)}</td>
        <td>${w.accuracy ? w.accuracy.toFixed(1) : "-"}</td>
      </tr>`).join("")}
  </tbody>
</table>` : '<p style="color:#666;font-size:11pt">Tidak ada data waypoint.</p>'}

${photos.length > 0 ? `
<div class="section-title">${mapB64 ? "V" : "IV"}. Dokumentasi Lapangan</div>
<div class="photo-wrapper">
<table class="photo-table">
  ${photoRows}
</table>
</div>` : ""}

<div class="footer">
  <p>Laporan ini digenerate secara otomatis oleh ActiTrack</p>
  <p>ActiTrack &mdash; Aktivasi Toko Management &copy; ${new Date().getFullYear()}</p>
  <p class="page-num">Halaman <span style="mso-field-code: ' PAGE '">1</span> dari <span style="mso-field-code: ' NUMPAGES '">1</span></p>
</div>

</body>
</html>`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const route = await getSurveyRouteById(Number(id));
    if (!route) {
      return NextResponse.json({ error: "Survey not found", id: Number(id) }, { status: 404 });
    }

    const waypoints = route.waypoints || [];
    const photos = route.photos || [];
    let mapB64 = "";
    try {
      mapB64 = await buildMapPNG(waypoints, photos);
    } catch (mapErr: any) {
      console.error("MAP BUILD ERROR:", mapErr?.message);
    }
    const html = buildDoc(route, mapB64);
    const safeName = route.storeName.replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="Laporan_Survey_${safeName}.doc"`,
      },
    });
  } catch (e: any) {
    console.error("REPORT ERROR:", e?.message, e?.stack?.split("\n").slice(0, 5).join("\n"));
    return NextResponse.json({ error: e?.message || "Unknown error", stack: e?.stack?.split("\n").slice(0, 3).join("\n") }, { status: 500 });
  }
}
