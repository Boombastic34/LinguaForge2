// ================= PODSTAWY — kurs: teoria, ćwiczenia, test =================
// Rozdział = teoria (z tabelą-ściągą) → ćwiczenia z wyjaśnieniem „dlaczego tak i dlaczego
// nie inaczej" → test bez podpowiedzi. Zdany test (≥70%) zalicza ogniwo Ścieżki.

async function viewBasics() {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("🎒", "Podstawy", "Gramatyka A1–A2: teoria, ćwiczenia i test w każdym temacie", "indigo"));

  let data;
  try {
    data = await API.get("/api/basics");
  } catch (e) {
    main.append(el("div", { class: "card" },
      el("h3", {}, "Nie udało się wczytać Podstaw"),
      el("p", { class: "muted" }, String(e.message || e)),
      el("button", { class: "btn primary", onclick: () => location.reload() }, "🔄 Odśwież")));
    return;
  }
  const topics = data.topics || [];
  if (!topics.length) {
    main.append(el("div", { class: "card" },
      el("h3", {}, "Brak treści do wyświetlenia"),
      el("p", { class: "muted" }, "Serwer nie znalazł pliku data/podstawy/kursy.json.")));
    return;
  }

  const list = el("div", { class: "basics-grid" });
  topics.forEach(t => {
    const pct = t.test_pct != null ? t.test_pct : null;
    const state = pct != null && pct >= 70 ? "done" : (t.read || t.practice_pct != null ? "started" : "new");
    list.append(el("div", { class: "basics-card bc-" + state, onclick: () => viewBasicsTopic(t.id) },
      el("div", { class: "bc-top" },
        el("span", { class: "bc-step" }, String(t.order || "•")),
        el("span", { class: "bc-level" }, t.level),
        state === "done" ? el("span", { class: "bc-badge" }, "✓ zaliczone") : null),
      el("div", { class: "bc-emoji" }, t.emoji),
      el("b", { class: "bc-name" }, t.name),
      el("div", { class: "bc-short" }, t.short),
      el("div", { class: "bc-meta" },
        el("span", {}, `📖 ${t.pages}`), el("span", {}, `✍️ ${t.practice}`), el("span", {}, `🎓 ${t.test}`)),
      el("div", { class: "bc-progress" },
        el("div", { class: "bc-progress-fill", style: `width:${pct != null ? pct : (t.practice_pct != null ? t.practice_pct / 2 : (t.read ? 15 : 0))}%` }))));
  });
  main.append(list);
}

// ---------- ekran tematu: ściąga + wybór trybu ----------
// pathLink: identyfikator ogniwa Ścieżki, z którego przyszliśmy (powrót na Ścieżkę)
async function viewBasicsTopic(tid, pathLink) {
  clearMain();
  const main = document.querySelector("main");
  const t = await API.get("/api/basics/" + tid);
  t._path = pathLink || t.path_link || null;
  main.append(hero(t.emoji, t.name, t.short, "indigo", t.level));

  const card = el("div", { class: "card bt-topic" });
  card.append(el("div", { class: "bt-intro" }, t.intro));
  if (t.cheatsheet) {
    card.append(el("details", { class: "bt-cheat", open: "" },
      el("summary", {}, "📋 " + (t.cheatsheet.title || "Ściąga")),
      dataTable(t.cheatsheet),
      t.cheatsheet.note ? el("div", { class: "kb-tip" }, "💡 " + t.cheatsheet.note) : null));
  }
  const modes = el("div", { class: "bt-modes" });
  [["📖", "Teoria", `${t.pages.length} stron · z lektorem`, "indigo", () => basicsTheory(t, 0)],
   ["✍️", "Ćwiczenia", `${t.practice.length} zadań · z wyjaśnieniami`, "teal", () => basicsRun(t, "practice")],
   ["🎓", "Test", `${t.test.length} pytań · bez podpowiedzi`, "gold", () => basicsRun(t, "test")]]
    .forEach(([emo, name, sub, th, fn]) => modes.append(
      el("button", { class: "bt-mode bt-mode-" + th, onclick: fn },
        el("span", { class: "bt-mode-emo" }, emo),
        el("span", { class: "bt-mode-txt" }, el("b", {}, name), el("span", { class: "small" }, sub)),
        el("span", { class: "bt-mode-arrow" }, "→"))));
  card.append(modes,
    el("div", { class: "fb-btns", style: "margin-top:12px" },
      t._path ? el("button", { class: "btn ghost", onclick: viewPath }, "← Ścieżka") : null,
      el("button", { class: "btn ghost", onclick: viewBasics }, "← Wszystkie tematy")));
  main.append(card);
}

// przykłady sekcji: wariant „praca" gdy uczeń uczy się do magazynu, inaczej ogólne
function sectionExamples(t, s) {
  if (t.domain === "warehouse" && s.examples_work && s.examples_work.length) return s.examples_work;
  return s.examples || [];
}

// ---------- TEORIA (wielostronicowa, opcjonalnie dwie kolumny) ----------
function basicsTheory(t, pageIdx) {
  clearMain();
  const main = document.querySelector("main");
  const page = t.pages[pageIdx];
  enterFocus({ title: t.emoji + " " + t.name, subtitle: page.title, theme: "indigo",
    cheatsheet: () => cheatTable(t.cheatsheet),
    onExit: () => viewBasicsTopic(t.id, t._path) });
  focusProgress(pageIdx, t.pages.length, `strona ${pageIdx + 1}/${t.pages.length}`);

  const twoCol = LFSET.get("bt_twocol", true);
  const box = el("div", { class: "card bt-theory" + (twoCol ? " bt-twocol" : "") });
  main.append(box);

  const pageText = [page.title].concat(page.sections.map(s =>
    s.title + ". " + (s.text || "").replace(/\n/g, ". ") + (s.tip ? " Wskazówka: " + s.tip : ""))).join(". ");
  box.append(el("div", { class: "kb-toolbar" },
    el("button", { class: "btn primary", onclick: () => speak(pageText, undefined, "pl") }, "🔊 Odsłuchaj stronę"),
    el("button", { class: "btn ghost", onclick: stopSpeaking }, "⏹ Stop"),
    speedPicker(ttsRate(), null),
    el("button", { class: "btn ghost bt-col-toggle", onclick: () => {
      LFSET.set("bt_twocol", !LFSET.get("bt_twocol", true)); basicsTheory(t, pageIdx);
    } }, twoCol ? "▤ Jedna kolumna" : "▥ Dwie kolumny")));
  prefetchTts(pageText, "pl");

  box.append(el("h3", { class: "bt-page-title" }, `${pageIdx + 1}. ${page.title}`));

  page.sections.forEach(s => {
    const c = el("section", { class: "kb-block kb-" + (s.color || "indigo") });
    const left = el("div", { class: "kb-left" });
    const right = el("div", { class: "kb-right" });
    left.append(el("div", { class: "kb-block-head" },
      el("span", { class: "kb-block-emo" }, s.emoji || "•"), el("b", {}, s.title)));
    (s.text || "").split("\n").forEach(line => {
      if (line.trim()) left.append(el("p", { class: "kb-block-txt" }, line));
    });
    if (s.table) left.append(dataTable(s.table));
    if (s.tip) left.append(el("div", { class: "kb-tip" }, "💡 " + s.tip));
    const exs = sectionExamples(t, s);
    if (exs.length) {
      right.append(el("div", { class: "kb-ex-head" }, "Przykłady"));
      exs.forEach(([en, pl]) => right.append(el("div", { class: "kb-ex" },
        el("div", { class: "en" }, el("b", {}, en), " ",
          el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
        el("div", { class: "muted" }, pl))));
      prefetchTts(exs.map(x => x[0]), "en");
    }
    c.append(left, exs.length ? right : null);
    box.append(c);
  });

  const nav = el("div", { class: "fb-btns", style: "margin-top:14px" });
  if (pageIdx > 0) nav.append(el("button", { class: "btn ghost", onclick: () => basicsTheory(t, pageIdx - 1) }, "← Poprzednia"));
  if (pageIdx + 1 < t.pages.length) {
    nav.append(el("button", { class: "btn primary big", onclick: () => basicsTheory(t, pageIdx + 1) }, "Dalej →"));
  } else {
    nav.append(el("button", { class: "btn ok big", onclick: async () => {
      await API.post("/api/basics/progress", { topic: t.id, read: true, kind: "theory", xp: 5 }).catch(() => {});
      basicsRun(t, "practice");
    } }, "✍️ Teraz poćwicz →"),
    el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(t.id, t._path) }, "Wróć"));
  }
  box.append(nav);
}

// ---------- ĆWICZENIA / TEST ----------
// skróty uznawane na równi z pełną formą (teoria je poleca, więc nie mogą być błędem)
const BT_CONTRACT = { "am": ["'m"], "is": ["'s"], "are": ["'re"], "is not": ["isn't"], "are not": ["aren't"],
                      "was not": ["wasn't"], "were not": ["weren't"], "do not": ["don't"], "does not": ["doesn't"],
                      "did not": ["didn't"], "cannot": ["can't"], "will not": ["won't"], "have": ["'ve"], "has": ["'s"],
                      "will": ["'ll"], "would": ["'d"] };
function btGapOk(given, q) {
  const alts = [q.answer].concat(q.accept || [], BT_CONTRACT[String(q.answer).toLowerCase()] || []);
  const g = String(given).trim().replace(/[’`´]/g, "'");
  return alts.some(a => answersMatch(g, a, { lang: "en" }) ||
    g.toLowerCase() === String(a).toLowerCase());
}

function basicsRun(t, kind) {
  clearMain();
  const main = document.querySelector("main");
  const isTest = kind === "test";
  const items = (isTest ? t.test : t.practice).slice();
  enterFocus({ title: (isTest ? "🎓 " : "✍️ ") + t.name,
    subtitle: isTest ? "test" : "ćwiczenia", theme: isTest ? "gold" : "teal",
    cheatsheet: isTest ? null : () => cheatTable(t.cheatsheet),   // w teście bez ściągi
    onExit: () => viewBasicsTopic(t.id, t._path) });
  const box = el("div", { class: "card" });
  main.append(box);
  let i = 0, good = 0;
  show();

  function dunno(q) {
    return el("button", { class: "btn ghost", onclick: () => judge(false, "", q, true) }, "🤷 Nie wiem");
  }

  function show() {
    if (i >= items.length) return finish();
    const q = items[i];
    box.innerHTML = "";
    focusProgress(i, items.length, `poprawnych: ${good}`);
    prefetchTts(items.slice(i, i + 3).map(x => x.en || (x.options && x.answer !== undefined ? x.options[x.answer] : x.answer)).filter(Boolean), "en");
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${items.length}`),
      el("span", { class: "badge" }, { choice: "wybór", gap: "uzupełnij", listen: "słuchanie", match: "dopasuj" }[q.type] || q.type)));
    if (q.type === "choice") return renderChoice(q);
    if (q.type === "gap") return renderGap(q);
    if (q.type === "listen") return renderListen(q);
    if (q.type === "match") return renderMatch(q);
    i++; show();
  }

  function renderChoice(q) {
    box.append(el("div", { class: "qtext" }, q.text));
    if (q.pl) box.append(el("div", { class: "muted", style: "margin-bottom:8px" }, q.pl));
    const opts = el("div", { class: "options" });
    q.options.forEach((o, n) => opts.append(
      el("button", { class: "option", onclick: () => judge(n === q.answer, o, q) }, o)));
    box.append(opts, el("div", { class: "fb-btns" }, dunno(q)));
  }

  function renderGap(q) {
    const parts = q.text.split(/_{2,}/);
    const line = el("div", { class: "gap-line" });
    const inp = el("input", { class: "gap-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", size: 8 });
    inp.oninput = () => { inp.size = Math.max(8, inp.value.length + 1); };
    line.append(el("span", { class: "gap-text" }, parts[0] || ""), inp, el("span", { class: "gap-text" }, parts[1] || ""));
    box.append(line);
    if (q.pl) box.append(el("div", { class: "muted" }, q.pl));
    if (!isTest && q.hint) box.append(el("div", { class: "muted small" }, "💡 " + q.hint));   // w teście bez podpowiedzi
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(btGapOk(inp.value, q), inp.value, q);
    } }, "Sprawdź ⏎");
    // stopPropagation: to samo naciśnięcie Enter nie może dotrzeć do „Dalej" ekranu wyniku
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };
    box.append(el("div", { class: "fb-btns" }, send, dunno(q)));
    inp.focus();
  }

  function renderListen(q) {
    const say = quiet => speak(q.en, undefined, "en", quiet);      // zadanie ze słuchu: lektor gra zawsze
    box.append(
      el("div", { class: "qtext" }, "Posłuchaj i zapisz po angielsku:"),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big-play", onclick: () => say(false) }, "▶ Odtwórz"),
        el("button", { class: "btn ghost", onclick: () => say(false) }, "🔁 Powtórz")),
      speedPicker(ttsRate(), () => say(false)));
    const inp = el("input", { class: "input", placeholder: "wpisz po angielsku…", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(answersMatch(inp.value, q.en, { lang: "en", strict: true }), inp.value, q);
    } }, "Sprawdź ⏎");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };
    box.append(inp, el("div", { class: "fb-btns" }, send, dunno(q)));
    say(true);
    inp.focus();
  }

  function renderMatch(q) {
    box.append(el("div", { class: "qtext" }, "Połącz w pary:"));
    const left = q.pairs.map((p, n) => ({ txt: p[0], n }));
    const right = q.pairs.map((p, n) => ({ txt: p[1], n })).sort(() => Math.random() - .5);
    let sel = null, hit = 0, misses = 0;
    const grid = el("div", { class: "pairs-two" });
    const cL = el("div", { class: "pairs-col" }), cR = el("div", { class: "pairs-col" });
    left.forEach(x => cL.append(mk(x, "en")));
    right.forEach(x => cR.append(mk(x, "pl")));
    grid.append(cL, cR);
    box.append(grid);
    function mk(x, side) {
      const b = el("button", { class: "pair-tile pair-" + side }, x.txt);
      b.onclick = () => {
        if (b.classList.contains("done")) return;
        if (side === "en") speak(x.txt);
        if (!sel) { sel = { x, b, side }; b.classList.add("sel"); return; }
        if (sel.side === side) { sel.b.classList.remove("sel"); sel = { x, b, side }; b.classList.add("sel"); return; }
        if (sel.x.n === x.n) {
          sel.b.classList.add("done"); b.classList.add("done"); sel.b.classList.remove("sel"); sel = null; hit++;
          haptic("good");
          if (hit === q.pairs.length) judge(misses <= 1, "", q);
        } else {
          misses++;
          b.classList.add("bad"); sel.b.classList.add("bad");
          const s = sel;
          setTimeout(() => { b.classList.remove("bad"); s.b.classList.remove("bad", "sel"); }, 500);
          sel = null;
          haptic("bad");
        }
      };
      return b;
    }
  }

  // ok: poprawnie; given: co wpisał/wybrał uczeń; unknown: kliknął „Nie wiem"
  function judge(ok, given, q, unknown) {
    if (ok) good++;
    haptic(ok ? "good" : "bad");
    const correct = q.options && q.answer !== undefined ? q.options[q.answer] : (q.answer || q.en || "");
    if (q.en) speakAuto(q.en);
    else if (correct && /^[a-z' ]+$/i.test(String(correct))) speakAuto(String(correct));
    box.innerHTML = "";
    const fb = el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, ok ? "✔ Dobrze!" : (unknown ? "🤷 Nic nie szkodzi — zobacz dlaczego" : "✘ Niestety nie")),
      (!ok && given) ? el("div", {}, "Twoja odpowiedź: ", el("b", {}, given)) : null,
      correct ? el("div", { class: "fb-pair" }, "Poprawnie: ", el("b", {}, String(correct)), " ",
        el("button", { class: "mini-tts", onclick: () => speak(String(q.en || correct)) }, "🔊")) : null,
      q.pl ? el("div", { class: "muted" }, q.pl) : null,
      q.why ? el("div", { class: "fb-explain" }, "💡 Dlaczego tak: " + q.why) : null);
    // dlaczego NIE inaczej: po błędzie — o wybranej opcji; po „nie wiem" — o wszystkich pozostałych
    if (q.why_not) {
      const all = Object.keys(q.why_not);
      const g = String(given || "").trim().toLowerCase().replace(/[.?!]$/, "");
      const hit = all.filter(k => k.toLowerCase().replace(/[.?!]$/, "") === g);
      // po błędzie: o wybranej opcji (jeśli ją znamy), inaczej o wszystkich pozostałych
      const keys = (unknown || ok || !hit.length) ? all : hit;
      if (keys.length) {
        const wn = el("div", { class: "fb-whynot" }, el("b", {}, "Dlaczego nie inaczej:"));
        keys.forEach(k => wn.append(el("div", { class: "fb-whynot-row" }, el("span", { class: "fb-whynot-opt" }, k), " — " + q.why_not[k])));
        fb.append(wn);
      }
    }
    box.append(fb);
    const nx = el("button", { class: "btn primary big", onclick: next }, i + 1 >= items.length ? "Podsumowanie →" : "Dalej →");
    box.append(el("div", { class: "fb-btns" }, nx));
    nx.focus();
    // handler zakładamy w następnej klatce — nie może go trafić to samo naciśnięcie Enter
    setTimeout(() => { document.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); next(); } }; }, 0);
    function next() { document.onkeydown = null; i++; show(); }
  }

  async function finish() {
    document.onkeydown = null;
    exitFocus();
    const pct = Math.round(100 * good / items.length);
    if (pct >= 80) confetti();
    let r = {};
    try {
      r = await API.post("/api/basics/progress", { topic: t.id, kind, [isTest ? "test_pct" : "practice_pct"]: pct, xp: Math.round(pct / 5) });
    } catch (e) { /* offline — pomijamy */ }
    box.innerHTML = "";
    const passed = isTest && pct >= 70;
    box.append(el("h3", {}, isTest ? "🎓 Wynik testu" : "✍️ Ćwiczenia zakończone"),
      el("div", { class: "game-result" },
        el("div", { class: "gr-big" }, pct + "%"),
        el("div", { class: "muted" }, `${good} z ${items.length} poprawnych`)),
      el("p", { class: "muted" }, isTest
        ? (passed ? "Test zdany — temat zaliczony" + (r.path_link_done ? ", ogniwo Ścieżki odhaczone." : ".") : "Do zaliczenia potrzeba 70%. Wróć do teorii i spróbuj ponownie.")
        : (pct >= 80 ? "Świetnie — możesz przejść do testu." : "Warto wrócić do teorii i poćwiczyć jeszcze raz.")),
      el("div", { class: "fb-btns" },
        passed && t._path ? el("button", { class: "btn primary", onclick: viewPath }, "🧭 Wróć na Ścieżkę") : null,
        el("button", { class: "btn " + (passed ? "ghost" : "primary"), onclick: () => basicsRun(t, kind) }, "🔁 Jeszcze raz"),
        !isTest ? el("button", { class: "btn ok", onclick: () => basicsRun(t, "test") }, "🎓 Test") : null,
        el("button", { class: "btn ghost", onclick: () => basicsTheory(t, 0) }, "📖 Teoria"),
        el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(t.id, t._path) }, "← Temat")));
  }
}
