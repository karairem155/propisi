// Bölüm 13 — Test 1: Rusça ses var mı? (En kritik test.)
//
// Belgesel kanıt güçlü (Milena iPadOS'ta önyüklü) ama cihaz testi yok.
// ru-RU yoksa brief 9.3'teki Piper yolu tek seçenek olur.
//
// brief 9.1'deki dört tuzağın hepsi burada uygulanıyor.

let voices: SpeechSynthesisVoice[] = [];
let primed = false;
/** Utterance referansları canlı tutulur — GC toplanan nesnede callback tetiklenebiliyor. */
const held: SpeechSynthesisUtterance[] = [];

function hold(u: SpeechSynthesisUtterance): SpeechSynthesisUtterance {
  held.push(u);
  if (held.length > 8) held.shift();
  return u;
}

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = `
    <div class="warn">
      <b>Bu testi yapmadan ses mimarisine karar verme.</b> Listede <code>ru-RU</code> bir ses
      görünmüyorsa Web Speech yolu kapalıdır ve brief 9.3'teki önceden üretilmiş Piper
      dosyaları tek seçenektir.
    </div>
    <div class="warn">
      <b>iOS Ayarlar → Erişilebilirlik → Oku ve Konuş</b> bölümünden gelişmiş/yüksek kaliteli
      Rusça sesi <b>indirme</b>. İndirilen sesler Web Speech listesinde görünmüyor ve
      önyüklü sesin yüksek kaliteli sürümü kurulunca <b>dil listeden tamamen kayboluyor</b>.
    </div>

    <div class="stats" id="summary"></div>

    <h2>Deneme</h2>
    <div class="row">
      <button id="prime" class="ghost">Sesi hazırla (ilk dokunuş)</button>
      <button id="speak" class="primary">Oku: шиншилла</button>
      <button id="speakSlow" class="ghost">Yavaş oku (rate 0.7)</button>
      <button id="reload" class="ghost">Listeyi yenile</button>
    </div>
    <p class="note" id="status" style="margin-top:12px">Hazır.</p>

    <h2>Cihazdaki sesler</h2>
    <div class="table-card">
      <table>
        <thead><tr><th>Ad</th><th>lang</th><th>local</th><th>default</th></tr></thead>
        <tbody id="rows"><tr><td colspan="4">Yükleniyor…</td></tr></tbody>
      </table>
    </div>
    <p class="note" style="margin-top:12px">
      <code>voice.default</code> Safari'de <b>her ses için</b> true döner — seçim yaparken
      <code>lang</code>'e bak, <code>default</code>'a değil.
    </p>
  `;

  const summary = root.querySelector<HTMLElement>('#summary')!;
  const rows = root.querySelector<HTMLElement>('#rows')!;
  const status = root.querySelector<HTMLElement>('#status')!;

  const russian = () => voices.filter((v) => v.lang.toLowerCase().startsWith('ru'));

  function paint() {
    const ru = russian();
    summary.innerHTML = `
      <div class="stat"><b>${voices.length}</b><span>toplam ses</span></div>
      <div class="stat"><b>${ru.length}</b><span>ru-* ses</span></div>
      <div class="stat"><b>${ru.some((v) => /milena/i.test(v.name)) ? 'VAR' : 'yok'}</b><span>Milena</span></div>
      <div class="stat"><b>${'speechSynthesis' in window ? 'var' : 'YOK'}</b><span>Web Speech API</span></div>
    `;
    rows.innerHTML = voices.length
      ? voices
          .map(
            (v) =>
              `<tr class="${v.lang.toLowerCase().startsWith('ru') ? 'hit' : ''}">
                 <td>${escape(v.name)}</td><td>${escape(v.lang)}</td>
                 <td>${v.localService ? 'evet' : 'hayır'}</td><td>${v.default ? 'evet' : 'hayır'}</td>
               </tr>`,
          )
          .join('')
      : '<tr><td colspan="4">Liste boş. "Listeyi yenile"ye bas — getVoices() ilk çağrıda boş döner.</td></tr>';
  }

  function load() {
    voices = window.speechSynthesis?.getVoices() ?? [];
    paint();
  }

  // getVoices() ilk çağrıda BOŞ döner — voiceschanged dinle (brief 9.1).
  window.speechSynthesis?.addEventListener('voiceschanged', load);
  load();
  setTimeout(load, 400); // bazı cihazlarda voiceschanged hiç gelmiyor

  function prime() {
    // speak() iOS'ta kullanıcı hareketi gerektirir — ilk dokunuşta boş utterance ile prime et.
    if (primed) return;
    window.speechSynthesis.speak(hold(new SpeechSynthesisUtterance('')));
    primed = true;
    status.textContent = 'Ses hazırlandı. Artık okuma çalışmalı.';
  }

  function say(text: string, rate: number) {
    prime();
    const ru = russian()[0];
    if (!ru) {
      status.textContent = 'ru-* ses bulunamadı — okuma yapılamıyor. Piper yolu gerekli.';
      return;
    }
    const u = hold(new SpeechSynthesisUtterance(text)); // referansı canlı tut
    u.voice = ru;
    u.lang = ru.lang;
    u.rate = rate;
    u.onstart = () => (status.textContent = `Okunuyor: ${ru.name} (${ru.lang}), rate ${rate}`);
    u.onend = () => (status.textContent = `Bitti: ${ru.name}`);
    u.onerror = (e) => (status.textContent = `Hata: ${e.error}`);
    window.speechSynthesis.speak(u);
  }

  root.querySelector('#prime')!.addEventListener('click', prime);
  root.querySelector('#speak')!.addEventListener('click', () => say('шиншилла', 1));
  root.querySelector('#speakSlow')!.addEventListener('click', () => say('шиншилла', 0.7));
  root.querySelector('#reload')!.addEventListener('click', load);

  return () => {
    window.speechSynthesis?.removeEventListener('voiceschanged', load);
    window.speechSynthesis?.cancel();
    held.length = 0;
  };
}

function escape(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
}
