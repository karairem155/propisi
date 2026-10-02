// Cevrimdisi calisma: uygulama kabugu onbellege alinir.
// Yeni surum yayinlandiginda VERSION degisir, eski onbellek silinir.
//
// DIKKAT: SHELL listesi elle yazildi. vite.config.ts cikti adlarini sabit tutuyor
// (hash yok) — yeni bir ekran/parca eklersen bu listeyi VE VERSION'u guncelle.
const VERSION = "propisi-50912d0b";
const SHELL = [
  "./",
  "./art/badge-100-reviews.webp",
  "./art/badge-first-group.webp",
  "./art/badge-first-letter.webp",
  "./art/badge-night.webp",
  "./art/badge-perfect.webp",
  "./art/badge-streak3.webp",
  "./art/badge-streak30.webp",
  "./art/badge-streak7.webp",
  "./art/feedback-correct.webp",
  "./art/feedback-hint.webp",
  "./art/feedback-wrong.webp",
  "./art/goal-complete.webp",
  "./art/level-badge-0.webp",
  "./art/level-badge-1.webp",
  "./art/level-badge-2.webp",
  "./art/level-badge-3.webp",
  "./art/level-badge-4.webp",
  "./art/level-badge-5.webp",
  "./art/level-badge-6.webp",
  "./art/level-badge-7.webp",
  "./art/level-complete.webp",
  "./art/node-locked.webp",
  "./art/onboard-install.webp",
  "./art/onboard-scribble.webp",
  "./art/onboard-voice.webp",
  "./art/onboard-welcome.webp",
  "./art/today-empty.webp",
  "./art/today-hero.webp",
  "./art/today-streak.webp",
  "./assets/BadScript-Regular-kNvreJEi.ttf",
  "./assets/Russkopis-Normalny-DDVFbnqf.otf",
  "./assets/index-Zjc231VN.css",
  "./assets/marck-cyrillic-BIatlnl2.woff2",
  "./assets/marck-latin-hvIDGCO4.woff2",
  "./assets/nunito-cyrillic-CY6AOgYE.woff2",
  "./assets/nunito-latin-BzFMHfZw.woff2",
  "./assets/nunito-latin-ext-CXYtwYOx.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/alfabe-BkaPMkxq.js",
  "./js/app-nququSqo.js",
  "./js/arrow-Bw4-14bE.js",
  "./js/av-Br0w3Efv.js",
  "./js/baslangic-b96dHJ99.js",
  "./js/calisma-DqtnNyrE.js",
  "./js/celebrate-BJjkiS3f.js",
  "./js/confusables-C4jrEv9P.js",
  "./js/cumle-DQBRWaWm.js",
  "./js/curriculum-Dwn2HrLB.js",
  "./js/db-42TdSMnr.js",
  "./js/ders-DUNpvon6.js",
  "./js/dikte-BiQaJPqs.js",
  "./js/dizi-tPFUZBl1.js",
  "./js/eksik-CgxOiYWh.js",
  "./js/eslestir-DUXA5H9n.js",
  "./js/flow-D6k3XFqs.js",
  "./js/guide-DJjIdi-_.js",
  "./js/hamle-C9ahEcfE.js",
  "./js/ilerleme-g6uKMyDO.js",
  "./js/ink-DwApjVaZ.js",
  "./js/kontrol-CaFa750p.js",
  "./js/kur-BYqjhN38.js",
  "./js/labels-D7QX8m1W.js",
  "./js/mascots-B-BRANiN.js",
  "./js/moduller-pTkFdwnF.js",
  "./js/nav-2U2GOewt.js",
  "./js/oku-CnW972bs.js",
  "./js/ozet-BNzA_9s-.js",
  "./js/paper-MkVFdroW.js",
  "./js/patika-L_y-wbNq.js",
  "./js/profil-DeGlGfPv.js",
  "./js/records-C9GsI94G.js",
  "./js/rolldown-runtime-DK3Fl9T5.js",
  "./js/sandbox-DsfxIGms.js",
  "./js/scheduler-BBO0KnyI.js",
  "./js/sentences-By8JroMx.js",
  "./js/session-SGLUr19Y.js",
  "./js/shape-D-COQGat.js",
  "./js/starts-DoFMNSZQ.js",
  "./js/tani-B9PU7Xab.js",
  "./js/tekrar-aJ5E_D_R.js",
  "./js/test-latency-BPP-oFcW.js",
  "./js/test-scribble-CrvOgWVy.js",
  "./js/test-voice-x98XCvMi.js",
  "./js/write-anim-Do8D5o1W.js",
  "./js/yazim-B5EZ9CJt.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Gezinme istegi: once ag, olmazsa onbellekteki kabuk. Cevrimdisi acilis icin sart.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html").then((r) => r || Response.error()))
    );
    return;
  }

  // DIKKAT: caches.match(request) BUTUN onbelleklerde arar — aktivasyon
  // sirasinda olmekte olan eski surumun dosyasini verebiliyordu. Yalniz kendi
  // surumunun onbellegine bak.
  event.respondWith(
    caches.open(VERSION).then((cache) => cache.match(request)).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
