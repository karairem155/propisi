// dist/ içeriğinden sw.js SHELL listesini ve VERSION'u üretir.
//
// Neden otomatik: parça adları (js/*.js) import grafiği değiştikçe kayıyor.
// Elle tutulan listede bir dosya eksik kalırsa uygulama çevrimdışı açılmıyor,
// fazla kalırsa install adımı 404'te patlıyor — ikisi de sessiz hata.
//
// VERSION dosya listesi + boyutlarının özetinden türetiliyor: çıktı değişmediyse
// sürüm de değişmiyor, değiştiyse kendiliğinden artıyor. Böylece "sw sürümünü
// artırmayı unutma" diye bir kural kalmıyor.
//
// `npm run build` sonrası otomatik çalışır (package.json → postbuild).

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const SW_SRC = 'public/sw.js';
const SW_OUT = 'dist/sw.js';
const SKIP = new Set(['sw.js', '_headers']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(DIST)
  .map((f) => relative(DIST, f).split(sep).join('/'))
  .filter((f) => !SKIP.has(f))
  .sort();

const hash = createHash('sha1');
for (const f of files) hash.update(`${f}:${statSync(join(DIST, f)).size};`);
const version = `propisi-${hash.digest('hex').slice(0, 8)}`;

const shell = ['./', ...files];
const block = shell
  .map((f) => (f === './' ? '  "./"' : `  "./${f}"`))
  .join(',\n');

let sw = readFileSync(SW_SRC, 'utf8');
sw = sw.replace(/const VERSION = "[^"]*";/, `const VERSION = "${version}";`);
sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = [\n${block}\n];`);

// Kaynağı da güncel tut ki depo ile dist tutarlı olsun.
writeFileSync(SW_SRC, sw);
writeFileSync(SW_OUT, sw);

const bytes = files.reduce((n, f) => n + statSync(join(DIST, f)).size, 0);
console.log(
  `sw.js: ${shell.length} girdi · ${(bytes / 1024 / 1024).toFixed(2)} MB · ${version}`,
);
