// Rendu du film de présentation Globly, image par image.
//   node assets/video/motion/render.mjs landscape|portrait fr|en [--stills 1.5,4.2,...]
// Écrit les images dans assets/video/motion/frames-<format>/ ; l'encodage en
// mp4 se fait ensuite avec ffmpeg (voir encode.sh).
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';

const format = process.argv[2] === 'portrait' ? 'portrait' : 'landscape';
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
const lang = process.argv[3] === 'en' ? 'en' : 'fr';
const [W, H] = format === 'portrait' ? [540, 1264] : [1280, 920];
const FPS = 30;
const dir = path.resolve('assets/video/motion');
const out = path.join(dir, stills ? `stills-${format}-${lang}` : `frames-${format}-${lang}`);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

// Petit serveur de fichiers sur la racine du dépôt : les modules ES (three.js)
// et les textures WebGL ne se chargent pas depuis file://.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
const server = createServer((req, res) => {
  const file = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
  try { const body = readFileSync(file); res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/assets/video/motion/index.html`;
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERREUR PAGE', String(e)));
await page.goto(base + `?format=${format}&lang=${lang}`);
await page.waitForFunction(() => window.ready === true);
// toutes les images chargées avant la première prise
await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))));
await page.waitForTimeout(1200);

const DUR = await page.evaluate(() => window.DUR);
const times = stills ?? Array.from({ length: Math.round(FPS * DUR) }, (_, i) => i / FPS);
for (let i = 0; i < times.length; i++) {
  await page.evaluate((t) => window.seek(t), times[i]);
  const name = stills ? `t${String(times[i]).replace('.', '_')}.jpg` : `f${String(i).padStart(4, '0')}.jpg`;
  await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 93 });
  if (!stills && i % 90 === 0) console.log(format, lang, `${i}/${times.length}`);
}
await browser.close(); server.close();
console.log('ok', out, times.length);
