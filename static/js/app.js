// Router + nawigacja
const ROUTES_STUDENT = [
  ["#dashboard", "🏠 Pulpit", viewDashboard],
  ["#path", "🧭 Ścieżka", viewPath],
  ["#flashcards", "🃏 Fiszki", viewFlashcards],
  ["#dialogs", "💬 Rozmowy", viewDialogs],
  ["#reading", "📖 Czytanie", viewReading],
  ["#training", "🛠 Mój trening", viewTraining],
  ["#admin", "🛡 Administrator", viewAdmin, "admin"],
  ["#review", "🔍 Przegląd treści", viewReview, "admin"],
  ["#notes", "📋 Notatki admina", viewReviewNotes, "admin"],
  ["#verbs", "⚙️ Czasowniki z czasami", viewVerbs],
  ["#knowledge", "📖 Baza wiedzy", viewKnowledge],
  ["#lessons", "📚 Lekcje", viewLessons],
  ["#grammar", "📐 Gramatyka", viewGrammar],
  ["#translate", "🌐 Tłumaczenia", viewTranslate],
  ["#listening", "🎧 Słuchanie", viewListening],
  ["#games", "🎮 Gry", viewGames],
  ["#programs", "📚 Programy", viewPrograms],
  ["#custom", "➕ Własne fiszki", viewCustom],
];
const ROUTES_TEACHER = [["#teacher", "🧑‍🏫 Uczniowie", viewTeacher]];

// hash -> identyfikator modułu (do filtrowania wg uprawnień)
const ROUTE_MODULE = {
  "#path": "path", "#flashcards": "flashcards", "#verbs": "verbs", "#dialogs": "dialogs",
  "#reading": "reading", "#listening": "listening", "#translate": "translate",
  "#grammar": "grammar", "#knowledge": "knowledge", "#lessons": "lessons",
  "#training": "training", "#games": "games", "#programs": "programs",
  "#custom": "custom", "#placement": "placement",
};
// lista dozwolonych modułów — uzupełniana z /api/dashboard
window.LF_ALLOWED = null;
function moduleAllowed(hash) {
  const id = ROUTE_MODULE[hash];
  if (!id) return true;                       // pulpit, administrator itd.
  if (!window.LF_ALLOWED) return true;        // przed pobraniem nie ukrywamy
  return window.LF_ALLOWED.includes(id);
}
const HIDDEN = { "#placement": viewPlacement, "#student": null };

function boot() {
  if (!API.token || !API.user) { viewAuth(); return; }
  const app = document.getElementById("app");
  app.innerHTML = "";
  const routes = API.user.role === "teacher" ? ROUTES_TEACHER : ROUTES_STUDENT;

  const nav = el("nav", {});
  const aside = el("aside", {},
    el("div", { class: "brand" }, "Lingua", el("span", {}, "Forge")),
    el("div", { class: "brand-sub", id: "verbox" }, "v2.4.0 · kuźnia języka"),
    nav,
    el("div", { class: "spacer" }),
    el("div", { class: "userbox" },
      el("div", { class: "set-row", style: "margin:0 0 6px" },
        el("button", { class: "theme-toggle", title: "Tryb jasny / ciemny", onclick: toggleTheme }, "🌓"),
        el("span", { class: "muted small" }, "motyw")),
      el("div", {}, "Zalogowano: ", el("b", {}, API.user.username)),
      el("button", { class: "nav", style: "margin-top:6px;padding-left:0", onclick: () => API.logout() }, "Wyloguj ↩")));
  const main = el("main", {});
  app.append(aside, main);

  API.get("/api/dashboard").then(d => {
    applyTheme(d.profile.settings && d.profile.settings.dark);
    window.LF_ROLE = d.profile.role || "student";
    window.LF_ALLOWED = d.profile.allowed || null;
    if (d.profile.admin || window.LF_ROLE === "admin") window.IS_ADMIN = true;
    renderNav();
  }).catch(() => {});

  // porównanie wersji plików z wersją serwera — ostrzega o starym cache
  fetch("/api/version").then(r => r.json()).then(v => {
    const box = document.getElementById("verbox");
    if (!box) return;
    box.textContent = "v" + v.version + " · kuźnia języka";
    if (v.version !== "2.4.0") {
      box.textContent = "v" + v.version + " · odśwież (Ctrl+F5)";
      box.style.color = "#ffd43b";
    }
  }).catch(() => {});

  // pięć głównych zakładek na dole; reszta w arkuszu „Więcej"
  const TABS = API.user.role === "teacher"
    ? [["#teacher", "🧑‍🏫", "Uczniowie"]]
    : [["#dashboard", "🏠", "Start"], ["#path", "🧭", "Ścieżka"],
       ["#flashcards", "🃏", "Fiszki"], ["#dialogs", "💬", "Rozmowy"]];

  function renderNav() {
    nav.innerHTML = "";
    const cur = location.hash || "#dashboard";
    for (const [hash, icon, label] of TABS) {
      if (!moduleAllowed(hash)) continue;
      nav.append(el("button", {
        class: "tab-btn" + (cur === hash ? " active" : ""),
        onclick: () => { haptic(); location.hash = hash; },
      }, el("span", { class: "tab-ico" }, icon), el("span", { class: "tab-lbl" }, label)));
    }
    const inTabs = TABS.some(t => t[0] === cur);
    nav.append(el("button", {
      class: "tab-btn" + (inTabs ? "" : " active"), onclick: () => { haptic(); openMore(); },
    }, el("span", { class: "tab-ico" }, "☰"), el("span", { class: "tab-lbl" }, "Więcej")));
  }

  // arkusz wysuwany z dołu — reszta modułów
  function openMore() {
    const sheet = el("div", { class: "sheet-bg", onclick: e => { if (e.target === sheet) close(); } });
    const inner = el("div", { class: "sheet" },
      el("div", { class: "sheet-grip" }),
      el("h3", {}, "Wszystkie moduły"));
    const grid = el("div", { class: "sheet-grid" });
    for (const [hash, label, , flag] of routes) {
      if (flag === "admin" && !window.IS_ADMIN) continue;
      if (TABS.some(t => t[0] === hash)) continue;
      if (!moduleAllowed(hash)) continue;
      const parts = label.split(" ");
      grid.append(el("button", {
        class: "sheet-item", onclick: () => { haptic(); close(); location.hash = hash; },
      }, el("span", { class: "sheet-ico" }, parts[0]),
         el("span", { class: "sheet-txt" }, parts.slice(1).join(" "))));
    }
    inner.append(grid,
      el("div", { class: "sheet-foot" },
        el("button", { class: "btn ghost", onclick: () => { toggleTheme(); haptic(); } }, "🌓 Motyw"),
        el("button", { class: "btn ghost", onclick: () => API.logout() }, "Wyloguj ↩"),
        el("span", { class: "muted small", id: "verbox2" }, "")),
      el("button", { class: "btn primary sheet-close", onclick: close }, "Zamknij"));
    sheet.append(inner);
    document.body.append(sheet);
    requestAnimationFrame(() => sheet.classList.add("open"));
    function close() { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 220); }
  }

  let CURRENT = null;
  async function route() {
    renderNav();
    const h = location.hash || (API.user.role === "teacher" ? "#teacher" : "#dashboard");
    if (CURRENT === h) return;   // ten sam widok już wyrenderowany — bez duplikatu
    CURRENT = h;
    if (h.startsWith("#flashcards:")) return viewFlashcards(h.split(":")[1] === "theme" ? "all" : "all", h.split(":")[2]);
    if (h === "#repair") return viewRepair();
    const r = routes.find(x => x[0] === h);
    if (!moduleAllowed(h)) {
      clearMain();
      document.querySelector("main").append(el("div", { class: "card" },
        el("h3", {}, "🔒 Dział niedostępny"),
        el("p", { class: "muted" }, "Ten moduł został wyłączony przez administratora."),
        el("button", { class: "btn primary", onclick: () => { location.hash = "#dashboard"; } }, "← Pulpit")));
      return;
    }
    try {
      if (r) await r[2]();
      else if (h === "#placement") await viewPlacement();
      else { location.hash = routes[0][0]; }
    } catch (e) {
      showViewError(e);
    }
  }
  window.onhashchange = route;
  const resume = sessionStorage.getItem("lf_resume");
  if (resume) {
    sessionStorage.removeItem("lf_resume");
    if (location.hash !== resume) { location.hash = resume; }
    toast("Wznowiono — możesz uczyć się dalej");
  }
  route();
}

boot();


// ---------- motyw ----------
function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  API.post("/api/settings", { dark }).catch(() => {});
}
function applyTheme(dark) { document.body.classList.toggle("dark", !!dark); }


// ---------- awaryjne wyświetlenie błędu zamiast pustej strony ----------
function showViewError(e) {
  console.error(e);
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = "";
  main.append(el("div", { class: "card" },
    el("h3", {}, "😕 Nie udało się otworzyć tego widoku"),
    el("p", { class: "muted" }, String((e && e.message) || e)),
    el("p", { class: "muted small" }, "Spróbuj ponownie albo wróć na pulpit. Jeśli błąd się powtarza, zgłoś go — komunikat wyżej wskazuje przyczynę."),
    el("div", { class: "fb-btns" },
      el("button", { class: "btn primary", onclick: () => location.reload() }, "🔄 Odśwież"),
      el("button", { class: "btn ghost", onclick: () => { location.hash = "#dashboard"; location.reload(); } }, "← Pulpit"))));
  toast("Błąd widoku: " + ((e && e.message) || e), true);
}

async function safeView(fn) {
  try { await fn(); } catch (e) { showViewError(e); }
}

window.addEventListener("error", ev => {
  const main = document.querySelector("main");
  if (main && !main.children.length) showViewError(ev.error || ev.message);
});
window.addEventListener("unhandledrejection", ev => {
  const main = document.querySelector("main");
  if (main && !main.children.length) showViewError(ev.reason);
});


// ================= v0.8: praca na telefonie =================
// Baner „serwer zatrzymany" + automatyczne wznowienie po powrocie do aplikacji
let DOWN_BAR = null;

let RECONNECT_TIMER = null;
let RECONNECT_TRIES = 0;

function serverDown() {
  if (!DOWN_BAR) {
    DOWN_BAR = el("div", { class: "down-bar" },
      el("div", { class: "down-txt" },
        el("b", {}, "⏸ Aplikacja uśpiona przez system"),
        el("div", { class: "small", id: "downmsg" },
          "Próbuję wznowić połączenie… Jeśli to nie pomoże, wróć do Pydroid 3 / Termux i naciśnij ▶.")),
      el("button", { class: "btn", onclick: () => retryConnection(true) }, "🔄 Ponów teraz"));
    document.body.append(DOWN_BAR);
  }
  startAutoReconnect();
}

function serverUp() {
  RECONNECT_TRIES = 0;
  if (RECONNECT_TIMER) { clearTimeout(RECONNECT_TIMER); RECONNECT_TIMER = null; }
  if (DOWN_BAR) { DOWN_BAR.remove(); DOWN_BAR = null; }
}

// samoczynne wznawianie: próbuje co 2–10 s, aż serwer wróci
function startAutoReconnect() {
  if (RECONNECT_TIMER) return;
  const tick = async () => {
    RECONNECT_TIMER = null;
    if (document.hidden) { RECONNECT_TIMER = setTimeout(tick, 4000); return; }
    RECONNECT_TRIES++;
    const alive = await isAlive(3500);
    const msg = document.getElementById("downmsg");
    if (alive) {
      if (msg) msg.textContent = "Połączono ponownie — odświeżam…";
      serverUp();
      restoreView();
      return;
    }
    if (msg) {
      msg.textContent = RECONNECT_TRIES < 4
        ? `Próbuję wznowić połączenie… (próba ${RECONNECT_TRIES})`
        : "Serwer nie odpowiada. Wróć do Pydroid 3 / Termux i naciśnij ▶ (start), " +
          "a potem wróć tutaj — reszta wznowi się sama.";
    }
    RECONNECT_TIMER = setTimeout(tick, Math.min(2000 + RECONNECT_TRIES * 1500, 10000));
  };
  RECONNECT_TIMER = setTimeout(tick, 1500);
}

async function isAlive(timeout = 4000) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeout);
    const r = await fetch("/api/ping", { signal: ctrl.signal, cache: "no-store" });
    return r.ok;
  } catch (e) { return false; }
}

// wraca do tego samego miejsca w aplikacji po wznowieniu serwera
function restoreView() {
  const hash = location.hash || "#dashboard";
  sessionStorage.setItem("lf_resume", hash);
  location.reload();
}

async function retryConnection(manual) {
  if (await isAlive(4000)) { serverUp(); restoreView(); }
  else if (manual) toast("Serwer nadal nie odpowiada — uruchom go ponownie (▶)", true);
}

async function pingServer() {
  if (await isAlive(5000)) serverUp(); else serverDown();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) pingServer(); });
window.addEventListener("focus", pingServer);
window.addEventListener("pageshow", e => { if (e.persisted) pingServer(); });

// utrzymanie połączenia w trakcie nauki (co 25 s, tylko gdy ekran aktywny)
setInterval(() => { if (!document.hidden) isAlive(6000).then(ok => ok ? serverUp() : serverDown()); }, 25000);

// ekran nie gaśnie w trakcie nauki (jeśli przeglądarka to wspiera)
let WAKE = null;
async function keepAwake() {
  try {
    if ("wakeLock" in navigator && !WAKE) WAKE = await navigator.wakeLock.request("screen");
  } catch (e) { /* brak wsparcia — pomijamy */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) keepAwake(); });
document.addEventListener("click", keepAwake, { once: true });

// rejestracja service workera — potrzebna, by Chrome pozwolił zainstalować aplikację
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// przycisk instalacji, gdy przeglądarka ją zaoferuje
let INSTALL_PROMPT = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  INSTALL_PROMPT = e;
  const b = document.getElementById("installbtn");
  if (b) b.style.display = "";
});
async function installApp() {
  if (!INSTALL_PROMPT) {
    toast("Użyj menu przeglądarki: ⋮ → Zainstaluj aplikację / Dodaj do ekranu głównego", true);
    return;
  }
  INSTALL_PROMPT.prompt();
  await INSTALL_PROMPT.userChoice;
  INSTALL_PROMPT = null;
}


// ================= v1.0: ustawienia zachowań aplikacji =================
const LFSET = {
  get(key, def) {
    const v = localStorage.getItem("lf_" + key);
    return v === null ? def : v === "1";
  },
  set(key, val) {
    localStorage.setItem("lf_" + key, val ? "1" : "0");
    API.post("/api/settings", { [key]: !!val }).catch(() => {});
  },
};

// ustawienia tekstowe (np. kierunek tłumaczenia)
function LFSET_str(key, def) {
  try { return localStorage.getItem("lf_" + key) || def; } catch (e) { return def; }
}
function LFSET_setStr(key, val) {
  try { localStorage.setItem("lf_" + key, val); } catch (e) {}
  API.post("/api/settings", { [key]: val }).catch(() => {});
}

// krótka wibracja przy dotknięciu — daje wrażenie natywnej aplikacji
function haptic(kind = "tap") {
  if (!LFSET.get("haptics", true) || !navigator.vibrate) return;
  navigator.vibrate({ tap: 8, good: [12, 40, 18], bad: [30, 40, 30] }[kind] || 8);
}

// automatyczne czytanie odpowiedzi (można wyciszyć)
function speakAuto(text, lang = "en") {
  if (!text || !LFSET.get("tts_auto", true)) return;
  speak(text, undefined, lang, true);   // automat: bez ostrzeżeń, gdy telefon zignoruje
}

// przełącznik głośnika — wstawiany w paskach zadań
function muteButton() {
  const b = el("button", { class: "mute-btn", title: "Czytanie na głos" }, "");
  const paint = () => { b.textContent = LFSET.get("tts_auto", true) ? "🔊" : "🔇"; };
  b.onclick = e => {
    e.stopPropagation();
    LFSET.set("tts_auto", !LFSET.get("tts_auto", true));
    paint();
    haptic();
    toast(LFSET.get("tts_auto", true) ? "Lektor włączony" : "Lektor wyciszony");
  };
  paint();
  return b;
}


// ================= v1.3: pole tekstowe zawsze widoczne nad klawiaturą =================
// Na telefonie klawiatura ekranowa zasłaniała pole, w którym się pisze — nie było
// widać wpisywanego tekstu. Po pojawieniu się klawiatury przewijamy pole do widoku.
function keepInputVisible(target) {
  if (!target) return;
  setTimeout(() => {
    try { target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
  }, 320);   // opóźnienie na animację wysuwania klawiatury
}
document.addEventListener("focusin", e => {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) keepInputVisible(t);
});
// gdy klawiatura zmienia wysokość widocznego obszaru (Android), ponawiamy przewinięcie
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) keepInputVisible(a);
  });
}
