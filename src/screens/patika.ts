// Patika — müfredat haritası. Bkz. docs/ekranlar.md §2.2
//
// Artık sahte veri yok: düğümler data/curriculum.ts'ten, durumları srs/scheduler.ts'ten
// geliyor. Henüz hiç kart yoksa her şey kilitli görünür — doğru davranış.
//
// Referanstan ayrıldığımız yer: düğüm "bitti/bitmedi" ikilisi değil. FSRS bir konuyu
// geciktirdiyse düğüm yeşil kalmaz, KEHRİBAR olur (`fading`). Patika hem ilerlemeyi
// hem unutmayı gösterir.

import { ELEMENTS, LEVELS } from '../data/curriculum';
import { allCards, progressBySubject } from '../srs/scheduler';
import { mastery } from '../srs/cards';
import { mascot, type MascotName } from '../ui/mascot';
import { gridHtml } from './alfabe';

type NodeState = 'locked' | 'current' | 'done' | 'fading';

type PathNode = {
  kind: 'element' | 'letter' | 'join' | 'word' | 'checkpoint';
  art: string;
  label: string;
  sub?: string;
  state: NodeState;
  due?: number;
};

const GAP = 54;
const AMP = 88;

const TARGET = `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor"
  stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`;

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Patika yükleniyor…</div>';

  let disposed = false;

  void (async () => {
    const [progress, cards] = await Promise.all([progressBySubject(), allCards()]);
    if (disposed) return;

    // İlk görülmemiş düğüm "current" olur; ondan sonrası kilitli.
    let currentTaken = false;
    const stateOf = (subject: string): { state: NodeState; due?: number } => {
      const entry = progress.get(subject);
      if (entry?.seen) {
        return entry.due > 0 ? { state: 'fading', due: entry.due } : { state: 'done' };
      }
      if (!currentTaken) {
        currentTaken = true;
        return { state: 'current' };
      }
      return { state: 'locked' };
    };

    const sections: { tag: string; name: string; nodes: PathNode[] }[] = [
      {
        tag: 'Seviye 0',
        name: 'Элементы — elemanlar',
        nodes: [
          ...ELEMENTS.map((el): PathNode => {
            const s = stateOf(el.id);
            return {
              kind: 'element',
              art: el.mascot ?? 'cubuk',
              label: el.name,
              sub: el.ru,
              ...s,
            };
          }),
          checkpoint(stateOf('cp-elements'), 'Kontrol noktası', 'karışık sınav'),
        ],
      },
      ...LEVELS.map((level) => ({
        tag: level.tag,
        name: level.ru,
        nodes: [
          ...level.letters.map((l): PathNode => {
            const s = stateOf(l.ch);
            return {
              kind: 'letter',
              art: l.ch,
              label: l.ch,
              ...(l.hint ? { sub: l.hint } : l.derivedFrom ? { sub: `${l.derivedFrom} türevi` } : {}),
              ...s,
            };
          }),
          ...(level.joins.length
            ? [
                {
                  kind: 'join' as const,
                  art: level.joins[0]!,
                  label: 'Bağlantı',
                  sub: level.joins.join(' · '),
                  ...stateOf(`joins-${level.id}`),
                },
              ]
            : []),
          ...(level.words.length
            ? [
                {
                  kind: 'word' as const,
                  art: level.words[0]!.ru,
                  label: 'Kelime',
                  sub: level.words.map((w) => w.ru).join(' · '),
                  ...stateOf(`words-${level.id}`),
                },
              ]
            : []),
          checkpoint(stateOf(`cp-${level.id}`), 'Kontrol noktası', 'grup sınavı'),
        ],
      })),
    ];

    let i = 0;
    const html: string[] = ['<div class="path-wrap">'];
    for (const section of sections) {
      const done = section.nodes.filter(
        (n) => n.state === 'done' || n.state === 'fading',
      ).length;
      html.push(`
        <div class="level-head">
          <b>${section.tag}</b>
          <h3>${section.name}</h3>
          <div class="level-meter">
            <div class="level-bar"><i style="width:${Math.round((done / section.nodes.length) * 100)}%"></i></div>
            <span>${done} / ${section.nodes.length}</span>
          </div>
        </div>`);
      for (const node of section.nodes) {
        const x = offset(i);
        if (i > 0) html.push(connector(offset(i - 1), x, node.state));
        html.push(row(node, x));
        i++;
      }
    }
    html.push('</div>');

    const seen = [...progress.values()].filter((e) => e.seen).length;
    const letters = cards.filter((c) => c.subject.length === 1);
    const mastered = new Set(letters.filter((c) => mastery(c) > 0.5).map((c) => c.subject)).size;
    const due = [...progress.values()].reduce((n, e) => n + e.due, 0);

    // Özet şerit — teşhisin ARŞİV kısmına kapı. Ayrıntı İlerleme ekranında;
    // burada sadece "nerede duruyorum" özeti var (bkz. docs/ekranlar.md §0).
    const strip = `
      <a class="prog-strip" href="#/ilerleme">
        <div><b>${mastered}</b><span>ustalaşılan</span></div>
        <div><b>${seen}</b><span>açılan</span></div>
        <div><b>${due}</b><span>tekrar bekliyor</span></div>
        <span class="go">›</span>
      </a>`;

    const toggle = `
      <div class="segmented" id="views">
        <button data-view="path" class="on">Yol</button>
        <button data-view="grid">Izgara</button>
      </div>`;

    root.innerHTML = `
      ${strip}
      ${toggle}
      ${
        seen === 0
          ? `<div class="note" style="margin-bottom:14px">
               Henüz hiçbir ders açılmadı, bu yüzden her şey kilitli — doğru davranış.
               İlk düğüm <b>current</b> olarak işaretli. Örnek ilerleme görmek için
               <b>Profil → Geliştirici → Örnek kart üret</b>.
             </div>`
          : ''
      }
      <div id="view-path">${html.join('')}</div>
      <div id="view-grid" hidden>${gridHtml(progress)}</div>
    `;

    const pathView = root.querySelector<HTMLElement>('#view-path')!;
    const gridView = root.querySelector<HTMLElement>('#view-grid')!;
    root.querySelector('#views')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-view]');
      if (!btn) return;
      const wantPath = btn.dataset['view'] === 'path';
      pathView.hidden = !wantPath;
      gridView.hidden = wantPath;
      for (const b of root.querySelectorAll('#views button')) {
        b.classList.toggle('on', b === btn);
      }
      root.scrollTop = 0;
    });

    requestAnimationFrame(() => {
      root.querySelector('.path-row--current')?.scrollIntoView({ block: 'center' });
    });
  })();

  return () => {
    disposed = true;
  };
}

function checkpoint(
  s: { state: NodeState; due?: number },
  label: string,
  sub: string,
): PathNode {
  return { kind: 'checkpoint', art: '', label, sub, ...s };
}

/** Yolun yanlara salınımı — ölçüm gerektirmesin diye sinüsle hesaplanıyor. */
function offset(index: number): number {
  return Math.round(Math.sin((index * Math.PI) / 3) * AMP);
}

function connector(x1: number, x2: number, state: NodeState): string {
  // Maket 09: bağ ince ve nötr; rengi düğüm taşıyor, ribbon değil.
  const color = state === 'locked' ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.34)';
  const w = AMP * 2 + 120;
  const cx = w / 2;
  return `<svg class="path-link" width="${w}" height="${GAP}" viewBox="0 0 ${w} ${GAP}" aria-hidden="true">
    <path d="M${cx + x1} 0 C${cx + x1} ${GAP * 0.55}, ${cx + x2} ${GAP * 0.45}, ${cx + x2} ${GAP}"
      stroke="${color}" stroke-width="8" stroke-linecap="round" fill="none"/>
  </svg>`;
}

function row(node: PathNode, x: number): string {
  const cls = ['node', `node--${node.state}`];
  if (node.kind === 'checkpoint') cls.push('node--checkpoint');

  let flag = '';
  if (node.state === 'done') flag = '<span class="flag flag--done">✓</span>';
  if (node.state === 'fading') flag = `<span class="flag flag--fading">${node.due ?? ''}</span>`;

  return `<div class="path-row path-row--${node.state}" style="transform:translateX(${x}px)">
    <div class="${cls.join(' ')}">${nodeArt(node)}${flag}</div>
    <div class="node-label">${node.label}${node.sub ? `<small>${node.sub}</small>` : ''}</div>
  </div>`;
}

function nodeArt(node: PathNode): string {
  if (node.kind === 'checkpoint') {
    return `<span style="color:${node.state === 'locked' ? '#a8b4c7' : 'var(--coral)'}">${TARGET}</span>`;
  }
  if (node.kind === 'element') {
    return mascot(node.art as MascotName, {
      size: 54,
      mood: node.state === 'current' ? 'open' : node.state === 'fading' ? 'sleep' : 'happy',
      ...(node.state === 'locked' ? { color: '#a8b4c7' } : {}),
    });
  }
  // Harf / çift / kelime: düğümün içi EL YAZISI, altındaki etiket MATBU.
  // Bu eşleşmenin kendisi öğretiyor.
  const long = node.art.length > 1;
  return `<span class="art${long ? ' pair' : ''}">${node.art}</span>`;
}
