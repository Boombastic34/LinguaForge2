// Baza wiedzy: teoria (co to, kiedy, formuła, sygnały, przykłady, błędy) + sprawdzian opisowy PL
async function viewKnowledge() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/knowledge");
  main.append(hero("📖", "Baza wiedzy", "Teoria jak od nauczyciela: co to, kiedy używać, wzór, przykłady — i sprawdzian z rozumienia", "indigo",
    `${d.articles.length} tematów`));
  for (const cat of d.categories) {
    const card = el("div", { class: "card" }, el("h3", {}, `${cat.emoji} ${cat.name}`));
    const grid = el("div", { class: "kb-grid stagger" });
    d.articles.filter(a => a.cat === cat.id).forEach((a, i) => {
      grid.append(el("div", { class: "topic-card", style: `animation-delay:${i * 50}ms`, onclick: () => viewKbArticle(a.id) },
        el("div", { class: "topic-lvl" }, a.level),
        el("b", {}, a.name),
        el("div", { class: "muted small" }, a.what),
        a.n_quiz ? el("div", { class: "small", style: "margin-top:6px;color:#4c5fd5" }, `📝 sprawdzian: ${a.n_quiz} pytań opisowych`) : null));
    });
    card.append(grid);
    main.append(card);
  }
}

async function viewKbArticle(aid) {
  clearMain();
  const main = document.querySelector("main");
  const a = await API.get("/api/knowledge/" + aid);
  main.append(hero("📖", a.name, a.what, "indigo", a.level));
  main.append(el("button", { class: "btn ghost", onclick: viewKnowledge }, "← Baza wiedzy"));
  const box = el("div", { class: "card" });
  main.append(box);

  const sec = (title, node, cls) => box.append(
    el("div", { class: "kb-sec " + (cls || "") }, el("h4", {}, title), node));

  // ---------- pasek: odsłuchaj całą lekcję ----------
  const lessonText = buildLessonAudio(a);
  box.append(el("div", { class: "kb-toolbar" },
    el("button", { class: "btn primary", onclick: () => speak(lessonText, ttsRate(), "pl") },
      "🔊 Odsłuchaj lekcję"),
    speedPicker(ttsRate(), v => speak(lessonText, v, "pl")),
    a.practice && a.practice.length
      ? el("button", { class: "btn ok", onclick: () => runKbPractice(a) },
          `✍️ Ćwiczenia (${a.practice.length})`) : null));

  if (a.intro) box.append(el("div", { class: "kb-intro" }, a.intro));

  // ---------- TABELE ----------
  (a.tables || []).forEach(t => {
    const wrap = el("div", { class: "kb-table-wrap" });
    if (t.title) wrap.append(el("h4", {}, "📊 " + t.title));
    if (t.note) wrap.append(el("div", { class: "muted small" }, t.note));
    const scroll = el("div", { class: "kb-table-scroll" });
    const tbl = el("table", { class: "kb-table" });
    const thead = el("tr", {});
    t.head.forEach((h, i) => thead.append(el("th", { class: "kbt-c" + i }, h)));
    tbl.append(thead);
    t.rows.forEach(r => {
      const tr = el("tr", {});
      r.forEach((cell, i) => {
        const td = el("td", { class: "kbt-c" + i }, cell);
        if (i > 0) {
          td.classList.add("kbt-en");
          td.onclick = () => speak(cell);
          td.title = "kliknij, aby odsłuchać";
        }
        tr.append(td);
      });
      tbl.append(tr);
    });
    scroll.append(tbl);
    wrap.append(scroll);
    box.append(wrap);
  });

  // ---------- SEKCJE OPISOWE ----------
  (a.sections || []).forEach(s => {
    const card = el("div", { class: "kb-block kb-" + (s.color || "indigo") });
    card.append(el("div", { class: "kb-block-head" },
      el("span", { class: "kb-block-emo" }, s.emoji || "•"),
      el("b", {}, s.title)));
    (s.text || "").split("\n").forEach(line => {
      if (line.trim()) card.append(el("div", { class: "kb-block-txt" }, line));
    });
    (s.examples || []).forEach(([en, pl]) => card.append(el("div", { class: "kb-ex" },
      el("div", { class: "en" }, el("b", {}, en), " ",
        el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
      el("div", { class: "muted" }, pl))));
    if (s.tip) card.append(el("div", { class: "kb-tip" }, "💡 " + s.tip));
    box.append(card);
  });

  // ---------- klasyczne pola (gdy artykuł ich jeszcze nie ma rozbitych) ----------
  if (!a.sections || !a.sections.length) {
    const whenUl = el("ul", {});
    (a.when || []).forEach(w => whenUl.append(el("li", {}, w)));
    if (whenUl.children.length) sec("Kiedy używać?", whenUl);

    const form = el("div", { class: "kb-form" });
    if (a.form && a.form.plus && a.form.plus !== "—") form.append(el("div", {}, "➕ Twierdzenie: " + a.form.plus));
    if (a.form && a.form.minus && a.form.minus !== "—") form.append(el("div", {}, "➖ Przeczenie: " + a.form.minus));
    if (a.form && a.form.question && a.form.question !== "—") form.append(el("div", {}, "❓ Pytanie: " + a.form.question));
    if (form.children.length) sec("Formuła (wzór)", form);

    const exs = el("div", {});
    (a.examples || []).forEach(([en, pl]) => exs.append(el("div", { class: "kb-ex" },
      el("div", { class: "en" }, el("b", {}, en), " ",
        el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
      el("div", { class: "muted" }, pl))));
    if (exs.children.length) sec("Przykłady", exs);
  }

  if (a.signals && a.signals.length) {
    const sig = el("div", { class: "kb-sig" });
    a.signals.forEach(s => sig.append(el("span", { class: "chip" }, s), " "));
    sec("Słowa-sygnały", sig);
  }

  const mis = el("div", {});
  (a.mistakes || []).forEach(x => mis.append(el("div", { class: "kb-mistake" }, "⚠ " + x)));
  if (mis.children.length) sec("Typowe błędy Polaków", mis, "kb-sec-warn");

  // ---------- co dalej ----------
  const next = el("div", { class: "fb-btns", style: "margin-top:14px" });
  if (a.practice && a.practice.length)
    next.append(el("button", { class: "btn ok big", onclick: () => runKbPractice(a) },
      `✍️ Poćwicz w praktyce (${a.practice.length} zadań)`));
  if (a.quiz && a.quiz.length)
    next.append(el("button", { class: "btn primary big", onclick: () => runKbQuiz(a) },
      `📝 Sprawdzian (${a.quiz.length} pytań)`));
  box.append(next);
}

// tekst całej lekcji do odczytania na głos
function buildLessonAudio(a) {
  const parts = [a.name, a.intro || a.what || ""];
  (a.sections || []).forEach(s => {
    parts.push(s.title);
    parts.push((s.text || "").replace(/\n/g, ". "));
    if (s.tip) parts.push("Wskazówka: " + s.tip);
  });
  if (!a.sections || !a.sections.length) (a.when || []).forEach(w => parts.push(w));
  return parts.filter(Boolean).join(". ");
}

// ---------- ĆWICZENIA PRAKTYCZNE (przed sprawdzianem) ----------
function runKbPractice(a) {
  clearMain();
  const main = document.querySelector("main");
  enterFocus({ title: "✍️ " + a.name, subtitle: "ćwiczenia", theme: "teal",
    onExit: () => viewArticle(a.id) });
  const box = el("div", { class: "card" });
  main.append(box);
  let i = 0, good = 0;
  const items = a.practice;

  show();
  function show() {
    if (i >= items.length) return done();
    const q = items[i];
    box.innerHTML = "";
    focusProgress(i, items.length, `poprawnych: ${good}`);
    box.append(
      el("div", { class: "pl-top" }, el("span", { class: "badge" }, `${i + 1}/${items.length}`)),
      el("div", { class: "gap-sentence" },
        ...q.text.split("___").flatMap((part, n, arr) =>
          n < arr.length - 1 ? [el("span", {}, part), el("span", { class: "gap-slot" }, "?")]
                             : [el("span", {}, part)])),
      el("div", { class: "muted", style: "margin-bottom:10px" }, q.pl));
    const opts = el("div", { class: "options" });
    q.options.forEach(o => opts.append(el("button", { class: "option", onclick: () => pick(o) }, o)));
    box.append(opts);
  }

  function pick(choice) {
    const q = items[i];
    const ok = choice.toLowerCase() === q.answer.toLowerCase();
    if (ok) good++;
    if (typeof haptic === "function") haptic(ok ? "good" : "bad");
    const filled = q.text.replace("___", q.answer);
    speakAuto(filled);
    box.innerHTML = "";
    box.append(el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, ok ? "✔ Dobrze!" : "✘ Niestety nie"),
      !ok ? el("div", {}, "Twoja odpowiedź: ", el("b", {}, choice)) : null,
      el("div", { class: "gap-sentence gap-done" }, filled, " ",
        el("button", { class: "mini-tts", onclick: () => speak(filled) }, "🔊")),
      el("div", { class: "muted" }, q.pl),
      el("div", { class: "fb-explain" }, "💡 Dlaczego: " + q.why)));
    const next = el("button", { class: "btn primary big", onclick: () => { i++; show(); } },
      i + 1 >= items.length ? "Podsumowanie →" : "Dalej →");
    box.append(el("div", { class: "fb-btns" }, next));
    next.focus();
  }

  function done() {
    exitFocus();
    const pct = Math.round(100 * good / items.length);
    if (pct >= 80) confetti();
    box.innerHTML = "";
    box.append(el("h3", {}, "Ćwiczenia zakończone"),
      el("p", {}, `Wynik: ${good}/${items.length} (${pct}%)`),
      el("div", { class: "fb-btns" },
        a.quiz && a.quiz.length
          ? el("button", { class: "btn primary", onclick: () => runKbQuiz(a) }, "📝 Teraz sprawdzian") : null,
        el("button", { class: "btn ghost", onclick: () => runKbPractice(a) }, "🔁 Jeszcze raz"),
        el("button", { class: "btn ghost", onclick: () => viewArticle(a.id) }, "← Teoria")));
  }
}

function runKbQuiz(a) {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("📝", "Sprawdzian z rozumienia: " + a.name,
    "Odpowiadasz PO POLSKU, własnymi słowami — liczy się sens, nie formułka", "gold",
    `${a.quiz.length} pytań`));
  const box = el("div", { class: "card" });
  main.append(box);
  let i = 0, total = 0, t0 = 0;

  function next() {
    if (i >= a.quiz.length) return finish();
    const q = a.quiz[i];
    t0 = Date.now();
    box.innerHTML = "";
    box.append(
      el("div", { class: "pl-top" },
        el("span", { class: "badge" }, `Pytanie ${i + 1}/${a.quiz.length}`),
        el("div", { class: "progress" }, el("div", { class: "progress-fill", style: `width:${Math.round(i / a.quiz.length * 100)}%` }))),
      el("div", { class: "qtext" }, q.q),
      el("div", { class: "muted small" }, "Napisz 1–3 zdania po polsku."));
    const ta = el("textarea", { class: "input", placeholder: "Twoja odpowiedź po polsku…" });
    box.append(el("details", { class: "kb-criteria" },
      el("summary", {}, "❓ Jak oceniana jest ta odpowiedź?"),
      el("div", { class: "muted small" },
        "System szuka w odpowiedzi kilku POJĘĆ, nie konkretnych zdań. Z każdej grupy pojęć "
        + "musi paść przynajmniej jedno słowo — wystarczy sam rdzeń, np. „dzierżawcz” zaliczy "
        + "„dzierżawczy” i „dzierżawcze”. Wynik = ile grup trafiłeś. Odpowiedź krótsza niż "
        + "3 słowa nie jest oceniana. Po sprawdzeniu zobaczysz, których wątków zabrakło.")));
    const send = el("button", { class: "btn ok", onclick: check }, "Sprawdź");
    box.append(ta, send);
    ta.focus();

    async function check() {
      box.querySelectorAll("button,textarea").forEach(b => b.disabled = true);
      const r = await API.post("/api/knowledge/check", { article: a.id, q_idx: i, answer: ta.value, rt: Date.now() - t0 });
      total += r.score;
      if (r.correct && r.xp) xpPop(r.xp);
      box.innerHTML = "";
      box.append(feedbackPanel({
        correct: r.correct,
        your: ta.value,
        answer: `${Math.round(r.score * 100)}% sensu trafione`,
        pl: null,
        explain: r.msg,
        extraHtml: `<div class="fb-explain">📘 Wzorcowa odpowiedź: <b>${r.model}</b></div>`,
        onNext: () => { i++; next(); },
      }));
    }
  }

  function finish() {
    const pct = Math.round(100 * total / a.quiz.length);
    if (pct >= 60) confetti();
    box.innerHTML = "";
    box.append(el("h3", {}, pct >= 60 ? "🎉 Rozumiesz ten temat!" : "Warto wrócić do teorii"),
      el("p", {}, `Wynik: ${pct}% sensu.` + (pct < 60 ? " Przeczytaj artykuł jeszcze raz i spróbuj ponownie." : "")),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => viewKbArticle(a.id) }, "← Do artykułu"),
        el("button", { class: "btn ghost", onclick: viewKnowledge }, "Baza wiedzy")));
  }
  next();
}
