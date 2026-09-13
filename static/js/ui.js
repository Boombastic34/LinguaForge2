
// ---------- v0.4: porównywanie odpowiedzi wyrozumiałe dla ogonków i literówek ----------
const PL_FOLD = { "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
                  "ó": "o", "ś": "s", "ź": "z", "ż": "z" };
function foldPl(s) {
  return (s || "").toLowerCase().replace(/[ąćęłńóśźż]/g, ch => PL_FOLD[ch]);
}

// Normalizacja odpowiedzi. Ogonki spłaszczamy TYLKO przy polskich odpowiedziach —
// w angielskim słowie polska litera to zwykły błąd, nie wariant zapisu.
function normAns(s, lang) {
  const base = lang === "en" ? String(s || "").toLowerCase() : foldPl(s);
  return base.replace(/[.,!?;:„”"'()]/g, "").replace(/\s+/g, " ").trim();
}

// odległość Levenshteina (liczona najwyżej do 2 różnic)
function editDist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Czy odpowiedź jest poprawna.
 * opts.lang    — "en" albo "pl" (decyduje o traktowaniu ogonków)
 * opts.strict  — true przy dyktandzie i pisaniu ze słuchu: zero tolerancji,
 *                bo wtedy sprawdzamy właśnie pisownię
 *
 * Tolerancja: najwyżej JEDNA literówka i tylko w dłuższych hasłach.
 * Dodatkowo pierwsze dwie litery muszą się zgadzać — literówka nie zmienia
 * początku wyrazu, a bez tego warunku "wacz out" przechodziło jako "watch out".
 */
function answersMatch(given, expected, opts) {
  const o = opts || {};
  const lang = o.lang || "en";
  const a = normAns(given, lang), b = normAns(expected, lang);
  if (!a || !b) return false;
  if (a === b) return true;
  if (o.strict) return false;

  if (b.length < 7) return false;                 // krótkie słowa: bez taryfy ulgowej
  if (a.split(" ").length !== b.split(" ").length) return false;   // inna liczba słów
  if (a.slice(0, 2) !== b.slice(0, 2)) return false;               // inny początek
  return editDist(a, b) <= 1;                     // najwyżej jedna literówka
}

// Pomocnicze funkcje interfejsu
// DOM-owy append() zamienia null na tekst „null" — a my bardzo często piszemy
// `warunek ? element : null`. Bez tej poprawki na ekranie pojawia się słowo „null".
// Nadpisujemy append/prepend tak, żeby po cichu pomijały null i undefined.
(function patchAppend() {
  ["append", "prepend"].forEach(name => {
    const orig = Element.prototype[name];
    Element.prototype[name] = function (...kids) {
      return orig.apply(this, kids.filter(k => k !== null && k !== undefined));
    };
  });
})();

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

function toast(msg, isErr = false) {
  const t = el("div", { class: "toast" + (isErr ? " err" : "") }, msg);
  document.getElementById("toasts").append(t);
  setTimeout(() => t.remove(), 3400);
}

function xpPop(xp, x, y) {
  if (!xp) return;
  const p = el("div", { class: "xp-pop" }, `+${xp} XP`);
  p.style.left = (x || innerWidth / 2) + "px";
  p.style.top = (y || innerHeight / 2) + "px";
  document.body.append(p);
  setTimeout(() => p.remove(), 1000);
}

function confetti() {
  for (let i = 0; i < 26; i++) {
    const c = el("div");
    const colors = ["#e8590c", "#4c5fd5", "#0ca678", "#e8a202", "#7048e8"];
    Object.assign(c.style, {
      position: "fixed", left: Math.random() * 100 + "vw", top: "-12px",
      width: "9px", height: "9px", zIndex: 70, pointerEvents: "none",
      background: colors[i % colors.length],
      borderRadius: Math.random() > .5 ? "50%" : "2px",
      transition: "transform 1.4s ease-in, opacity 1.4s",
    });
    document.body.append(c);
    requestAnimationFrame(() => {
      c.style.transform = `translateY(${innerHeight + 40}px) rotate(${Math.random() * 600}deg)`;
      c.style.opacity = "0";
    });
    setTimeout(() => c.remove(), 1500);
  }
}

// ================= SYNTEZA MOWY =================
// W aplikacji Android (WebView) korzystamy z mostu natywnego NativeTTS.
// W przeglądarce — z window.speechSynthesis, ale odpornie:
//  * nie wymuszamy en-GB (brak takiego głosu = cisza bez błędu),
//  * odblokowujemy mowę przy pierwszym dotknięciu (polityka mobilnych przeglądarek),
//  * obchodzimy błąd Chrome, w którym mowa zatrzymuje się po cancel().
const HAS_NATIVE_TTS = (typeof window.NativeTTS !== "undefined" && !!window.NativeTTS);
const HAS_WEB_TTS = ("speechSynthesis" in window) && typeof SpeechSynthesisUtterance !== "undefined";

let VOICES = [];
function loadVoices() {
  if (!HAS_WEB_TTS) return;
  try { VOICES = speechSynthesis.getVoices() || []; } catch (e) { VOICES = []; }
}
if (HAS_WEB_TTS) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 400);        // część przeglądarek ładuje głosy z opóźnieniem
}

function pickVoiceFor(lang) {
  if (!VOICES.length) loadVoices();
  const want = lang === "pl" ? "pl" : "en";
  const cand = VOICES.filter(v => (v.lang || "").toLowerCase().startsWith(want));
  if (!cand.length) return null;
  if (want === "en") {
    return cand.find(v => /en[-_]GB/i.test(v.lang))
        || cand.find(v => /en[-_]US/i.test(v.lang))
        || cand.find(v => v.localService) || cand[0];
  }
  return cand.find(v => v.localService) || cand[0];
}

// Mobilne przeglądarki wymagają gestu, zanim pozwolą mówić — odblokowujemy raz.
let TTS_UNLOCKED = false;
function unlockTts() {
  // NIE wypowiadamy tu nic. Ciche "ok" plus późniejszy cancel() wprowadzały
  // silnik Chrome na Androidzie w stan, w którym ignorował kolejne żądania.
  if (!HAS_WEB_TTS) return;
  loadVoices();
}
document.addEventListener("pointerdown", unlockTts);
document.addEventListener("keydown", unlockTts);

// ---------- TEMPO LEKTORA ----------
// Jedno ustawienie dla całej aplikacji (zapisywane w przeglądarce i w profilu).
// Domyślnie 1.0 = naturalne tempo mowy. Lektor z serwera zawsze przychodzi w tempie 1.0,
// a prędkość zmieniamy przy odtwarzaniu (playbackRate) — zmiana jest natychmiastowa
// i nie wymaga pobierania nowego nagrania.
const TTS_DEFAULT_RATE = 1.0;
function ttsRate() {
  try {
    const v = parseFloat(localStorage.getItem("lf_tts_rate"));
    return (v >= 0.5 && v <= 1.6) ? v : TTS_DEFAULT_RATE;
  } catch (e) { return TTS_DEFAULT_RATE; }
}
function setTtsRate(v) {
  v = Math.max(0.5, Math.min(1.6, +v || TTS_DEFAULT_RATE));
  try { localStorage.setItem("lf_tts_rate", String(v)); } catch (e) {}
  API.post("/api/settings", { tts_rate: v }).catch(() => {});
  // jeśli coś właśnie gra — zmieniamy tempo w locie
  if (AUDIO_EL) { try { AUDIO_EL.playbackRate = v; } catch (e) {} }
  document.querySelectorAll(".speed-row").forEach(row =>
    row.querySelectorAll(".speed-btn").forEach(bt =>
      bt.classList.toggle("active", Math.abs(parseFloat(bt.dataset.rate) - v) < 0.03)));
  document.querySelectorAll(".speed-cycle").forEach(paintSpeedCycle);
}

const TTS_SPEEDS = [[0.7, "🐢", "wolno"], [1.0, "▶", "normalnie"], [1.2, "🐇", "szybko"], [1.4, "⚡", "bardzo szybko"]];
function speedLabel(v) {
  const hit = TTS_SPEEDS.find(([r]) => Math.abs(r - v) < 0.03);
  return hit ? hit[1] + " " + hit[2] : "▶ " + v.toFixed(1) + "×";
}
// Pełny wybór tempa (rząd przycisków) — do ekranów słuchania i teorii.
// onChange(v) wywoływany po zmianie — zwykle powtarza nagranie w nowym tempie.
function speedPicker(current, onChange) {
  current = current || ttsRate();
  const row = el("div", { class: "speed-row" }, el("span", { class: "muted small" }, "tempo:"));
  TTS_SPEEDS.forEach(([v, icon, label]) => {
    const b = el("button", {
      class: "speed-btn" + (Math.abs(v - current) < 0.03 ? " active" : ""),
      "data-rate": String(v),
      onclick: () => { setTtsRate(v); if (onChange) onChange(v); },
    }, icon + " " + label);
    row.append(b);
  });
  return row;
}
// Zwarty przełącznik tempa (jeden przycisk, kolejne dotknięcia = kolejne tempo) —
// wstawiany w pasek trybu skupienia, więc jest dostępny w KAŻDYM zadaniu.
function paintSpeedCycle(b) {
  const v = ttsRate();
  const hit = TTS_SPEEDS.find(([r]) => Math.abs(r - v) < 0.03) || [v, "▶", v.toFixed(1) + "×"];
  b.innerHTML = "";
  b.append(hit[1], el("span", { class: "sc-lbl" }, " " + hit[2]));
}
function speedCycleButton() {
  const b = el("button", { class: "speed-cycle", title: "Tempo lektora" }, "");
  paintSpeedCycle(b);
  b.onclick = e => {
    e.stopPropagation();
    const cur = ttsRate();
    let i = TTS_SPEEDS.findIndex(([r]) => Math.abs(r - cur) < 0.03);
    i = (i + 1) % TTS_SPEEDS.length;
    setTtsRate(TTS_SPEEDS[i][0]);
    if (typeof haptic === "function") haptic();
    toast("Tempo lektora: " + TTS_SPEEDS[i][2]);
  };
  return b;
}

let TTS_WARNED = false;
let TTS_LAST_ERR = "";
const TTS_KEEP = [];            // referencje wypowiedzi (ochrona przed usunięciem z pamięci)

// ---------- LEKTOR Z SERWERA ----------
// Gotowe nagranie MP3 pobierane z serwera. Działa nawet tam, gdzie własny silnik
// mowy przeglądarki zawodzi (Chrome na Androidzie bywa zepsuty: zwraca listę głosów,
// ale synteza kończy się błędem synthesis-failed).
let AUDIO_EL = null;
let SERVER_TTS_OK = null;       // null = jeszcze nie wiadomo
let SPEAK_SEQ = 0;              // numer bieżącej wypowiedzi — starsze są porzucane

function ttsAudioEl() {
  if (!AUDIO_EL) {
    AUDIO_EL = new Audio();
    AUDIO_EL.preload = "auto";
    try { AUDIO_EL.preservesPitch = true; AUDIO_EL.mozPreservesPitch = true; } catch (e) {}
  }
  return AUDIO_EL;
}

// pamięć podręczna nagrań w przeglądarce: klucz -> {url, done, waiters}
const TTS_BLOBS = {};
const TTS_BLOB_ORDER = [];
const TTS_BLOB_LIMIT = 80;

function ttsUrl(text, lang) {
  return "/api/tts?lang=" + encodeURIComponent(lang || "en") + "&rate=1&text=" + encodeURIComponent(text);
}

// Pobiera nagranie (raz) i zwraca Promise z adresem blob. Wielokrotne wywołania
// dla tego samego tekstu dzielą jedno żądanie.
function fetchTts(text, lang) {
  lang = lang === "pl" ? "pl" : "en";
  const key = lang + "|" + text;
  if (TTS_BLOBS[key]) return TTS_BLOBS[key];
  const p = fetch(ttsUrl(text, lang), { headers: { "x-token": API.token || "" } })
    .then(r => { if (!r.ok) throw new Error("serwer odpowiedział " + r.status); return r.blob(); })
    .then(blob => {
      if (!blob || blob.size < 500) throw new Error("puste nagranie");
      const url = URL.createObjectURL(blob);
      TTS_BLOB_ORDER.push(key);
      while (TTS_BLOB_ORDER.length > TTS_BLOB_LIMIT) {
        const k = TTS_BLOB_ORDER.shift();
        const old = TTS_BLOBS[k];
        delete TTS_BLOBS[k];
        if (old) old.then(u => URL.revokeObjectURL(u)).catch(() => {});
      }
      return url;
    })
    .catch(err => { delete TTS_BLOBS[key]; throw err; });
  TTS_BLOBS[key] = p;
  return p;
}

// Pobiera nagrania z wyprzedzeniem (np. następna fiszka), zanim będą potrzebne —
// dzięki temu odtworzenie jest natychmiastowe. Przyjmuje tekst albo listę tekstów.
function prefetchTts(texts, lang) {
  if (HAS_NATIVE_TTS) return;
  const mode = typeof LFSET_str === "function" ? LFSET_str("tts_mode", "server") : "server";
  if (mode === "browser") return;
  (Array.isArray(texts) ? texts : [texts]).filter(Boolean).slice(0, 8).forEach(t => {
    const chunks = splitForTts(String(t));
    chunks.slice(0, 3).forEach(c => fetchTts(c, lang).catch(() => {}));
  });
}

// Długie teksty (teoria) dzielimy na zdania po ~300 znaków i czytamy po kolei.
function splitForTts(text) {
  text = String(text || "").replace(/\s+/g, " ").trim();
  const MAX = 300;
  if (text.length <= MAX) return text ? [text] : [];
  // zdania: tniemy po ". ", "! ", "? " (bez lookbehind — starsze Safari go nie zna)
  const sents = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  const out = [];
  let cur = "";
  const push = piece => {
    piece = piece.trim();
    if (!piece) return;
    while (piece.length > MAX) {           // bardzo długi fragment bez kropek — po słowach
      let cut = piece.lastIndexOf(" ", MAX);
      if (cut < MAX / 2) cut = MAX;
      out.push(piece.slice(0, cut).trim());
      piece = piece.slice(cut).trim();
    }
    if ((cur + " " + piece).trim().length > MAX) { if (cur) out.push(cur); cur = piece; }
    else cur = (cur + " " + piece).trim();
  };
  sents.forEach(push);
  if (cur) out.push(cur);
  return out;
}

function speakServer(text, rate, lang, onFail) {
  const a = ttsAudioEl();
  const seq = ++SPEAK_SEQ;
  const chunks = splitForTts(text);
  if (!chunks.length) return;
  try { a.pause(); } catch (e) {}
  // zaczynamy pobierać wszystkie kawałki od razu (równolegle)
  const parts = chunks.map(c => fetchTts(c, lang));

  const playAt = k => {
    if (seq !== SPEAK_SEQ) return;              // ktoś zaczął mówić coś nowego
    if (k >= parts.length) return;
    parts[k].then(src => {
      if (seq !== SPEAK_SEQ) return;
      a.onended = () => playAt(k + 1);
      a.src = src;
      a.playbackRate = ttsRate();
      const p = a.play();
      if (p && p.catch) {
        p.then(() => { SERVER_TTS_OK = true; TTS_LAST_ERR = ""; })
         .catch(err => {
           if (err && err.name === "AbortError") return;   // przerwane nowym speak()
           TTS_LAST_ERR = "odtwarzanie: " + ((err && err.name) || err);
           if (onFail) onFail();
         });
      } else { SERVER_TTS_OK = true; }
    }).catch(err => {
      if (seq !== SPEAK_SEQ) return;
      SERVER_TTS_OK = false;
      TTS_LAST_ERR = "pobieranie: " + (err && err.message || err);
      if (onFail) onFail();
    });
  };
  playAt(0);
}

// zatrzymuje lektora (serwerowego i przeglądarkowego)
function stopSpeaking() {
  SPEAK_SEQ++;
  if (AUDIO_EL) { try { AUDIO_EL.onended = null; AUDIO_EL.pause(); } catch (e) {} }
  if (HAS_WEB_TTS) { try { speechSynthesis.cancel(); } catch (e) {} }
  if (HAS_NATIVE_TTS && window.NativeTTS.stop) { try { window.NativeTTS.stop(); } catch (e) {} }
}

// ---------- LEKTOR W PRZEGLĄDARCE (zapasowy) ----------
function _ttsSpeakRaw(text, rate, lang, useVoice, onStarted, onFailed) {
  const u = new SpeechSynthesisUtterance(String(text));
  TTS_KEEP.push(u);
  if (TTS_KEEP.length > 8) TTS_KEEP.shift();
  if (useVoice) {
    const v = pickVoiceFor(lang);
    if (v) { u.voice = v; u.lang = v.lang; }
    else { u.lang = lang === "pl" ? "pl-PL" : "en-US"; }
  } else {
    u.lang = lang === "pl" ? "pl-PL" : "en-US";
  }
  u.rate = rate; u.pitch = 1; u.volume = 1;
  u.onstart = () => { TTS_LAST_ERR = ""; if (onStarted) onStarted(); };
  u.onend = () => { const i = TTS_KEEP.indexOf(u); if (i >= 0) TTS_KEEP.splice(i, 1); };
  u.onerror = ev => {
    TTS_LAST_ERR = (ev && ev.error) || "nieznany błąd";
    if (TTS_LAST_ERR === "interrupted" || TTS_LAST_ERR === "canceled") return;
    if (onFailed) onFailed(TTS_LAST_ERR);
  };
  speechSynthesis.speak(u);
  try { speechSynthesis.resume(); } catch (e) {}
  return u;
}

function speakBrowser(text, rate, lang, quiet) {
  if (!HAS_WEB_TTS) {
    if (!TTS_WARNED && !quiet) { TTS_WARNED = true; toast("Ta przeglądarka nie obsługuje lektora", true); }
    return;
  }
  try {
    if (!VOICES.length) loadVoices();
    if (speechSynthesis.speaking) { try { speechSynthesis.cancel(); } catch (e) {} }
    let started = false, retried = false;
    const fallback = () => {
      if (retried) return;
      retried = true;
      setTimeout(() => {
        try {
          _ttsSpeakRaw(text, rate, lang, false, () => { started = true; }, err => {
            TTS_LAST_ERR = err;
            if (!TTS_WARNED && !quiet) {
              TTS_WARNED = true;
              toast("Lektor: " + err, true);
            }
          });
        } catch (e) {}
      }, 200);
    };
    _ttsSpeakRaw(text, rate, lang, true, () => { started = true; }, fallback);
    setTimeout(() => { if (!started && !retried) fallback(); }, 500);
  } catch (e) {
    TTS_LAST_ERR = String(e && e.message || e);
  }
}

// ---------- GŁÓWNA FUNKCJA ----------
// speak(text, rate, lang, quiet) — rate pomijamy (undefined) = aktualne tempo z ustawień.
// Ta funkcja ZAWSZE mówi (przyciski 🔊, zadania ze słuchu). Automatyczne czytanie,
// które użytkownik może wyciszyć, przechodzi przez speakAuto() w app.js.
function speak(text, rate, lang = "en", quiet = false) {
  if (rate === undefined || rate === null) rate = ttsRate();
  if (!text) return;

  // w aplikacji Android korzystamy z mostu natywnego
  if (HAS_NATIVE_TTS) {
    try { window.NativeTTS.speak(String(text), lang === "pl" ? "pl" : "en", rate); }
    catch (e) {}
    return;
  }

  const mode = typeof LFSET_str === "function" ? LFSET_str("tts_mode", "server") : "server";
  if (mode === "browser") return speakBrowser(text, rate, lang, quiet);
  if (mode === "server" || SERVER_TTS_OK !== false) {
    // domyślnie serwer — jest niezawodny; przy niepowodzeniu wracamy do przeglądarki
    return speakServer(text, rate, lang, () => {
      if (mode !== "server") speakBrowser(text, rate, lang, quiet);
      else if (!TTS_WARNED && !quiet) {
        TTS_WARNED = true;
        toast("Lektor serwerowy niedostępny: " + TTS_LAST_ERR, true);
      }
    });
  }
  return speakBrowser(text, rate, lang, quiet);
}

// Diagnostyka dla przycisku „Sprawdź lektora"
function ttsInfo() {
  if (HAS_NATIVE_TTS) return "lektor telefonu (aplikacja)";
  const mode = LFSET_str ? LFSET_str("tts_mode", "server") : "server";
  const srv = SERVER_TTS_OK === true ? "działa" : (SERVER_TTS_OK === false ? "NIE działa" : "nietestowany");
  const pre = `tryb: ${mode} · lektor serwerowy: ${srv} · `;
  if (!HAS_WEB_TTS) return pre + "przeglądarka: brak wsparcia";
  loadVoices();
  const en = VOICES.filter(v => (v.lang || "").toLowerCase().startsWith("en")).length;
  const pl = VOICES.filter(v => (v.lang || "").toLowerCase().startsWith("pl")).length;
  const st = speechSynthesis.speaking ? "mówi" : (speechSynthesis.pending ? "w kolejce" : "bezczynny");
  return pre + `głosy EN: ${en}, PL: ${pl} · stan: ${st}` +
         (TTS_LAST_ERR ? ` · ostatni błąd: ${TTS_LAST_ERR}` : "") +
         (VOICES.length ? "" : " · UWAGA: przeglądarka nie zwróciła żadnych głosów");
}

// Telefon bez polskich danych głosowych — podpowiadamy, gdzie je włączyć
let TTS_PL_WARNED = false;
window.onNativeTtsMissing = function (lang) {
  if (lang !== "pl" || TTS_PL_WARNED) return;
  TTS_PL_WARNED = true;
  toast("Brak polskiego głosu w telefonie — Ustawienia → Ułatwienia dostępu → Zamiana tekstu na mowę → dodaj język polski", true);
};

function ring(value, goal, label) {
  const pct = Math.min(1, goal ? value / goal : 0);
  const R = 56, C = 2 * Math.PI * R;
  const wrap = el("div", { class: "ringwrap" });
  wrap.innerHTML = `<svg width="130" height="130">
    <circle class="ring-bg" cx="65" cy="65" r="${R}"></circle>
    <circle class="ring-fg" cx="65" cy="65" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"></circle>
  </svg>`;
  wrap.append(el("div", { class: "ringtxt" },
    el("div", { class: "big" }, String(value)),
    el("div", { class: "muted" }, label)));
  return wrap;
}

function skillBar(name, val, lvl) {
  return el("div", { class: "skill-row" },
    el("span", {}, name),
    el("div", { class: "bar" }, el("div", { style: `width:${val}%` })),
    el("b", { class: "lvl" }, lvl));
}

function levelSelect(current, id) {
  const s = el("select", id ? { id } : {});
  s.append(el("option", { value: "" }, "— wybierz —"));
  for (const L of ["A1", "A2", "B1", "B2", "C1", "C2"])
    s.append(el("option", { value: L, ...(L === current ? { selected: 1 } : {}) }, L));
  return s;
}

function clearMain() {
  exitFocus();
  const m = document.querySelector("main");
  m.innerHTML = "";
  m.scrollTop = 0;
  window.scrollTo(0, 0);
  return m;
}

// ================= TRYB SKUPIENIA =================
// Podczas zadania znika menu i wszystko poza samym ćwiczeniem.
// opts: {title, subtitle, onExit, theme, listening}
//   listening: true  -> zadanie polega na słuchaniu: pokazujemy TYLKO tempo lektora
//                       (wyciszenie nie ma sensu, bo bez dźwięku nie da się rozwiązać)
//   domyślnie        -> tempo + przełącznik 🔊/🔇 (uczeń decyduje, czy lektor czyta odpowiedzi)
function enterFocus(opts = {}) {
  exitFocus();
  stopSpeaking();
  document.body.classList.add("focus");
  const bar = el("div", { class: "focus-bar focus-" + (opts.theme || "ember"), id: "focusbar" },
    el("button", {
      class: "focus-back", title: "Zakończ i wróć",
      onclick: () => {
        if (typeof opts.onExit === "function") opts.onExit();
        else { exitFocus(); location.hash = "#dashboard"; }
      },
    }, "←"),
    el("div", { class: "focus-txt" },
      el("div", { class: "focus-title" }, opts.title || ""),
      el("div", { class: "focus-sub", id: "focussub" }, opts.subtitle || "")),
    el("div", { class: "focus-tts" },
      opts.cheatsheet ? cheatButton(opts.cheatsheet) : null,
      speedCycleButton(),
      (!opts.listening && typeof muteButton === "function") ? muteButton() : null),
    el("div", { class: "focus-count", id: "focuscount" }, ""));
  const line = el("div", { class: "focus-line" }, el("div", { class: "focus-line-fill", id: "focusfill" }));
  bar.append(line);
  document.body.prepend(bar);
  return bar;
}

// ---------- ŚCIĄGA: boczny panel z tabelą bieżącego tematu (nie trzeba się cofać) ----------
// build: funkcja zwracająca węzeł DOM z treścią ściągi
function cheatButton(build) {
  const b = el("button", { class: "cheat-btn", title: "Ściąga — tabela tematu" }, "📋",
    el("span", { class: "sc-lbl" }, " Ściąga"));
  b.onclick = e => { e.stopPropagation(); toggleCheatDrawer(build); };
  return b;
}
function toggleCheatDrawer(build) {
  const old = document.getElementById("cheatdrawer");
  if (old) { old.classList.remove("open"); setTimeout(() => old.remove(), 200); return; }
  const dr = el("div", { class: "cheat-drawer", id: "cheatdrawer" },
    el("div", { class: "cheat-head" }, el("b", {}, "📋 Ściąga"),
      el("button", { class: "btn ghost mini", onclick: () => toggleCheatDrawer() }, "✕ Zamknij")),
    el("div", { class: "cheat-body" }, build ? build() : ""));
  document.body.append(dr);
  requestAnimationFrame(() => dr.classList.add("open"));
}
function cheatTable(cs) {
  if (!cs) return el("div", { class: "muted" }, "Brak ściągi dla tego tematu.");
  const wrap = el("div", { class: "cheat-tbl-wrap" });
  if (cs.title) wrap.append(el("h4", {}, cs.title));
  wrap.append(dataTable(cs));
  if (cs.note) wrap.append(el("div", { class: "kb-tip" }, "💡 " + cs.note));
  return wrap;
}
// tabela z {head:[...], rows:[[...]]}
function dataTable(t) {
  const tbl = el("table", { class: "data-tbl" });
  if (t.head) tbl.append(el("thead", {}, el("tr", {}, ...t.head.map(h => el("th", {}, h)))));
  const tb = el("tbody", {});
  (t.rows || []).forEach(r => tb.append(el("tr", {}, ...r.map((c, i) =>
    el("td", { class: i === 0 ? "tbl-first" : "" }, c)))));
  tbl.append(tb);
  return el("div", { class: "tbl-scroll" }, tbl);
}

function exitFocus() {
  document.onkeydown = null;          // skróty klawiszowe zadania nie mogą przeżyć widoku
  const dr = document.getElementById("cheatdrawer"); if (dr) dr.remove();
  document.body.classList.remove("focus");
  const b = document.getElementById("focusbar");
  if (b) b.remove();
}

// aktualizacja paska postępu w trybie skupienia
function focusProgress(done, total, label) {
  const fill = document.getElementById("focusfill");
  const cnt = document.getElementById("focuscount");
  const sub = document.getElementById("focussub");
  if (fill && total) fill.style.width = Math.round(100 * done / total) + "%";
  if (cnt && total) cnt.textContent = `${done}/${total}`;
  if (sub && label !== undefined) sub.textContent = label;
}

// ---------- v0.2: pasek hero modułu ----------
function hero(emoji, title, sub, theme = "ember", counter = "") {
  return el("div", { class: "hero hero-" + theme },
    el("div", { class: "hero-emoji" }, emoji),
    el("div", { class: "hero-txt" },
      el("h2", {}, title),
      sub ? el("div", { class: "hero-sub" }, sub) : null),
    counter ? el("div", { class: "hero-count" }, counter) : null);
}

// ---------- v0.2: licznik serii (combo) ----------
const COMBO = { n: 0 };
function comboHit(ok) {
  if (!ok) { COMBO.n = 0; return; }
  COMBO.n++;
  if (COMBO.n === 3) toast("🔥 Seria x3!");
  if (COMBO.n === 5) { toast("🔥🔥 Seria x5 — nieźle!"); confetti(); }
  if (COMBO.n === 10) { toast("⚡ SERIA x10 — mistrzostwo!"); confetti(); }
}

// ---------- v0.2: panel feedbacku czekający na „Dalej” ----------
// opts: {correct, your, answer, pl, explain, tts, ttsPl, askKnown, onNext(guessed), extraHtml}
// ---------- PORÓWNANIE ZDAŃ SŁOWO PO SŁOWIE ----------
// wordDiff(given, expected) -> { your: <div>, missing: [...], wrong: [...], right: [...], ok }
// Uczeń widzi na czerwono słowa, których w poprawnym zdaniu nie ma (albo są źle
// zapisane), a na zielono słowa, których zabrakło. Porównanie po normalizacji
// (małe litery, bez interpunkcji), dopasowanie najdłuższym wspólnym ciągiem (LCS).
function _wdTok(t) {
  return String(t || "").replace(/[’`´]/g, "'").split(/\s+/).filter(Boolean);
}
function _wdNorm(w) { return w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""); }
function wordDiff(given, expected) {
  const a = _wdTok(given), b = _wdTok(expected);
  const an = a.map(_wdNorm), bn = b.map(_wdNorm);
  // LCS
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = an[i] === bn[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const matchA = new Set(), matchB = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (an[i] === bn[j]) { matchA.add(i); matchB.add(j); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const your = el("div", { class: "wd-line" });
  a.forEach((w, k) => your.append(el("span", { class: "wd-w " + (matchA.has(k) ? "wd-ok" : "wd-bad") }, w), " "));
  const missing = b.filter((_, k) => !matchB.has(k));
  if (missing.length) {
    your.append(el("span", { class: "wd-miss-label" }, " brakuje: "));
    missing.forEach(w => your.append(el("span", { class: "wd-w wd-miss" }, w), " "));
  }
  return { your, ok: matchA.size === n && matchB.size === m,
           wrong: a.filter((_, k) => !matchA.has(k)).map(_wdNorm),
           missing: missing.map(_wdNorm), right: b.filter((_, k) => matchB.has(k)).map(_wdNorm) };
}

// ---------- „DO UTRWALENIA": zgłaszanie i oznaczanie słów ----------
// Po sprawdzeniu zdania: błędne/brakujące słowa treści trafiają do kategorii fiszek
// „🔥 Do utrwalenia", poprawnie zapisane słowa z tej kategorii dostają +1.
function reportHardWords(diff, ctxEn, ctxPl) {
  if (!diff) return;
  // do utrwalenia trafia POPRAWNA forma słowa, którego zabrakło / które zapisano źle
  // (diff.missing), a nie literówka ucznia
  const wrong = [...new Set(diff.missing)].filter(w => w.length >= 3);
  API.post("/api/hardwords/report", { wrong, right: diff.right, ctx_en: ctxEn || "", ctx_pl: ctxPl || "" })
    .then(r => {
      if (r.added && r.added.length) toast("🔥 Do utrwalenia: " + r.added.join(", "));
      if (r.released && r.released.length) toast("✨ Opanowane: " + r.released.join(", "));
    }).catch(() => {});
}
// Zdanie jako klikalne słowa — dotknięcie słowa dodaje je do „Do utrwalenia".
function wordChips(en, pl) {
  const wrap = el("div", { class: "wchips" });
  _wdTok(en).forEach(w => {
    const clean = _wdNorm(w);
    const b = el("button", { class: "wchip", title: "Nie znam — dodaj do utrwalenia" }, w);
    b.onclick = e => {
      e.stopPropagation();
      if (clean.length < 2) return;
      b.classList.add("wchip-on");
      API.post("/api/hardwords/add", { en: clean, ctx_en: en, ctx_pl: pl || "" })
        .then(r => toast("🔥 Dodano do utrwalenia: " + clean + (r.word && r.word.pl ? " = " + r.word.pl : "")))
        .catch(err => { b.classList.remove("wchip-on"); toast(String(err.message || err), true); });
    };
    wrap.append(b, " ");
  });
  wrap.append(el("span", { class: "muted small wchips-hint" }, "← dotknij słowa, którego nie znasz"));
  return wrap;
}

// ---------- MÓWIENIE: „🎤 Powiedz to zdanie" (Web Speech API, Chrome / Android) ----------
// Uczeń wypowiada zdanie, przeglądarka je rozpoznaje, a my porównujemy słowo po słowie.
// Nie ocenia akcentu — ocenia, czy powiedziałeś właściwe zdanie. Gdy przeglądarka
// nie obsługuje rozpoznawania mowy, przycisk się nie pokazuje.
function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !HAS_NATIVE_TTS;
}
function speakCheckButton(target, lang) {
  if (!speechSupported() || !target) return null;
  const box = el("div", { class: "say-box" });
  const b = el("button", { class: "btn ghost say-btn" }, "🎤 Powiedz to zdanie");
  const out = el("div", { class: "say-out" });
  box.append(b, out);
  b.onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec;
    try { rec = new SR(); } catch (e) { out.textContent = "Rozpoznawanie mowy niedostępne."; return; }
    stopSpeaking();
    rec.lang = lang === "pl" ? "pl-PL" : "en-US";
    rec.interimResults = false; rec.maxAlternatives = 3;
    b.disabled = true; b.textContent = "🎙 Słucham…"; out.textContent = "";
    rec.onresult = ev => {
      const alts = [...ev.results[0]].map(r => r.transcript);
      let best = null;
      alts.forEach(t => { const d = wordDiff(t, target); if (!best || d.wrong.length + d.missing.length < best.d.wrong.length + best.d.missing.length) best = { t, d }; });
      out.innerHTML = "";
      out.append(el("div", { class: "muted small" }, "Usłyszałem:"), best.d.your,
        el("div", { class: best.d.ok ? "say-good" : "say-bad" }, best.d.ok ? "✔ Świetnie — całe zdanie!" :
          (best.d.wrong.length + best.d.missing.length <= 1 ? "◐ Prawie — jedno słowo do poprawy" : "✘ Spróbuj jeszcze raz — posłuchaj lektora")));
      if (typeof haptic === "function") haptic(best.d.ok ? "good" : "bad");
    };
    rec.onerror = ev => { out.textContent = "Nie udało się: " + (ev.error === "not-allowed" ? "brak zgody na mikrofon" : ev.error); };
    rec.onend = () => { b.disabled = false; b.textContent = "🎤 Powiedz jeszcze raz"; };
    try { rec.start(); } catch (e) { out.textContent = "Nie udało się uruchomić mikrofonu."; b.disabled = false; }
  };
  return box;
}

function feedbackPanel(opts) {
  const state = opts.state || (opts.correct ? "good" : "bad");
  comboHit(state === "good");
  if (typeof haptic === "function") haptic(state === "good" ? "good" : "bad");
  const cls = { good: "fb-good", partial: "fb-part", bad: "fb-bad" }[state];
  const head = { good: "✔ Dobrze!", partial: "◐ Prawie — częściowo dobrze", bad: "✘ Niestety nie" }[state];
  const box = el("div", { class: "feedback " + cls });
  box.append(el("div", { class: "fb-head" },
    opts.label || head,
    typeof opts.score === "number" ? el("span", { class: "fb-score" }, ` ${Math.round(opts.score * 100)}%`) : null,
    COMBO.n >= 2 ? el("span", { class: "fb-combo" }, ` 🔥x${COMBO.n}`) : null));

  const grid = el("div", { class: "fb-grid" });
  // zdania (dyktando, tłumaczenie): pokazujemy słowo po słowie, co było źle
  const sentenceTarget = opts.diffTarget || null;
  let diff = null;
  if (sentenceTarget && opts.your !== undefined && opts.your !== "" && String(opts.your) !== "(nie wiem)") {
    diff = wordDiff(String(opts.your), sentenceTarget);
    if (opts.reportHard !== false) reportHardWords(diff, sentenceTarget, opts.pl);
  }
  if (opts.your !== undefined && opts.your !== "" && state !== "good")
    grid.append(el("div", { class: "fb-label" }, "Twoja odpowiedź:"),
                el("div", { class: "fb-your" }, diff ? diff.your : String(opts.your)));
  if (opts.answer)
    grid.append(el("div", { class: "fb-label" }, "Poprawna odpowiedź:"),
                el("div", { class: "fb-answer" },
                  String(opts.answer), " ",
                  (!opts.en && opts.tts) ? el("button", { class: "mini-tts", onclick: () => speak(opts.tts) }, "🔊 EN") : null));
  if (opts.en && opts.en !== opts.answer)
    grid.append(el("div", { class: "fb-label" }, "Całe zdanie EN:"),
                el("div", { class: "fb-en" }, String(opts.en), " ",
                  el("button", { class: "mini-tts", onclick: () => speak(opts.en) }, "🔊 EN")));
  else if (opts.en)
    grid.append(el("div", { class: "fb-label" }, "Po angielsku:"),
                el("div", { class: "fb-en" }, "— jak wyżej — ",
                  el("button", { class: "mini-tts", onclick: () => speak(opts.en) }, "🔊 EN")));
  if (opts.pl)
    grid.append(el("div", { class: "fb-label" }, "Po polsku:"),
                el("div", { class: "fb-pl" },
                  String(opts.pl), " ",
                  el("button", { class: "mini-tts", onclick: () => speak(opts.pl, undefined, "pl") }, "🔊 PL")));
  box.append(grid);
  if (opts.options && opts.options.length) {
    const ol = el("div", { class: "fb-options" },
      el("div", { class: "fb-label" }, "Wszystkie odpowiedzi z tłumaczeniem:"));
    opts.options.forEach(o => ol.append(
      el("div", { class: "fb-opt" + (o.correct ? " fb-opt-good" : "") + (o.chosen && !o.correct ? " fb-opt-bad" : "") },
        o.correct ? "✔ " : (o.chosen ? "✘ " : "· "),
        el("b", {}, o.en), o.pl ? " — " + o.pl : "")));
    box.append(ol);
  }
  const chipSrc = opts.en || sentenceTarget || (opts.answer && /\s/.test(String(opts.answer)) ? String(opts.answer) : null);
  if (chipSrc && opts.chips !== false) box.append(wordChips(chipSrc, opts.pl));
  if (chipSrc && opts.say !== false) { const sb = speakCheckButton(chipSrc, "en"); if (sb) box.append(sb); }
  if (opts.explain) box.append(el("div", { class: "fb-explain" }, "💡 " + opts.explain));
  if (opts.rule) box.append(el("div", { class: "fb-rule" },
    el("b", {}, "📏 Reguła" + (opts.ruleTitle ? " — " + opts.ruleTitle : "") + ": "), opts.rule));
  if (opts.extraHtml) box.append(el("div", { html: opts.extraHtml }));

  const btns = el("div", { class: "fb-btns" });
  if (opts.correct && opts.askKnown) {
    btns.append(
      el("button", { class: "btn ok", onclick: () => opts.onNext(false) }, "✔ Wiedziałem"),
      el("button", { class: "btn ghost", onclick: () => opts.onNext(true) }, "🤞 Zgadywałem"));
    box.append(el("div", { class: "fb-note muted" },
      "Szczerość pomaga: zgadnięcia liczą się z mniejszą wagą, dzięki czemu wynik jest prawdziwy."));
  } else {
    btns.append(el("button", { class: "btn primary", onclick: () => opts.onNext(false) }, "Dalej →"));
  }
  box.append(btns);
  setTimeout(() => { const b = btns.querySelector("button"); if (b) b.focus(); }, 60);
  return box;
}


// ---------- v0.4: interakcja z odpowiedziami (klawisze 1–4, zaznaczenie) ----------
document.addEventListener("click", e => {
  const opt = e.target.closest(".option");
  if (!opt || opt.disabled) return;
  const wrap = opt.closest(".options");
  if (!wrap) return;
  wrap.querySelectorAll(".option").forEach(o => o.classList.remove("opt-picked"));
  opt.classList.add("opt-picked");
});

document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  const n = parseInt(e.key, 10);
  if (!n || n < 1 || n > 9) return;
  const wrap = document.querySelector("main .options");
  if (!wrap) return;
  const btn = wrap.querySelectorAll(".option")[n - 1];
  if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
});


// ---------- v0.5.1: wybór liczby zadań przed sesją ----------
// opts: {title, subtitle, pool, suggested, unit, onStart(n), extra}
function sizePicker(opts) {
  const pool = opts.pool || 0;
  const unit = opts.unit || "zadań";
  let chosen = Math.min(opts.suggested || 10, pool);

  const box = el("div", { class: "card size-picker" });
  box.append(
    el("h3", {}, opts.title || "Ile zadań chcesz przerobić?"),
    el("p", { class: "muted" }, opts.subtitle || `Dostępna pula: ${pool} ${unit}.`),
    el("div", { class: "pool-badge" }, `📚 pula: ${pool} ${unit}`));

  const custom = el("input", { class: "input short", type: "number", min: 1, max: pool, value: chosen });
  const badge = el("div", { class: "size-chosen" }, `wybrano: ${chosen} ${unit}`);

  function setChosen(v, btn) {
    chosen = v === "all" ? "all" : Math.max(1, Math.min(pool, +v || 1));
    badge.textContent = `wybrano: ${chosen === "all" ? pool + " (wszystkie)" : chosen} ${unit}`;
    grid.querySelectorAll(".size-btn").forEach(x => x.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (chosen !== "all") custom.value = chosen;
  }

  const presets = [5, 10, 15, 20, 30].filter(n => n < pool);
  const grid = el("div", { class: "size-grid" });
  presets.forEach(n => {
    const b = el("button", { class: "size-btn", onclick: () => setChosen(n, b) },
      el("b", {}, String(n)), el("div", { class: "small" }, unit));
    grid.append(b);
  });
  const allB = el("button", { class: "size-btn size-all", onclick: () => setChosen("all", allB) },
    el("b", {}, "WSZYSTKIE"), el("div", { class: "small" }, `${pool} ${unit}`));
  grid.append(allB);
  box.append(grid);

  custom.oninput = () => setChosen(custom.value, null);
  box.append(el("div", { class: "set-row" }, "Własna liczba: ", custom), badge);

  if (opts.extra) box.append(opts.extra);

  // START dopiero po kliknięciu — wybór liczby niczego nie uruchamia
  box.append(el("button", { class: "btn primary big start-btn", onclick: () => opts.onStart(chosen) },
    "▶ START"));
  return box;
}

