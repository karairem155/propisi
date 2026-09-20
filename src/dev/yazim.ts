// Yazım animasyonu galerisi — 33 harfin hepsini yan yana denetle.
//
// NEDEN VAR: animasyon fonttan TÜRETİLMİŞ veri, elle yazılmış değil. Türetilen
// şeyin doğruluğuna ancak bakarak karar verilir. Bu ekran her harfin yazım
// hareketini beş kareye bölüp gösteriyor; bir harf yanlış açılıyorsa burada
// hemen görünür.
//
// Kırmızı çerçeveli harfler: başlangıç noktası doğrulanmamış (starts.ts →
// sure:false). Açılımın YÖNÜ o noktadan çıktığı için en şüpheli olanlar onlar.

import { ALPHABET, hasCapital } from '../data/curriculum';
import { startOf } from '../data/starts';
import { ensureGuideFont } from '../ui/guide';
import { drawWriteFrame } from '../ui/write-anim';
import { playWrite, type WriteAnim } from '../ui/write-anim';

import { cursiveFamily } from '../ui/cursive';

const FAMILY = () => cursiveFamily();
const STEPS = [0.2, 0.4, 0.6, 0.8, 1];

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Font yükleniyor…</div>';

  let disposed = false;
  let anim: WriteAnim | null = null;

  void (async () => {
    await ensureGuideFont();
    if (disposed) return;

    const unsure = ALPHABET.filter((ch) => startOf(ch)?.sure === false);
    // Büyük harfler de gösteriliyor: küçüğünün büyütülmüşü değil, ayrı şekil.
    const caps = ALPHABET.filter(hasCapital).map((ch) => ch.toLocaleUpperCase('ru'));

    root.innerHTML = `
      <div class="note">
        Yazım animasyonu fonttan <b>türetiliyor</b>: harfin başlangıç
        noktasından mürekkebin içinden yayılan mesafe. Elle yazılmış hamle
        verisi değil — bu yüzden gözle denetlenmeli.
        <br><br>
        Kırmızı çerçeveli <b>${unsure.length}</b> harfte başlangıç noktası
        doğrulanmadı; açılımın yönü oradan çıktığı için en şüpheli olanlar
        bunlar. Bir harf ters ya da kopuk açılıyorsa
        <code>src/data/starts.ts</code> düzeltilmeli.
      </div>
      <h2>Küçük harfler · ${ALPHABET.length}</h2>
      <div id="gallery" class="write-gallery"></div>
      <h2>Büyük harfler · ${caps.length}</h2>
      <div id="galleryCaps" class="write-gallery"></div>
      <div class="card" id="player" style="text-align:center">
        <div class="fine">Bir harfe dokun, tam hızında oynasın</div>
        <canvas id="stage" style="width:100%;max-width:340px;height:200px"></canvas>
      </div>
    `;

    const gallery = root.querySelector<HTMLElement>('#gallery')!;
    const stage = root.querySelector<HTMLCanvasElement>('#stage')!;

    const capsBox = root.querySelector<HTMLElement>('#galleryCaps')!;

    const addRow = (host: HTMLElement, ch: string, unsureMark: boolean, big: boolean) => {
      const row = document.createElement('button');
      row.className = `write-row${unsureMark ? ' unsure' : ''}`;
      row.dataset['ch'] = ch;

      const label = document.createElement('span');
      label.className = 'write-label';
      label.textContent = ch;
      row.appendChild(label);

      for (const t of STEPS) {
        const cv = document.createElement('canvas');
        cv.width = 76;
        cv.height = 92;
        const c = cv.getContext('2d')!;
        c.fillStyle = '#fff';
        c.fillRect(0, 0, cv.width, cv.height);
        // Büyük harf satırı yüksek; taban çizgisi aşağıda ve punto küçük.
        drawWriteFrame(c, ch, t, {
          x: big ? 16 : 20,
          baseline: big ? 80 : 64,
          fontSize: big ? 62 : 56,
          family: FAMILY(),
        });
        row.appendChild(cv);
      }
      host.appendChild(row);
    };

    for (const ch of ALPHABET) addRow(gallery, ch, startOf(ch)?.sure === false, false);
    // Büyük harflerin başlangıç noktası HİÇ tanımlı değil (starts.ts küçük
    // harfler için); hepsi şüpheli sayılıyor.
    for (const ch of caps) addRow(capsBox, ch, true, true);

    const onPick = (e: Event) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-ch]');
      if (!row) return;
      const ch = row.dataset['ch']!;
      anim?.stop();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      stage.width = stage.clientWidth * dpr;
      stage.height = 200 * dpr;
      const ctx = stage.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      anim = playWrite(ctx, ch, {
        x: stage.clientWidth / 2 - 40,
        baseline: 140,
        fontSize: 120,
        family: FAMILY(),
        loop: true,
      });
      root.querySelector('#player')!.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    gallery.addEventListener('click', onPick);
    capsBox.addEventListener('click', onPick);
  })();

  return () => {
    disposed = true;
    anim?.stop();
  };
}
