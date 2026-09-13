// Test poziomujący 2.0
const MODULE_INFO = {
  vocab: ["🧠", "Słownictwo — rozpoznawanie", "Wybierz właściwe znaczenie."],
  produce: ["✍️", "Słownictwo — pisanie", "Napisz słowo po angielsku. To sprawdza PRAWDZIWĄ znajomość."],
  grammar: ["📐", "Gramatyka", "Trudność dostosowuje się do Twoich odpowiedzi."],
  reading: ["📖", "Czytanie ze zrozumieniem", "Odpowiedzi są sparafrazowane — szukaj sensu, nie identycznych słów."],
  translation: ["🌐", "Tłumaczenie", "Przetłumacz całe zdanie."],
  listening: ["🎧", "Słuchanie — dyktando", "Posłuchaj i zapisz po angielsku."],
  listening_pl: ["🔁", "Słuchanie PL → EN", "Usłyszysz polskie zdanie — zapisz je po angielsku."],
};

async function viewPlacement() {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("🧭", "Test poziomujący", "≈49 pytań · 15–25 minut · wynik ustawia Twój plan nauki", "indigo"));
  const box = el("div", { class: "card placement-card" });
  main.append(el("div", { class: "skip-bar" },
    el("span", { class: "muted small" }, "Nie masz czasu na cały test?"),
    (() => {
      const lvl = levelSelect("A1");
      const btn = el("button", { class: "btn ghost mini-skip", onclick: async () => {
        await API.post("/api/placement/skip", { level: lvl.value || "A1" });
        toast("Test pominięty — poziom ustawiony ręcznie");
        location.hash = "#path";
      } }, "⏭ Pomiń test");
      return el("span", { class: "set-row", style: "margin:0" }, lvl, btn);
    })()));
  main.append(box);

  let qStart = 0;

  function showQuestion(payload) {
    box.innerHTML = "";
    if (payload.module === "done") return;
    const [emo, name, tip] = MODULE_INFO[payload.module] || ["❓", payload.module, ""];
    const pct = Math.round((payload.progress || 0) * 100);
    focusProgress(pct, 100, name);
    box.append(
      el("div", { class: "pl-top" },
        el("span", { class: "badge" }, `${emo} ${name}`),
        el("div", { class: "progress" }, el("div", { class: "progress-fill", style: `width:${pct}%` })),
        el("span", { class: "muted" }, pct + "%")),
      el("div", { class: "muted pl-tip" }, tip));
    const q = payload.q;
    qStart = Date.now();

    if (q.passage) {
      const pass = el("div", { class: "passage" },
        el("b", {}, q.title || "Tekst"), " ",
        el("span", { class: "badge" }, q.level || ""), el("p", {}, q.passage));
      if (q.passage_pl) {
        const plBox = el("div", { class: "pass-pl", style: "display:none" }, "🇵🇱 " + q.passage_pl);
        pass.append(el("button", { class: "mini-tts", onclick: () => {
          plBox.style.display = plBox.style.display === "none" ? "" : "none";
        } }, "🇵🇱 pokaż/ukryj tłumaczenie tekstu"), plBox);
      }
      box.append(pass);
    }
    if (q.type === "dictation" || q.type === "dictation_pl") {
      const isPl = q.type === "dictation_pl";
      const say = () => speak(isPl ? q.tts_pl : q.tts, undefined, isPl ? "pl" : "en");
      box.append(
        el("div", { class: "qtext" }, q.text),
        el("div", { class: "fb-btns" },
          el("button", { class: "btn primary big-play", onclick: say }, "▶ Odtwórz"),
          el("button", { class: "btn ghost", onclick: say }, "🔁 Powtórz")),
        speedPicker(ttsRate(), say),
        el("div", { class: "muted", style: "margin:4px 0 8px" }, "Możesz słuchać wiele razy."));
      const inp = el("input", { class: "input", placeholder: "Wpisz zdanie po angielsku…", autocomplete: "off" });
      const send = el("button", { class: "btn ok" }, "Sprawdź");
      send.onclick = () => submit(q.id, inp.value.trim());
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, send);
      say();
      inp.focus();
      return;
    }
    box.append(el("div", { class: "qtext" }, q.text));
    if (q.type === "choice") {
      const opts = el("div", { class: "options stagger" });
      q.options.forEach((o, i) =>
        opts.append(el("button", { class: "option", style: `animation-delay:${i * 60}ms`, onclick: () => submit(q.id, i) }, o)));
      box.append(opts, el("button", { class: "btn ghost", onclick: () => submit(q.id, -1, true) }, "🤷 Nie wiem"));
    } else {
      if (q.hint) box.append(el("div", { class: "muted" }, "Podpowiedź: " + q.hint));
      const inp = el("input", { class: "input", placeholder: "Wpisz po angielsku…", autocomplete: "off" });
      const send = el("button", { class: "btn ok" }, "Sprawdź");
      send.onclick = () => submit(q.id, inp.value.trim());
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, el("div", { class: "fb-btns" }, send,
        el("button", { class: "btn ghost", onclick: () => submit(q.id, "", true) }, "🤷 Nie wiem")));
      inp.focus();
    }
  }

  async function submit(id, answer, unknown) {
    const rt = Date.now() - qStart;
    box.querySelectorAll("button,input").forEach(b => b.disabled = true);
    const { feedback } = await API.post("/api/placement/answer", { id, answer, rt, unknown: !!unknown });
    if (unknown) feedback.your = "(nie wiem)";
    showFeedback(feedback);
  }

  function showFeedback(fb) {
    box.innerHTML = "";
    box.append(feedbackPanel({
      correct: fb.correct, your: fb.your, answer: fb.answer, pl: fb.pl, en: fb.en,
      explain: fb.explain || (fb.detail && fb.detail.hint) || "",
      tts: fb.tts || (typeof fb.answer === "string" && /[a-z]/i.test(fb.answer || "") ? fb.answer : null),
      askKnown: fb.ask_known && !fb.unknown,
      options: fb.options,
      onNext: (guessed) => confirmAndNext(guessed),
    }));
    if (fb.detail && fb.detail.errors && fb.detail.errors.length) {
      const ul = el("ul", { class: "errlist" });
      fb.detail.errors.forEach(e => ul.append(el("li", {}, e.msg)));
      box.append(ul);
    }
  }

  async function confirmAndNext(guessed) {
    const res = await API.post("/api/placement/confirm", { guessed });
    if (res.done) return showResult(res.result);
    showQuestion(res.next);
  }

  function showResult(r) {
    exitFocus();
    confetti();
    box.innerHTML = "";
    box.append(el("h2", {}, `Twój poziom: ${r.level}`),
      el("p", { class: "muted" },
        `Test: ${r.questions} pytań · szacowany zasób słów: ~${r.vocab_size_est}` +
        (r.guessed ? ` · zgadnięć: ${r.guessed} (policzone z mniejszą wagą)` : "")));
    const grid = el("div", { class: "cefr-grid" });
    for (const [k, v] of Object.entries(r.cefr)) {
      const names = { vocab: "Słownictwo", grammar: "Gramatyka", reading: "Czytanie", listening: "Słuchanie", writing: "Pisanie" };
      grid.append(el("div", { class: "cefr-cell" },
        el("div", { class: "big" }, v), el("div", { class: "muted" }, names[k] || k)));
    }
    box.append(grid,
      el("button", { class: "btn primary", onclick: () => { location.hash = "#dashboard"; } },
        "Przejdź do pulpitu →"));
  }

  enterFocus({ title: "🧭 Test poziomujący", subtitle: "trwa test", theme: "indigo",
    onExit: () => { exitFocus(); location.hash = "#dashboard"; location.reload(); } });
  const first = await API.post("/api/placement/start", {});
  showQuestion(first);
}
