// Boş defter — serbest alıştırma.
//
// Kullanıcının isteği: "boş defter kısmı olsun, bolca alıştırma yapmam için."
// Dersler ölçülü ve kısa; kas hafızası ise TEKRARLA oluşur. Gerçek propisi
// defterinin yaptığı şey basit: satır başında bir örnek, sen satırı
// dolduruyorsun. Burası o defter.
//
// Bilinçli olarak YOK:
//   · Not / puan — burada yanlış yapmak serbest olmalı. Ölçülen pratik
//     derslerde; defter kaygısız tekrar yeri.
//   · Kart / FSRS — defterde yazılan hiçbir şey zamanlamayı etkilemiyor.
//
// Var:
//   · Satır çizgili sayfalar (ders ekranlarıyla aynı propisi ölçüleri)
//   · İsteğe bağlı örnek: satır başında bir kez ya da satır boyunca soluk
//   · ✎ — örneğin nasıl yazıldığını kalemle gösterir
//   · Sayfalar kaydediliyor; uygulama kapansa da defter duruyor
//   · Avuç koruması: kalem bir kez görülünce parmak dokunuşu çizmiyor

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { baselines, drawPaper, DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import { ensureGuideFont, measureGuide } from '../ui/guide';
import { cursiveFamily } from '../ui/cursive';
import { playWrite, type WriteAnim } from '../ui/write-anim';
import { ALL_WORDS, ALPHABET } from '../data/curriculum';
import { SENTENCES } from '../data/sentences';
import { delSetting, getSetting, setSetting } from '../db/db';
import { newId, type InkPoint, type InkStroke } from '../types';

const INK_COLOR = '#14213d';
const MODEL_COLOR = '#1d3f8f';

type Mode = 'none' | 'start' | 'trace';

type Page = {
  id: string;
  at: number;
  model: string;
  mode: Mode;
  strokes: InkStroke[];
};

const INDEX_KEY = 'defter.index';
const PAGE_KEY = (id: string) => `defter.page:${id}`;
/** Bundan fazla sayfa tutulmuyor — en eskisi siliniyor. */
const MAX_PAGES = 60;

const MODE_LABEL: Record<Mode, string> = {
  none: 'Örneksiz',
  start: 'Satır başında',
  trace: 'Soluk satır',
};

function blankPage(model = '', mode: Mode = 'start'): Page {
  return { id: newId(), at: Date.now(), model, mode, strokes: [] };
}

function randomOf<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export function render(root: HTMLElement): () => void {
  root.className = 'screen flush';
  root.innerHTML = `
    <div class="practice-top">
      <span style="width:44px"></span>
      <div class="practice-title">
        <b class="as-text">Defter</b>
        <span id="pageLabel">—</span>
      </div>
      <div class="practice-tools">
        <button id="show" class="ghost" title="Örnek nasıl yazılır">✎</button>
      </div>
    </div>

    <div class="defter-bar">
      <input id="model" class="defter-input cursive" placeholder="örnek: и, мама…"
             maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" lang="ru">
      <button id="dice" class="ghost" title="Rastgele kelime">🎲</button>
      <div class="segmented defter-mode" id="mode">
        ${(Object.keys(MODE_LABEL) as Mode[])
          .map((m) => `<button data-mode="${m}">${MODE_LABEL[m]}</button>`)
          .join('')}
      </div>
    </div>
    <div class="defter-chips" id="chips"></div>

    <div class="ink-surface defter-surface" id="surface"></div>

    <div class="toolbar">
      <button id="undo" class="ghost" disabled>↶ Geri al</button>
      <button id="clear" class="ghost" disabled>Temizle</button>
      <span class="spacer"></span>
      <button id="prev" class="ghost" title="Önceki sayfa">‹</button>
      <button id="next" class="ghost" title="Sonraki sayfa">›</button>
      <button id="add" class="primary">+ Sayfa</button>
    </div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const modelIn = root.querySelector<HTMLInputElement>('#model')!;
  const modeBox = root.querySelector<HTMLElement>('#mode')!;
  const chips = root.querySelector<HTMLElement>('#chips')!;
  const pageLabel = root.querySelector<HTMLElement>('#pageLabel')!;
  const undoBtn = root.querySelector<HTMLButtonElement>('#undo')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear')!;
  const prevBtn = root.querySelector<HTMLButtonElement>('#prev')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('#next')!;
  const showBtn = root.querySelector<HTMLButtonElement>('#show')!;

  const surface = new InkSurface(host, { desynchronized: true });
  let paper: PaperConfig = DEFAULT_PAPER;
  let ids: string[] = [];
  let index = 0;
  let page: Page = blankPage();
  let disposed = false;

  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;
  let seenPen = false;
  let anim: WriteAnim | null = null;

  // ── Kayıt ─────────────────────────────────────────────────────────────────
  //
  // Her sayfa kendi anahtarında; dizin ayrı. Bir sayfadaki yüzlerce hamle
  // her kayıtta bütün defteri yeniden yazmasın diye.

  let saveTimer = 0;
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void savePage(), 400);
  };
  async function savePage(): Promise<void> {
    page.at = Date.now();
    await setSetting(PAGE_KEY(page.id), page);
    if (!ids.includes(page.id)) {
      ids.push(page.id);
      // Sınırı aşan en eski sayfa siliniyor.
      while (ids.length > MAX_PAGES) {
        const old = ids.shift()!;
        await delSetting(PAGE_KEY(old));
        index = Math.max(0, index - 1);
      }
      await setSetting(INDEX_KEY, ids);
    }
  }

  async function openPage(i: number): Promise<void> {
    if (!ids.length) {
      page = blankPage();
      index = 0;
    } else {
      index = Math.max(0, Math.min(ids.length - 1, i));
      const saved = await getSetting<Page | null>(PAGE_KEY(ids[index]!), null);
      page = saved ?? blankPage();
    }
    if (disposed) return;
    modelIn.value = page.model;
    syncMode();
    redraw();
    syncButtons();
  }

  // ── Çizim ─────────────────────────────────────────────────────────────────

  /** Örneğin puntosu: gövde satır yüksekliğine eşit (ders ekranlarıyla aynı). */
  const modelSize = (): { fontSize: number; asc: number; width: number } => {
    const ctx = surface.ctx.paper;
    const box = measureGuide(ctx, page.model || 'о', paper, 4000, 4000);
    ctx.save();
    ctx.font = `400 ${box.fontSize}px ${cursiveFamily()}`;
    const m = ctx.measureText(page.model || 'о');
    ctx.restore();
    return { fontSize: box.fontSize, asc: m.actualBoundingBoxAscent || box.fontSize * 0.6, width: m.width };
  };

  /** Örneğin sığdığı satırlar — kolu tuvalden taşan ilk satır atlanıyor. */
  const rows = (): number[] => {
    const { asc } = modelSize();
    return baselines(paper, surface.height).filter((b) => b - asc >= 2 && b < surface.height - 4);
  };

  const redraw = () => {
    const ctx = surface.ctx.paper;
    drawPaper(ctx, surface.width, surface.height, paper);

    if (page.model && page.mode !== 'none') {
      const { fontSize, width } = modelSize();
      ctx.save();
      ctx.font = `400 ${fontSize}px ${cursiveFamily()}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = MODEL_COLOR;
      const gap = Math.max(fontSize * 0.25, 18);
      for (const b of rows()) {
        if (page.mode === 'start') {
          // Satır başındaki örnek belirgin: kopyalanacak model.
          ctx.globalAlpha = 0.55;
          ctx.fillText(page.model, 16, b);
        } else {
          // Soluk satır: üstünden geçmelik, satır boyu tekrar.
          ctx.globalAlpha = 0.17;
          for (let x = 16; x + width <= surface.width - 8; x += width + gap) {
            ctx.fillText(page.model, x, b);
          }
        }
      }
      ctx.restore();
    }

    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of page.strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };
  surface.setResizeHandler(redraw);

  const syncButtons = () => {
    const has = page.strokes.length > 0;
    undoBtn.disabled = !has;
    clearBtn.disabled = !has;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= ids.length - 1;
    const total = Math.max(ids.length, 1);
    pageLabel.textContent = `Sayfa ${Math.min(index + 1, total)} / ${total}`;
  };

  const syncMode = () => {
    for (const b of modeBox.querySelectorAll<HTMLElement>('[data-mode]')) {
      b.classList.toggle('on', b.dataset['mode'] === page.mode);
    }
    showBtn.disabled = !page.model;
  };

  const paint = () => {
    frame = 0;
    surface.clearLive();
    if (current.length < 2) return;
    surface.ctx.live.fillStyle = INK_COLOR;
    surface.ctx.live.fill(outlinePath(current, styleFor(pointerType), false));
  };

  const stopAnim = () => {
    anim?.stop();
    anim = null;
    showBtn.classList.remove('on');
  };

  const pointer: PointerHandle = attachPointer(
    host,
    {
      onStart(pt, e) {
        // Avuç koruması: Apple Pencil bir kez görüldüyse bundan sonra yalnız
        // kalem çizer. Defter uzun yazılan bir yer; bilek ekrana değiyor.
        if (e.pointerType === 'pen' && !seenPen) {
          seenPen = true;
          pointer.config.penOnly = true;
        }
        if (anim) stopAnim();
        pointerType = e.pointerType;
        current = [pt];
        if (!frame) frame = requestAnimationFrame(paint);
      },
      onMove(pts) {
        current.push(...pts);
        if (!frame) frame = requestAnimationFrame(paint);
      },
      onEnd(reason) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (current.length > 1) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
          page.strokes.push({
            points: current,
            pointerType,
            coalescedCount: 0,
            rawMoves: 0,
            canceled: reason === 'cancel',
          });
          saveSoon();
        }
        current = [];
        surface.clearLive();
        syncButtons();
      },
    },
    { penOnly: false, usePredicted: true },
  );

  // ── Kontroller ────────────────────────────────────────────────────────────

  const setModel = (text: string) => {
    page.model = text.trim();
    modelIn.value = page.model;
    if (page.model && page.mode === 'none') page.mode = 'start';
    syncMode();
    redraw();
    saveSoon();
  };

  modelIn.addEventListener('input', () => {
    page.model = modelIn.value.trim();
    syncMode();
    redraw();
    saveSoon();
  });

  modeBox.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
    if (!b) return;
    page.mode = b.dataset['mode'] as Mode;
    syncMode();
    redraw();
    saveSoon();
  });

  // Hızlı örnekler: bir harf, iki kelime, bir cümle — her açılışta değişiyor.
  const fillChips = () => {
    const picks = [
      randomOf(ALPHABET),
      randomOf(ALPHABET).toLocaleUpperCase('ru'),
      randomOf(ALL_WORDS),
      randomOf(ALL_WORDS),
      randomOf(SENTENCES).ru.split(' ').slice(0, 2).join(' '),
    ];
    chips.innerHTML = picks
      .map((p) => `<button class="chip cursive" data-pick="${p}">${p}</button>`)
      .join('');
  };
  chips.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pick]');
    if (b) setModel(b.dataset['pick']!);
  });

  root.querySelector('#dice')!.addEventListener('click', () => {
    setModel(randomOf(ALL_WORDS));
    fillChips();
  });

  showBtn.addEventListener('click', () => {
    if (anim) return stopAnim();
    if (!page.model) return;
    const first = rows()[0];
    if (first === undefined) return;
    const { fontSize } = modelSize();
    showBtn.classList.add('on');
    anim = playWrite(surface.ctx.live, page.model, {
      x: 16,
      baseline: first,
      fontSize,
      family: cursiveFamily(),
      loop: true,
    });
    if (!anim) stopAnim();
  });

  undoBtn.addEventListener('click', () => {
    if (!page.strokes.length) return;
    page.strokes.pop();
    redraw();
    syncButtons();
    saveSoon();
  });

  clearBtn.addEventListener('click', () => {
    if (!page.strokes.length) return;
    if (!confirm('Bu sayfadaki yazılar silinsin mi?')) return;
    page.strokes = [];
    redraw();
    syncButtons();
    saveSoon();
  });

  prevBtn.addEventListener('click', () => {
    stopAnim();
    void savePage().then(() => openPage(index - 1));
  });
  nextBtn.addEventListener('click', () => {
    stopAnim();
    void savePage().then(() => openPage(index + 1));
  });

  root.querySelector('#add')!.addEventListener('click', async () => {
    stopAnim();
    // Boş sayfayı sonsuza çoğaltma: bu sayfa boşsa yenisini açma.
    if (!page.strokes.length && ids.includes(page.id)) {
      modelIn.focus();
      return;
    }
    if (page.strokes.length || page.model) await savePage();
    // Yeni sayfa son örneği ve kipi devralıyor — aynı şeyi bir sayfa daha.
    page = blankPage(page.model, page.mode);
    await savePage();
    index = ids.length - 1;
    modelIn.value = page.model;
    syncMode();
    redraw();
    syncButtons();
  });

  // ── Açılış ────────────────────────────────────────────────────────────────

  void (async () => {
    const [savedPaper, savedIds] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      getSetting<string[]>(INDEX_KEY, []),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = savedPaper;
    ids = savedIds;
    fillChips();
    // Son yazılan sayfadan devam.
    await openPage(ids.length - 1);
  })();

  return () => {
    disposed = true;
    clearTimeout(saveTimer);
    // Çıkarken bekleyen kaydı kaybetme.
    if (page.strokes.length || page.model) void savePage();
    stopAnim();
    pointer.detach();
    surface.destroy();
  };
}
