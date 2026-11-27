// Packages the built game (./dist) into a single self-contained index.html and a zip that holds only that file.
// Usage: npm run build && node package-crazygames.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = 'dist';
const OUT = 'crazygames-upload';            // what you upload: the zip (+ preview videos)
const SINGLE = path.join(DIST, 'crazygames'); // the unzipped single-file build, for local testing
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SINGLE, { recursive: true });

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
let css = fs.readFileSync(path.join(DIST, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(DIST, 'game.js'), 'utf8');

// Fonts -> data URIs inside the stylesheet.
css = css.replace(/url\(fonts\/([^)]+\.woff2)\)/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(DIST, 'fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});

// Keep the inline script from ending early.
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const styleTag = '<link rel="stylesheet" href="style.css">';
const scriptTag = '<script src="game.js"></script>';
if (!html.includes(styleTag) || !html.includes(scriptTag)) throw new Error('index.html layout changed; update the packager');
const single = html
  .replace(styleTag, () => `<style>\n${css}\n</style>`)
  .replace(scriptTag, () => `<script>\n${safeJs}\n</script>`);
if (/(src|href)="(?!https?:)[^"#]+"/.test(single)) throw new Error('A relative asset reference is left in index.html');
fs.writeFileSync(path.join(SINGLE, 'index.html'), single);

// Minimal zip writer (deflate) so no external tools are needed.
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const zipPath = path.join(OUT, 'lucid-angles-crazygames.zip');
fs.writeFileSync(zipPath, zip([{ name: 'index.html', data: Buffer.from(single, 'utf8') }]));
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`index.html ${mb(Buffer.byteLength(single))}  ->  ${zipPath} ${mb(fs.statSync(zipPath).size)}`);
