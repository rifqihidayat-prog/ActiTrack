import sharp from "sharp";
import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { cleanTrack, haversine } from "./gps";

const WP_LIMIT = 20;
const PHOTO_LIMIT = 8;

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

const TILE_MIRRORS = [
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
];

async function fetchTile(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 200) return buf;
    }
  } catch {}
  return null;
}

// Semua mirror di-fetch paralel; hasil tercepat yang valid dipakai (maks ~4 dtk).
async function fetchOSMTile(z: number, x: number, y: number): Promise<Buffer | null> {
  const urls = TILE_MIRRORS.map(m => m.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)));
  const results = await Promise.all(urls.map(fetchTile));
  return results.find(b => b !== null) ?? null;
}

// Padatkan waypoint mentah (>=5m) sebagai fallback saat cleanTrack kosong.
function compressRaw(pts: any[]): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  for (const p of pts) {
    const lat = Number(p.lat), lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (out.length === 0 || haversine(out[out.length - 1].lat, out[out.length - 1].lng, lat, lng) >= 5) {
      out.push({ lat, lng });
    }
  }
  return out;
}

function validPoints(pts: any[]): any[] {
  return pts.filter((p: any) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
}

export async function buildMapPNG(waypoints: any[], photos: any[]): Promise<string> {
  const W = 700, H = 400;
  const pts0 = validPoints(waypoints);
  if (pts0.length < 2) return "";

  const lats = pts0.map((w: any) => w.lat);
  const lngs = pts0.map((w: any) => w.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const zoom = calcZoom(pts0, W, H);

  const c = worldPx(centerLat, centerLng, zoom);
  const vpLeft = c.x - W / 2;
  const vpTop = c.y - H / 2;
  const vpRight = c.x + W / 2;
  const vpBottom = c.y + H / 2;

  const minTX = Math.floor(vpLeft / 256);
  const maxTX = Math.floor((vpRight - 1) / 256);
  const minTY = Math.floor(vpTop / 256);
  const maxTY = Math.floor((vpBottom - 1) / 256);

  const tilePromises: Promise<Buffer | null>[] = [];
  const tileCoords: { tx: number; ty: number }[] = [];
  for (let tx = minTX; tx <= maxTX; tx++) {
    for (let ty = minTY; ty <= maxTY; ty++) {
      tileCoords.push({ tx, ty });
      tilePromises.push(fetchOSMTile(zoom, tx, ty));
    }
  }
  const tileResults = await Promise.all(tilePromises);

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
  const bg = () => sharp({
    create: { width: tileW, height: tileH, channels: 3, background: { r: 248, g: 249, b: 250 } }
  }).png().toBuffer();
  const tileImg = layers.length > 0 ? await sharp(await bg()).composite(layers).png().toBuffer() : await bg();

  const cropped = await sharp(tileImg)
    .extract({
      left: Math.round(vpLeft - minTX * 256),
      top: Math.round(vpTop - minTY * 256),
      width: W,
      height: H,
    })
    .png().toBuffer();

  function svgCoord(lat: number, lng: number) {
    const p = worldPx(lat, lng, zoom);
    return { x: p.x - vpLeft, y: p.y - vpTop };
  }

  // Jejak GPS asli; fallback ke waypoint mentah agar garis selalu ada.
  const cleaned = cleanTrack(pts0);
  const drawCoords = cleaned.length >= 2 ? cleaned : compressRaw(pts0);
  const pts = drawCoords.length >= 2
    ? drawCoords.map((w: any) => {
        const p = svgCoord(w.lat, w.lng);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(" ")
    : "";

  const waypointDots = pts0.slice(0, 150).map((w: any) => {
    const p = svgCoord(w.lat, w.lng);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#222" opacity="0.5"/>`;
  }).join("");

  let photoMarkers = "";
  photos.slice(0, 20).forEach((ph: any, i: number) => {
    const p = svgCoord(ph.lat, ph.lng);
    photoMarkers += `<g>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="#d93025" stroke="white" stroke-width="2.5"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="white" font-weight="bold" font-family="Arial">${i + 1}</text>
      <text x="${p.x.toFixed(1)}" y="${(p.y + 24).toFixed(1)}" text-anchor="middle" font-size="9" fill="#333" font-weight="bold" font-family="Arial">Foto ${i + 1}</text>
    </g>`;
  });

  const sp = svgCoord(pts0[0].lat, pts0[0].lng);
  const ep = svgCoord(pts0[pts0.length - 1].lat, pts0[pts0.length - 1].lng);

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${pts ? `<polyline points="${pts}" fill="none" stroke="#1a73e8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" stroke-dasharray=""/>` : ""}
    <circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="10" fill="#1a73e8" stroke="white" stroke-width="3"/>
    <text x="${sp.x.toFixed(1)}" y="${(sp.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">S</text>
    <text x="${sp.x.toFixed(1)}" y="${(sp.y - 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#1a73e8" font-weight="bold" font-family="Arial">Start</text>
    <circle cx="${ep.x.toFixed(1)}" cy="${ep.y.toFixed(1)}" r="10" fill="#34a853" stroke="white" stroke-width="3"/>
    <text x="${ep.x.toFixed(1)}" y="${(ep.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">F</text>
    <text x="${ep.x.toFixed(1)}" y="${(ep.y - 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#34a853" font-weight="bold" font-family="Arial">Finish</text>
    ${waypointDots}
    ${photoMarkers}
    <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#888" font-family="Arial">Peta &#169; OpenStreetMap &amp; CARTO kontributor — Zoom ${zoom}</text>
  </svg>`;

  const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  const composite = await sharp(cropped).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toBuffer();
  return composite.toString("base64");
}

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "222222" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "222222" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "222222" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "222222" },
};
const lightCellBorder = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
};

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26 })],
    spacing: { before: 280, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "333333", space: 3 } },
  });
}

function cell(children: Paragraph[], opts: { fill?: string; border?: any; width?: number; span?: number; vertical?: boolean } = {}): TableCell {
  return new TableCell({
    children,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    borders: opts.border,
    width: opts.width !== undefined ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: opts.span,
    verticalAlign: opts.vertical === false ? VerticalAlign.TOP : VerticalAlign.CENTER,
  });
}

function textP(text: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, color: opts.color })],
    alignment: opts.align,
    spacing: { after: 60 },
  });
}

async function photoBuffer(dataUri: string): Promise<Buffer | null> {
  try {
    const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUri);
    if (!m) return null;
    const buf = Buffer.from(m[1], "base64");
    return await sharp(buf).rotate().resize({ width: 700, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
  } catch {
    return null;
  }
}

export async function buildDocx(route: any, mapB64: string): Promise<Buffer> {
  const waypoints = validPoints(route.waypoints || []);
  const photos = route.photos || [];
  const distance = route.totalDistance ?? 0;
  const startRaw = new Date(route.createdAt);
  const startTime = Number.isNaN(startRaw.getTime()) ? null : startRaw;
  const endRaw = route.endTime ? new Date(route.endTime) : null;
  const endTime = endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : null;
  const durationMs = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const durStr = durationMin >= 60 ? `${Math.floor(durationMin / 60)} jam ${durationMin % 60} menit` : `${durationMin} menit`;
  const dateStr = startTime
    ? startTime.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "-";
  const typeStr = route.type === "observasi" ? "Observasi / Pengenalan Toko" : route.type === "mailer" ? "Sebar Mailer / Brosur" : route.type;

  let gmapsUrl = "";
  if (waypoints.length >= 2) {
    const waypointStr = waypoints.map((w: any) => `${w.lat},${w.lng}`).join("/");
    const lats = waypoints.map((w: any) => w.lat);
    const lngs = waypoints.map((w: any) => w.lng);
    const cLat = ((Math.min(...lats) + Math.max(...lats)) / 2).toFixed(6);
    const cLng = ((Math.min(...lngs) + Math.max(...lngs)) / 2).toFixed(6);
    gmapsUrl = `https://www.google.com/maps/dir/${waypointStr}/@${cLat},${cLng},15z`;
  }

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({ children: [new TextRun({ text: "LAPORAN SURVEY LAPANGAN", bold: true, size: 34 })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "ActiTrack — Sistem Manajemen Aktivasi Toko", size: 20, color: "444444" })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: `No. Laporan: SRV-${String(route.id).padStart(4, "0")} / ${startTime ? startTime.getFullYear() : new Date().getFullYear()}`, size: 20, color: "444444" })], alignment: AlignmentType.CENTER, spacing: { after: 160 } })
  );

  children.push(sectionTitle("I. Informasi Umum"));
  const infoRows: TableRow[] = [
    ["Tanggal Survey", dateStr],
    ["Tipe Survey", typeStr],
    ["Nama Toko / Tujuan", route.storeName],
    ["PIC / Tim Pelaksana", route.picName],
    ["Status", route.status === "completed" ? "Selesai" : route.status],
  ].map(([k, v]) => new TableRow({
    children: [
      cell([textP(k, { bold: true })], { fill: "F5F5F5", border: cellBorder, width: 30 }),
      cell([textP(String(v ?? "-"))], { border: cellBorder, width: 70 }),
    ],
  }));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoRows }));

  children.push(sectionTitle("II. Ringkasan Perjalanan"));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        cell([textP(endTime && startTime ? durStr : "-", { bold: true, size: 40, align: AlignmentType.CENTER }), textP("Durasi Perjalanan", { size: 18, color: "444444", align: AlignmentType.CENTER })], { border: cellBorder, width: 33 }),
        cell([textP(`${(distance / 1000).toFixed(2)} km`, { bold: true, size: 40, align: AlignmentType.CENTER }), textP("Total Jarak Tempuh", { size: 18, color: "444444", align: AlignmentType.CENTER })], { border: cellBorder, width: 33 }),
        cell([textP(String(waypoints.length), { bold: true, size: 40, align: AlignmentType.CENTER }), textP("Jumlah Titik Waypoint", { size: 18, color: "444444", align: AlignmentType.CENTER })], { border: cellBorder, width: 34 }),
      ],
    })],
  }));

  children.push(sectionTitle("III. Rute Perjalanan"));
  if (mapB64) {
    children.push(new Paragraph({
      children: [new ImageRun({ type: "png", data: Buffer.from(mapB64, "base64"), transformation: { width: 470, height: 269 } })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
    }));
    if (gmapsUrl) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Buka rute ini di Google Maps → ", size: 18, color: "1a73e8" }), new TextRun({ text: gmapsUrl, size: 16, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }));
    }
  } else {
    children.push(textP("Data rute perjalanan tidak tersedia (minimal 2 titik waypoint diperlukan).", { size: 20, color: "666666" }));
  }

  children.push(sectionTitle("IV. Data Waypoint"));
  if (waypoints.length > 0) {
    const header = new TableRow({
      children: [
        cell([textP("No", { bold: true, size: 18, color: "FFFFFF" })], { fill: "333333", border: cellBorder, width: 10 }),
        cell([textP("Latitude", { bold: true, size: 18, color: "FFFFFF" })], { fill: "333333", border: cellBorder, width: 30 }),
        cell([textP("Longitude", { bold: true, size: 18, color: "FFFFFF" })], { fill: "333333", border: cellBorder, width: 30 }),
        cell([textP("Akurasi (m)", { bold: true, size: 18, color: "FFFFFF" })], { fill: "333333", border: cellBorder, width: 30 }),
      ],
    });
    const rows = waypoints.slice(0, WP_LIMIT).map((w: any, i: number) => new TableRow({
      children: [
        cell([textP(String(i + 1), { align: AlignmentType.CENTER, size: 18 })], { border: lightCellBorder, width: 10 }),
        cell([textP(w.lat.toFixed(6), { size: 18 })], { border: lightCellBorder, width: 30 }),
        cell([textP(w.lng.toFixed(6), { size: 18 })], { border: lightCellBorder, width: 30 }),
        cell([textP(w.accuracy != null ? w.accuracy.toFixed(1) : "-", { size: 18 })], { border: lightCellBorder, width: 30 }),
      ],
    }));
    const withAcc = waypoints.filter((w: any) => w.accuracy != null);
    const avgAcc = withAcc.length > 0 ? withAcc.reduce((a: number, w: any) => a + w.accuracy, 0) / withAcc.length : 0;
    const more = waypoints.length > WP_LIMIT ? ` ... dan ${waypoints.length - WP_LIMIT} titik waypoint lainnya.` : "";
    rows.push(new TableRow({
      children: [cell([textP(`Total ${waypoints.length} titik${more} — Rata-rata akurasi: ${avgAcc ? avgAcc.toFixed(1) + " m" : "-"}`, { size: 18, color: "666666" })], { span: 4, border: lightCellBorder })],
    }));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }));
  } else {
    children.push(textP("Tidak ada data waypoint.", { size: 20, color: "666666" }));
  }

  const reportPhotos = photos.slice(0, PHOTO_LIMIT);
  if (reportPhotos.length > 0) {
    children.push(sectionTitle("V. Dokumentasi Lapangan"));
    const photoRows: TableRow[] = [];
    for (let i = 0; i < reportPhotos.length; i += 2) {
      const pair = reportPhotos.slice(i, i + 2);
      const cells: TableCell[] = [];
      for (const p of pair) {
        const buf = await photoBuffer(p.photoData);
        const inner: Paragraph[] = buf
          ? [
              new Paragraph({ children: [new ImageRun({ type: "jpg", data: buf, transformation: { width: 280, height: 210 } })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
              new Paragraph({ children: [new TextRun({ text: p.caption || "Foto dokumentasi", size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: `Lokasi: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`, size: 16, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
            ]
          : [textP("(Foto gagal dimuat)", { size: 18, color: "666666", align: AlignmentType.CENTER })];
        cells.push(cell(inner, { width: 50 }));
      }
      photoRows.push(new TableRow({ children: cells }));
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: photoRows }));
    if (photos.length > PHOTO_LIMIT) {
      children.push(textP(`... dan ${photos.length - PHOTO_LIMIT} foto lainnya.`, { size: 18, color: "666666", align: AlignmentType.CENTER }));
    }
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: "Laporan ini digenerate secara otomatis oleh ActiTrack", size: 18, color: "666666" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 320, after: 20 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "333333", space: 8 } },
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: `ActiTrack — Aktivasi Toko Management © ${new Date().getFullYear()}`, size: 16, color: "888888" })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: "Halaman 1 dari 1", size: 14, color: "888888" })], alignment: AlignmentType.CENTER }));

  return Packer.toBuffer(new Document({
    creator: "ActiTrack",
    title: `Laporan Survey ${route.storeName}`,
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
        },
      },
      children,
    }],
  }));
}
