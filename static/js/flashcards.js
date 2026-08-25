// Fiszki 2.0 — duża karta, wpisywanie w obu kierunkach, skróty klawiszowe, pasek serii
async function viewFlashcards(cat, theme, count, retype, dirMode, learnMode, audioMode) {
  const m = clearMain();
  const stats = await API.get("/api/content/stats");
  m.append(hero("🃏", theme && theme !== "all" ? "Fiszki: " + theme : "Fiszki",
    "Wpisz odpowiedź — kierunek losowy: raz PL→EN, raz EN→PL", "ember",
    `${stats.vocab_total} słówek w bazie`));

  if (!cat) {
    const gaps = await API.get("/api/gaps").catch(() => ({ themes: [], weak: [] }));
    const box = el("div", {});

    // --- 1) JEDNA wyraźna akcja na górze: albo największa luka, albo losowa sesja
    if (gaps.weak && gaps.weak.length) {
      const top = gaps.weak[0];
      box.append(el("div", { class: "fc-primary", onclick: () => viewFlashcards("all", top.theme) },
        el("div", { class: "fc-primary-emoji" }, "🔍"),
        el("div", { class: "fc-primary-txt" },
          el("div", { class: "fc-primary-label" }, "Twoja największa luka"),
          el("h2", {}, top.name),
          el("div", { class: "fc-primary-sub" },
            `opanowanie ${Math.round(top.eff)}% · ${top.known}/${top.total} słówek`)),
        el("div", { class: "fc-primary-arrow" }, "→")));
      if (gaps.weak.length > 1) {
        const row = el("div", { class: "fc-weak-row" });
        gaps.weak.slice(1).forEach(w => row.append(
          el("button", { class: "chip chip-btn chip-warn", onclick: () => viewFlashcards("all", w.theme) },
            `⚠️ ${w.name} ${Math.round(w.eff)}%`)));
        box.append(row);
      }
    } else {
      box.append(el("div", { class: "fc-primary", onclick: () => viewFlashcards("all", "all") },
        el("div", { class: "fc-primary-emoji" }, "🎲"),
        el("div", { class: "fc-primary-txt" },
          el("div", { class: "fc-primary-label" }, "Zalecane teraz"),
          el("h2", {}, "Wszystko losowo"),
          el("div", { class: "fc-primary-sub" }, `${stats.vocab_total} słówek, cała baza wymieszana`)),
        el("div", { class: "fc-primary-arrow" }, "→")));
    }

    // --- 2) reszta trybów: zwinięta, spokojniejsza sekcja
    const modes = el("details", { class: "path-sec" });
    modes.append(el("summary", {}, "🗂 Inne tryby fiszek"));
    const modeRow = el("div", { class: "fc-mode-row" });
    [["🎲", "Wszystko losowo", () => viewFlashcards("all", "all")],
     ["🏃", "Czasowniki — słówka", () => viewFlashcards("verbs")],
     ["📦", "Rzeczowniki", () => viewFlashcards("nouns")],
     ["🧩", "Tematyczne", () => viewFlashcards("mixed")],
     ["🔗", "Phrasal verbs", () => viewFlashcards("phrasal")],
     ["🪤", "False friends", () => viewFlashcards("traps")]]
      .forEach(([emo, name, onclick]) => modeRow.append(
        el("button", { class: "fc-mode-btn", onclick }, el("span", {}, emo), name)));
    modes.append(modeRow);
    box.append(modes);

    // --- 3) wszystkie kategorie: zwinięte, bo lista bywa długa
    if (gaps.themes && gaps.themes.length) {
      const cats = el("details", { class: "path-sec" });
      cats.append(el("summary", {}, `📚 Wszystkie kategorie (${gaps.themes.length})`));
      const themeRow = el("div", { class: "mix-checks" });
      gaps.themes.forEach(t => themeRow.append(
        el("button", { class: "chip chip-btn", onclick: () => viewFlashcards("all", t.theme) },
          `${t.name} (${t.total})`)));
      cats.append(themeRow,
        el("p", { class: "muted small", style: "margin-top:8px" },
          "Odmiana czasowników przez czasy jest w osobnej zakładce „⚙️ Czasowniki z czasami”."));
      box.append(cats);
    }

    m.append(box);
    return;
  }

  if (!count) {
    const info = await API.get("/api/cards/session?cat=" + cat + (theme ? "&theme=" + theme : "") + "&n=1");
    const retypeCheck = el("input", { type: "checkbox",
      ...(LFSET.get("fc_retype", false) ? { checked: "" } : {}),
      onchange: e => LFSET.set("fc_retype", e.target.checked) });
    // tryb ćwiczenia: pisanie z tekstu albo ze słuchu
    let chosenAudio = LFSET_str("fc_audio", "off");   // off | en | pl
    const audioRow = el("div", { class: "opt-row-btns" });
    [["off", "✍️ Zwykłe fiszki", "widzisz słowo, wpisujesz tłumaczenie"],
     ["en", "🎧 Ze słuchu — angielski", "lektor mówi po angielsku, zapisujesz to słowo"],
     ["pl", "🎧 Ze słuchu — polski", "lektor mówi po polsku, zapisujesz to słowo"]]
      .forEach(([v, label, sub]) => {
        const b = el("button", { class: "mode-btn" + (chosenAudio === v ? " active" : ""),
          onclick: () => {
            chosenAudio = v; LFSET_setStr("fc_audio", v);
            audioRow.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
            dirWrap.style.display = v === "off" ? "" : "none";
          } }, el("b", {}, label), el("div", { class: "small" }, sub));
        audioRow.append(b);
      });

    // kierunek tłumaczenia
    let chosenDir = LFSET_str("fc_dir", "mix");
    const dirRow = el("div", { class: "opt-row-btns" });
    [["mix", "🔀 Losowo", "raz tak, raz tak"],
     ["pl_en", "🇵🇱→🇬🇧 Z polskiego", "widzisz PL, piszesz EN"],
     ["en_pl", "🇬🇧→🇵🇱 Z angielskiego", "widzisz EN, piszesz PL"]]
      .forEach(([v, label, sub]) => {
        const b = el("button", { class: "mode-btn" + (chosenDir === v ? " active" : ""),
          onclick: () => {
            chosenDir = v; LFSET_setStr("fc_dir", v);
            dirRow.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
          } }, el("b", {}, label), el("div", { class: "small" }, sub));
        dirRow.append(b);
      });

    const learnCheck = el("input", { type: "checkbox",
      ...(LFSET.get("fc_learn", false) ? { checked: "" } : {}),
      onchange: e => LFSET.set("fc_learn", e.target.checked) });

    const dirWrap = el("div", { style: chosenAudio === "off" ? "" : "display:none" },
      el("div", { class: "muted small", style: "margin-bottom:6px" }, "Kierunek tłumaczenia:"),
      dirRow);
    const extraBox = el("div", { style: "margin-top:10px" },
      el("div", { class: "muted small", style: "margin-bottom:6px" }, "Tryb ćwiczenia:"),
      audioRow,
      dirWrap,
      el("label", { class: "chip chip-check", style: "margin-top:10px" },
        learnCheck, " 📖 Tryb nauki (najpierw pokaż znaczenie)"),
      el("p", { class: "muted small", style: "margin-top:4px" },
        "Każde słówko zobaczysz najpierw z tłumaczeniem i przykładem, dopiero potem je wpiszesz."),
      el("label", { class: "chip chip-check fc-retype-toggle", style: "margin-top:8px" },
        retypeCheck, " ✍️ Przepisz błąd na czysto"),
      el("p", { class: "muted small", style: "margin-top:4px" },
        "Gdy błędnie wpiszesz słowo, zanim przejdziesz dalej, przepiszesz je raz poprawnie — pomaga zapamiętać pisownię."),
      el("button", { class: "btn ghost", style: "margin-top:8px", onclick: () => viewFlashcards() }, "← Zmień kategorię"));
    m.append(sizePicker({
      title: "Ile fiszek chcesz przerobić?", pool: info.pool, unit: "fiszek", suggested: 15,
      subtitle: (theme === "all" ? `Cała baza: ${info.pool} fiszek, wybierane losowo` :
        `W tej kategorii jest ${info.pool} fiszek`) +
        (info.due ? `, w tym ${info.due} czeka na powtórkę` : "") + ". Wybierz długość sesji.",
      onStart: v => viewFlashcards(cat, theme, v, retypeCheck.checked, chosenDir, learnCheck.checked, chosenAudio),
      extra: extraBox,
    }));
    return;
  }
  if (retype === undefined) retype = LFSET.get("fc_retype", false);
  const audio = audioMode || LFSET_str("fc_audio", "off");   // off | en | pl
  const data = await API.get("/api/cards/session?cat=" + cat + (theme ? "&theme=" + theme : "") + "&n=" + count);
  enterFocus({ title: "🃏 Fiszki", subtitle: theme && theme !== "all" ? theme : "sesja nauki",
    onExit: () => viewFlashcards() });
  const dm = dirMode || LFSET_str("fc_dir", "mix");
  let queue = data.cards.map(c => ({ ...c,
    dir: dm === "pl_en" ? "pl_en"
       : dm === "en_pl" ? "en_pl"
       : (Math.random() < 0.55 ? "pl_en" : "en_pl") }));
  // tryb nauki: KAŻDA karta najpierw pokazywana do przeczytania
  const learn = learnMode !== undefined ? learnMode : LFSET.get("fc_learn", false);
  if (learn) queue.forEach(c => { c.new = true; });
  if (!queue.length) {
    m.append(el("div", { class: "card" }, el("p", {}, "Brak kart w tej kategorii."),
      el("button", { class: "btn primary", onclick: () => viewFlashcards() }, "← Wybierz inną")));
    return;
  }
  let idx = 0, t0 = Date.now(), sessionXp = 0, done = 0, streak = 0, best = 0;

  const bar = el("div", { class: "fc-bar" },
    el("div", { class: "fc-progress" }, el("div", { class: "fc-progress-fill", id: "fprog" })),
    el("div", { class: "fc-stats" },
      el("span", { id: "fcount" }, "0"), el("span", { class: "muted" }, " / " + queue.length),
      el("span", { class: "fc-streak", id: "fstreak" }, "")));
  const stage = el("div", { class: "fc-stage" });
  m.innerHTML = "";
  m.append(el("div", { class: "card fc-card-wrap" }, bar, stage));

  function plVariants(pl) { return pl.split(/[\/,;]| albo /).map(x => x.trim()).filter(Boolean); }

  // wspólna logika oceny — używana zarówno przy pierwszej odpowiedzi, jak i przy przepisywaniu
  function isCorrect(c, val) {
    return c.dir === "pl_en"
      ? answersMatch(val, c.en)
      : plVariants(c.pl).some(x => answersMatch(val, x) ||
          (normAns(val).length > 3 && normAns(x).includes(normAns(val))));
  }
  function correctTarget(c) {
    return c.dir === "pl_en" ? c.en : plVariants(c.pl)[0];
  }

  function updateBar() {
    focusProgress(idx, queue.length, streak >= 2 ? `🔥 seria ${streak}` : "sesja nauki");
    document.getElementById("fprog").style.width = (idx / queue.length * 100) + "%";
    document.getElementById("fcount").textContent = String(idx);
    const s = document.getElementById("fstreak");
    s.textContent = streak >= 2 ? `🔥 ${streak}` : "";
  }

  function render() {
    if (idx >= queue.length) return finish();
    const c = queue[idx];
    // NOWE słówko pokazujemy najpierw do przeczytania — dopiero potem odpytujemy.
    // Bez tego nieznane phrasal verbs sprowadzały się do klikania „Nie wiem".
    if (c.new && !c._seen) { c._seen = true; return renderIntro(c); }
    if (audio !== "off") return renderAudio(c);
    t0 = Date.now();
    stage.innerHTML = "";
    updateBar();
    const askPl = c.dir === "pl_en";

    const card = el("div", { class: "fc-card" },
      el("div", { class: "fc-face fc-front" },
        el("div", { class: "fc-tags" },
          c.new ? el("span", { class: "fc-tag tag-new" }, "NOWE") : null,
          c.leech ? el("span", { class: "fc-tag tag-leech" }, "🩸 PIJAWKA") : null,
          el("span", { class: "fc-tag" }, askPl ? "PL → EN" : "EN → PL"),
          el("span", { class: "fc-tag" }, c.theme || "inne"),
          c.nr ? el("span", { class: "fc-tag tag-nr" }, "[" + c.nr + "]") : null),
        el("div", { class: "fc-word" }, askPl ? c.pl : c.en,
          !askPl ? el("button", { class: "fc-speak", onclick: e => { e.stopPropagation(); speak(c.en); } }, "🔊") : null),
        c.hint ? el("div", { class: "fc-hint" }, "💡 " + c.hint) : null,
        el("div", { class: "fc-side" }, askPl ? "napisz po angielsku" : "napisz po polsku")));
    stage.append(card);

    const inp = el("input", { class: "input fc-input", autocomplete: "off", autocapitalize: "off",
      spellcheck: "false", placeholder: askPl ? "po angielsku…" : "po polsku…" });
    const send = el("button", { class: "btn ok", onclick: () => check(c, inp.value) }, "Sprawdź ⏎");
    const dunno = el("button", { class: "btn ghost", onclick: () => grade(c, false, "", true) }, "🤷 Nie wiem");
    inp.onkeydown = e => {
      if (e.key === "Enter") { e.preventDefault(); check(c, inp.value); }
      if (e.key === "Escape") grade(c, false, "", true);
    };
    stage.append(el("div", { class: "fc-answer-row" }, inp), el("div", { class: "fb-btns fc-btns" }, send, dunno),
      el("div", { class: "muted small fc-keys" }, "⏎ sprawdź · Esc — nie wiem"));
    inp.focus();
  }

  function renderIntro(c) {
    stage.innerHTML = "";
    updateBar();
    speakAuto(c.en);
    const card = el("div", { class: "fc-card fc-intro" },
      el("div", { class: "fc-face" },
        el("div", { class: "fc-tags" },
          el("span", { class: "fc-tag tag-new" }, "NOWE SŁÓWKO"),
          el("span", { class: "fc-tag" }, c.theme || "inne"),
          c.nr ? el("span", { class: "fc-tag tag-nr" }, "[" + c.nr + "]") : null),
        el("div", { class: "fc-intro-label" }, "Poznaj — za chwilę Cię z tego zapytam"),
        el("div", { class: "fc-word" }, c.en, " ",
          el("button", { class: "fc-speak", onclick: e => { e.stopPropagation(); speak(c.en); } }, "🔊")),
        el("div", { class: "fc-pl" }, c.pl),
        c.hint ? el("div", { class: "fc-hint" }, "💡 " + c.hint) : null,
        c.example ? el("div", { class: "fc-example", onclick: () => speak(c.example) },
          "„" + c.example + "”",
          c.example_pl ? el("div", { class: "muted small" }, c.example_pl) : null) : null));
    stage.append(card);
    const go = el("button", { class: "btn primary big", onclick: next }, "Rozumiem →");
    stage.append(el("div", { class: "fb-btns fc-btns" }, go));
    go.focus();
    document.onkeydown = e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
    };
    function next() { document.onkeydown = null; render(); }
  }

  // ---------- FISZKA ZE SŁUCHU: lektor mówi, uczeń zapisuje ----------
  function renderAudio(c) {
    t0 = Date.now();
    stage.innerHTML = "";
    updateBar();
    const lang = audio;                       // "en" albo "pl"
    const target = lang === "en" ? c.en : plVariants(c.pl)[0];
    let rate = ttsRate();
    const say = () => speak(target, rate, lang);

    const card = el("div", { class: "fc-card fc-audio" },
      el("div", { class: "fc-face" },
        el("div", { class: "fc-tags" },
          el("span", { class: "fc-tag tag-audio" }, lang === "en" ? "🎧 SŁUCHAJ · ANGIELSKI" : "🎧 SŁUCHAJ · POLSKI"),
          el("span", { class: "fc-tag" }, c.theme || "inne"),
          c.reps === 0 ? el("span", { class: "fc-tag tag-new" }, "NOWE") : null),
        el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
        speedPicker(rate, v => { rate = v; say(); }),
        el("div", { class: "muted small" }, "Zapisz dokładnie to, co słyszysz.")));
    stage.append(card);

    const inp = el("input", { class: "input fc-input", autocomplete: "off",
      autocapitalize: "off", spellcheck: "false",
      placeholder: lang === "en" ? "wpisz po angielsku…" : "wpisz po polsku…" });
    const send = el("button", { class: "btn ok", onclick: () => judge(inp.value) }, "Sprawdź ⏎");
    const dunno = el("button", { class: "btn ghost", onclick: () => grade(c, false, "", true) }, "🤷 Nie wiem");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); judge(inp.value); } };
    stage.append(inp, el("div", { class: "fb-btns fc-btns" }, send, dunno));
    inp.focus();
    setTimeout(say, 400);

    function judge(val) {
      if (!val.trim()) return;
      grade(c, answersMatch(val, target), val, false);
    }
  }

  function check(c, val) {
    if (!val.trim()) return;
    grade(c, isCorrect(c, val), val, false);
  }

  async function grade(c, ok, val, gaveUp) {
    const rt = Date.now() - t0;
    const rating = gaveUp || !ok ? 1 : (rt < 6000 ? 4 : 3);
    streak = ok ? streak + 1 : 0;
    best = Math.max(best, streak);
    const r = await API.post("/api/cards/review",
      { id: c.id, rating, rt, level: c.level, en: c.en, pl: c.pl, theme: c.theme });
    done++;
    if (ok) { sessionXp += r.xp; xpPop(r.xp); }
    stage.innerHTML = "";
    speakAuto(c.en);                     // lektor czyta angielskie słowo po odpowiedzi
    const flip = el("div", { class: "fc-card fc-flip " + (ok ? "fc-ok" : "fc-bad") },
      el("div", { class: "fc-face fc-back" },
        el("div", { class: "fc-verdict" }, ok ? "✔ Dobrze!" : (gaveUp ? "🤷 Nic nie szkodzi" : "✘ Niestety")),
        el("div", { class: "fc-pair" },
          el("div", { class: "fc-en" }, c.en, " ",
            el("button", { class: "fc-speak", onclick: () => speak(c.en) }, "🔊"),
            muteButton()),
          el("div", { class: "fc-pl" }, c.pl)),
        !ok && val ? el("div", { class: "fc-your" }, "Twoja odpowiedź: " + val) : null,
        c.example ? el("div", { class: "fc-example", onclick: () => speak(c.example) }, "„" + c.example + "”",
          c.example_pl ? el("div", { class: "muted small" }, c.example_pl) : null) : null,
        el("div", { class: "fc-meta" }, `następna powtórka: ${r.next_in}` +
          (r.mature ? " · OPANOWANE ✔" : "") + (r.leech ? " · pijawka 🩸" : ""))));
    stage.append(flip);

    function go() {
      document.onkeydown = null;
      if (!ok) queue.push({ ...c });
      idx++;
      render();
    }

    if (!ok && retype) {
      showRetypeStep(c);
    } else {
      showContinueButton();
    }

    function showContinueButton() {
      const next = el("button", { class: "btn primary big", onclick: go }, "Dalej →");
      stage.append(el("div", { class: "fb-btns fc-btns" }, next));
      next.focus();
      document.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    }

    function showRetypeStep(c) {
      const target = correctTarget(c);
      const wrap = el("div", { class: "fc-retype-box" },
        el("div", { class: "fc-retype-label" }, "✍️ Przepisz poprawnie, zanim pójdziesz dalej:"),
        el("div", { class: "fc-retype-target" }, target));
      const rInp = el("input", { class: "input fc-input", autocomplete: "off", autocapitalize: "off",
        spellcheck: "false", placeholder: "przepisz dokładnie to słowo…" });
      const rBtn = el("button", { class: "btn ok", onclick: tryRetype }, "Sprawdź ⏎");
      rInp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); tryRetype(); } };
      wrap.append(rInp, el("div", { class: "fb-btns fc-btns" }, rBtn));
      stage.append(wrap);
      rInp.focus();
      document.onkeydown = null;   // Enter na tym etapie idzie do pola przepisywania, nie do "Dalej"

      function tryRetype() {
        if (!rInp.value.trim()) return;
        if (answersMatch(rInp.value, target)) {
          if (typeof haptic === "function") haptic("good");
          wrap.remove();
          stage.append(el("div", { class: "fc-retype-ok" }, "✔ Zapisane — świetnie!"));
          showContinueButton();
        } else {
          if (typeof haptic === "function") haptic("bad");
          rInp.classList.add("fc-shake");
          setTimeout(() => rInp.classList.remove("fc-shake"), 350);
          rInp.select();
        }
      }
    }
  }

  function finish() {
    document.onkeydown = null;
    exitFocus();
    confetti();
    stage.innerHTML = "";
    updateBar();
    stage.append(el("div", { class: "fc-done" },
      el("h2", {}, "Sesja zakończona 💪"),
      el("div", { class: "week-row", style: "justify-content:center" },
        el("div", { class: "week-cell" }, el("div", { class: "big" }, String(done)), el("div", { class: "muted small" }, "kart")),
        el("div", { class: "week-cell" }, el("div", { class: "big" }, String(sessionXp)), el("div", { class: "muted small" }, "XP")),
        el("div", { class: "week-cell" }, el("div", { class: "big" }, "🔥 " + best), el("div", { class: "muted small" }, "najdłuższa seria"))),
      el("div", { class: "fb-btns", style: "justify-content:center" },
        el("button", { class: "btn primary", onclick: () => viewFlashcards(cat, theme, count, retype, dirMode, learnMode, audioMode) }, "Jeszcze jedna sesja"),
        el("button", { class: "btn ghost", onclick: () => viewFlashcards(cat, theme) }, "Inna liczba fiszek"),
        el("button", { class: "btn ghost", onclick: () => viewFlashcards() }, "Zmień kategorię"),
        el("button", { class: "btn ghost", onclick: () => location.hash = "#dashboard" }, "Pulpit"))));
  }

  render();
}
