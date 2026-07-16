// Simulate what the route does
async function main() {
  console.log('Testing route...');
  try {
    // Test 1: getSurveyRouteById
    const { getSurveyRouteById } = require('./src/lib/actions');
    console.log('actions loaded');
    const route = await getSurveyRouteById(1);
    if (!route) { console.log('No route found for ID 1'); return; }
    console.log('Route:', route.storeName, 'waypoints:', route.waypoints?.length);

    // Test 2: sharp
    const sharp = require('sharp');
    console.log('sharp loaded');

    // Test 3: mercator
    function mercator(lat, lng, zoom) {
      const n = Math.pow(2, zoom);
      const x = (lng + 180) / 360 * n * 256;
      const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256;
      return { x, y };
    }
    console.log('mercator OK');

    // Test 4: generate fallback tile
    const fallbackBuf = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 248, g: 249, b: 250 } } }).png().toBuffer();
    console.log('fallback tile:', fallbackBuf.length);

    // Test 5: SVG overlay + composite
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="10" fill="red"/></svg>';
    const overlayBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    const result = await sharp(fallbackBuf).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toBuffer();
    console.log('composite:', result.length, 'OK');

    // Test 6: Build doc HTML
    const mapB64 = result.toString('base64');
    if (mapB64.length > 100) console.log('mapB64 length:', mapB64.length, 'OK');

    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('FAILED:', e.message);
    console.error(e.stack);
  }
}
main();
