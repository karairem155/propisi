// Cevrimdisi calisma: uygulama kabugu onbellege alinir.
// Yeni surum yayinlandiginda VERSION degisir, eski onbellek silinir.
//
// DIKKAT: SHELL listesi elle yazildi. vite.config.ts cikti adlarini sabit tutuyor
// (hash yok) — yeni bir ekran/parca eklersen bu listeyi VE VERSION'u guncelle.
const VERSION = "propisi-39a1db48";
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
  "./assets/index-D79aw2u0.css",
  "./assets/marck-cyrillic-BIatlnl2.woff2",
  "./assets/marck-latin-hvIDGCO4.woff2",
  "./assets/nunito-cyrillic-CY6AOgYE.woff2",
  "./assets/nunito-latin-BzFMHfZw.woff2",
  "./assets/nunito-latin-ext-CXYtwYOx.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/alfabe-DQMNStvO.js",
  "./js/app-XE64VYrt.js",
  "./js/arrow-Bw4-14bE.js",
  "./js/av-ZYc1YL28.js",
  "./js/baslangic-CK6lkfwb.js",
  "./js/calisma-B9Udyqmw.js",
  "./js/celebrate-BJjkiS3f.js",
  "./js/confusables-C4jrEv9P.js",
  "./js/cumle-C07rbwG6.js",
  "./js/curriculum-ZCvlHY6n.js",
  "./js/db-42TdSMnr.js",
  "./js/defter-CfSo9cQa.js",
  "./js/ders-Dg-EfuZq.js",
  "./js/dikte-CdfoRbH2.js",
  "./js/dizi-BukvUCdj.js",
  "./js/eksik-C5qMjPOy.js",
  "./js/eslestir-Ay0GgKHx.js",
  "./js/flow-D6k3XFqs.js",
  "./js/guide-BpbD4P-D.js",
  "./js/hamle-DPc852Bt.js",
  "./js/ilerleme-DZ3kiRxx.js",
  "./js/ink-DwApjVaZ.js",
  "./js/kontrol-9VO5obaJ.js",
  "./js/kur-DXIY1r8C.js",
  "./js/labels-hMXEei2d.js",
  "./js/mascots-J55PxSXz.js",
  "./js/moduller-qNZQMSam.js",
  "./js/nav-2U2GOewt.js",
  "./js/oku-tHQMccwZ.js",
  "./js/ozet-stthXdy5.js",
  "./js/paper-MkVFdroW.js",
  "./js/patika-BGYszokb.js",
  "./js/profil-nSZO18nO.js",
  "./js/records-C8ltr6Ma.js",
  "./js/rolldown-runtime-DK3Fl9T5.js",
  "./js/sandbox-D7J3pgXn.js",
  "./js/scheduler-BBO0KnyI.js",
  "./js/sentences-BMlHUy5L.js",
  "./js/session-SGLUr19Y.js",
  "./js/shape-D-COQGat.js",
  "./js/starts-DoFMNSZQ.js",
  "./js/tani-BWv4DAqE.js",
  "./js/tekrar-DD5U2EtL.js",
  "./js/test-latency-BPP-oFcW.js",
  "./js/test-scribble-CrvOgWVy.js",
  "./js/test-voice-x98XCvMi.js",
  "./js/write-anim-Do8D5o1W.js",
  "./js/yazim-CkSMha4L.js",
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
