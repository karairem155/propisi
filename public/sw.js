// Cevrimdisi calisma: uygulama kabugu onbellege alinir.
// Yeni surum yayinlandiginda VERSION degisir, eski onbellek silinir.
//
// DIKKAT: SHELL listesi elle yazildi. vite.config.ts cikti adlarini sabit tutuyor
// (hash yok) — yeni bir ekran/parca eklersen bu listeyi VE VERSION'u guncelle.
const VERSION = "propisi-8ad307f5";
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
  "./assets/index-BG32haKA.css",
  "./assets/nunito-cyrillic-CY6AOgYE.woff2",
  "./assets/nunito-latin-BzFMHfZw.woff2",
  "./assets/nunito-latin-ext-CXYtwYOx.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/alfabe-Bc7ZjBFP.js",
  "./js/app-Cu0d9c-d.js",
  "./js/av-2RACbh16.js",
  "./js/baslangic-I1PsEqYB.js",
  "./js/calisma-nLgP3mWi.js",
  "./js/celebrate-BJjkiS3f.js",
  "./js/confusables-C4jrEv9P.js",
  "./js/cumle-DmYjCi5w.js",
  "./js/curriculum-8IjVb2po.js",
  "./js/db-42TdSMnr.js",
  "./js/ders-T2UHtLuL.js",
  "./js/dikte-Dit4vZMs.js",
  "./js/dizi-Dwuj5v4w.js",
  "./js/eksik-CTrs3Gja.js",
  "./js/eslestir-C2D-nPX9.js",
  "./js/flow-D6k3XFqs.js",
  "./js/guide-negCgSGR.js",
  "./js/ilerleme-D0zMP8_B.js",
  "./js/ink-DwApjVaZ.js",
  "./js/kontrol-D9mcdJJf.js",
  "./js/kur-B5xLfMAB.js",
  "./js/labels-CEH7aqQs.js",
  "./js/mascots-CHSdJP-A.js",
  "./js/oku-CseG8p8c.js",
  "./js/ozet-DzeR-den.js",
  "./js/paper-MkVFdroW.js",
  "./js/patika-CT8E38JJ.js",
  "./js/profil-CK8qBeiA.js",
  "./js/records-CdvFhxT9.js",
  "./js/rolldown-runtime-DK3Fl9T5.js",
  "./js/sandbox-BBW25JqC.js",
  "./js/scheduler-BBO0KnyI.js",
  "./js/sentences-CmfW7O4S.js",
  "./js/session-SGLUr19Y.js",
  "./js/shape-DKG17HQG.js",
  "./js/starts-BxEyZQx_.js",
  "./js/stats-GFSy6L1C.js",
  "./js/tani-C-cHCZdX.js",
  "./js/tekrar-AnWyeUDV.js",
  "./js/test-latency-BPP-oFcW.js",
  "./js/test-scribble-CrvOgWVy.js",
  "./js/test-voice-x98XCvMi.js",
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
