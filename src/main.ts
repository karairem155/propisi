// Uygulama kabuğu ve hash tabanlı yönlendirme.
// Faz 0 kapsamı: çizim yüzeyi, Bölüm 13'ün üç testi, kayıt/yedek ekranı.

import './ui/style.css';
import { requestPersistence } from './db/db';
import { initSpeech } from './audio/speech';
import { mascot } from './ui/mascot';
import { APP_VERSION } from './types';

type Screen = {
  title: string;
  render(root: HTMLElement, param?: string): () => void;
};

type Route = {
  title: string;
  /** Alt gezinmede hangi sekme yanacak. */
  tab: string;
  load?: () => Promise<Screen['render']>;
  /** Yol öneki eşleşmesi: '#/calis/ш' → param 'ш'. */
  prefix?: string;
  inline?: (root: HTMLElement) => () => void;
};

const ICONS: Record<string, string> = {
  repeat: '<path d="M4 9.2A5.2 5.2 0 0 1 9.2 4h9M18 4.4 20.8 7 18 9.6"/><path d="M20 14.8a5.2 5.2 0 0 1-5.2 5.2h-9M6 19.6 3.2 17 6 14.4"/>',
  pen: '<path d="M4 20.2l4.2-1.1L20 7.3a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.9 15.9z"/><path d="M15.4 5.9 19 9.5"/>',
  test: '<path d="M9.5 3h5M10.6 3v6.6L5.4 18.8A2 2 0 0 0 7.1 21.8h9.8a2 2 0 0 0 1.7-3L13.4 9.6V3"/><path d="M7.6 15.6h8.8"/>',
  box: '<path d="M3.4 7.6h17.2V20a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1z"/><path d="M3.4 7.6 5.3 3.2h13.4l1.9 4.4M9.6 12.2h4.8"/>',
  path: '<path d="M6.5 21c0-3.2 11-2.6 11-6.2S7 12.2 7 8.8 17.5 6 17.5 3"/><circle cx="6.5" cy="21" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="3" r="1.5" fill="currentColor" stroke="none"/>',
  grid: '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2"/>',
  chart: '<path d="M3.5 20.5h17M7 20.5v-6M12 20.5V7M17 20.5v-9"/>',
  user: '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.6 20.4a7.4 7.4 0 0 1 14.8 0"/>',
};

const TABS: { tab: string; href: string; icon: string; label: string }[] = [
  { tab: 'review', href: '#/', icon: 'repeat', label: 'Tekrar' },
  { tab: 'path', href: '#/patika', icon: 'path', label: 'Patika' },
  { tab: 'profile', href: '#/profil', icon: 'user', label: 'Profil' },
];

const routes: Record<string, Route> = {
  '/': { title: 'Tekrar', tab: 'review', load: async () => (await import('./screens/tekrar')).render },
  '/patika': { title: 'Patika', tab: 'path', load: async () => (await import('./screens/patika')).render },
  '/ozet': { title: 'Oturum özeti', tab: 'review', load: async () => (await import('./screens/ozet')).render },
  '/profil': { title: 'Profil', tab: 'profile', load: async () => (await import('./screens/profil')).render },

  // İlerleme artık sekme değil — Patika şeridinden ve Profil'den açılır.
  '/ilerleme': { title: 'İlerleme', tab: 'path', load: async () => (await import('./screens/ilerleme')).render },
  '/alfabe': { title: 'Alfabe', tab: 'path', load: async () => (await import('./screens/alfabe')).render },

  // Faz 0 araçları — Profil altında.
  '/tests': { title: 'Cihaz testleri', tab: 'profile', inline: tests },
  '/sandbox': { title: 'Çizim yüzeyi', tab: 'profile', load: async () => (await import('./screens/sandbox')).render },
  '/test/voice': { title: 'Test 1 — Rusça ses', tab: 'profile', load: async () => (await import('./screens/test-voice')).render },
  '/test/latency': { title: 'Test 2 — Gecikme', tab: 'profile', load: async () => (await import('./screens/test-latency')).render },
  '/test/scribble': { title: 'Test 3 — Scribble', tab: 'profile', load: async () => (await import('./screens/test-scribble')).render },
  '/records': { title: 'Kayıtlar ve yedek', tab: 'profile', load: async () => (await import('./screens/records')).render },
  '/dev/mascots': { title: 'Maskot kadrosu', tab: 'profile', load: async () => (await import('./dev/mascots')).render },
};

/** Parametre alan rotalar — tam eşleşme yerine önek eşleşmesi. */
const prefixRoutes: Route[] = [
  {
    title: 'Çalışma',
    tab: 'path',
    prefix: '/calis/',
    load: async () => (await import('./screens/calisma')).render,
  },
];

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header class="bar">
    <a class="back" href="#/" id="back" hidden>‹ Geri</a>
    <h1 id="title">Русская пропись</h1>
    <span class="spacer"></span>
    <small>Faz 0 · v${APP_VERSION}</small>
  </header>
  <main class="screen" id="main"></main>
  <nav class="tabs" id="tabs">
    ${TABS.map(
      (t) => `<a href="${t.href}" data-tab="${t.tab}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
             stroke-linecap="round" stroke-linejoin="round">${ICONS[t.icon]}</svg>
        <span>${t.label}</span>
      </a>`,
    ).join('')}
  </nav>
`;

const main = app.querySelector<HTMLElement>('#main')!;
const title = app.querySelector<HTMLElement>('#title')!;
const back = app.querySelector<HTMLElement>('#back')!;
const tabsBar = app.querySelector<HTMLElement>('#tabs')!;

let cleanup: (() => void) | null = null;

function card(href: string, mascot: string, name: string, desc: string): string {
  return `<a href="${href}">
    <span class="badge">${mascot}</span>
    <span class="txt"><b>${name}</b><span>${desc}</span></span>
    <span class="go">›</span>
  </a>`;
}

function tests(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = `
    <div class="note">
      Bu üç şey araştırmada <b>doğrulanamadı</b> — cihazda ölçülmeli. Testleri
      <b>kurulu uygulamanın içinde</b> yap.
    </div>
    <nav class="menu">
      ${card('#/test/voice', mascot('oval', { size: 40, mood: 'open' }), 'Test 1 — Rusça ses', 'speechSynthesis listesinde ru-RU var mı. En kritik test.')}
      ${card('#/test/latency', mascot('cubuk', { size: 40, mood: 'cheer' }), 'Test 2 — Gecikme', 'desynchronized:true gerçekten fark yaratıyor mu')}
      ${card('#/test/scribble', mascot('ilmek', { size: 40, mood: 'think' }), 'Test 3 — Scribble', 'Hızlı и/ш çiziminde hamle düşüyor mu')}
    </nav>
  `;
  return () => {};
}

async function route(): Promise<void> {
  const path = location.hash.replace(/^#/, '') || '/';
  cleanup?.();
  cleanup = null;
  main.innerHTML = '';
  main.scrollTop = 0;

  let param: string | undefined;
  let entry = routes[path];
  if (!entry) {
    const hit = prefixRoutes.find((r) => path.startsWith(r.prefix!));
    if (hit) {
      entry = hit;
      param = decodeURIComponent(path.slice(hit.prefix!.length));
    }
  }
  if (!entry) {
    title.textContent = 'Bulunamadı';
    back.hidden = false;
    main.className = 'screen';
    main.innerHTML = `<div class="warn">Böyle bir ekran yok: <code>${path}</code></div>`;
    markTab('home');
    return;
  }

  // Parametre ham kimlik olabiliyor (el-kryuchok); okunur adı ekranın kendisi
  // gösteriyor, üst başlığa basmıyoruz.
  title.textContent = entry.title;
  back.hidden = path === '/';
  markTab(entry.tab);

  cleanup = entry.inline ? entry.inline(main) : (await entry.load!())(main, param);
}

function markTab(active: string): void {
  for (const a of tabsBar.querySelectorAll<HTMLElement>('a')) {
    a.classList.toggle('on', a.dataset['tab'] === active);
  }
}

window.addEventListener('hashchange', () => void route());
void route();

/**
 * brief 8.3: "Ana ekranda her zaman bugünkü tekrar sayısı görünür."
 * Ayrı bir ana ekran kalmadığı için sayıyı sekme rozetine taşıdık — böylece
 * hangi ekranda olursan ol görünüyor, sadece birinde değil.
 */
async function refreshBadge(): Promise<void> {
  const { dueCount } = await import('./screens/tekrar');
  const n = await dueCount();
  const tab = tabsBar.querySelector<HTMLElement>('a[data-tab="review"]');
  if (!tab) return;
  tab.querySelector('.tab-badge')?.remove();
  if (n > 0) {
    const badge = document.createElement('span');
    badge.className = 'tab-badge';
    badge.textContent = n > 99 ? '99+' : String(n);
    tab.appendChild(badge);
  }
}

void refreshBadge();
window.addEventListener('hashchange', () => void refreshBadge());

// Kalıcı depolama iste — brief 12.3. Garanti değil, asıl güvence JSON yedeği.
void requestPersistence();

// Ses altyapısı: ses listesi ve ilk dokunuşta hazırlama (brief 9.1).
initSpeech();

// Service worker SADECE üretimde. Geliştirmede kayıtlıysa her değişiklikte
// önbellek temizlemek gerekiyor — o döngüye hiç girme.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js');
  });
}
