const sharp = require('sharp');
const svg = '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';
async function test() {
  const b = await sharp(Buffer.from(svg)).png().toBuffer();
  console.log('sharp SVG OK:', b.length);
  const tile = await sharp({create:{width:100,height:100,channels:3,background:{r:200,g:200,b:200}}}).png().toBuffer();
  console.log('sharp tile OK:', tile.length);
  const r = await sharp(tile).composite([{input:Buffer.from(svg),top:0,left:0}]).png().toBuffer();
  console.log('sharp composite OK:', r.length);
  console.log('ALL OK');
}
test().catch(e => console.error('ERROR:', e.message, e.stack));
