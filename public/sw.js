// Cevrimdisi calisma: uygulama kabugu onbellege alinir.
// Yeni surum yayinlandiginda VERSION degisir, eski onbellek silinir.
//
// DIKKAT: SHELL listesi elle yazildi. vite.config.ts cikti adlarini sabit tutuyor
// (hash yok) — yeni bir ekran/parca eklersen bu listeyi VE VERSION'u guncelle.
const VERSION = "propisi-7f2c1b52";
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
  "./assets/Russkopis-Normalny-Wpt4CNT5.otf",
  "./assets/index-C0MXAV7P.css",
  "./assets/marck-cyrillic-BIatlnl2.woff2",
  "./assets/marck-latin-hvIDGCO4.woff2",
  "./assets/nunito-cyrillic-CY6AOgYE.woff2",
  "./assets/nunito-latin-BzFMHfZw.woff2",
  "./assets/nunito-latin-ext-CXYtwYOx.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/alfabe-BrjdjsYg.js",
  "./js/app-Kzh_XjjI.js",
  "./js/arrow-Bw4-14bE.js",
  "./js/av-CY1g1ldh.js",
  "./js/baslangic-Dt35IfG0.js",
  "./js/calisma-Dsso_xVM.js",
  "./js/celebrate-BJjkiS3f.js",
  "./js/confusables-C4jrEv9P.js",
  "./js/cumle-BDwVDS3m.js",
  "./js/curriculum-ZCvlHY6n.js",
  "./js/db-42TdSMnr.js",
  "./js/defter-BLkHUC0V.js",
  "./js/ders-Dg-EfuZq.js",
  "./js/dikte-D44_pvZ3.js",
  "./js/dizi-CdfiYVsi.js",
  "./js/eksik-Bt5Csbz5.js",
  "./js/eslestir-pB0owG-W.js",
  "./js/flow-D6k3XFqs.js",
  "./js/guide-zcezP9RT.js",
  "./js/hamle-Bg4VJfwB.js",
  "./js/ilerleme-CYJ8h1Aq.js",
  "./js/ink-DwApjVaZ.js",
  "./js/kontrol-BuWvnG6i.js",
  "./js/kur-C2lXRcmR.js",
  "./js/labels-hMXEei2d.js",
  "./js/mascots-BAqQWU0r.js",
  "./js/moduller-CKgcSxDW.js",
  "./js/nav-2U2GOewt.js",
  "./js/oku-BdXOnVay.js",
  "./js/ozet-B5nyusxN.js",
  "./js/paper-MkVFdroW.js",
  "./js/patika-DBETZH30.js",
  "./js/profil-B6VDCBh9.js",
  "./js/records-DnQQNqR7.js",
  "./js/rolldown-runtime-DK3Fl9T5.js",
  "./js/sandbox-uo1p5VJ1.js",
  "./js/scheduler-BBO0KnyI.js",
  "./js/sentences-BMlHUy5L.js",
  "./js/session-SGLUr19Y.js",
  "./js/shape-D-COQGat.js",
  "./js/starts-DoFMNSZQ.js",
  "./js/tani-BJkM9ksQ.js",
  "./js/tekrar-CaeKoj_w.js",
  "./js/test-latency-BPP-oFcW.js",
  "./js/test-scribble-CrvOgWVy.js",
  "./js/test-voice-x98XCvMi.js",
  "./js/write-anim-Do8D5o1W.js",
  "./js/yazim-dEd8rihz.js",
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
