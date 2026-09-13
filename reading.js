// Czytanie — klikasz nieznane słowo, dostajesz tłumaczenie i dodajesz je do fiszek
async function viewReading() {
  clearMain();
  const main = document.querySelector("main");
  const { texts } = await API.get("/api/reading");
  main.append(hero("📖", "Czytanie", "Kliknij dowolne słowo w tekście — zobaczysz tłumaczenie i dodasz je do fiszek", "violet",
    `${texts.length} tekstów`));
  const card = el("div", { class: "card" });
  const list = el("div", { class: "chapter-list stagger" });
  texts.forEach((t, i) => list.append(el("div", {
    class: "chapter" + (t.done != null ? " ch-done" : ""), style: `animation-delay:${i * 60}ms`,
    onclick: () => runReading(t.id),
  },
    el("div", { class: "ch-status" }, t.emoji),
    el("div", { class: "ch-body" },
      el("b", {}, t.title),
      el("div", { class: "muted small" },
        `poziom ${t.level} · ${t.words} słów · ${t.questions} pytań` +
        (t.done != null ? ` · najlepszy wynik ${t.done}%` : " · jeszcze nieczytane"))))));
  card.append(list);
  main.append(card);
}

async function runReading(tid) {
  clearMain();
  const main = document.querySelector("main");
  const t = await API.get("/api/reading/" + tid);
  main.append(hero(t.emoji || "📖", t.title,
    "Kliknij słowo, którego nie znasz — pojawi się tłumaczenie", "violet", `poziom ${t.level}`));

  let saved = 0;
  const savedBadge = el("span", { class: "badge" }, "0 słówek zapisanych");
  const toolbar = el("div", { class: "read-toolbar" },
    el("button", { class: "btn mini", onclick: () => speak(t.text.replace(/\n+/g, ". ")) }, "🔊 Przeczytaj tekst"),
    el("button", { class: "btn mini", onclick: stopSpeaking }, "⏹ Stop"),
    speedPicker(ttsRate(), null),
    el("button", { class: "btn mini", onclick: togglePl }, "🇵🇱 Tłumaczenie tekstu"),
    savedBadge);

  const article = el("div", { class: "read-text" });
  t.text.split(/\n\n+/).forEach(par => {
    const p = el("p", {});
    par.split(/(\s+)/).forEach(tok => {
      if (/^\s+$/.test(tok)) { p.append(document.createTextNode(tok)); return; }
      const clean = tok.replace(/[^A-Za-z'-]/g, "");
      if (!clean) { p.append(document.createTextNode(tok)); return; }
      const before = tok.slice(0, tok.indexOf(clean));
      const after = tok.slice(tok.indexOf(clean) + clean.length);
      if (before) p.append(document.createTextNode(before));
      p.append(el("span", { class: "rw", onclick: e => lookup(clean, e.target) }, clean));
      if (after) p.append(document.createTextNode(after));
    });
    article.append(p);
  });

  const plBox = el("div", { class: "pass-pl", style: "display:none" });
  (t.text_pl || "").split(/\n\n+/).forEach(par => plBox.append(el("p", {}, par)));
  function togglePl() { plBox.style.display = plBox.style.display === "none" ? "" : "none"; }

  const readCard = el("div", { class: "card" }, toolbar, article, plBox,
    el("button", { class: "btn primary big", style: "margin-top:12px", onclick: showQuestions },
      `Rozumiem — pytania (${t.questions.length}) →`));
  main.append(readCard);

  // --- dymek ze słowem
  let pop = null;
  async function lookup(word, target) {
    if (pop) pop.remove();
    target.classList.add("rw-active");
    pop = el("div", { class: "word-pop" }, el("div", { class: "muted small" }, "szukam…"));
    document.body.append(pop);
    const r = target.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 300, r.left)) + "px";
    pop.style.top = (window.scrollY + r.bottom + 8) + "px";
    try {
      const w = await API.get("/api/reading/word/" + word.toLowerCase());
      pop.innerHTML = "";
      pop.append(
        el("div", { class: "wp-head" },
          el("b", {}, w.en), " ",
          el("button", { class: "mini-tts", onclick: () => speak(w.en) }, "🔊"),
          el("span", { class: "wp-src" }, w.src)),
        el("div", { class: "wp-pl" }, w.pl),
        w.note ? el("div", { class: "muted small" }, w.note) : null,
        w.example ? el("div", { class: "muted small", style: "margin-top:4px" }, "„" + w.example + "”") : null,
        el("div", { class: "fb-btns", style: "margin-top:8px" },
          w.known
            ? el("span", { class: "badge" }, "✔ masz w fiszkach")
            : el("button", { class: "btn mini ok", onclick: async e => {
                await API.post("/api/reading/save_word", { en: w.en, pl: w.pl, example: w.example || "", level: t.level });
                saved++;
                savedBadge.textContent = saved + " słówek zapisanych";
                e.target.replaceWith(el("span", { class: "badge" }, "✔ dodano do fiszek"));
                toast("Dodano „" + w.en + "” do Twoich fiszek");
              } }, "➕ Dodaj do fiszek"),
          el("button", { class: "btn mini ghost", onclick: closePop }, "Zamknij")));
    } catch (e) {
      pop.innerHTML = "";
      pop.append(el("div", {}, "Nie mam tłumaczenia tego słowa."),
        el("button", { class: "btn mini ghost", onclick: closePop }, "Zamknij"));
    }
    function closePop() { pop.remove(); pop = null; target.classList.remove("rw-active"); }
  }

  // --- pytania
  function showQuestions() {
    if (t.questions.length > 3) {
      clearMain();
      const mq = document.querySelector("main");
      mq.append(hero("❓", "Pytania: " + t.title, "", "violet"));
      mq.append(sizePicker({
        title: "Ile pytań chcesz rozwiązać?", pool: t.questions.length, unit: "pytań", suggested: 3,
        onStart: n => { if (n !== "all") t.questions = t.questions.slice(0, n); askQuestions(); },
      }));
      return;
    }
    askQuestions();
  }

  function askQuestions() {
    clearMain();
    enterFocus({ title: "❓ " + t.title, subtitle: "pytania do tekstu", theme: "violet",
      onExit: () => viewReading() });
    const m2 = document.querySelector("main");
    m2.append(hero("❓", "Pytania: " + t.title, "Sprawdź, ile zrozumiałeś", "violet",
      `${t.questions.length} pytań`));
    const box = el("div", { class: "card" });
    m2.append(box);
    const answers = {};
    let i = 0;
    render();
    function render() {
      if (i >= t.questions.length) return submit();
      const q = t.questions[i];
      box.innerHTML = "";
      focusProgress(i, t.questions.length, "");
      box.append(el("div", { class: "pl-top" },
        el("span", { class: "badge" }, `${i + 1}/${t.questions.length}`),
        el("div", { class: "progress" },
          el("div", { class: "progress-fill", style: `width:${Math.round(100 * i / t.questions.length)}%` }))),
        el("details", { class: "path-sec" }, el("summary", {}, "📄 Pokaż tekst"),
          el("div", { class: "read-text small" }, t.text)),
        el("div", { class: "qtext" }, q.text));
      const opts = el("div", { class: "options stagger" });
      q.options.forEach((o, j) => opts.append(
        el("button", { class: "option", onclick: () => { answers[i] = j; i++; render(); } }, o)));
      box.append(opts,
        el("button", { class: "btn ghost", onclick: () => { answers[i] = -1; i++; render(); } }, "🤷 Nie wiem"),
        el("div", { class: "keyhint" }, "klawisze 1–4 wybierają odpowiedź"));
    }
    async function submit() {
      exitFocus();
      const r = await API.post("/api/reading/done", { id: tid, answers, saved });
      box.innerHTML = "";
      if (r.pct >= 60) confetti();
      box.append(el("h3", {}, r.pct >= 60 ? "🎉 Dobre zrozumienie!" : "Warto przeczytać jeszcze raz"),
        el("p", {}, `Wynik: ${r.pct}% · +${r.xp} XP` + (saved ? ` · zapisane słówka: ${saved}` : "")));
      r.results.forEach((row, n) => {
        box.append(el("div", { class: "feedback " + (row.correct ? "fb-good" : "fb-bad"), style: "margin-top:10px" },
          el("div", { class: "fb-head" }, `${n + 1}. ${row.question}`),
          el("div", { class: "fb-options" },
            ...row.options.map(o => el("div", {
              class: "fb-opt" + (o.correct ? " fb-opt-good" : "") + (o.chosen && !o.correct ? " fb-opt-bad" : ""),
            }, (o.correct ? "✔ " : (o.chosen ? "✘ " : "· ")), el("b", {}, o.en), o.pl ? " — " + o.pl : "")))
          , row.pl ? el("div", { class: "fb-explain" }, "💡 " + row.pl) : null));
      });
      box.append(el("div", { class: "fb-btns", style: "margin-top:12px" },
        el("button", { class: "btn primary", onclick: viewReading }, "← Lista tekstów"),
        el("button", { class: "btn ghost", onclick: () => runReading(tid) }, "🔁 Przeczytaj ponownie")));
    }
  }
}
