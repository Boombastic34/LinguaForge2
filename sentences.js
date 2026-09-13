// ============================================================
// Ścieżki zdaniowe — dwie osobne drogi oparte na jednym banku zdań:
//   ✍️ Tworzenie zdań  — widzisz zdanie po polsku, piszesz po angielsku,
//   🎧 Słuchanie zdań  — słyszysz zdanie i je zapisujesz.
// Etapy: słownictwo wg trudności · dwa wyrazy = inne znaczenie · czasy podstawowe.
// Po błędzie: przepisanie poprawnego zdania, oznaczanie nieznanych słów,
// a CAŁE błędne zdanie trafia do talii „📝 Zdania do poprawy".
// ============================================================

let SP_MODE = "build";

async function viewSentences() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/sentences/paths");

  main.append(hero("✍️", "Zdania",
    "Dwie ścieżki: buduj zdania po angielsku albo zapisuj to, co słyszysz", "violet"));

  // --- wybór ścieżki
  const modeRow = el("div", { class: "sp-modes" });
  Object.entries(d.modes).forEach(([id, label]) => modeRow.append(el("button", {
    class: "sp-mode" + (SP_MODE === id ? " active" : ""),
    onclick: () => { SP_MODE = id; viewSentences(); },
  }, label)));
  main.append(el("div", { class: "card" }, modeRow,
    el("p", { class: "muted small", style: "margin:8px 0 0" },
      SP_MODE === "build"
        ? "Dostajesz zdanie po polsku i piszesz je po angielsku. Po błędzie przepiszesz poprawną wersję, a całe zdanie trafi do talii „📝 Zdania do poprawy”."
        : "Słyszysz zdanie i zapisujesz je po angielsku. Tu nic nie trafia do fiszek automatycznie — do talii dodajesz tylko to, co sam zaznaczysz."),
    d.to_fix ? el("button", { class: "btn ok", style: "margin-top:10px",
      onclick: () => viewFlashcards("all", "poprawa") },
      `📝 Zdania do poprawy (${d.to_fix})`) : null));

  // --- etapy w grupach
  d.groups.forEach(g => {
    const box = el("div", { class: "card" }, el("h3", {}, g.name));
    g.stages.forEach(st => {
      const sc = st.scores[SP_MODE];
      box.append(el("button", {
        class: "sp-stage" + (sc ? " sp-done" : ""),
        onclick: () => runSentenceStage(SP_MODE, st.id),
      },
        el("span", { class: "sp-emoji" }, st.emoji),
        el("div", { class: "sp-body" },
          el("b", {}, st.name),
          el("div", { class: "muted small" }, st.short),
          el("div", { class: "muted small" },
            `${st.n} zdań · poziom ${st.level} · trudność ${"●".repeat(st.diff)}${"○".repeat(4 - st.diff)}`)),
        sc ? el("span", { class: "badge ok-badge" }, Math.round(sc.score * 100) + "%") : null));
    });
    main.append(box);
  });
}

async function runSentenceStage(mode, sid, n) {
  const main = document.querySelector("main");
  const info = await API.get(`/api/sentences/session/${mode}/${sid}` + (n ? `?n=${n}` : ""));
  if (info.choose) {
    clearMain();
    main.append(hero(mode === "build" ? "✍️" : "🎧", info.name, info.short, "violet"));
    main.append(sizePicker({
      pool: info.pool, suggested: info.suggested, unit: "zdań",
      subtitle: `Ten etap ma ${info.pool} zdań. ` +
        (mode === "build" ? "Piszesz je po angielsku z polskiego."
                          : "Słuchasz i zapisujesz — lektor czyta w Twoim tempie."),
      onStart: v => runSentenceStage(mode, sid, v),
      extra: el("button", { class: "btn ghost", style: "margin-top:8px", onclick: viewSentences }, "← Zdania"),
    }));
    return;
  }
  runSentenceSession(info, mode, sid);
}

function runSentenceSession(data, mode, sid) {
  clearMain();
  const main = document.querySelector("main");
  const box = el("div", { class: "card" });
  main.append(box);
  const tasks = data.tasks;
  let i = 0, good = 0, t0 = 0;

  enterFocus({ title: (mode === "build" ? "✍️ " : "🎧 ") + data.name,
    subtitle: `${tasks.length} zdań`, theme: "violet",
    listening: mode === "listen",
    onExit: () => { exitFocus(); viewSentences(); } });

  // w trybie słuchania nagrania pobieramy z wyprzedzeniem (tekst zna tylko serwer)
  async function prefetchAhead(from) {
    if (mode !== "listen") return;
    for (let k = from; k < Math.min(tasks.length, from + 3); k++) {
      try {
        const a = await API.get("/api/sentences/audio/" + tasks[k].idx);
        tasks[k]._tts = a.tts;
        prefetchTts(a.tts, "en");
      } catch (e) { /* nagranie pobierze się przy odtwarzaniu */ }
    }
  }
  prefetchAhead(0);

  async function render() {
    if (i >= tasks.length) return finish();
    const t = tasks[i];
    t0 = Date.now();
    box.innerHTML = "";
    focusProgress(i, tasks.length, `poprawnych: ${good}`);
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${tasks.length}`),
      el("div", { class: "progress" },
        el("div", { class: "progress-fill", style: `width:${Math.round(100 * i / tasks.length)}%` }))));

    const inp = el("input", { class: "input", autocomplete: "off", autocapitalize: "off",
      spellcheck: "false", placeholder: "Napisz całe zdanie po angielsku…" });
    const send = el("button", { class: "btn ok", onclick: () => submit(inp.value.trim()) }, "Sprawdź ⏎");
    const dunno = el("button", { class: "btn ghost", onclick: () => submit(null) }, "🤷 Nie wiem");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };

    if (mode === "build") {
      box.append(el("div", { class: "qtext" }, "✍️ Napisz po angielsku:"),
        el("div", { class: "sp-pl" }, t.pl));
    } else {
      if (!t._tts) {
        try { t._tts = (await API.get("/api/sentences/audio/" + t.idx)).tts; } catch (e) {}
      }
      const say = () => t._tts && speak(t._tts, undefined, "en");
      box.append(el("div", { class: "qtext" }, "🎧 Posłuchaj i zapisz zdanie:"),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say));
      say();
    }
    box.append(inp, el("div", { class: "fb-btns" }, send, dunno));
    inp.focus();
    prefetchAhead(i + 1);
  }

  async function submit(val) {
    const unknown = val === null;
    const r = await API.post("/api/sentences/answer",
      { idx: tasks[i].idx, answer: unknown ? "" : val, unknown, rt: Date.now() - t0 });
    if (r.correct) good++;
    haptic(r.correct ? "good" : "bad");
    speakAuto(r.answer);
    const diff = (!unknown && val) ? wordDiff(val, r.answer) : null;
    box.innerHTML = "";
    const fb = el("div", { class: "feedback " + (r.correct ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, r.correct ? "✔ Dobrze!" :
        (unknown ? "🤷 Nic nie szkodzi — zobacz, jak to brzmi" : `✘ Nie do końca (${Math.round(r.score * 100)}%)`)),
      (!r.correct && val) ? el("div", {}, "Twoja wersja: ", diff ? diff.your : el("b", {}, val)) : null,
      el("div", { class: "fb-pair" }, "Poprawnie: ", el("b", {}, r.answer), " ",
        el("button", { class: "mini-tts", onclick: () => speak(r.answer) }, "🔊")),
      el("div", { class: "muted" }, r.pl),
      r.note ? el("div", { class: "fb-explain" }, "💡 " + r.note) : null);
    // dotknij słowa, którego nie znasz — trafi do „🔥 Do utrwalenia"
    fb.append(wordChips(r.answer, r.pl));
    const sb = speakCheckButton(r.answer, "en");
    if (sb) fb.append(sb);
    if (r.to_fix) {
      fb.append(el("div", { class: "muted small", style: "margin-top:8px" },
        "📝 To zdanie trafiło do talii „Zdania do poprawy”."));
    } else if (!r.correct) {
      // słuchanie: nic nie trafia do fiszek samo — uczeń decyduje
      const add = el("button", { class: "btn ghost mini", onclick: async () => {
        await API.post("/api/sentences/tofix/add", { en: r.answer, pl: r.pl, note: r.note || "" });
        add.disabled = true; add.textContent = "📝 Dodane do poprawy";
        toast("📝 Zdanie trafiło do talii do poprawy");
      } }, "📝 Dodaj to zdanie do poprawy");
      fb.append(el("div", { style: "margin-top:8px" }, add));
    }
    box.append(fb);

    // po błędzie: przepisz poprawne zdanie (nie liczy się do wyniku, ale utrwala)
    const wrong = !r.correct;
    const next = el("button", { class: "btn primary", onclick: () => { i++; render(); } }, "Dalej →");
    if (wrong && LFSET.get("sp_retype", true)) {
      const rInp = el("input", { class: "input", autocomplete: "off", autocapitalize: "off",
        spellcheck: "false", placeholder: "przepisz poprawne zdanie…" });
      const rBtn = el("button", { class: "btn ok", onclick: () => {
        if (answersMatch(rInp.value, r.answer, { lang: "en", strict: true })) {
          toast("✔ Zapisane poprawnie");
          haptic("good");
          i++; render();
        } else {
          const d2 = wordDiff(rInp.value, r.answer);
          rInp.classList.add("shake");
          setTimeout(() => rInp.classList.remove("shake"), 400);
          const old = box.querySelector(".sp-retype-diff");
          if (old) old.remove();
          rBtn.parentNode.parentNode.insertBefore(
            el("div", { class: "sp-retype-diff" }, d2.your), rBtn.parentNode);
        }
      } }, "Sprawdź przepisanie");
      rInp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); rBtn.click(); } };
      box.append(el("div", { class: "fc-retype-box" },
        el("div", { class: "fc-retype-label" }, "✍️ Przepisz poprawne zdanie (nie liczy się do wyniku):"),
        el("div", { class: "fc-retype-target" }, r.answer),
        rInp, el("div", { class: "fb-btns" }, rBtn,
          el("button", { class: "btn ghost", onclick: () => { i++; render(); } }, "Pomiń →"))));
      setTimeout(() => rInp.focus(), 30);
    } else {
      box.append(el("div", { class: "fb-btns" }, next));
      setTimeout(() => { document.onkeydown = e => { if (e.key === "Enter") next.click(); }; }, 0);
    }
  }

  async function finish() {
    document.onkeydown = null;
    const r = await API.post("/api/sentences/complete", {});
    exitFocus();
    clearMain();
    const main2 = document.querySelector("main");
    main2.append(hero(r.passed ? "🏅" : "📘", r.passed ? "Etap zaliczony!" : "Jeszcze raz?",
      `Wynik: ${Math.round(r.score * 100)}% (potrzeba ${Math.round(r.need * 100)}%)`, "violet"));
    main2.append(el("div", { class: "card" },
      el("div", { class: "gr-big" }, Math.round(r.score * 100) + "%"),
      el("p", { class: "muted" }, `Poprawnych zdań: ${good} z ${tasks.length}.` +
        (r.to_fix ? ` W talii „Zdania do poprawy” czeka ${r.to_fix}.` : "")),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => runSentenceStage(mode, sid) }, "🔁 Jeszcze raz"),
        r.to_fix ? el("button", { class: "btn ok", onclick: () => viewFlashcards("all", "poprawa") },
          "📝 Popraw zdania") : null,
        el("button", { class: "btn ghost", onclick: viewSentences }, "← Etapy"))));
  }

  render();
}
