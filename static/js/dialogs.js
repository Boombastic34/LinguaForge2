// Rozmowy — symulacje dialogów z rozgałęzieniami
async function viewDialogs() {
  clearMain();
  const main = document.querySelector("main");
  const { dialogs } = await API.get("/api/dialogs");
  main.append(hero("💬", "Rozmowy",
    "Scenki jak w prawdziwym życiu: słyszysz rozmówcę, odpowiadasz, dostajesz reakcję", "teal",
    `${dialogs.length} scenek`));
  const card = el("div", { class: "card" });
  const list = el("div", { class: "chapter-list stagger" });
  dialogs.forEach((d, i) => {
    list.append(el("div", { class: "chapter" + (d.best != null ? " ch-done" : ""), style: `animation-delay:${i * 60}ms`,
      onclick: () => runDialog(d.id) },
      el("div", { class: "ch-status" }, d.emoji || "💬"),
      el("div", { class: "ch-body" },
        el("b", {}, d.name),
        el("div", { class: "muted small" }, d.desc),
        el("div", { class: "small counters" },
          `poziom ${d.level} · ${d.n} kwestii` + (d.best != null ? ` · najlepszy wynik ${d.best}%` : " · jeszcze nie grane")))));
  });
  card.append(list);
  main.append(card);
}

async function runDialog(did) {
  clearMain();
  const main = document.querySelector("main");
  const dlg = await API.get("/api/dialog/" + did);
  main.append(hero(dlg.emoji || "💬", dlg.name, dlg.desc, "teal", `poziom ${dlg.level}`));
  enterFocus({ title: dlg.emoji + " " + dlg.name, subtitle: "rozmowa", theme: "teal",
    onExit: () => viewDialogs() });
  const chat = el("div", { class: "card chat" });
  const box = el("div", { class: "card" });
  main.append(chat, box);

  let node = dlg.nodes[0], good = 0, total = 0;
  const log = [];

  function bubble(who, en, pl, cls) {
    const b = el("div", { class: "bubble " + cls + " pop-in" },
      el("div", { class: "bubble-who" }, who),
      el("div", { class: "bubble-en" }, en, " ",
        el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
      pl ? el("div", { class: "bubble-pl" }, pl) : null);
    chat.append(b);
    b.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function render() {
    if (!node || node === "END") return finish();
    focusProgress(total, dlg.nodes.length, `naturalnych: ${good}`);
    bubble("🧑 Rozmówca", node.npc_en, node.npc_pl, "b-npc");
    speakAuto(node.npc_en);      // można wyciszyć w pasku (🔊/🔇), przycisk 🔊 przy kwestii gra zawsze
    box.innerHTML = "";
    box.append(el("div", { class: "muted" }, "💡 " + (node.hint || "Twoja kolej — odpowiedz.")));
    if (node.mode === "choice") {
      const opts = el("div", { class: "options stagger" });
      node.options.forEach((o, i) => opts.append(
        el("button", { class: "option opt-dlg", style: `animation-delay:${i * 60}ms`, onclick: () => choose(o) },
          el("div", {}, o.en), el("div", { class: "muted small" }, o.pl))));
      box.append(opts);
    } else {
      const inp = el("input", { class: "input", autocomplete: "off", placeholder: "Napisz swoją odpowiedź po angielsku…" });
      const send = el("button", { class: "btn ok", onclick: () => write(inp.value.trim()) }, "Powiedz");
      inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
      box.append(inp, send);
      inp.focus();
    }
  }

  function choose(o) {
    total++;
    if (o.good) good++;
    bubble("🙋 Ty", o.en, o.pl, o.good ? "b-me" : "b-me b-me-bad");
    log.push({ said: o.en, good: o.good, note: o.feedback });
    box.innerHTML = "";
    box.append(feedbackPanel({
      correct: o.good, answer: o.en, pl: o.pl, explain: o.feedback,
      onNext: () => { node = nodeById(o.next); render(); },
    }));
  }

  async function write(val) {
    box.querySelectorAll("button,input").forEach(b => b.disabled = true);
    const r = await API.post("/api/dialog/write_check", { dialog: did, node: node.id, answer: val });
    total++;
    if (r.ok) good++;
    bubble("🙋 Ty", val || "…", "", r.state === "good" ? "b-me" : (r.state === "partial" ? "b-me b-me-part" : "b-me b-me-bad"));
    log.push({ said: val, good: r.ok, state: r.state,
               note: r.state === "good" ? "Zrozumiałe i poprawne."
                     : (r.state === "partial" ? "Częściowo dobrze — wzorzec: " + r.model
                                              : "Wzorzec: " + r.model) });
    box.innerHTML = "";
    box.append(feedbackPanel({
      correct: r.ok, state: r.state, score: r.score, your: val, answer: r.model,
      en: r.model, tts: r.model, explain: r.feedback,
      onNext: () => { node = nodeById(node.write.next); render(); },
    }));
  }

  function nodeById(id) {
    if (!id || id === "END") return "END";
    return dlg.nodes.find(n => n.id === id) || "END";
  }

  async function finish() {
    exitFocus();
    const r = await API.post("/api/dialog/done", { dialog: did, good, total });
    if (r.pct >= 60) confetti();
    box.innerHTML = "";
    box.append(el("h3", {}, r.pct >= 60 ? "🎉 Rozmowa poszła dobrze!" : "Rozmowa skończona — jest co poprawić"),
      el("p", {}, `Naturalnych odpowiedzi: ${good}/${total} (${r.pct}%) · +${r.xp} XP`),
      el("h4", {}, "Raport z rozmowy:"));
    log.forEach((l, i) => box.append(el("div", { class: "chapter" },
      el("div", { class: "ch-status" }, l.state === "partial" ? "◐" : (l.good ? "✔" : "✘")),
      el("div", { class: "ch-body" }, el("b", {}, l.said), el("div", { class: "muted small" }, l.note)))));
    box.append(el("div", { class: "fb-btns" },
      el("button", { class: "btn primary", onclick: () => runDialog(did) }, "🔁 Zagraj jeszcze raz"),
      el("button", { class: "btn ghost", onclick: viewDialogs }, "← Lista rozmów")));
  }

  render();
}
