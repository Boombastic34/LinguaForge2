// Lekcje jak podręcznik: rozdziały → teoria → ćwiczenia → praca domowa → quiz → sprawdzian z oceną
async function viewLessons() {
  clearMain();
  const main = document.querySelector("main");
  const data = await API.get("/api/lessons");
  main.append(hero("📚", "Lekcje", "Podręcznik: teoria → ćwiczenia → praca domowa → quiz → sprawdzian", "violet"));

  for (const u of data.units) {
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, `${u.name} (${u.level})`), el("p", { class: "muted" }, u.desc));
    const list = el("div", { class: "chapter-list stagger" });
    u.chapters.forEach((c, idx) => {
      const done = c.quiz_passed;
      const row = el("div", {
        class: "chapter" + (done ? " ch-done" : "") + (!c.unlocked ? " ch-locked" : ""),
        style: `animation-delay:${idx * 70}ms`,
        onclick: () => { if (c.unlocked) viewChapter(u.id, c.id); else toast("Najpierw zalicz poprzedni rozdział (quiz ≥ 60%).", true); },
      });
      row.append(
        el("div", { class: "ch-status" }, done ? "✅" : (c.unlocked ? "📖" : "🔒")),
        el("div", { class: "ch-body" },
          el("b", {}, c.name),
          el("div", { class: "muted small" }, c.intro),
          el("div", { class: "small counters" },
            `✏️ ${c.exercises_done}/${c.n_ex} ćwiczeń · 🏠 ${c.homework_done}/${c.n_hw} pracy domowej · 📝 quiz: ` +
            (c.quiz_score != null ? Math.round(c.quiz_score * 100) + "%" : "—") + ` (${c.n_quiz} pytań)`)));
      list.append(row);
    });
    card.append(list);

    const examRow = el("div", { class: "chapter exam-row" + (u.exam_unlocked ? "" : " ch-locked"),
      onclick: () => { if (u.exam_unlocked) viewExam(u.id); else toast("Sprawdzian odblokujesz po zaliczeniu wszystkich rozdziałów.", true); } });
    examRow.append(
      el("div", { class: "ch-status" }, u.exam ? "🎓" : (u.exam_unlocked ? "📝" : "🔒")),
      el("div", { class: "ch-body" },
        el("b", {}, `Sprawdzian końcowy (${u.exam_questions} pytań)`),
        el("div", { class: "muted small" }, u.exam
          ? `Najlepszy wynik: ${u.exam.pct}% — ocena ${u.exam.grade} (${u.exam.grade_name}), ${u.exam.date}`
          : "Ocena szkolna 1–6. Zaliczenie od 3 (55%).")));
    card.append(examRow);
    main.append(card);
  }
}

async function viewChapter(uid, cid) {
  clearMain();
  const main = document.querySelector("main");
  const c = await API.get(`/api/lesson/${uid}/${cid}`);
  main.append(hero("📖", c.name, c.intro, "violet",
    `${c.pages.length} str. teorii · ${c.exercises.length} ćwiczeń · ${c.homework.length} zad. dom. · ${c.quiz.length} pytań quizu`));
  const box = el("div", { class: "card" });
  main.append(box);
  enterFocus({ title: "📚 " + c.name, subtitle: "lekcja", theme: "violet",
    onExit: () => viewLessons() });
  let stage = "theory", page = 0, exIdx = 0, exGood = 0, hwIdx = 0, hwGood = 0, qIdx = 0, qGood = 0, t0 = 0;

  function render() {
    box.innerHTML = "";
    if (stage === "theory") return renderTheory();
    if (stage === "exercises") return renderItem(c.exercises, exIdx, "exercises", "✏️ Ćwiczenie");
    if (stage === "homework") return renderItem(c.homework, hwIdx, "homework", "🏠 Praca domowa");
    if (stage === "quiz") return renderItem(c.quiz, qIdx, "quiz", "📝 Quiz zaliczeniowy");
    renderSummary();
  }

  function renderTheory() {
    box.append(el("div", { class: "badge" }, `📄 Teoria — strona ${page + 1}/${c.pages.length}`),
      el("div", { class: "theory pop-in", html: c.pages[page] }));
    const btns = el("div", { class: "fb-btns" });
    if (page > 0) btns.append(el("button", { class: "btn ghost", onclick: () => { page--; render(); } }, "← Wstecz"));
    btns.append(el("button", { class: "btn primary", onclick: () => {
      if (page < c.pages.length - 1) { page++; render(); }
      else { stage = "exercises"; render(); }
    } }, page < c.pages.length - 1 ? "Dalej →" : "Przechodzę do ćwiczeń →"));
    box.append(btns);
  }

  function renderItem(list, idx, section, label) {
    if (idx >= list.length) return nextStage(section);
    const item = list[idx];
    t0 = Date.now();
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${label} ${idx + 1}/${list.length}`),
      el("div", { class: "progress" }, el("div", { class: "progress-fill", style: `width:${Math.round(idx / list.length * 100)}%` }))));
    const text = item.text || ("Przetłumacz: „" + (item.pl || "") + "”");
    if (item.type === "choice") {
      box.append(el("div", { class: "qtext" }, text));
      const opts = el("div", { class: "options stagger" });
      item.options.forEach((o, i) => opts.append(
        el("button", { class: "option", style: `animation-delay:${i * 60}ms`, onclick: () => submit(item, i, section) }, o)));
      box.append(opts);
    } else if (/_{2,}/.test(text)) {
      // ZDANIE Z LUKAMI: wpisujesz wprost w miejsce luki, w dowolnej kolejności
      const parts = text.split(/_{2,}/);
      const line = el("div", { class: "gap-line" });
      const gaps = [];
      parts.forEach((part, i) => {
        if (part) line.append(el("span", { class: "gap-text" }, part));
        if (i < parts.length - 1) {
          const g = el("input", {
            class: "gap-input", type: "text", autocomplete: "off",
            autocapitalize: "off", spellcheck: "false", size: 6,
          });
          g.oninput = () => { g.size = Math.max(6, g.value.length + 1); };
          g.onkeydown = e => {
            if (e.key === "Enter") { e.preventDefault(); send.click(); }
            // Tab/strzałki przechodzą do kolejnej luki
            if (e.key === "Tab" && !e.shiftKey && gaps[gaps.indexOf(g) + 1]) {
              e.preventDefault(); gaps[gaps.indexOf(g) + 1].focus();
            }
          };
          gaps.push(g);
          line.append(g);
        }
      });
      box.append(line,
        el("div", { class: "muted small" },
          gaps.length > 1 ? "Kliknij w dowolne miejsce i wpisz — kolejność dowolna, możesz poprawiać."
                          : "Kliknij w puste miejsce i wpisz odpowiedź."));
      const send = el("button", { class: "btn ok", onclick: () => {
        submit(item, gaps.map(g => g.value.trim()).filter(Boolean).join(" "), section);
      } }, "Sprawdź");
      box.append(el("div", { class: "fb-btns" }, send));
      gaps[0].focus();
    } else {
      box.append(el("div", { class: "qtext" }, text));
      if (item.type === "order") box.append(el("div", { class: "wordbank" },
        ...item.words.map(w => el("span", { class: "chip" }, w))));
      const inp = el("input", { class: "input", placeholder: item.type === "translate" ? "Tłumaczenie po angielsku…" : "Twoja odpowiedź…", autocomplete: "off" });
      const send = el("button", { class: "btn ok" }, "Sprawdź");
      send.onclick = () => submit(item, inp.value.trim(), section);
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, send);
      inp.focus();
    }
  }

  async function submit(item, val, section) {
    box.querySelectorAll("button,input").forEach(b => b.disabled = true);
    const r = await API.post("/api/lesson/answer", {
      unit: uid, chapter: cid, section, item: item.id, answer: val, rt: Date.now() - t0 });
    if (r.correct && r.xp) xpPop(r.xp);
    if (section === "exercises" && r.correct) exGood++;
    if (section === "homework" && r.correct) hwGood++;
    if (section === "quiz" && r.correct) qGood++;
    box.innerHTML = "";
    box.append(feedbackPanel({
      correct: r.correct, your: r.your, answer: r.answer, pl: r.pl, en: r.en, explain: r.explain,
      tts: /[a-z]/i.test(r.answer || "") ? r.answer : null,
      onNext: () => {
        if (section === "exercises") exIdx++;
        if (section === "homework") hwIdx++;
        if (section === "quiz") qIdx++;
        render();
      },
    }));
  }

  async function nextStage(section) {
    if (section === "exercises") {
      await API.post("/api/lesson/progress", { unit: uid, chapter: cid, section, done: c.exercises.length });
      stage = "homework";
    } else if (section === "homework") {
      await API.post("/api/lesson/progress", { unit: uid, chapter: cid, section, done: c.homework.length });
      stage = "quiz";
    } else {
      const score = qGood / c.quiz.length;
      await API.post("/api/lesson/progress", { unit: uid, chapter: cid, section: "quiz", score });
      stage = "summary";
    }
    render();
  }

  function renderSummary() {
    exitFocus();
    const score = qGood / c.quiz.length;
    const passed = score >= 0.6;
    if (passed) confetti();
    box.append(el("h3", {}, passed ? "🎉 Rozdział zaliczony!" : "Jeszcze raz quiz?"),
      el("p", {}, `Ćwiczenia: ${exGood}/${c.exercises.length} · Praca domowa: ${hwGood}/${c.homework.length} · Quiz: ${Math.round(score * 100)}% ${passed ? "(zaliczony ✅)" : "(potrzeba ≥60%)"}`),
      el("div", { class: "fb-btns" },
        !passed ? el("button", { class: "btn primary", onclick: () => { qIdx = 0; qGood = 0; stage = "quiz"; render(); } }, "Powtórz quiz") : null,
        el("button", { class: "btn " + (passed ? "primary" : "ghost"), onclick: () => viewLessons() }, "← Mapa lekcji")));
  }
  render();
}

async function viewExam(uid) {
  clearMain();
  const main = document.querySelector("main");
  const data = await API.get("/api/lessons");
  const u = data.units.find(x => x.id === uid);
  main.append(hero("🎓", "Sprawdzian: " + u.name, "Wszystkie pytania naraz — jak w szkole. Na końcu ocena.", "gold",
    `${u.exam_questions} pytań`));
  const box = el("div", { class: "card" });
  main.append(box);
  const ex = await API.get(`/api/lesson/${uid}/exam`);
  const answers = {};
  const form = el("div", { class: "exam-form" });
  ex.questions.forEach((q, i) => {
    const qa = el("div", { class: "exam-q" });
    qa.append(el("div", { class: "qtext" }, `${i + 1}. ${q.text || "Przetłumacz: „" + q.pl + "”"}`));
    if (q.type === "choice") {
      const opts = el("div", { class: "options" });
      q.options.forEach((o, j) => {
        const b = el("button", { class: "option", onclick: () => {
          answers[q.id] = j;
          opts.querySelectorAll(".option").forEach(x => x.classList.remove("selected"));
          b.classList.add("selected");
        } }, o);
        opts.append(b);
      });
      qa.append(opts);
    } else {
      const inp = el("input", { class: "input", placeholder: "Odpowiedź…", autocomplete: "off",
        oninput: e => { answers[q.id] = e.target.value.trim(); } });
      qa.append(inp);
    }
    form.append(qa);
  });
  box.append(form,
    el("button", { class: "btn primary", style: "margin-top:10px", onclick: submitExam }, "📤 Oddaję sprawdzian"));

  window.onbeforeunload = () => Object.keys(answers).length ? "Masz niezapisane odpowiedzi sprawdzianu." : null;

  async function submitExam() {
    window.onbeforeunload = null;
    if (Object.keys(answers).length < ex.questions.length &&
        !confirm("Nie odpowiedziałeś na wszystkie pytania. Oddać mimo to?")) return;
    const r = await API.post("/api/lesson/exam", { unit: uid, answers });
    box.innerHTML = "";
    if (r.grade.grade >= 3) confetti();
    box.append(
      el("div", { class: "exam-grade grade-" + r.grade.grade },
        el("div", { class: "grade-num" }, String(r.grade.grade)),
        el("div", {}, el("b", {}, r.grade.name), el("div", { class: "muted" }, `${r.pct}% · ${r.pass_note}`))),
      el("h4", {}, "Twój arkusz:"));
    const tbl = el("table", { class: "table" },
      el("tr", {}, el("th", {}, "Pytanie"), el("th", {}, "Twoja odpowiedź"), el("th", {}, "Poprawna"), el("th", {}, "")));
    r.results.forEach(row => tbl.append(el("tr", { class: row.correct ? "row-ok" : "row-bad" },
      el("td", {}, row.question), el("td", {}, row.your || "—"),
      el("td", {}, row.answer), el("td", {}, row.correct ? "✔" : "✘"))));
    box.append(tbl,
      el("button", { class: "btn primary", style: "margin-top:10px", onclick: () => viewLessons() }, "← Mapa lekcji"));
  }
}
