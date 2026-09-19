import { defineConfig } from 'vite';

// Çıktı dosya adları İÇERİK HASH'İ taşır.
//
// Eskiden sabitti (js/session.js), gerekçesi "sw.js'teki SHELL listesi elle
// yazılıyor" idi. O gerekçe tools/gen-sw-shell.mjs ile ortadan kalktı; ama
// sabit adlar kalınca canlıda şu hata çıktı:
//
//   SyntaxError: The requested module './session.js'
//                does not provide an export named 't'
//
// Yeni app.js ile ESKİ session.js aynı sayfada buluşuyordu — adlar aynı olduğu
// için önbellek (hem service worker hem tarayıcı) eskisini veriyordu. Sonuç:
// bütün alıştırma ekranları canlıda BOŞ açılıyordu, dev sunucusunda sorunsuz.
//
// Hash'le eski ve yeni dosyalar bir arada durabiliyor; bir sayfa her zaman
// kendi içinde tutarlı bir küme yüklüyor. SHELL listesi zaten dist'ten üretiliyor.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'js/app-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: { host: true },
});
