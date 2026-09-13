// Programy od nauczyciela — widok ucznia (v0.2: feedback panel, dyktanda, terminy)
async function viewPrograms() {
  const m = clearMain();
  const d = await API.get("/api/programs");
  m.append(hero("📋", "Programy od nauczyciela",
    d.programs.length ? "Zadania przygotowane specjalnie dla Ciebie" : "Nauczyciel nie przypisał Ci jeszcze programu.",
    "indigo", d.programs.length ? `${d.programs.length} programów` : ""));

  for (const p of d.programs.slice().reverse()) {
    const doneN = p.tasks.filter(t => t.done).length;
    const overdue = p.deadline && new Date(p.deadline) < new Date() && doneN < p.tasks.length;
    const card = el("div", { class: "card" },
      el("div", { class: "pl-top" },
        el("h3", {}, p.title),
        el("span", { class: "badge" }, `${doneN}/${p.tasks.length}`),
        p.deadline ? el("span", { class: "badge " + (overdue ? "tpast" : "") },
          (overdue ? "⏰ po terminie: " : "📅 termin: ") + p.deadline) : null),
      p.note ? el("p", { class: "muted" }, "📝 " + p.note) : null,
      el("div", { class: "progress" }, el("div", { class: "progress-fill", style: `width:${doneN / p.tasks.length * 100}%` })));
    const box = el("div", {});
    card.append(box);
    const idx = p.tasks.findIndex(t => !t.done);
    if (idx === -1) box.append(el("p", { class: "fb-good feedback" }, "✔ Program ukończony!"));
    else renderTask(p, idx, box);
    m.append(card);
  }

  function renderTask(p, idx, box) {
    box.innerHTML = "";
    if (idx >= p.tasks.length) { viewPrograms(); return; }
    const t = p.tasks[idx];
    let t0 = Date.now();
    if (t.type === "vocab") {
      box.append(el("p", { class: "muted" }, `📦 Słówko „${t.en} — ${t.pl}” trafiło do Twoich fiszek.`),
        el("button", { class: "btn primary", onclick: async () => {
          await API.post("/api/program/answer", { program: p.id, task: t.id, answer: "ok" });
          renderTask(p, idx + 1, box);
        } }, "OK, dalej →"));
      return;
    }
    if (t.type === "dictation") {
      const say = () => speak(t.en);
      box.append(el("div", { class: "qtext" }, "🎧 Dyktando — posłuchaj i zapisz zdanie."),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say));
      const inp = el("input", { class: "input", placeholder: "Wpisz po angielsku…", autocomplete: "off" });
      const send = el("button", { class: "btn ok", onclick: () => submit(inp.value.trim()) }, "Sprawdź");
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, send);
      say();
      return;
    }
    box.append(el("div", { class: "qtext" }, t.text || (t.pl ? "Przetłumacz: „" + t.pl + "”" : "")));
    if (t.type === "choice") {
      const opts = el("div", { class: "options stagger" });
      t.options.forEach((o, i) => opts.append(el("button", { class: "option", style: `animation-delay:${i * 60}ms`, onclick: () => submit(i) }, o)));
      box.append(opts);
    } else {
      const inp = el("input", { class: "input", placeholder: "Twoja odpowiedź…", autocomplete: "off" });
      const send = el("button", { class: "btn ok", onclick: () => submit(inp.value.trim()) }, "Sprawdź");
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, send);
    }

    async function submit(val) {
      box.querySelectorAll("button,input").forEach(b => b.disabled = true);
      const res = await API.post("/api/program/answer", { program: p.id, task: t.id, answer: val, rt: Date.now() - t0 });
      if (res.correct && res.xp) xpPop(res.xp);
      box.innerHTML = "";
      box.append(feedbackPanel({
        correct: res.correct, your: String(val), answer: res.answer, pl: res.pl,
        explain: res.explain, tts: /[a-z]/i.test(res.answer || "") ? res.answer : null,
        onNext: () => renderTask(p, idx + 1, box),
      }));
    }
  }
}
