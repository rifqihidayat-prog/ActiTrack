const sharp = require('sharp');

function mercator(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = (lng + 180) / 360 * n * 256;
  const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256;
  return { x, y };
}

function toPixel(lat, lng, cLat, cLng, zoom, imgW, imgH) {
  const p = mercator(lat, lng, zoom);
  const c = mercator(cLat, cLng, zoom);
  return { x: p.x - c.x + imgW / 2, y: c.y - p.y + imgH / 2 };
}

function calcZoom(waypoints, imgW, imgH) {
  const lats = waypoints.map(w => w.lat);
  const lngs = waypoints.map(w => w.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latD = maxLat - minLat || 0.001;
  const lngD = maxLng - minLng || 0.001;
  const zLat = Math.log2(360 * 256 * 0.7 / (latD * imgH));
  const zLng = Math.log2(360 * 256 * 0.7 / (lngD * imgW));
  const z = Math.floor(Math.min(zLat, zLng));
  return Math.max(10, Math.min(19, z));
}

async function test() {
  const waypoints = [
    { lat: -6.2088, lng: 106.8456 },
    { lat: -6.2090, lng: 106.8460 },
    { lat: -6.2095, lng: 106.8462 },
    { lat: -6.2100, lng: 106.8455 },
  ];
  const photos = [
    { lat: -6.2095, lng: 106.8462, photoData: '', caption: 'Test foto' },
  ];

  const W = 700, H = 400;
  const centerLat = (Math.min(...waypoints.map(w=>w.lat)) + Math.max(...waypoints.map(w=>w.lat))) / 2;
  const centerLng = (Math.min(...waypoints.map(w=>w.lng)) + Math.max(...waypoints.map(w=>w.lng))) / 2;
  const zoom = calcZoom(waypoints, W, H);
  console.log('zoom:', zoom, 'center:', centerLat, centerLng);

  // Generate fallback gray tile
  const tileBuf = await sharp({create:{width:W,height:H,channels:3,background:{r:240,g:240,b:240}}}).png().toBuffer();
  console.log('tileBuf:', tileBuf.length);

  const pts = waypoints.map(w => {
    const p = toPixel(w.lat, w.lng, centerLat, centerLng, zoom, W, H);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  const sp = toPixel(waypoints[0].lat, waypoints[0].lng, centerLat, centerLng, zoom, W, H);
  const ep = toPixel(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng, centerLat, centerLng, zoom, W, H);

  let photoMarkers = '';
  photos.forEach((ph, i) => {
    const p = toPixel(ph.lat, ph.lng, centerLat, centerLng, zoom, W, H);
    photoMarkers += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="#d93025" stroke="white" stroke-width="2.5"/><text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="white" font-weight="bold" font-family="Arial">${i + 1}</text><text x="${p.x.toFixed(1)}" y="${(p.y + 24).toFixed(1)}" text-anchor="middle" font-size="9" fill="#333" font-weight="bold" font-family="Arial">Foto ${i + 1}</text>`;
  });

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="none"/>
    <polyline points="${pts}" fill="none" stroke="#1a73e8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>
    <circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="10" fill="#1a73e8" stroke="white" stroke-width="3"/>
    <text x="${sp.x.toFixed(1)}" y="${(sp.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">S</text>
    <circle cx="${ep.x.toFixed(1)}" cy="${ep.y.toFixed(1)}" r="10" fill="#34a853" stroke="white" stroke-width="3"/>
    <text x="${ep.x.toFixed(1)}" y="${(ep.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="Arial">F</text>
    ${photoMarkers}
  </svg>`;

  const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  console.log('overlayBuf:', overlayBuf.length);

  const result = await sharp(tileBuf).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toBuffer();
  console.log('result:', result.length, 'bytes');

  const fs = require('fs');
  fs.writeFileSync('test-map-result.png', result);
  console.log('Saved: test-map-result.png');

  const b64 = result.toString('base64');
  console.log('base64 length:', b64.length);
  console.log('ALL OK');
}

test().catch(e => console.error('ERROR:', e.message, e.stack));
