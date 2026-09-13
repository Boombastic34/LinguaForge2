// ============================================================
// WERSJA 2 — aplikacja przebudowana wg dokumentu „System nauki języka".
// Wersja 1 (klasyczna) działa dalej bez zmian; przełącznik jest w ustawieniach.
//
// Czym się różni:
//   • ekran główny odpowiada na jedno pytanie „co teraz?" — jedna karta i jeden przycisk,
//   • sesja ma łuk: rozgrzewka → nowe → mieszanka → użycie → błyskawica → zamknięcie,
//   • zadania są przeplatane, słownictwo mieszane między tematami,
//   • zapominanie pokazujemy jako „rdzę" (nazwana rzecz), nie listę zaległości,
//   • faza 0: wymowa (minimalne pary) przed resztą materiału,
//   • sesja kończy się rundą na czas i zapowiedzią jutra.
// ============================================================

// wersja interfejsu trzymana jako ustawienie tekstowe („1" albo „2")
function v2On() { return LFSET_str("ui_version", "1") === "2"; }

// klasa na <body> — wersja 2 ma własną paletę (ciepłe tło, jeden akcent)
function applyV2Class() {
  document.body.classList.toggle("v2", v2On());
}


// ============================================================
// ONBOARDING WERSJI 2 — cel przed poziomem, potem czas, potem test.
// Test jest adaptacyjny (dwie pomyłki z rzędu na progu → schodzimy niżej) i kończy się
// MAPĄ umiejętności, nie oceną. Tematy zdane w teście są pomijane na Ścieżce.
// ============================================================
async function runOnboarding() {
  const d = await API.get("/api/v2/onboarding");
  if (d.step === "goal") return onbGoal(d);
  if (d.step === "time") return onbTime(d);
  if (d.step === "test") return onbTest();
  return onbResult(d.map);
}

function onbShell(step, total, title, sub) {
  clearMain();
  const main = document.querySelector("main");
  main.append(el("div", { class: "onb-top" },
    el("div", { class: "onb-dots" }, ...Array.from({ length: total }, (_, k) =>
      el("span", { class: "onb-dot" + (k < step ? " on" : "") }))),
    el("h2", { class: "v2-title" }, title),
    el("p", { class: "muted" }, sub)));
  const box = el("div", { class: "card" });
  main.append(box);
  return box;
}

// EKRAN 1 — po co Ci ten język (przed jakimkolwiek testem: autonomia przed oceną)
function onbGoal(d) {
  const box = onbShell(1, 3, "Po co Ci angielski?",
    "Od tego zależą wszystkie przykłady, słówka i rozmowy. Możesz to zmienić w każdej chwili.");
  d.goals.forEach(g => box.append(el("button", { class: "onb-opt", onclick: async () => {
    await API.post("/api/v2/onboarding/goal", { goal: g.id });
    haptic("good"); runOnboarding();
  } },
    el("span", { class: "onb-emoji" }, g.emoji),
    el("div", {}, el("b", {}, g.name), el("div", { class: "muted small" }, g.desc)))));
}

// EKRAN 2 — ile czasu dziennie (małe zobowiązanie zamiast ambitnego postanowienia)
function onbTime(d) {
  const box = onbShell(2, 3, "Ile czasu dziennie?",
    "Lepiej mało i codziennie niż dużo raz w tygodniu.");
  d.times.forEach(t => box.append(el("button", { class: "onb-opt" + (t.id === 15 ? " onb-rec" : ""), onclick: async () => {
    await API.post("/api/v2/onboarding/time", { minutes: t.id });
    haptic("good"); runOnboarding();
  } },
    el("span", { class: "onb-emoji" }, t.id === 5 ? "🌱" : t.id === 15 ? "⭐" : "🔥"),
    el("div", {}, el("b", {}, t.name), el("div", { class: "muted small" }, t.desc)))));
  box.append(el("div", { class: "v2-why" },
    "15 minut dziennie przez rok to więcej niż 3 godziny raz w tygodniu — nie dlatego, " +
    "że to więcej minut, tylko dlatego, że pamięć buduje się na powtórkach rozłożonych w czasie."));
}

// EKRAN 3 — test adaptacyjny (4 bloki, 7–10 minut)
async function onbTest() {
  const t = await API.get("/api/v2/onboarding/test");
  const box = onbShell(3, 3, "Krótki test", "Nie oceniamy Cię — sprawdzamy, co możemy pominąć.");
  const answers = {}, bands = {};
  let queue = [], i = 0;

  // adaptacja słownictwa: progi po kolei, dwie pomyłki na progu = koniec wspinaczki
  const byBand = {};
  t.vocab.forEach(q => (byBand[q.band] = byBand[q.band] || []).push(q));
  let band = 0, bandMiss = 0;
  // adaptacja gramatyki: idziemy po kolei programu, dwa błędne tematy z rzędu = stop
  const gTopics = [];
  t.grammar.forEach(q => {
    const g = gTopics.find(x => x.topic === q.topic) || (gTopics.push({ topic: q.topic, qs: [] }), gTopics[gTopics.length - 1]);
    g.qs.push(q);
  });
  let gi = 0, gMiss = 0;

  function nextQuestion() {
    if (byBand[band] && byBand[band].length) return byBand[band].shift();
    if (gi < gTopics.length) { const g = gTopics[gi]; if (g.qs.length) return g.qs.shift(); gi++; return nextQuestion(); }
    if (t.listen.length) return t.listen.shift();
    if (t.produce.length) return t.produce.shift();
    return null;
  }

  function render() {
    const q = nextQuestion();
    if (!q) return finish();
    box.innerHTML = "";
    const total = 18;
    box.append(el("div", { class: "onb-prog" },
      el("div", { class: "onb-progfill", style: `width:${Math.min(100, Math.round(100 * i / total))}%` })));
    box.append(el("div", { class: "v2-crumb" },
      { vocab: "Słownictwo", grammar: "Gramatyka", listen: "Słuchanie", produce: "Pisanie" }[q.kind]));
    if (q.kind === "listen") {
      const say = () => speak(q.tts);
      box.append(el("div", { class: "qtext" }, q.text),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")));
      say();
    } else {
      box.append(el("div", { class: "qtext" }, q.text));
    }
    if (q.options) {
      const opts = el("div", { class: "options" });
      q.options.forEach((o, k) => opts.append(el("button", { class: "option", onclick: () => mark(q, k === q.answer) }, o)));
      box.append(opts);
    } else {
      const inp = el("input", { class: "input", autocomplete: "off", spellcheck: "false", placeholder: "po angielsku…" });
      const send = el("button", { class: "btn ok", onclick: () =>
        mark(q, answersMatch(inp.value, q.answer, { lang: "en", strict: true })) }, "Sprawdź ⏎");
      inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); send.click(); } };
      box.append(inp, el("div", { class: "fb-btns" }, send));
      inp.focus();
    }
    // „nie wiem" jest zawsze — zgadywanie zafałszowałoby mapę
    box.append(el("div", { class: "fb-btns" },
      el("button", { class: "btn ghost", onclick: () => mark(q, false) }, "🤷 Nie wiem")));
  }

  // w teście NIE pokazujemy poprawnych odpowiedzi — to jeszcze nie jest nauka
  function mark(q, ok) {
    answers[q.id] = ok;
    if (q.kind === "vocab") {
      bands[q.id] = q.band;
      if (!ok) bandMiss++;
      if (bandMiss >= 2) { delete byBand[band]; band = 99; }       // przestajemy się wspinać
      else if (byBand[band] && !byBand[band].length) { band++; bandMiss = 0; }
    }
    if (q.kind === "grammar") {
      const g = gTopics[gi];
      if (g && !g.qs.length) {
        const both = Object.entries(answers).filter(([id]) => id.startsWith("g_" + g.topic));
        gMiss = both.every(([, v]) => v) ? 0 : gMiss + 1;
        gi++;
        if (gMiss >= 2) gi = gTopics.length;                       // dwa tematy z rzędu nie wyszły
      }
    }
    i++;
    haptic();
    render();
  }

  async function finish() {
    box.innerHTML = "";
    box.append(el("p", { class: "muted" }, "Układam Twoją mapę…"));
    const map = await API.post("/api/v2/onboarding/result", { answers, bands });
    onbResult(map);
  }
  render();
}

// EKRAN 4 — wynik jako MAPA: co umiesz, co pomijamy, ile czasu to oszczędza
function onbResult(m) {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("🗺️", "Umiesz już całkiem sporo",
    `Znasz około ${m.words} słów · poziom ${m.level}`, "violet"));
  const box = el("div", { class: "card" });
  main.append(box);
  if (m.strong.length)
    box.append(el("div", { class: "onb-block onb-strong" },
      el("b", {}, "✔ To już umiesz — pomijamy"),
      el("div", { class: "onb-chips" }, ...m.strong.map(t => el("span", { class: "onb-chip" }, t.emoji + " " + t.name)))));
  if (m.weak.length)
    box.append(el("div", { class: "onb-block onb-weak" },
      el("b", {}, "◐ Do poprawy"),
      el("div", { class: "onb-chips" }, ...m.weak.map(t => el("span", { class: "onb-chip" }, t.emoji + " " + t.name)))));
  box.append(el("div", { class: "onb-block" },
    el("b", {}, "Największa dziura"),
    el("div", { class: "muted" }, m.biggest_gap)));
  if (m.saved_days > 0)
    box.append(el("div", { class: "onb-saved" },
      `⏱ Pominięliśmy ${m.skipped} ogniw. Zaoszczędziłeś około ${m.saved_days} dni nauki.`));
  box.append(el("div", { class: "onb-block" },
    el("b", {}, "Zaczynamy od:"),
    el("div", { class: "muted" }, m.first ? m.first.emoji + " " + m.first.name : "wymowy — od ucha")),
    el("button", { class: "v2-start", onclick: viewToday }, "Zaczynamy →"));
}

// ---------- EKRAN GŁÓWNY ----------
async function viewToday() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/v2/today");
  if (d.onboarding) return runOnboarding();     // najpierw poznajemy ucznia

  // 1. pasek stanu — celowo cichy i szary: to informacja, nie nagroda
  main.append(el("div", { class: "v2-status" },
    el("span", { class: "v2-streak" }, "🔥 " + d.streak),
    el("div", { class: "v2-goalbar" },
      el("div", { class: "v2-goalfill", style: `width:${Math.min(100, Math.round(100 * d.goal.done / Math.max(1, d.goal.target)))}%` })),
    el("span", { class: "v2-goaltext" }, `${d.goal.done}/${d.goal.target}`)));

  // 2. karta „Dziś" — dominanta ekranu, jeden przycisk w kolorze akcentu
  const m = d.main;
  const card = el("div", { class: "v2-today" },
    el("div", { class: "v2-kicker" }, m.type === "pron" ? "Faza 0 · wymowa" : d.day.name),
    el("h2", { class: "v2-title" }, m.title),
    el("div", { class: "v2-sub" }, m.subtitle),
    el("div", { class: "v2-parts" },
      el("span", { class: "v2-min" }, m.minutes + " minut"),
      el("span", { class: "v2-dot" }, "·"),
      m.parts.join(" · ")),
    m.steps ? el("div", { class: "v2-steps" },
      el("div", { class: "v2-stepbar" },
        el("div", { class: "v2-stepfill", style: `width:${Math.round(100 * (m.step - 1) / m.steps)}%` })),
      el("span", { class: "muted small" }, `${m.step} z ${m.steps}`)) : null,
    m.why ? el("div", { class: "v2-why" }, m.why) : null,
    el("button", { class: "v2-start", onclick: () => m.type === "pron" ? runPron(m.id) : runDaySession() },
      "Zacznij →"));
  main.append(card);

  // 3. trzy małe kafelki — neutralne, z czasem w minutach
  const row = el("div", { class: "v2-tiles" });
  row.append(el("button", { class: "v2-tile", onclick: () => viewFlashcards() },
    el("div", { class: "v2-tile-ico" }, "🔁"),
    el("b", {}, d.review.due ? d.review.due + " powtórek" : "Brak powtórek"),
    el("div", { class: "muted small" }, d.review.due ? d.review.minutes + " min" : "wróć jutro")));
  // rdza: nazwana rzecz do uratowania, nie liczba długów
  row.append(d.rust
    ? el("button", { class: "v2-tile v2-rust", onclick: () => viewFlashcards("all", d.rust.theme) },
        el("div", { class: "v2-tile-ico" }, "⚠️"),
        el("b", {}, d.rust.name),
        el("div", { class: "muted small" }, d.rust.label + " · " + d.rust.n + " słów"))
    : el("div", { class: "v2-tile v2-tile-off" },
        el("div", { class: "v2-tile-ico" }, "✨"),
        el("b", {}, "Nic nie rdzewieje"),
        el("div", { class: "muted small" }, "wszystko świeże")));
  row.append(el("button", { class: "v2-tile", onclick: () => { location.hash = d.light.hash; } },
    el("div", { class: "v2-tile-ico" }, d.light.emoji),
    el("b", {}, d.light.name),
    el("div", { class: "muted small" }, d.light.minutes + " min")));
  main.append(row);

  if (d.tuning && d.tuning.level !== 0)
    main.append(el("div", { class: "v2-tune" }, "🎚 " + d.tuning.label));
  main.append(el("div", { class: "v2-foot" },
    el("button", { class: "btn ghost mini", onclick: viewProgress }, "📈 Czy to działa?"),
    el("button", { class: "btn ghost mini", onclick: () => { location.hash = "#more"; } }, "☰ Moduły"),
    el("button", { class: "btn ghost mini", onclick: switchVersion }, "↔ Wróć do wersji 1")));
}

async function switchVersion() {
  const to = v2On() ? 1 : 2;
  LFSET_setStr("ui_version", String(to));
  await API.post("/api/settings", { ui_version: to }).catch(() => {});
  applyV2Class();
  toast(to === 2 ? "Włączono wersję 2" : "Wróciłeś do wersji 1");
  location.hash = to === 2 ? "#today" : "#dashboard";
  setTimeout(() => location.reload(), 300);
}


// ============================================================
// PANEL SKUTECZNOŚCI — miary, które mówią prawdę o nauce.
// Świadomie NIE pokazujemy tu czasu w aplikacji ani liczby kliknięć: te rosną nawet wtedy,
// gdy nauka stoi. Pokazujemy pamięć trwałą, wielkość słownika, tempo i transfer.
// ============================================================
async function viewProgress() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/v2/progress");
  main.append(hero("📈", "Czy to działa?",
    "Pięć miar, które pokazują naukę — a nie czas spędzony w aplikacji", "violet"));

  // 1. RETENCJA — jedyna uczciwa miara pamięci trwałej
  const r = d.retention;
  const rbox = el("div", { class: "card" },
    el("h3", {}, "1. Pamięć trwała"),
    el("p", { class: "muted small" },
      "Ile pamiętasz ze słów, których nie widziałeś od co najmniej 21 dni. To jedyna miara, " +
      "której nie da się oszukać świeżą powtórką."));
  if (r.last) {
    rbox.append(el("div", { class: "pg-big" }, Math.round(r.last.retention * 100) + "%"),
      el("div", { class: "muted small" },
        `ostatni test kontrolny: ${r.last.date} · ${r.last.n} słów · ${r.days_since} dni temu`));
    if (r.history.length > 1) rbox.append(sparkline(r.history.map(h => h.retention), "retencja"));
  } else {
    rbox.append(el("p", {}, "Jeszcze nie było testu kontrolnego."));
  }
  rbox.append(r.ready || r.available >= 4
    ? el("button", { class: "btn primary", onclick: runCheckup }, "▶ Zrób test kontrolny")
    : el("div", { class: "muted small" },
        `Test będzie możliwy, gdy uzbiera się materiał sprzed 21 dni (masz ${r.available} z ${r.need}).`));
  main.append(rbox);

  // 2. SŁOWNIK — nie „ile fiszek", tylko ile słów z progów częstotliwości
  const w = d.words;
  const wbox = el("div", { class: "card" },
    el("h3", {}, "2. Wielkość słownika"),
    el("div", { class: "pg-big" }, "≈ " + w.value + " słów"),
    el("p", { class: "muted small" },
      `Opanowanych fiszek: ${w.mature_cards} z ${w.all_cards}. Szacunek liczony przez progi ` +
      "częstotliwości, tak samo jak w teście wstępnym — dlatego liczby są porównywalne w czasie."));
  w.bands.forEach(b => wbox.append(el("div", { class: "pg-band" },
    el("span", { class: "pg-band-name" }, b.band),
    el("div", { class: "pg-bar" }, el("div", { class: "pg-fill", style: `width:${Math.round(b.share * 100)}%` })),
    el("span", { class: "pg-band-val" }, Math.round(b.share * 100) + "%"))));
  main.append(wbox);

  // 3. TEMPO — płynność, nie wiedza
  const sp = d.speed;
  main.append(el("div", { class: "card" },
    el("h3", {}, "3. Tempo odpowiedzi"),
    el("div", { class: "pg-big" }, sp.median_ms ? (sp.median_ms / 1000).toFixed(1) + " s" : "—"),
    el("p", { class: "muted small" },
      sp.median_ms
        ? `Mediana z ${sp.samples} poprawnych odpowiedzi. Spadek tempa przy tej samej ` +
          "skuteczności oznacza automatyzację — czyli realną płynność."
        : "Potrzeba kilku sesji, żeby to policzyć.")));

  // 3b. TEMPO MOWY — z ćwiczeń 4/3/2
  const fl = d.fluency || { sessions: 0 };
  main.append(el("div", { class: "card" },
    el("h3", {}, "4. Tempo mowy"),
    el("div", { class: "pg-big" }, fl.wpm ? fl.wpm + " słów/min" : "—"),
    el("p", { class: "muted small" },
      fl.sessions
        ? `Z ${fl.sessions} ćwiczeń 4/3/2. Pierwszy wynik: ${fl.first} · rekord: ${fl.best}. ` +
          "Wzrost przy tej samej treści to płynność, nie wiedza."
        : "Zrób ćwiczenie 4/3/2, żeby zmierzyć tempo mowy."),
    fl.history && fl.history.length > 1
      ? sparkline(fl.history.map(h => Math.min(1, h.wpm / 150)), "tempo mowy") : null,
    el("button", { class: "btn ghost", onclick: viewFluency }, "🗣 Ćwiczenia płynności")));

  // 5 i 6. TRANSFER I PORÓWNANIE WERSJI
  const vb = el("div", { class: "card" },
    el("h3", {}, "5. Transfer i porównanie wersji"),
    el("p", { class: "muted small" },
      "Transfer = skuteczność w zadaniach trudniejszych niż rozpoznanie (wpisywanie, zdanie, słuch). " +
      "To najostrzejszy test tego, czy uczysz się języka, czy aplikacji."));
  const tbl = el("div", { class: "pg-table" },
    el("div", { class: "pg-row pg-head" }, el("span", {}, ""), el("span", {}, "Wersja 1"), el("span", {}, "Wersja 2")));
  const row = (name, f) => tbl.append(el("div", { class: "pg-row" },
    el("span", {}, name), el("span", {}, f(d.versions.v1)), el("span", {}, f(d.versions.v2))));
  row("Odpowiedzi", v => v.answers || "—");
  row("Skuteczność", v => v.acc === null ? "—" : Math.round(v.acc * 100) + "%");
  row("Transfer", v => v.transfer === null ? "—" : Math.round(v.transfer * 100) + "%");
  row("Czas nauki", v => v.minutes ? v.minutes + " min" : "—");
  vb.append(tbl, el("p", { class: "muted small", style: "margin-top:10px" },
    "Porównuj dopiero po kilkuset odpowiedziach w obu wersjach — wcześniej różnice to szum."));
  main.append(vb);

  main.append(el("div", { class: "v2-foot" },
    el("button", { class: "btn ghost mini", onclick: viewToday }, "← Ekran główny")));
}

// prosty wykres liniowy z historii testów kontrolnych
function sparkline(values, label) {
  const w = 260, h = 54, max = 1, min = 0;
  const pts = values.map((v, i) =>
    `${(i / Math.max(1, values.length - 1)) * (w - 8) + 4},${h - 6 - ((v - min) / (max - min)) * (h - 14)}`);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("class", "pg-spark");
  svg.innerHTML = `<polyline points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>` +
    pts.map(p => `<circle cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="3" fill="currentColor"/>`).join("");
  return el("div", { class: "pg-sparkbox" }, svg, el("span", { class: "muted small" }, label));
}

// TEST KONTROLNY — tylko słowa niewidziane od ≥21 dni
async function runCheckup() {
  let d;
  try { d = await API.get("/api/v2/checkup"); }
  catch (e) { return toast(String(e.message || e), true); }
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  enterFocus({ title: "🧪 Test kontrolny", subtitle: `${d.tasks.length} słów sprzed ${d.min_days}+ dni`,
    theme: "violet", onExit: () => { exitFocus(); viewProgress(); } });
  let i = 0, good = 0;
  render();
  function render() {
    if (i >= d.tasks.length) return finish();
    const q = d.tasks[i];
    box.innerHTML = "";
    focusProgress(i, d.tasks.length, "");
    box.append(el("div", { class: "v2-crumb" }, `nie widziałeś tego od ${q.days} dni`),
      el("div", { class: "qtext" }, q.text));
    const opts = el("div", { class: "options" });
    q.options.forEach((o, k) => opts.append(el("button", { class: "option", onclick: () => {
      if (k === q.answer) good++;
      haptic(k === q.answer ? "good" : "bad");
      i++; render();                       // bez informacji zwrotnej — to pomiar, nie nauka
    } }, o)));
    box.append(opts, el("div", { class: "fb-btns" },
      el("button", { class: "btn ghost", onclick: () => { i++; render(); } }, "🤷 Nie wiem")));
  }
  async function finish() {
    const r = await API.post("/api/v2/checkup", { correct: good, total: d.tasks.length });
    exitFocus();
    clearMain();
    const m2 = document.querySelector("main");
    const pct = Math.round(r.retention * 100);
    m2.append(hero("🧪", "Pamięć trwała: " + pct + "%",
      `${good} z ${d.tasks.length} słów sprzed ${d.min_days}+ dni`, "violet"));
    const card = el("div", { class: "card" },
      el("p", {}, pct >= 80
        ? "Bardzo dobry wynik — powtórki są dobrze rozłożone."
        : pct >= 60
          ? "Przyzwoicie. Warto robić powtórki regularniej, zanim słowa zdążą wyblaknąć."
          : "Sporo wyparowało. To znak, że robisz za dużo nowego, a za mało powtórek."),
      r.prev ? el("p", { class: "muted" },
        `Poprzedni test (${r.prev.date}): ${Math.round(r.prev.retention * 100)}% · ` +
        `słownik ${r.prev.words} → ${r.words}`) : null,
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: viewProgress }, "→ Panel skuteczności")));
    m2.append(card);
  }
}


// ============================================================
// PŁYNNOŚĆ — 4/3/2 i shadowing.
// Płynność to automatyzacja, nie wiedza: nie da się jej osiągnąć przez zrozumienie,
// tylko przez powtórzenie pod presją czasu. Dlatego tu NIE oceniamy poprawności ani
// akcentu — liczy się tempo i to, czy udało się powiedzieć całość.
// ============================================================
async function viewFluency() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/v2/fluency");
  main.append(hero("🗣", "Płynność",
    "Mówienie tego, co już umiesz — coraz szybciej i bez wahania", "violet"));

  main.append(el("div", { class: "card" },
    el("h3", {}, "🔁 4 / 3 / 2"),
    el("p", { class: "muted small" },
      "Opowiadasz to samo trzy razy: najpierw w 4 minuty, potem w 3, na końcu w 2. " +
      "Ta sama treść, coraz mniej czasu — nie ma kiedy tłumaczyć w głowie, więc mózg " +
      "zaczyna sięgać po gotowe zwroty. To jedno z najlepiej zbadanych ćwiczeń płynności."),
    d.best_wpm ? el("div", { class: "fl-best" }, "Twój rekord tempa: " + d.best_wpm + " słów/min") : null,
    ...d.topics.map(t => el("button", { class: "fl-item" + (t.done ? " fl-done" : ""),
      onclick: () => run432(t, d.rounds) },
      el("span", { class: "fl-emoji" }, t.emoji),
      el("div", {}, el("b", {}, t.pl),
        el("div", { class: "muted small" }, t.en + " · " + t.level)),
      t.done ? el("span", { class: "badge ok-badge" }, "✓") : null))));

  main.append(el("div", { class: "card" },
    el("h3", {}, "🎧 Shadowing"),
    el("p", { class: "muted small" },
      "Powtarzasz za nagraniem prawie równocześnie, nie czekając na koniec zdania. " +
      "Trenuje rytm i łączenia międzywyrazowe — czyli dokładnie to, co sprawia, że " +
      "native brzmi „za szybko”."),
    ...d.passages.map(p => el("button", { class: "fl-item" + (p.done ? " fl-done" : ""),
      onclick: () => runShadow(p.id) },
      el("span", { class: "fl-emoji" }, p.emoji),
      el("div", {}, el("b", {}, p.name),
        el("div", { class: "muted small" }, p.lines.length + " zdań · " + p.level)),
      p.done ? el("span", { class: "badge ok-badge" }, "✓") : null))));

  main.append(el("div", { class: "v2-foot" },
    el("button", { class: "btn ghost mini", onclick: viewToday }, "← Ekran główny")));
}

// ---------- 4/3/2 ----------
function run432(topic, rounds) {
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  enterFocus({ title: "🔁 4 / 3 / 2", subtitle: topic.pl, theme: "violet",
    onExit: () => { stopRec(); clearInterval(TIMER); exitFocus(); viewFluency(); } });
  let round = 0;
  const results = [];
  let rec = null, words = 0, TIMER = null;

  function stopRec() { if (rec) { try { rec.stop(); } catch (e) {} rec = null; } }

  intro();

  function intro() {
    box.innerHTML = "";
    box.append(
      el("div", { class: "qtext" }, topic.pl),
      el("div", { class: "muted", style: "margin-bottom:10px" }, topic.en),
      el("div", { class: "fl-help" },
        el("b", {}, "Przydatne początki zdań:"),
        ...topic.phrases.map(([en, pl]) => el("div", { class: "fl-phrase" },
          el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊"),
          el("b", {}, en), el("span", { class: "muted small" }, " — " + pl)))),
      el("div", { class: "fl-help" },
        el("b", {}, "Powiedz o:"),
        el("ul", { class: "fl-hints" }, ...topic.hints.map(h => el("li", {}, h)))),
      el("div", { class: "v2-why" },
        "Zasada: mówisz na głos przez cały czas rundy. Nie zatrzymuj się, żeby szukać słowa — " +
        "opisz je inaczej i idź dalej. Za każdym razem opowiadasz TO SAMO, tylko szybciej."),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big", onclick: startRound }, "▶ Runda 1 — 4 minuty")));
  }

  function startRound() {
    const secs = rounds[round];
    words = 0;
    box.innerHTML = "";
    const bar = el("div", { class: "fl-timer" }, el("div", { class: "fl-timerfill" }));
    const clock = el("div", { class: "fl-clock" }, fmt(secs));
    const counter = el("div", { class: "fl-counter" }, "");
    box.append(el("div", { class: "v2-crumb" }, `Runda ${round + 1} z ${rounds.length}`),
      el("div", { class: "qtext" }, topic.pl), clock, bar, counter,
      el("div", { class: "fl-mini" }, ...topic.hints.map(h => el("span", { class: "fl-chip" }, h))),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn ghost", onclick: () => finishRound(secs) }, "Skończyłem wcześniej")));

    // liczymy słowa mikrofonem, jeśli przeglądarka to potrafi; jeśli nie — pytamy ucznia
    if (speechSupported()) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      try {
        rec = new SR();
        rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
        let finalWords = 0;
        rec.onresult = ev => {
          let interim = 0;
          for (let k = ev.resultIndex; k < ev.results.length; k++) {
            const n = ev.results[k][0].transcript.trim().split(/\s+/).filter(Boolean).length;
            if (ev.results[k].isFinal) finalWords += n; else interim = n;
          }
          words = finalWords + interim;
          counter.textContent = words + " słów";
        };
        rec.onerror = () => { counter.textContent = "(mikrofon niedostępny — policzymy inaczej)"; };
        rec.start();
        counter.textContent = "0 słów";
      } catch (e) { rec = null; }
    } else {
      counter.textContent = "Mów na głos — po rundzie ocenisz sam, ile udało się powiedzieć.";
    }

    let left = secs;
    clearInterval(TIMER);
    TIMER = setInterval(() => {
      left--;
      clock.textContent = fmt(left);
      bar.firstChild.style.width = (100 * left / secs) + "%";
      if (left <= 10) clock.classList.add("fl-hurry");
      if (left <= 0) finishRound(secs);
    }, 1000);
  }

  function finishRound(secs) {
    clearInterval(TIMER);
    stopRec();
    const spoken = words;
    box.innerHTML = "";
    const rec_ = { seconds: secs, words: spoken };
    const wpm = Math.round(spoken / (secs / 60));
    const done = () => {
      results.push(rec_);
      round++;
      if (round >= rounds.length) return finishAll();
      box.innerHTML = "";
      box.append(el("div", { class: "qtext" }, `Runda ${round + 1}: ta sama historia w ${rounds[round] / 60} minuty`),
        el("p", { class: "muted" },
          "Nie dodawaj nowych wątków — powiedz dokładnie to samo, tylko szybciej i pewniej."),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big", onclick: startRound }, "▶ Zaczynam")));
    };
    if (spoken) {
      box.append(el("div", { class: "feedback fb-good" },
        el("div", { class: "fb-head" }, "✔ Runda " + (round + 1) + " za Tobą"),
        el("div", {}, `${spoken} słów w ${secs / 60} min · tempo ${wpm} słów/min`)),
        el("div", { class: "fb-btns" }, el("button", { class: "btn primary", onclick: done }, "Dalej →")));
    } else {
      // brak mikrofonu — uczeń sam ocenia, ile zdążył powiedzieć
      box.append(el("div", { class: "qtext" }, "Ile udało Ci się powiedzieć?"),
        el("div", { class: "options" },
          ...[["Całą historię, ze spokojem", 130], ["Prawie całą", 100], ["Połowę", 70], ["Ledwo zacząłem", 40]]
            .map(([label, est]) => el("button", { class: "option", onclick: () => {
              rec_.words = Math.round(est * secs / 60); rec_.est = true; done();
            } }, label))));
    }
  }

  async function finishAll() {
    const r = await API.post("/api/v2/fluency/save",
      { mode: "432", topic: topic.id, rounds: results });
    exitFocus();
    clearMain();
    const m2 = document.querySelector("main");
    m2.append(hero("🗣", "Tempo: " + r.wpm + " słów/min",
      r.growth !== null && r.growth > 0
        ? `To o ${r.growth}% szybciej niż w pierwszej rundzie`
        : "Ta sama treść, trzy razy — o to właśnie chodziło", "violet"));
    const rows = el("div", { class: "pg-table" },
      el("div", { class: "pg-row pg-head" }, el("span", {}, "Runda"), el("span", {}, "Słowa"), el("span", {}, "Tempo")));
    results.forEach((x, k) => rows.append(el("div", { class: "pg-row" },
      el("span", {}, `${k + 1}. ${x.seconds / 60} min`),
      el("span", {}, x.words + (x.est ? "*" : "")),
      el("span", {}, Math.round(x.words / (x.seconds / 60)) + "/min"))));
    m2.append(el("div", { class: "card" }, rows,
      el("p", { class: "muted small", style: "margin-top:10px" },
        "Wzrost tempa przy tej samej treści to dokładnie to, co nazywamy płynnością — " +
        "mniej szukania słów, więcej gotowych zwrotów." +
        (results.some(x => x.est) ? " (*wynik szacowany — bez mikrofonu)" : "")),
      r.best_prev ? el("p", { class: "muted small" }, "Poprzedni rekord: " + r.best_prev + " słów/min") : null,
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: viewFluency }, "→ Płynność"),
        el("button", { class: "btn ghost", onclick: viewToday }, "Ekran główny"))));
  }

  function fmt(s) { return Math.floor(s / 60) + ":" + String(Math.max(0, s % 60)).padStart(2, "0"); }
}

// ---------- SHADOWING ----------
async function runShadow(pid) {
  const p = await API.get("/api/v2/fluency/passage/" + pid);
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  enterFocus({ title: "🎧 Shadowing", subtitle: p.name, theme: "violet", listening: true,
    onExit: () => { exitFocus(); viewFluency(); } });
  let i = 0, matched = 0;
  render();

  function render() {
    if (i >= p.lines.length) return finish();
    const [en, pl] = p.lines[i];
    box.innerHTML = "";
    focusProgress(i, p.lines.length, "");
    const say = () => speak(en);
    box.append(el("div", { class: "v2-crumb" }, `Zdanie ${i + 1} z ${p.lines.length}`),
      el("div", { class: "sp-pl" }, en),
      el("div", { class: "muted", style: "margin-bottom:10px" }, pl),
      el("div", { class: "v2-why" },
        "Odtwórz i mów RAZEM z nagraniem, pół sekundy za lektorem. Nie czekaj na koniec zdania. " +
        "Zacznij od wolniejszego tempa, potem przyspiesz."),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
        el("button", { class: "btn ghost", onclick: say }, "🔁 Jeszcze raz")),
      speedPicker(ttsRate(), say));
    const check = speakCheckButton(en, "en");
    if (check) box.append(check);
    box.append(el("div", { class: "fb-btns", style: "margin-top:10px" },
      el("button", { class: "btn ok", onclick: () => { matched++; i++; render(); } }, "✔ Nadążam — dalej"),
      el("button", { class: "btn ghost", onclick: () => { i++; render(); } }, "Trudne — dalej")));
    say();
  }

  async function finish() {
    await API.post("/api/v2/fluency/save",
      { mode: "shadow", topic: p.id, lines: p.lines.length, matched });
    exitFocus();
    clearMain();
    const m2 = document.querySelector("main");
    m2.append(hero("🎧", "Fragment przerobiony",
      `Nadążyłeś przy ${matched} z ${p.lines.length} zdań`, "violet"));
    m2.append(el("div", { class: "card" },
      el("p", {}, "Ten sam fragment warto powtórzyć jutro — przy drugim podejściu tempo " +
        "zwykle przestaje być problemem i zaczynasz słyszeć łączenia między słowami."),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => runShadow(pid) }, "🔁 Jeszcze raz"),
        el("button", { class: "btn ghost", onclick: viewFluency }, "← Płynność"))));
  }
}

// ---------- FAZA 0: WYMOWA (minimalne pary) ----------
// Uczymy ucha zanim zaczniemy uczyć języka: dopóki uczeń nie SŁYSZY różnicy,
// nie potrafi jej wymówić ani rozpoznać w zdaniu.
async function runPron(cid) {
  const c = await API.get("/api/v2/pron/" + cid);
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  enterFocus({ title: "🔊 " + c.name, subtitle: c.title, theme: "teal", listening: true,
    onExit: () => { exitFocus(); viewToday(); } });

  // krok 1: wyjaśnienie, po co to
  box.append(el("h3", {}, c.title),
    el("p", {}, c.why),
    el("div", { class: "v2-tip" }, "💡 " + c.tip),
    el("div", { class: "v2-pairs" }, ...c.pairs.map(p =>
      el("div", { class: "v2-pair" },
        el("button", { class: "v2-pw", onclick: () => speak(p[0]) }, "🔊 " + p[0]),
        el("span", { class: "muted small" }, p[1]),
        el("button", { class: "v2-pw", onclick: () => speak(p[2]) }, "🔊 " + p[2]),
        el("span", { class: "muted small" }, p[3])))),
    el("div", { class: "fb-btns", style: "margin-top:14px" },
      el("button", { class: "btn primary big", onclick: quiz }, "▶ Sprawdź, czy słyszysz różnicę"),
      // autonomia: kto ten kontrast ma opanowany, nie musi go przechodzić
      el("button", { class: "btn ghost", onclick: async () => {
        await API.post("/api/v2/pron/done", { id: c.id });
        toast("Pominięto — wróci w powtórkach");
        exitFocus(); viewToday();
      } }, "Znam to — pomiń")));

  // krok 2: test — słyszysz słowo, wybierasz które
  function quiz() {
    const items = [];
    c.pairs.forEach(p => { items.push({ w: p[0], o: [p[0], p[2]] }); items.push({ w: p[2], o: [p[0], p[2]] }); });
    items.sort(() => Math.random() - .5);
    let i = 0, good = 0;
    step();
    function step() {
      if (i >= items.length) return done();
      const it = items[i];
      box.innerHTML = "";
      focusProgress(i, items.length, `trafionych: ${good}`);
      const say = () => speak(it.w);
      box.append(el("div", { class: "qtext" }, "Które słowo słyszysz?"),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say));
      const opts = el("div", { class: "options" });
      it.o.forEach(o => opts.append(el("button", { class: "option", onclick: () => {
        const ok = o === it.w;
        if (ok) good++;
        haptic(ok ? "good" : "bad");
        box.innerHTML = "";
        box.append(el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
          el("div", { class: "fb-head" }, ok ? "✔ Dobrze!" : "✘ To było: " + it.w),
          el("div", { class: "fb-pair" },
            el("button", { class: "btn ghost mini", onclick: () => speak(it.o[0]) }, "🔊 " + it.o[0]), " ",
            el("button", { class: "btn ghost mini", onclick: () => speak(it.o[1]) }, "🔊 " + it.o[1])),
          el("div", { class: "muted small" }, c.tip)),
          el("div", { class: "fb-btns" },
            el("button", { class: "btn primary", onclick: () => { i++; step(); } }, "Dalej →")));
      } }, o)));
      box.append(opts);
      say();
    }
    async function done() {
      const pct = Math.round(100 * good / items.length);
      await API.post("/api/v2/pron/done", { id: c.id });
      exitFocus();
      clearMain();
      const m2 = document.querySelector("main");
      m2.append(hero(pct >= 75 ? "👂" : "🔁", pct >= 75 ? "Ucho ustawione" : "Jeszcze raz to przećwicz",
        `Trafionych: ${good} z ${items.length} (${pct}%)`, "teal"));
      m2.append(el("div", { class: "card" },
        el("p", {}, pct >= 75
          ? "Świetnie — ten kontrast masz opanowany. Wróci jeszcze w powtórkach."
          : "To normalne: mózg dorosłego musi się nauczyć słyszeć dźwięk, którego nie ma w polskim. Powtórz ten zestaw jutro."),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary", onclick: viewToday }, "→ Dalej"),
          el("button", { class: "btn ghost", onclick: () => runPron(c.id) }, "🔁 Jeszcze raz"))));
    }
  }
}

// ---------- SESJA DNIA (łuk) ----------
async function runDaySession() {
  const data = await API.get("/api/v2/session");
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  const tasks = data.tasks, plan = data.plan;
  let i = 0, good = 0, t0 = 0, timer = null, secLast = null;

  enterFocus({ title: data.title, subtitle: data.day.name, theme: "violet",
    onExit: () => { clearInterval(timer); exitFocus(); viewToday(); } });

  const sectionOf = idx => plan.find(p => idx >= p.from && idx < p.to) || plan[plan.length - 1];

  function render() {
    clearInterval(timer);
    if (i >= tasks.length) return finish();
    const sec = sectionOf(i);
    // między częściami sesji pokazujemy krótką planszę — uczeń wie, gdzie jest w łuku
    if (sec !== secLast) {
      secLast = sec;
      box.innerHTML = "";
      focusProgress(i, tasks.length, `poprawnych: ${good}`);
      box.append(el("div", { class: "v2-section" },
        el("div", { class: "v2-sec-step" }, `${plan.indexOf(sec) + 1} z ${plan.length}`),
        el("h3", {}, sec.name),
        el("p", { class: "muted" }, sec.why),
        sec.theory ? el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(sec.theory.topic) },
          "📘 Zobacz teorię: " + sec.theory.name) : null,
        el("button", { class: "btn primary big", onclick: () => { renderTask(); } }, "Dalej →")));
      return;
    }
    renderTask();
  }

  function renderTask() {
    const t = tasks[i], sec = sectionOf(i);
    t0 = Date.now();
    box.innerHTML = "";
    focusProgress(i, tasks.length, `poprawnych: ${good}`);
    const FMT = { recognize: "rozpoznanie", reverse: "po angielsku", produce: "wpisz z pamięci",
                  in_sentence: "w zdaniu", listen: "ze słuchu" };
    box.append(el("div", { class: "v2-crumb" }, sec.name + (t.fmt ? " · " + FMT[t.fmt] : "")));

    // runda na czas — ćwiczenie płynności, nie wiedzy
    if (sec.speed) {
      const bar = el("div", { class: "v2-timer" }, el("div", { class: "v2-timerfill" }));
      box.append(bar);
      let left = sec.speed * 10;
      timer = setInterval(() => {
        left--;
        bar.firstChild.style.width = Math.max(0, 100 * left / (sec.speed * 10)) + "%";
        if (left <= 0) { clearInterval(timer); submit(null); }
      }, 100);
    }

    box.append(el("div", { class: "qtext" }, t.text));
    if (t.pl && t.kind === "order") box.append(el("div", { class: "muted", style: "margin-bottom:8px" }, t.pl));

    if (t.kind === "order") {
      const line = el("div", { class: "order-line" }), pool = el("div", { class: "order-pool" });
      const chosen = [];
      const send = el("button", { class: "btn ok", onclick: () => submit(chosen.map(x => x.w).join(" ")) }, "Sprawdź");
      send.disabled = true;
      t.words.forEach(w => {
        const it = { w };
        const b = el("button", { class: "order-w" }, w);
        b.onclick = () => {
          if (b.parentNode === pool) { chosen.push(it); line.append(b); }
          else { chosen.splice(chosen.indexOf(it), 1); pool.append(b); }
          send.disabled = chosen.length !== t.words.length;
        };
        pool.append(b);
      });
      box.append(line, pool, el("div", { class: "fb-btns" }, send, dunno()));
      return;
    }
    if (t.kind === "dictation" || t.tts_pl) {
      const say = () => speak(t.tts_pl || t.tts, undefined, t.tts_pl ? "pl" : "en");
      box.append(el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
        el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say));
      say();
    }
    if (t.options) {
      const opts = el("div", { class: "options" });
      t.options.forEach((o, k) => opts.append(el("button", { class: "option", onclick: () => submit(k) }, o)));
      box.append(opts, el("div", { class: "fb-btns" }, dunno()));
      return;
    }
    const inp = el("input", { class: "input", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      placeholder: t.kind === "dictation" ? "zapisz, co słyszysz…" : "wpisz po angielsku…" });
    const send = el("button", { class: "btn ok", onclick: () => submit(inp.value.trim()) }, "Sprawdź ⏎");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };
    box.append(inp, el("div", { class: "fb-btns" }, send, dunno()));
    inp.focus();
  }

  const dunno = () => el("button", { class: "btn ghost", onclick: () => submit(null) }, "🤷 Nie wiem");

  async function submit(val) {
    clearInterval(timer);
    const unknown = val === null;
    const t = tasks[i];
    const r = await API.post("/api/path/answer",
      { idx: t.idx, answer: unknown ? "" : val, unknown, rt: Date.now() - t0 });
    if (r.correct) good++;
    haptic(r.correct ? "good" : "bad");
    if (r.tts || r.en) speakAuto(r.tts || r.en);
    box.innerHTML = "";
    const goNext = () => { i++; render(); };
    box.append(feedbackPanel({
      onNext: goNext,                    // panel sam rysuje „Dalej →"
      correct: r.correct, unknown, score: r.score,
      your: unknown ? "(nie wiem)" : String(val),
      answer: r.answer, pl: r.pl, en: r.en, tts: r.tts, explain: r.explain,
      rule: r.rule, ruleTitle: r.topic_name,
      diffTarget: (t.kind === "dictation" || t.kind === "translate" || t.kind === "order")
        ? String(r.answer || r.en || "") : null,
    }));
    setTimeout(() => { document.onkeydown = e => { if (e.key === "Enter") goNext(); }; }, 0);
  }

  async function finish() {
    document.onkeydown = null;
    const r = await API.post("/api/v2/complete", {});
    exitFocus();
    clearMain();
    const m2 = document.querySelector("main");
    const pct = Math.round(r.score * 100);
    m2.append(hero("✅", "Gotowe na dziś", `${good} z ${tasks.length} poprawnych · ${pct}%`, "violet"));
    // zamknięcie: co opanowałeś + zapowiedź jutra (haczyk na kolejny dzień)
    m2.append(el("div", { class: "card" },
      r.learned.length ? el("div", {},
        el("b", {}, "Dziś opanowałeś:"),
        el("ul", { class: "v2-learned" }, ...r.learned.map(w => el("li", {}, w)))) : null,
      r.hint ? el("div", { class: "v2-tune" }, "🎚 " + r.hint) : null,
      el("div", { class: "v2-tomorrow" },
        el("b", {}, "Jutro: " + r.tomorrow.name),
        el("div", { class: "muted small" }, r.tomorrow.desc)),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: viewToday }, "→ Ekran główny"),
        el("button", { class: "btn ghost", onclick: () => viewFlashcards() }, "🔁 Jeszcze powtórki"))));
  }

  render();
}
