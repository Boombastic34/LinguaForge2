// ================= PODSTAWY — kurs: teoria, ćwiczenia, test =================

async function viewBasics() {
  clearMain();
  const main = document.querySelector("main");
  const { topics } = await API.get("/api/basics");
  main.append(hero("🎒", "Podstawy", "Fundamenty, na których stoi cała reszta", "indigo",
    `${topics.length} tematów`));

  const card = el("div", { class: "card" });
  card.append(el("p", { class: "muted" },
    "Każdy temat ma solidną teorię z przykładami i lektorem, ćwiczenia z wyjaśnieniem " +
    "każdej odpowiedzi oraz test na koniec. Sam decydujesz, od czego zaczynasz."));
  const list = el("div", { class: "basics-grid" });
  topics.forEach(t => {
    const done = [];
    if (t.read) done.push("📖");
    if (t.practice_pct != null) done.push(`✍️ ${t.practice_pct}%`);
    if (t.test_pct != null) done.push(`🎓 ${t.test_pct}%`);
    list.append(el("div", { class: "basics-card", onclick: () => viewBasicsTopic(t.id) },
      el("div", { class: "bc-emoji" }, t.emoji),
      el("div", { class: "bc-body" },
        el("b", {}, t.name),
        el("div", { class: "small muted" }, t.short),
        el("div", { class: "bc-meta" },
          `${t.pages} strony teorii · ${t.practice} ćwiczeń · ${t.test} pytań`),
        done.length ? el("div", { class: "bc-done" }, done.join("  ")) : null),
      el("div", { class: "bc-level" }, t.level)));
  });
  card.append(list);
  main.append(card);
}

// ---------- ekran tematu: wybór trybu ----------
async function viewBasicsTopic(tid) {
  clearMain();
  const main = document.querySelector("main");
  const t = await API.get("/api/basics/" + tid);
  main.append(hero(t.emoji, t.name, t.short, "indigo", t.level));

  const card = el("div", { class: "card" });
  card.append(el("div", { class: "kb-intro" }, t.intro));
  card.append(el("h3", {}, "Co chcesz teraz zrobić?"));
  const modes = el("div", { class: "tile-grid" });
  [["📖", "Teoria", `${t.pages.length} strony · z lektorem`, "indigo", () => basicsTheory(t, 0)],
   ["✍️", "Ćwiczenia", `${t.practice.length} zadań · z wyjaśnieniami`, "teal", () => basicsRun(t, "practice")],
   ["🎓", "Test", `${t.test.length} pytań · sprawdź się`, "gold", () => basicsRun(t, "test")]]
    .forEach(([emo, name, sub, th, fn]) => modes.append(
      el("div", { class: "tile tile-" + th, onclick: fn },
        el("div", { class: "tile-emoji" }, emo), el("b", {}, name),
        el("div", { class: "small" }, sub))));
  card.append(modes,
    el("button", { class: "btn ghost", style: "margin-top:12px", onclick: viewBasics }, "← Wszystkie tematy"));
  main.append(card);
}

// ---------- TEORIA (wielostronicowa) ----------
function basicsTheory(t, pageIdx) {
  clearMain();
  const main = document.querySelector("main");
  const page = t.pages[pageIdx];
  enterFocus({ title: t.emoji + " " + t.name, subtitle: page.title, theme: "indigo",
    onExit: () => viewBasicsTopic(t.id) });
  focusProgress(pageIdx, t.pages.length, `strona ${pageIdx + 1}/${t.pages.length}`);

  const box = el("div", { class: "card" });
  main.append(box);

  // pasek: odsłuchaj stronę
  const pageText = [page.title].concat(page.sections.map(s =>
    s.title + ". " + (s.text || "").replace(/\n/g, ". ") + (s.tip ? " Wskazówka: " + s.tip : ""))).join(". ");
  box.append(el("div", { class: "kb-toolbar" },
    el("button", { class: "btn primary", onclick: () => speak(pageText, ttsRate(), "pl") },
      "🔊 Odsłuchaj stronę"),
    speedPicker(ttsRate(), v => speak(pageText, v, "pl"))));

  box.append(el("h3", { class: "bt-page-title" }, `${pageIdx + 1}. ${page.title}`));

  page.sections.forEach(s => {
    const c = el("div", { class: "kb-block kb-" + (s.color || "indigo") });
    c.append(el("div", { class: "kb-block-head" },
      el("span", { class: "kb-block-emo" }, s.emoji || "•"), el("b", {}, s.title)));
    (s.text || "").split("\n").forEach(line => {
      if (line.trim()) c.append(el("div", { class: "kb-block-txt" }, line));
    });
    (s.examples || []).forEach(([en, pl]) => c.append(el("div", { class: "kb-ex" },
      el("div", { class: "en" }, el("b", {}, en), " ",
        el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
      el("div", { class: "muted" }, pl))));
    if (s.tip) c.append(el("div", { class: "kb-tip" }, "💡 " + s.tip));
    box.append(c);
  });

  const nav = el("div", { class: "fb-btns", style: "margin-top:14px" });
  if (pageIdx > 0) nav.append(el("button", { class: "btn ghost",
    onclick: () => basicsTheory(t, pageIdx - 1) }, "← Poprzednia"));
  if (pageIdx + 1 < t.pages.length) {
    nav.append(el("button", { class: "btn primary big",
      onclick: () => basicsTheory(t, pageIdx + 1) }, "Dalej →"));
  } else {
    nav.append(el("button", { class: "btn ok big", onclick: async () => {
      await API.post("/api/basics/progress", { topic: t.id, read: true, kind: "theory", xp: 5 })
        .catch(() => {});
      exitFocus();
      basicsRun(t, "practice");
    } }, "✍️ Teraz poćwicz →"),
    el("button", { class: "btn ghost", onclick: () => { exitFocus(); viewBasicsTopic(t.id); } }, "Wróć"));
  }
  box.append(nav);
}

// ---------- ĆWICZENIA / TEST ----------
function basicsRun(t, kind) {
  clearMain();
  const main = document.querySelector("main");
  const items = (kind === "test" ? t.test : t.practice).slice();
  const isTest = kind === "test";
  enterFocus({ title: (isTest ? "🎓 " : "✍️ ") + t.name,
    subtitle: isTest ? "test" : "ćwiczenia", theme: isTest ? "gold" : "teal",
    onExit: () => viewBasicsTopic(t.id) });
  const box = el("div", { class: "card" });
  main.append(box);
  let i = 0, good = 0;
  show();

  function show() {
    if (i >= items.length) return finish();
    const q = items[i];
    box.innerHTML = "";
    focusProgress(i, items.length, `poprawnych: ${good}`);
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${items.length}`),
      el("span", { class: "badge" }, {
        choice: "wybór", gap: "uzupełnij", listen: "słuchanie", match: "dopasuj",
      }[q.type] || q.type)));

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
    box.append(opts);
  }

  function renderGap(q) {
    const parts = q.text.split(/_{2,}/);
    const line = el("div", { class: "gap-line" });
    const inp = el("input", { class: "gap-input", autocomplete: "off",
      autocapitalize: "off", spellcheck: "false", size: 8 });
    inp.oninput = () => { inp.size = Math.max(8, inp.value.length + 1); };
    line.append(el("span", { class: "gap-text" }, parts[0] || ""), inp,
      el("span", { class: "gap-text" }, parts[1] || ""));
    box.append(line);
    if (q.pl) box.append(el("div", { class: "muted" }, q.pl));
    if (q.hint) box.append(el("div", { class: "muted small" }, "podpowiedź: " + q.hint));
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(answersMatch(inp.value, q.answer, { lang: "en" }), inp.value, q);
    } }, "Sprawdź ⏎");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); send.click(); } };
    box.append(el("div", { class: "fb-btns" }, send));
    inp.focus();
  }

  function renderListen(q) {
    let rate = ttsRate();
    const say = quiet => speak(q.en, rate, "en", quiet);
    box.append(
      el("div", { class: "qtext" }, "Posłuchaj i zapisz po angielsku:"),
      el("button", { class: "btn primary big-play", onclick: () => say(false) }, "▶ Odtwórz"),
      speedPicker(rate, v => { rate = v; say(false); }));
    const inp = el("input", { class: "input", placeholder: "wpisz po angielsku…",
      autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(answersMatch(inp.value, q.en, { lang: "en", strict: true }), inp.value, q);
    } }, "Sprawdź ⏎");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); send.click(); } };
    box.append(inp, el("div", { class: "fb-btns" }, send));
    setTimeout(() => say(true), 400);
    inp.focus();
  }

  function renderMatch(q) {
    box.append(el("div", { class: "qtext" }, "Połącz w pary:"));
    const left = q.pairs.map((p, n) => ({ txt: p[0], n }));
    const right = q.pairs.map((p, n) => ({ txt: p[1], n })).sort(() => Math.random() - .5);
    let sel = null, hit = 0;
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
        if (side === "en") { speak(x.txt); }
        if (!sel) { sel = { x, b, side }; b.classList.add("sel"); return; }
        if (sel.side === side) { sel.b.classList.remove("sel"); sel = { x, b, side }; b.classList.add("sel"); return; }
        if (sel.x.n === x.n) {
          sel.b.classList.add("done"); b.classList.add("done");
          sel.b.classList.remove("sel"); sel = null; hit++;
          if (typeof haptic === "function") haptic("good");
          if (hit === q.pairs.length) judge(true, "", q);
        } else {
          b.classList.add("bad"); sel.b.classList.add("bad");
          const s = sel;
          setTimeout(() => { b.classList.remove("bad"); s.b.classList.remove("bad", "sel"); }, 500);
          sel = null;
          if (typeof haptic === "function") haptic("bad");
        }
      };
      return b;
    }
  }

  function judge(ok, given, q) {
    if (ok) good++;
    if (typeof haptic === "function") haptic(ok ? "good" : "bad");
    const correct = q.answer !== undefined && q.options ? q.options[q.answer]
                  : (q.answer || q.en || "");
    if (q.en) speakAuto(q.en);
    else if (correct) speakAuto(String(correct));
    box.innerHTML = "";
    box.append(el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, ok ? "✔ Dobrze!" : "✘ Niestety nie"),
      (!ok && given) ? el("div", {}, "Twoja odpowiedź: ", el("b", {}, given)) : null,
      correct ? el("div", { class: "fb-pair" }, "Poprawnie: ", el("b", {}, String(correct)), " ",
        el("button", { class: "mini-tts", onclick: () => speak(String(q.en || correct)) }, "🔊")) : null,
      q.pl ? el("div", { class: "muted" }, q.pl) : null,
      q.why ? el("div", { class: "fb-explain" }, "💡 Dlaczego: " + q.why) : null));
    const nx = el("button", { class: "btn primary big", onclick: () => { i++; show(); } },
      i + 1 >= items.length ? "Podsumowanie →" : "Dalej →");
    box.append(el("div", { class: "fb-btns" }, nx));
    nx.focus();
    document.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); document.onkeydown = null; i++; show(); } };
  }

  async function finish() {
    document.onkeydown = null;
    exitFocus();
    const pct = Math.round(100 * good / items.length);
    if (pct >= 80) confetti();
    await API.post("/api/basics/progress", {
      topic: t.id, kind,
      [isTest ? "test_pct" : "practice_pct"]: pct,
      xp: Math.round(pct / 5),
    }).catch(() => {});
    box.innerHTML = "";
    box.append(el("h3", {}, isTest ? "🎓 Wynik testu" : "✍️ Ćwiczenia zakończone"),
      el("div", { class: "game-result" },
        el("div", { class: "gr-big" }, pct + "%"),
        el("div", { class: "muted" }, `${good} z ${items.length} poprawnych`)),
      el("p", { class: "muted" }, pct >= 80
        ? "Świetnie — ten temat masz opanowany."
        : "Warto wrócić do teorii i spróbować jeszcze raz."),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => basicsRun(t, kind) }, "🔁 Jeszcze raz"),
        !isTest ? el("button", { class: "btn ok", onclick: () => basicsRun(t, "test") }, "🎓 Test") : null,
        el("button", { class: "btn ghost", onclick: () => basicsTheory(t, 0) }, "📖 Teoria"),
        el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(t.id) }, "← Temat")));
  }
}
