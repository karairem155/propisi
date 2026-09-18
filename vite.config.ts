import { defineConfig } from 'vite';

// Çıktı dosya adları sabit tutuluyor (hash yok): sw.js içindeki SHELL listesi
// elle yazıldığı için — notdefteri ile aynı disiplin. Önbellek tazeleme VERSION
// sabitinin artırılmasıyla olur, dosya adı değişmesiyle değil.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'js/app.js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { host: true },
});
