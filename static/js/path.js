const UNKNOWN = "\u0000NIE_WIEM";
// Ścieżka nauki — łańcuch ogniw, odblokowywanych po kolei
const LINK_TYPE_PL = {
  slowka: "słówka", wiedza: "teoria", podstawy: "teoria + ćwiczenia + test", gramatyka: "ćwiczenia", lekcja: "lekcja",
  sluchanie: "słuchanie", tlumaczenia: "tłumaczenia", powtorka: "powtórka skumulowana",
  sprawdzian: "sprawdzian", egzamin: "egzamin poziomu", repair: "naprawa błędów",
  rozmowa: "rozmowa", czytanie: "czytanie ze zrozumieniem", pisanie: "praca pisemna",
};

async function viewPath() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/path");
  const totalDone = d.levels.reduce((s, l) => s + l.done, 0);
  const totalAll = d.levels.reduce((s, l) => s + l.total, 0);
  main.append(hero("🧭", "Ścieżka nauki",
    "Rozdział po rozdziale: słówka → teoria → ćwiczenia → rozmowa → powtórka → sprawdzian → egzamin poziomu",
    "ember", `${totalDone}/${totalAll} ogniw`));

  // pierwsze nieukończone ogniwo — duży baner „tu jesteś”
  let current = null;
  for (const lvl of d.levels) for (const ln of lvl.links)
    if (!current && !ln.done && ln.unlocked) current = { ...ln, level: lvl.level };
  if (current) {
    main.append(el("div", { class: "continue-box" },
      el("div", { style: "font-size:38px" }, current.emoji || "▶"),
      el("div", { class: "continue-txt" },
        el("b", {}, "Tu jesteś: " + current.name),
        el("div", {}, `${current.section} · poziom ${current.level}`)),
      el("button", { class: "btn", style: "margin-left:auto", onclick: () => openLink(current) }, "▶ Kontynuuj")));
  }

  for (const lvl of d.levels) {
    const card = el("div", { class: "card" });
    const pct = Math.round(100 * lvl.done / lvl.total);
    card.append(el("div", { class: "pl-top" },
      el("h3", {}, `${lvl.passed ? "🏅 " : ""}${lvl.name}`),
      el("span", { class: "badge" }, `${lvl.done}/${lvl.total}`),
      el("div", { class: "progress" }, el("div", { class: "progress-fill", style: `width:${pct}%` })),
      el("span", { class: "muted" }, pct + "%")));

    // grupowanie ogniw w rozdziały
    const sections = [];
    lvl.links.forEach(ln => {
      const name = ln.section || lvl.name;
      let s = sections.find(x => x.name === name);
      if (!s) { s = { name, links: [] }; sections.push(s); }
      s.links.push(ln);
    });

    sections.forEach((sec, si) => {
      const done = sec.links.filter(l => l.done).length;
      const open = sec.links.some(l => l.unlocked && !l.done);
      const secBox = el("details", { class: "path-sec" + (done === sec.links.length ? " sec-done" : ""),
        ...(open || done < sec.links.length ? { open: "" } : {}) });
      secBox.append(el("summary", {},
        el("span", { class: "sec-ico" }, done === sec.links.length ? "✅" : (open ? "📍" : "🔒")),
        el("b", {}, sec.name),
        el("span", { class: "muted small" }, ` — ${done}/${sec.links.length} ogniw`)));
      const chain = el("div", { class: "chain" });
      sec.links.forEach((ln, i) => {
        const score = d.scores[ln.id];
        const isCur = current && ln.id === current.id;
        const cls = ln.done ? "link-done" : (ln.unlocked ? "link-open" : "link-locked");
        const big = (ln.type === "egzamin" || ln.type === "sprawdzian") ? " link-big" : "";
        chain.append(el("div", {
          class: "chain-link " + cls + big + (isCur ? " link-current" : ""),
          onclick: () => ln.unlocked ? openLink(ln) : toast("Najpierw ukończ poprzednie ogniwo.", true),
        },
          el("div", { class: "link-dot" }, ln.done ? "✓" : (ln.unlocked ? (ln.emoji || "▶") : "🔒")),
          el("div", { class: "link-body" },
            el("b", {}, ln.name),
            el("div", { class: "muted small" },
              LINK_TYPE_PL[ln.type] + (ln.n ? ` · ${ln.n} zadań` : "") +
              (score ? ` · wynik ${Math.round(score.score * 100)}%` : ""))),
          isCur ? el("span", { class: "badge cur-badge" }, "TU JESTEŚ") : null));
      });
      secBox.append(chain);
      card.append(secBox);
    });
    main.append(card);
  }
}

function openLink(ln) {
  if (ln.type === "podstawy") return viewBasicsTopic(ln.topic, ln.id);
  if (ln.type === "lekcja" && typeof viewChapter === "function") return viewChapter(ln.unit, ln.chapter);
  if (ln.type === "rozmowa") return runDialog(ln.dialog);
  if (ln.type === "czytanie") return runReading(ln.text);
  if (ln.type === "pisanie") return runWriting(ln.task);
  runPathSession(ln.id);
}

// ---------- uniwersalny odtwarzacz sesji ----------
async function runPathSession(lid, n) {
  clearMain();
  const main = document.querySelector("main");
  let data;
  try {
    data = await API.get("/api/path/session/" + lid + (n ? "?n=" + n : ""));
  } catch (e) {
    main.append(el("div", { class: "card" },
      el("h3", {}, "Nie udało się otworzyć tego ogniwa"),
      el("p", { class: "muted" }, String(e.message || e)),
      el("button", { class: "btn primary", onclick: viewPath }, "← Ścieżka")));
    return;
  }

  // przekierowania do modułów (lekcja, rozmowa, czytanie, pisanie)
  if (data.redirect_basics) return viewBasicsTopic(data.redirect_basics, lid);
  if (data.redirect && typeof viewChapter === "function") return viewChapter(data.redirect.unit, data.redirect.chapter);
  if (data.redirect_dialog) return runDialog(data.redirect_dialog);
  if (data.redirect_reading) return runReading(data.redirect_reading);
  if (data.redirect_writing) return runWriting(data.redirect_writing);

  const link = data.link || {};
  const name = link.name || "Sesja";
  main.append(hero(lid === "repair" ? "🩹" : "🧭", name,
    LINK_TYPE_PL[link.type] || "", lid === "repair" ? "gold" : "ember",
    data.tasks ? `${data.tasks.length} zadań` : (data.pool ? `pula: ${data.pool}` : "")));

  // ekran wyboru długości sesji + czy poprawiać błędy od razu
  if (data.choose) {
    const isListen = link.type === "sluchanie";
    const extra = el("div", {},
      retypeToggle("path_retype", true,
        isListen ? "✍️ Po błędzie przepisz zdanie poprawnie" : "✍️ Po błędzie przepisz słówko poprawnie"),
      el("p", { class: "muted small", style: "margin:8px 0 0" },
        isListen ? "W zadaniach ze słuchu lektor gra zawsze — tempo zmienisz w pasku u góry."
                 : "Lektora możesz wyciszyć (🔊/🔇) i zmienić jego tempo w pasku u góry."),
      el("button", { class: "btn ghost", style: "margin-top:8px", onclick: viewPath }, "← Ścieżka"));
    main.append(sizePicker({
      pool: data.pool, suggested: data.suggested,
      subtitle: `Ten materiał ma łącznie ${data.pool} przygotowanych zadań. ` +
        "Możesz zrobić fragment albo przejść całą serię — wynik liczy się od tego, co wybierzesz.",
      onStart: v => runPathSession(lid, v),
      extra,
    }));
    return;
  }

  const box = el("div", { class: "card" });
  main.append(box);
  if (!data.tasks || !data.tasks.length) {
    box.append(el("p", {}, data.empty_msg || "Brak zadań."),
      el("button", { class: "btn primary", onclick: () => location.hash = "#dashboard" }, "← Pulpit"));
    return;
  }
  const opts = { retype: LFSET.get("path_retype", true), listening: link.type === "sluchanie" };
  if (data.theory || data.theory_html) {
    showTheory(box, data, () => runTaskList(box, data.tasks, lid, viewPath, name, opts));
  } else {
    runTaskList(box, data.tasks, lid, viewPath, name, opts);
  }
}

function showTheory(box, data, done) {
  box.innerHTML = "";
  if (data.theory) {
    const a = data.theory;
    box.append(el("h3", {}, "📖 " + a.name), el("p", { class: "muted" }, a.what));
    const ul = el("ul", {});
    a.when.forEach(w => ul.append(el("li", {}, w)));
    box.append(ul);
    const f = el("div", { class: "kb-form" });
    ["plus", "minus", "question"].forEach(k => {
      if (a.form[k] && a.form[k] !== "—") f.append(el("div", {}, a.form[k]));
    });
    box.append(f);
    a.examples.slice(0, 3).forEach(([en, pl]) => box.append(el("div", { class: "kb-ex" },
      el("div", { class: "en" }, en, " ", el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
      el("div", { class: "muted" }, pl))));
    if (a.mistakes) a.mistakes.slice(0, 3).forEach(x => box.append(el("div", { class: "kb-mistake" }, "⚠ " + x)));
  } else {
    box.append(el("div", { class: "theory", html: data.theory_html }));
  }
  box.append(el("button", { class: "btn primary", onclick: done }, "Rozumiem — ćwiczmy →"));
}

// tasks: lista z serwera; lid: identyfikator sesji; onBack: powrót
// opts.retype    — po błędzie (albo „nie wiem") uczeń przepisuje poprawną odpowiedź
// opts.listening — sesja ze słuchu: w pasku tylko tempo lektora, bez wyciszania
function runTaskList(box, tasks, lid, onBack, focusTitle, opts) {
  opts = opts || {};
  const retypeOn = opts.retype !== undefined ? !!opts.retype : LFSET.get("path_retype", true);
  let i = 0, t0 = 0, good = 0;
  enterFocus({ title: focusTitle || "🧭 Ćwiczenie", subtitle: `${tasks.length} zadań`,
    listening: !!opts.listening,
    onExit: () => { exitFocus(); onBack(); } });
  // nagrania na kolejne zadania pobieramy z wyprzedzeniem
  function prefetchAhead(from) {
    const texts = [];
    for (let k = from; k < Math.min(tasks.length, from + 3); k++) {
      const t = tasks[k];
      if (t.tts_pl) prefetchTts(t.tts_pl, "pl");
      else if (t.tts) texts.push(t.tts);
    }
    if (texts.length) prefetchTts(texts, "en");
  }
  prefetchAhead(0);

  function dunnoBtn() {
    return el("button", { class: "btn ghost", onclick: () => submit(UNKNOWN) }, "🤷 Nie wiem");
  }

  function render() {
    if (i >= tasks.length) return finish();
    const t = tasks[i];
    t0 = Date.now();
    focusProgress(i, tasks.length, `poprawnych: ${good}`);
    box.innerHTML = "";
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${tasks.length}`),
      t.nr ? el("span", { class: "badge nr-badge" }, "[" + t.nr + "]") : null,
      el("div", { class: "progress" },
        el("div", { class: "progress-fill", style: `width:${Math.round(100 * i / tasks.length)}%` }))));
    prefetchAhead(i + 1);
    if (t.kind === "dictation" || t.tts_pl) {
      // zadanie ze słuchu: lektor gra ZAWSZE (nie podlega wyciszeniu), tempo z ustawień
      const isPl = !!t.tts_pl;
      const say = () => isPl ? speak(t.tts_pl, undefined, "pl") : speak(t.tts, undefined, "en");
      box.append(el("div", { class: "qtext" }, t.text),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say));
      say();                                   // od razu, bez sztucznego opóźnienia
    } else {
      box.append(el("div", { class: "qtext" }, t.text));
    }
    if (t.words) box.append(el("div", { class: "wordbank" }, ...t.words.map(w => el("span", { class: "chip" }, w))));

    if (t.options) {
      const opts = el("div", { class: "options stagger" });
      t.options.forEach((o, j) => opts.append(
        el("button", { class: "option", style: `animation-delay:${j * 55}ms`, onclick: () => submit(j) }, o)));
      box.append(opts, dunnoBtn());
    } else if (t.kind === "openpl") {
      const ta = el("textarea", { class: "input", placeholder: "Odpowiedz po polsku, 1–3 zdania…" });
      box.append(ta, el("div", { class: "fb-btns" },
        el("button", { class: "btn ok", onclick: () => submit(ta.value) }, "Sprawdź"), dunnoBtn()));
      ta.focus();
    } else {
      const inp = el("input", { class: "input", autocomplete: "off", placeholder: "Twoja odpowiedź…" });
      const send = el("button", { class: "btn ok", onclick: () => submit(inp.value.trim()) }, "Sprawdź");
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, el("div", { class: "fb-btns" }, send, dunnoBtn()));
      inp.focus();
    }
  }

  async function submit(val) {
    const unknown = val === UNKNOWN;
    if (unknown) val = "";
    box.querySelectorAll("button,input,textarea").forEach(b => b.disabled = true);
    const r = await API.post("/api/path/answer", { idx: i, answer: val, rt: Date.now() - t0, unknown });
    if (r.correct) { good++; if (r.xp) xpPop(r.xp); }
    box.innerHTML = "";

    // lektor czyta poprawną odpowiedź / pełne zdanie po angielsku (można wyciszyć)
    speakAuto(r.en || r.tts || r.answer);

    const wrongAnswer = !r.correct;
    // przy błędzie / „nie wiem" przepisujemy poprawną odpowiedź — po angielsku, jeśli jest
    // (w zadaniu „co znaczy X" odpowiedzią jest polskie znaczenie, ale utrwalać chcemy X)
    const t = tasks[i];
    let target = String(r.answer || "").trim();
    if (t.kind === "choice" && r.en) target = String(r.en).trim();
    if (t.kind === "openpl") target = "";                 // pytanie opisowe — nie ma czego przepisywać
    const canRetype = wrongAnswer && retypeOn && target && target.length <= 90;

    box.append(feedbackPanel({
      correct: r.correct, state: unknown ? "bad" : r.state, score: r.score,
      your: unknown ? "(nie wiem)" : r.your, answer: r.answer,
      pl: r.pl, en: r.en, tts: r.tts, explain: r.explain,
      rule: r.rule, ruleTitle: r.topic_name,
      extraHtml: r.model ? `<div class="fb-explain">📘 Wzorcowa odpowiedź: <b>${r.model}</b></div>` : "",
      onNext: () => {
        if (canRetype) showRetype(target);
        else { i++; render(); }
      },
    }));
  }

  // krok przepisywania poprawnej odpowiedzi (ta sama zasada co w fiszkach).
  // Nie wpływa na wynik sesji — serwer zapisał już pierwszą odpowiedź.
  function showRetype(target) {
    box.innerHTML = "";
    const wrap = el("div", { class: "fc-retype-box" },
      el("div", { class: "fc-retype-label" }, "✍️ Przepisz poprawnie, żeby utrwalić (nie liczy się do wyniku):"),
      el("div", { class: "fc-retype-target" }, target, " ",
        el("button", { class: "mini-tts", onclick: () => speak(target) }, "🔊")));
    const rInp = el("input", { class: "input", autocomplete: "off", autocapitalize: "off",
      spellcheck: "false", placeholder: "przepisz dokładnie…" });
    const rBtn = el("button", { class: "btn ok", onclick: tryRetype }, "Sprawdź ⏎");
    const skip = el("button", { class: "btn ghost", onclick: () => { i++; render(); } }, "Pomiń");
    rInp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); tryRetype(); } };
    wrap.append(rInp, el("div", { class: "fb-btns" }, rBtn, skip));
    box.append(wrap);
    rInp.focus();
    function tryRetype() {
      if (!rInp.value.trim()) return;
      if (answersMatch(rInp.value, target, { lang: "en", strict: true })) {
        if (typeof haptic === "function") haptic("good");
        toast("✔ Zapisane poprawnie");
        i++; render();
      } else {
        if (typeof haptic === "function") haptic("bad");
        rInp.classList.add("fc-shake");
        setTimeout(() => rInp.classList.remove("fc-shake"), 350);
        rInp.select();
      }
    }
  }

  async function finish() {
    const r = await API.post("/api/path/complete", { link: lid });
    exitFocus();
    box.innerHTML = "";
    if (r.passed) confetti();
    const pct = Math.round(r.score * 100);
    box.append(
      r.grade ? el("div", { class: "exam-grade grade-" + r.grade.grade },
        el("div", { class: "grade-num" }, String(r.grade.grade)),
        el("div", {}, el("b", {}, r.grade.name), el("div", { class: "muted" }, `${pct}% poprawnych`)))
        : el("h3", {}, r.passed ? "✅ Ukończone!" : "Jeszcze raz — brakuje trochę"),
      el("p", {}, `Wynik: ${good}/${tasks.length} (${pct}%) · próg ${Math.round(r.need * 100)}%`),
      el("div", { class: "fb-btns" },
        !r.passed && lid !== "custom" ? el("button", { class: "btn primary", onclick: () => runPathSession(lid) }, "Powtórz") : null,
        lid !== "custom" ? el("button", { class: "btn ghost", onclick: () => runPathSession(lid) }, "🔁 Inna liczba zadań") : null,
        el("button", { class: "btn " + (r.passed ? "primary" : "ghost"), onclick: onBack }, "← Powrót"),
        el("button", { class: "btn ghost", onclick: () => location.hash = "#dashboard" }, "Pulpit")));
  }

  render();
}

// ---------- sesja naprawcza ----------
function viewRepair() { runPathSession("repair"); }
