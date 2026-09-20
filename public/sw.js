// Cevrimdisi calisma: uygulama kabugu onbellege alinir.
// Yeni surum yayinlandiginda VERSION degisir, eski onbellek silinir.
//
// DIKKAT: SHELL listesi elle yazildi. vite.config.ts cikti adlarini sabit tutuyor
// (hash yok) — yeni bir ekran/parca eklersen bu listeyi VE VERSION'u guncelle.
const VERSION = "propisi-c4ad02b3";
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
  "./assets/index-ClKjwqeP.css",
  "./assets/marck-cyrillic-BIatlnl2.woff2",
  "./assets/marck-latin-hvIDGCO4.woff2",
  "./assets/nunito-cyrillic-CY6AOgYE.woff2",
  "./assets/nunito-latin-BzFMHfZw.woff2",
  "./assets/nunito-latin-ext-CXYtwYOx.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/alfabe-Cj0outzC.js",
  "./js/app-De9Ky8hD.js",
  "./js/av-CzWJdlTa.js",
  "./js/baslangic-3sM1DaSB.js",
  "./js/calisma-C86AEEKd.js",
  "./js/celebrate-BJjkiS3f.js",
  "./js/confusables-C4jrEv9P.js",
  "./js/cumle-CMW3sUSy.js",
  "./js/curriculum-CHkh1tgG.js",
  "./js/db-42TdSMnr.js",
  "./js/ders-BGG6AE-R.js",
  "./js/dikte-BE1BJpMw.js",
  "./js/dizi-ClxBy4dP.js",
  "./js/eksik-7LQpd2ej.js",
  "./js/eslestir-D_bgiVeB.js",
  "./js/flow-D6k3XFqs.js",
  "./js/guide-fIl0q_OW.js",
  "./js/ilerleme-GgQvArHD.js",
  "./js/ink-DwApjVaZ.js",
  "./js/kontrol-6E5Ob76r.js",
  "./js/kur-DUolUZwc.js",
  "./js/labels-CJyjDQTq.js",
  "./js/mascots-DzONBWjv.js",
  "./js/oku-BNhE8IEv.js",
  "./js/ozet-B_S4rk3N.js",
  "./js/paper-MkVFdroW.js",
  "./js/patika-CGTh41OI.js",
  "./js/profil-D8kdL2pl.js",
  "./js/records-Be1mqupw.js",
  "./js/rolldown-runtime-DK3Fl9T5.js",
  "./js/sandbox-B3OfQz8U.js",
  "./js/scheduler-BBO0KnyI.js",
  "./js/sentences-FTHo06aV.js",
  "./js/session-SGLUr19Y.js",
  "./js/shape-DKG17HQG.js",
  "./js/starts-DoFMNSZQ.js",
  "./js/stats-GFSy6L1C.js",
  "./js/tani-CUsecr3f.js",
  "./js/tekrar-BXTiUXb8.js",
  "./js/test-latency-BPP-oFcW.js",
  "./js/test-scribble-CrvOgWVy.js",
  "./js/test-voice-x98XCvMi.js",
  "./js/write-anim-hjB5BpLW.js",
  "./js/yazim-BujiaoMz.js",
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
