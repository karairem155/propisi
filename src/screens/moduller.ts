// Modüller — "ne çalışacağıma ben karar vereyim".
//
// NEDEN VAR: Patika tek bir sıra dayatıyor. İlk düğümden başlayıp her şeyi
// bitirmeden kelimeye ya da cümleye ulaşılamıyordu; kullanıcının istediği
// tam olarak buydu — "harf modülleri ve kelime/cümle modülleri ayrı da
// olsun, seçebilelim". Patika sırayı, burası SEÇİMİ veriyor. İkisi aynı
// müfredatı ve aynı dersi (screens/ders.ts) açıyor, ilerleme ortak.
//
// Kilit YOK. Kart açılmamışsa ders açarken oluşuyor (calisma.ts → openLesson);
// sıra dışına çıkmanın bedeli zaten zorluk, ayrıca engellemeye gerek yok.

import { CAPITALS, ELEMENTS, LEVELS } from '../data/curriculum';
import { SENTENCES } from '../data/sentences';
import { progressBySubject } from '../srs/scheduler';
import { endPlaylist } from '../srs/session';
import { mascot, type MascotName } from '../ui/mascot';
import { lessonHref, lessonSteps } from './ders';

type Progress = Awaited<ReturnType<typeof progressBySubject>>;

type Item = {
  subject: string;
  /** Kartın üstünde görünen — el yazısıyla basılabilir mi ayrı tutuluyor. */
  art: string;
  cursive: boolean;
  sub?: string;
};

type Group = { tag: string; name: string; items: Item[] };

type Module = {
  key: string;
  title: string;
  ru: string;
  mascot: MascotName;
  blurb: string;
  groups: () => Group[];
};

const MODULES: Module[] = [
  {
    key: 'elemanlar',
    title: 'Elemanlar',
    ru: 'элементы букв',
    mascot: 'cubuk',
    blurb: 'Harflerin yapı taşları — çizgi, kanca, oval, ilmek.',
    groups: () => [
      {
        tag: 'Seviye 0',
        name: 'элементы букв',
        items: ELEMENTS.map((el) => ({
          subject: el.id,
          art: el.name,
          cursive: false,
          sub: el.ru,
        })),
      },
    ],
  },
  {
    key: 'harfler',
    title: 'Harfler',
    ru: 'буквы',
    mascot: 'kanca',
    blurb: 'Küçük harfler, gruplarına göre. Her ders yazım + tanıma + ezber.',
    groups: () =>
      LEVELS.map((level) => ({
        tag: level.tag,
        name: level.ru,
        items: level.letters.map((l) => ({
          subject: l.ch,
          art: l.ch,
          cursive: true,
          ...(l.hint ? { sub: l.hint } : {}),
        })),
      })),
  },
  {
    key: 'baglantilar',
    title: 'Bağlantılar',
    ru: 'соединения',
    mascot: 'ilmek',
    blurb: 'İki harfi kalem kaldırmadan bağlamak — el yazısının asıl kuralı.',
    groups: () =>
      LEVELS.filter((l) => l.joins.length).map((level) => ({
        tag: level.tag,
        name: level.ru,
        items: level.joins.map((pair) => ({ subject: pair, art: pair, cursive: true })),
      })),
  },
  {
    key: 'buyuk-harfler',
    title: 'Büyük harfler',
    ru: 'заглавные буквы',
    mascot: 'oval',
    blurb: 'Cümle onlarla başlıyor. Küçüğünün büyütülmüşü değiller.',
    groups: () =>
      LEVELS.filter((l) => (CAPITALS[l.id] ?? []).length).map((level) => ({
        tag: level.tag,
        name: level.ru,
        items: (CAPITALS[level.id] ?? []).map((ch) => ({
          subject: `cap:${ch}`,
          art: ch,
          cursive: true,
        })),
      })),
  },
  {
    key: 'kelimeler',
    title: 'Kelimeler',
    ru: 'слова',
    mascot: 'oval',
    blurb: 'Kelime kur, yaz, eksik harfi bul, dikteyle yaz.',
    groups: () =>
      LEVELS.filter((l) => l.words.length).map((level) => ({
        tag: level.tag,
        name: level.ru,
        items: level.words.map((w) => ({
          subject: w.ru,
          art: w.ru,
          cursive: true,
          sub: w.tr,
        })),
      })),
  },
  {
    key: 'cumleler',
    title: 'Cümleler',
    ru: 'предложения',
    mascot: 'kanca',
    blurb: 'Büyük harf, kelime arası boşluk, nokta — hepsi bir arada.',
    groups: () => {
      const byLevel = new Map<string, Item[]>();
      for (const s of SENTENCES) {
        const list = byLevel.get(s.after) ?? [];
        list.push({ subject: s.id, art: s.ru, cursive: true, sub: s.tr });
        byLevel.set(s.after, list);
      }
      return [...byLevel].map(([levelId, items]) => {
        const level = LEVELS.find((l) => l.id === levelId);
        return { tag: level ? `${level.tag} sonrası` : levelId, name: level?.ru ?? '', items };
      });
    },
  },
];

function stateOf(progress: Progress, subject: string): { cls: string; flag: string } {
  const entry = progress.get(subject);
  if (!entry?.seen) return { cls: 'pick-cell--new', flag: '' };
  if (entry.due > 0) return { cls: 'pick-cell--due', flag: '<i class="pick-flag due">●</i>' };
  return { cls: 'pick-cell--done', flag: '<i class="pick-flag done">✓</i>' };
}

function countDone(progress: Progress, groups: Group[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const g of groups) {
    for (const it of g.items) {
      total++;
      if (progress.get(it.subject)?.seen) done++;
    }
  }
  return { done, total };
}

export function render(root: HTMLElement, param?: string): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Modüller yükleniyor…</div>';

  // Yarım kalmış bir sınav listesi varsa burada kapanır: seçim ekranına
  // gelmek o listeyi bırakmaktır (bkz. main.ts → route).
  endPlaylist();

  let disposed = false;

  void (async () => {
    const progress = await progressBySubject();
    if (disposed) return;

    const mod = param ? MODULES.find((m) => m.key === param) : undefined;
    root.innerHTML = mod ? modulePage(mod, progress) : indexPage(progress);
  })();

  return () => {
    disposed = true;
  };
}

/** Modül listesi — altı kapı. */
function indexPage(progress: Progress): string {
  const rows = MODULES.map((m) => {
    const { done, total } = countDone(progress, m.groups());
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<a href="#/moduller/${m.key}">
      <span class="mod-art">${mascot(m.mascot, { size: 40, mood: done ? 'happy' : 'open' })}</span>
      <span class="txt">
        <b>${m.title} <small class="fine">· ${m.ru}</small></b>
        <span>${m.blurb}</span>
        <span class="mod-meter"><i style="width:${pct}%"></i></span>
      </span>
      <span class="badge">${done}/${total}</span>
      <span class="go">›</span>
    </a>`;
  }).join('');

  return `
    <div class="note">
      <b>Sırayı sen seç.</b> Patika müfredatı baştan sona kurar; burada
      istediğin modülü açıp istediğin konuyu çalışırsın. İlerleme ortak —
      burada çalıştığın patikada da işaretlenir.
    </div>
    <nav class="menu mod-menu">${rows}</nav>
    <a class="btn ghost" href="#/patika"
       style="display:block;text-align:center;text-decoration:none;margin-top:12px">
      Sıralı patikaya dön
    </a>`;
}

/** Tek modülün içi — konular, gruplarına ayrılmış. */
function modulePage(mod: Module, progress: Progress): string {
  const groups = mod.groups();
  const { done, total } = countDone(progress, groups);

  const sections = groups
    .map((g) => {
      const cells = g.items
        .map((it) => {
          const st = stateOf(progress, it.subject);
          const steps = lessonSteps(it.subject);
          const long = it.art.length > 3;
          return `<a class="pick-cell ${st.cls}" href="${lessonHref(it.subject)}">
            <span class="pick-art${it.cursive ? ' cursive' : ''}${long ? ' long' : ''}">${it.art}</span>
            ${it.sub ? `<small>${it.sub}</small>` : ''}
            <span class="pick-foot">${steps} adım</span>
            ${st.flag}
          </a>`;
        })
        .join('');
      return `<div class="level-head">
          <b>${g.tag}</b>
          <h3>${g.name}</h3>
        </div>
        <div class="pick-grid">${cells}</div>`;
    })
    .join('');

  return `
    <div class="section-head">
      <span class="section-art">${mascot(mod.mascot, { size: 40, mood: 'happy' })}</span>
      <span class="section-txt"><b>${mod.title}</b><small>${mod.ru}</small></span>
      <span class="section-count">${done}/${total}</span>
    </div>
    <div class="note">${mod.blurb} Kilit yok: hangisine dokunursan onun dersi açılır.</div>
    ${sections}
    <a class="btn ghost" href="#/moduller"
       style="display:block;text-align:center;text-decoration:none;margin-top:14px">
      Bütün modüller
    </a>`;
}
