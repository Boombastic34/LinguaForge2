
// ---------- v0.4: porównywanie odpowiedzi wyrozumiałe dla ogonków i literówek ----------
const PL_FOLD = { "ą":"a","ć":"c","ę":"e","ł":"l","ń":"n","ó":"o","ś":"s","ź":"z","ż":"z" };
function foldPl(s) {
  return (s || "").toLowerCase().replace(/[ąćęłńóśźż]/g, ch => PL_FOLD[ch]);
}
function normAns(s) {
  return foldPl(s).replace(/[.,!?;:„”"'()]/g, "").replace(/\s+/g, " ").trim();
}
// odległość Levenshteina (do 2 znaków tolerancji)
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
// zgodne? (ogonki nieistotne, 1 literówka wybaczona przy dłuższych słowach)
function answersMatch(given, expected) {
  const a = normAns(given), b = normAns(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  const tol = b.length >= 8 ? 2 : (b.length >= 5 ? 1 : 0);
  return tol > 0 && editDist(a, b) <= tol;
}
// Pomocnicze funkcje interfejsu
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

function ttsRate() {
  try {
    const v = parseFloat(localStorage.getItem("lf_tts_rate"));
    return (v >= 0.5 && v <= 1.5) ? v : 0.92;
  } catch (e) { return 0.92; }
}
function setTtsRate(v) {
  try { localStorage.setItem("lf_tts_rate", String(v)); } catch (e) {}
  API.post("/api/settings", { tts_rate: v }).catch(() => {});
}

const TTS_SPEEDS = [[0.6, "🐢", "wolno"], [0.85, "▶", "normalnie"], [1.05, "🐇", "szybko"]];
function speedPicker(current, onChange) {
  const row = el("div", { class: "speed-row" }, el("span", { class: "muted small" }, "tempo:"));
  TTS_SPEEDS.forEach(([v, icon, label]) => {
    const b = el("button", {
      class: "speed-btn" + (Math.abs(v - current) < 0.06 ? " active" : ""),
      onclick: () => {
        row.querySelectorAll(".speed-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        setTtsRate(v);
        onChange(v);
      },
    }, icon + " " + label);
    row.append(b);
  });
  return row;
}

let TTS_WARNED = false;
let TTS_LAST_ERR = "";
let TTS_MODE = "auto";          // auto | server | browser
const TTS_KEEP = [];            // referencje wypowiedzi (ochrona przed usunięciem z pamięci)

// ---------- LEKTOR Z SERWERA ----------
// Gotowe nagranie MP3 pobierane z serwera. Działa nawet tam, gdzie własny silnik
// mowy przeglądarki zawodzi (Chrome na Androidzie bywa zepsuty: zwraca listę głosów,
// ale synteza kończy się błędem synthesis-failed).
let AUDIO_EL = null;
let SERVER_TTS_OK = null;       // null = jeszcze nie wiadomo

function ttsAudioEl() {
  if (!AUDIO_EL) {
    AUDIO_EL = new Audio();
    AUDIO_EL.preload = "auto";
  }
  return AUDIO_EL;
}

const TTS_BLOBS = {};           // pamięć podręczna nagrań w przeglądarce

function speakServer(text, rate, lang, onFail) {
  const key = lang + "|" + rate + "|" + text;
  const a = ttsAudioEl();

  const play = src => {
    try { a.pause(); } catch (e) {}
    a.src = src;
    const p = a.play();
    if (p && p.catch) {
      p.then(() => { SERVER_TTS_OK = true; TTS_LAST_ERR = ""; })
       .catch(err => {
         TTS_LAST_ERR = "odtwarzanie: " + ((err && err.name) || err);
         if (onFail) onFail();
       });
    } else {
      SERVER_TTS_OK = true;
    }
  };

  if (TTS_BLOBS[key]) return play(TTS_BLOBS[key]);

  // WAŻNE: pobieramy nagranie zwykłym zapytaniem, żeby dołączyć token logowania.
  // Sam <audio src="..."> nie wysyła nagłówków, więc serwer odmawiał dostępu,
  // a przeglądarka zgłaszała NotSupportedError.
  const url = "/api/tts?lang=" + encodeURIComponent(lang)
            + "&rate=" + encodeURIComponent(rate)
            + "&text=" + encodeURIComponent(text);
  fetch(url, { headers: { "x-token": API.token || "" } })
    .then(r => {
      if (!r.ok) throw new Error("serwer odpowiedział " + r.status);
      return r.blob();
    })
    .then(blob => {
      if (!blob || blob.size < 500) throw new Error("puste nagranie");
      const src = URL.createObjectURL(blob);
      TTS_BLOBS[key] = src;
      const keys = Object.keys(TTS_BLOBS);
      if (keys.length > 40) { URL.revokeObjectURL(TTS_BLOBS[keys[0]]); delete TTS_BLOBS[keys[0]]; }
      SERVER_TTS_OK = true;
      play(src);
    })
    .catch(err => {
      SERVER_TTS_OK = false;
      TTS_LAST_ERR = "pobieranie: " + (err && err.message || err);
      if (onFail) onFail();
    });
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
    setTimeout(() => { if (!started && !retried) fallback(); }, 900);
  } catch (e) {
    TTS_LAST_ERR = String(e && e.message || e);
  }
}

// ---------- GŁÓWNA FUNKCJA ----------
function speak(text, rate, lang = "en", quiet = false) {
  if (rate === undefined || rate === null) rate = ttsRate();
  if (!text) return;

  // w aplikacji Android korzystamy z mostu natywnego
  if (HAS_NATIVE_TTS) {
    try { window.NativeTTS.speak(String(text), lang === "pl" ? "pl" : "en", rate); }
    catch (e) {}
    return;
  }

  const mode = LFSET_str ? LFSET_str("tts_mode", "server") : "server";
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
  if (!HAS_WEB_TTS) return "brak wsparcia w tej przeglądarce";
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
// opts: {title, subtitle, onExit, theme}
function enterFocus(opts = {}) {
  exitFocus();
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
    typeof muteButton === "function" ? muteButton() : null,
    el("div", { class: "focus-count", id: "focuscount" }, ""));
  const line = el("div", { class: "focus-line" }, el("div", { class: "focus-line-fill", id: "focusfill" }));
  bar.append(line);
  document.body.prepend(bar);
  return bar;
}

function exitFocus() {
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
  if (opts.your !== undefined && opts.your !== "" && state !== "good")
    grid.append(el("div", { class: "fb-label" }, "Twoja odpowiedź:"),
                el("div", { class: "fb-your" }, String(opts.your)));
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
                  el("button", { class: "mini-tts", onclick: () => speak(opts.pl, 0.95, "pl") }, "🔊 PL")));
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

