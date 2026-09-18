// Rusça seslendirme — brief 9.1.
//
// iPadOS'ta Milena (ru-RU) önyüklü bir Apple sesidir; ücretsiz, çevrimdışı,
// API anahtarsız. Brief Bölüm 13 Test 1 bunu cihazda doğrulayacak — yoksa
// önceden üretilmiş Piper dosyalarına düşmek gerekir (brief 9.3).
//
// Bölüm 9.1'deki DÖRT TUZAK burada ele alınıyor; hiçbiri isteğe bağlı değil:
//   1. getVoices() ilk çağrıda boş döner        → voiceschanged dinleniyor
//   2. speak() iOS'ta kullanıcı hareketi ister  → ilk dokunuşta prime ediliyor
//   3. voice.default Safari'de HER ses için true → seçim lang'e göre yapılıyor
//   4. GC toplanan utterance callback'i düşürür  → referanslar tutuluyor

let voices: SpeechSynthesisVoice[] = [];
let primed = false;

/** Tuzak 4: GC toplanan nesnede callback tetiklenmiyor. */
const held: SpeechSynthesisUtterance[] = [];

function hold(u: SpeechSynthesisUtterance): SpeechSynthesisUtterance {
  held.push(u);
  if (held.length > 8) held.shift();
  return u;
}

function load(): void {
  voices = window.speechSynthesis?.getVoices() ?? [];
}

export function initSpeech(): void {
  if (!('speechSynthesis' in window)) return;
  // Tuzak 1: ilk çağrı boş dönebilir, olayı dinle ve bir de gecikmeli dene.
  window.speechSynthesis.addEventListener('voiceschanged', load);
  load();
  setTimeout(load, 400);

  // Tuzak 2: ilk kullanıcı hareketinde boş bir utterance ile hazırla.
  const prime = () => {
    if (primed) return;
    primed = true;
    try {
      window.speechSynthesis.speak(hold(new SpeechSynthesisUtterance('')));
    } catch {
      /* hazırlama başarısız olursa okuma yine de denenir */
    }
  };
  window.addEventListener('pointerdown', prime, { once: true, capture: true });
  window.addEventListener('keydown', prime, { once: true, capture: true });
}

/** Tuzak 3: `default` bayrağı yalan söylüyor, dile bakılıyor. */
export function russianVoice(): SpeechSynthesisVoice | undefined {
  if (!voices.length) load();
  const ru = voices.filter((v) => v.lang.toLowerCase().startsWith('ru'));
  // Milena önyüklü olan; yerel ses ağ sesinden iyidir (çevrimdışı çalışır).
  return ru.find((v) => /milena/i.test(v.name)) ?? ru.find((v) => v.localService) ?? ru[0];
}

export function speechStatus(): { supported: boolean; ready: boolean; name?: string } {
  const supported = 'speechSynthesis' in window;
  const v = supported ? russianVoice() : undefined;
  return { supported, ready: !!v, ...(v ? { name: v.name } : {}) };
}

export type SpeakOptions = {
  /** brief 7.5 — dikte için yavaş okuma. */
  rate?: number;
};

/** Rusça metni okur. Ses yoksa sessizce false döner — çağıran karar verir. */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  const voice = russianVoice();
  if (!voice || !text) return false;

  window.speechSynthesis.cancel();
  const u = hold(new SpeechSynthesisUtterance(text));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = opts.rate ?? 1;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}
