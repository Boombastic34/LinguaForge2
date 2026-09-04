// Czasowniki — trener trzech form: base → past → past participle (+ znaczenie PL).
// Jedna kratka jest odkryta losowo, resztę uzupełniasz. Po poprawnym komplecie
// pokazujemy każdą formę użytą w zdaniu.
const VERB_CELLS = [
  { key: "base", label: "bezokolicznik", sub: "I ___ / to ___" },
  { key: "past", label: "2. forma", sub: "Past Simple — wczoraj" },
  { key: "perf", label: "3. forma", sub: "Past Participle — have ___" },
  { key: "pl", label: "znaczenie", sub: "po polsku" },
];

async function viewVerbs(count) {
  clearMain();
  const main = document.querySelector("main");
  const stats = await API.get("/api/content/stats");
  main.append(hero("⚙️", "Czasowniki nieregularne",
    "Uzupełnij trzy formy — jedna kratka jest odkryta", "teal",
    `${stats.verbs} czasowników`));

  if (!count) {
    const info = await API.get("/api/verbs/session?n=1");
    const retypeCheck = el("input", { type: "checkbox",
      ...(LFSET.get("fc_retype", false) ? { checked: "" } : {}),
      onchange: e => LFSET.set("fc_retype", e.target.checked) });
    main.append(sizePicker({
      title: "Ile czasowników przećwiczyć?", pool: info.pool, unit: "czasowników", suggested: 10,
      subtitle: `W bazie jest ${info.pool} czasowników` +
        (info.due ? `, w tym ${info.due} do powtórki` : "") +
        ". Za każdym razem odkrywana jest inna kratka.",
      onStart: n => viewVerbs(n),
      extra: el("div", { style: "margin-top:10px" },
        el("label", { class: "chip chip-check" }, retypeCheck, " ✍️ Przepisz błąd na czysto"),
        el("p", { class: "muted small", style: "margin-top:4px" },
          "Po błędzie przepiszesz cały komplet form poprawnie — to najlepiej wbija je do głowy.")),
    }));
    return;
  }

  const { cards, due_left } = await API.get("/api/verbs/session?n=" + count);
  if (!cards.length) {
    main.append(el("div", { class: "card" }, el("p", {}, "Brak kart na teraz — wróć później.")));
    return;
  }
  enterFocus({ title: "⚙️ Czasowniki", subtitle: "trzy formy", theme: "teal",
    onExit: () => viewVerbs() });

  const box = el("div", { class: "card" });
  main.innerHTML = "";
  main.append(box);

  let i = 0, good = 0, t0 = 0;
  const retype = LFSET.get("fc_retype", false);
  const formsCache = {};

  function plAccepts(pl) {
    return pl.split(/[\/,;]| albo /).map(x => x.trim()).filter(Boolean);
  }

  function show() {
    if (i >= cards.length) return finish();
    const c = cards[i];
    t0 = Date.now();
    box.innerHTML = "";
    focusProgress(i, cards.length, `poprawnych: ${good}`);

    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${cards.length}`),
      c.irregular ? el("span", { class: "badge tpast" }, "nieregularny") : null,
      c.reps === 0 ? el("span", { class: "badge new" }, "NOWY") : null));

    const grid = el("div", { class: "verb-grid" });
    const inputs = {};
    VERB_CELLS.forEach(cell => {
      const given = cell.key === c.reveal;
      const wrap = el("div", { class: "verb-cell" + (given ? " verb-cell-given" : "") },
        el("div", { class: "verb-cell-label" }, cell.label),
        el("div", { class: "verb-cell-sub" }, cell.sub));
      if (given) {
        wrap.append(el("div", { class: "verb-cell-value" }, c[cell.key], " ",
          cell.key !== "pl"
            ? el("button", { class: "mini-tts", onclick: () => speak(c[cell.key]) }, "🔊") : null));
      } else {
        const inp = el("input", { class: "input verb-input", autocomplete: "off",
          autocapitalize: "off", spellcheck: "false",
          placeholder: cell.key === "pl" ? "po polsku…" : "po angielsku…" });
        inputs[cell.key] = inp;
        wrap.append(inp);
      }
      grid.append(wrap);
    });
    box.append(grid);

    const send = el("button", { class: "btn ok", onclick: submit }, "Sprawdź ⏎");
    const dunno = el("button", { class: "btn ghost", onclick: () => reveal(false) }, "🤷 Nie wiem");
    box.append(el("div", { class: "fb-btns" }, send, dunno),
      el("div", { class: "keyhint" }, "⏎ sprawdź · Tab — następna kratka"));

    const first = Object.values(inputs)[0];
    if (first) {
      first.focus();
      Object.values(inputs).forEach(inp => {
        inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
      });
    }

    function submit() {
      const wrong = [];
      Object.entries(inputs).forEach(([key, inp]) => {
        const okCell = key === "pl"
          ? plAccepts(c.pl).some(v => answersMatch(inp.value, v))
          : answersMatch(inp.value, c[key]);
        inp.classList.toggle("verb-bad", !okCell);
        if (!okCell) wrong.push(key);
      });
      if (wrong.length) {
        if (typeof haptic === "function") haptic("bad");
        inputs[wrong[0]].focus();
        reveal(false);
      } else {
        if (typeof haptic === "function") haptic("good");
        reveal(true);
      }
    }
  }

  async function reveal(ok) {
    const c = cards[i];
    const rt = Date.now() - t0;
    if (ok) good++;
    API.post("/api/verbs/review", { id: c.id, correct: ok, rt,
      prompt: c.forms, answer_given: "", answer_good: c.forms })
      .then(r => { if (r.xp && ok) xpPop(r.xp); })
      .catch(() => {});

    box.innerHTML = "";
    speakAuto(c.base);

    box.append(el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, ok ? "✔ Wszystkie formy poprawne!" : "✘ Poprawnie jest tak:"),
      el("div", { class: "verb-answer" },
        el("span", {}, c.base), el("span", { class: "verb-arrow" }, "→"),
        el("span", {}, c.past), el("span", { class: "verb-arrow" }, "→"),
        el("span", {}, c.perf),
        el("button", { class: "mini-tts", onclick: () => speak(c.base + ", " + c.past + ", " + c.perf) }, "🔊")),
      el("div", { class: "fb-pl" }, c.pl)));

    if (!ok && retype) {
      showRetype(c);
    } else {
      await showExamples(c);
      showNext();
    }
  }

  function showRetype(c) {
    const target = c.base + " " + c.past + " " + c.perf;
    const wrap = el("div", { class: "fc-retype-box" },
      el("div", { class: "fc-retype-label" }, "✍️ Przepisz wszystkie trzy formy po kolei:"),
      el("div", { class: "fc-retype-target" }, c.base + "  " + c.past + "  " + c.perf));
    const rInp = el("input", { class: "input", autocomplete: "off", autocapitalize: "off",
      spellcheck: "false", placeholder: "np. eat ate eaten" });
    const rBtn = el("button", { class: "btn ok", onclick: tryRetype }, "Sprawdź ⏎");
    rInp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); tryRetype(); } };
    wrap.append(rInp, el("div", { class: "fb-btns" }, rBtn));
    box.append(wrap);
    rInp.focus();
    async function tryRetype() {
      if (!rInp.value.trim()) return;
      const cleaned = rInp.value.replace(/[,;]+/g, " ").replace(/\s+/g, " ");
      if (answersMatch(cleaned, target)) {
        if (typeof haptic === "function") haptic("good");
        wrap.remove();
        box.append(el("div", { class: "fc-retype-ok" }, "✔ Zapisane — świetnie!"));
        await showExamples(c);
        showNext();
      } else {
        if (typeof haptic === "function") haptic("bad");
        rInp.classList.add("fc-shake");
        setTimeout(() => rInp.classList.remove("fc-shake"), 350);
        rInp.select();
      }
    }
  }

  // każda forma użyta w zdaniu — dopiero po poprawnym komplecie
  async function showExamples(c) {
    if (!formsCache[c.id]) {
      try { formsCache[c.id] = await API.get("/api/verbs/forms/" + c.id); }
      catch (e) { return; }
    }
    const data = formsCache[c.id];
    const wrap = el("div", { class: "verb-examples" }, el("h4", {}, "Każda forma w zdaniu:"));
    data.forms.forEach(f => {
      const ex = f.examples[0];
      if (!ex) return;
      wrap.append(el("div", { class: "kb-ex" },
        el("div", { class: "badge" }, f.word + " — " + f.desc),
        el("div", { class: "en" }, ex.en, " ",
          el("button", { class: "mini-tts", onclick: () => speak(ex.en) }, "🔊")),
        el("div", { class: "muted small" }, ex.pl)));
    });
    box.append(wrap);
  }

  function showNext() {
    const next = el("button", { class: "btn primary big", onclick: go }, "Dalej →");
    box.append(el("div", { class: "fb-btns" }, next));
    next.focus();
    setTimeout(() => { document.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; }, 0);
    function go() { document.onkeydown = null; i++; show(); }
  }

  function finish() {
    document.onkeydown = null;
    exitFocus();
    if (good / cards.length >= 0.8) confetti();
    box.innerHTML = "";
    box.append(el("h3", {}, "Sesja zakończona"),
      el("p", {}, "Wynik: " + good + "/" + cards.length +
        (due_left ? " · czeka jeszcze " + due_left + " zaległych" : "")),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => viewVerbs(count) }, "Jeszcze raz"),
        el("button", { class: "btn ghost", onclick: () => viewVerbs() }, "Inna liczba"),
        el("button", { class: "btn ghost", onclick: () => { location.hash = "#dashboard"; } }, "Pulpit")));
  }

  show();
}
