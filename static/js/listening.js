// Słuchanie dwukierunkowe: dyktando EN + PL→EN
// Wynik procentowy + podświetlenie błędnych słów na czerwono.
async function viewListening() {
  clearMain();
  const main = document.querySelector("main");
  const stats = await API.get("/api/content/stats");
  main.append(hero("🎧", "Słuchanie", "Dyktando po angielsku albo: słyszysz po polsku → piszesz po angielsku", "violet",
    `${stats.listening + stats.placement.listening} dyktand · ${stats.placement.listening_pl} zadań PL→EN`));
  const box = el("div", { class: "card" });
  main.append(box);
  let t0 = 0;

  async function next() {
    box.innerHTML = "";
    const it = await API.get("/api/listen/next");
    t0 = Date.now();
    const isPl = it.mode === "pl";
    // prędkość lektora — osobna dla tego zadania, zapamiętywana w profilu
    let rate = ttsRate();
    const say = (q) => isPl ? speak(it.tts_pl, rate, "pl", q) : speak(it.tts, rate, "en", q);

    const speedRow = speedPicker(rate, v => { rate = v; say(false); });

    box.append(
      el("span", { class: "badge " + (isPl ? "tfut" : "") }, isPl ? "🔁 PL → EN" : "🎧 Dyktando EN"),
      el("div", { class: "qtext" }, isPl
        ? "Usłyszysz zdanie po polsku. Zapisz je PO ANGIELSKU."
        : "Posłuchaj i zapisz dokładnie, co słyszysz (po angielsku)."),
      el("button", { class: "btn primary big-play", onclick: () => say(false) }, "▶ Odtwórz"),
      speedRow,
      el("div", { class: "muted", style: "margin-bottom:8px" }, `poziom ${it.level} · możesz słuchać wiele razy`));
    const inp = el("input", { class: "input", placeholder: "Wpisz po angielsku…", autocomplete: "off",
      autocapitalize: "off", spellcheck: "false" });
    const send = el("button", { class: "btn ok" }, "Sprawdź");
    send.onclick = () => check(it, inp.value.trim(), rate);
    inp.onkeydown = e => { if (e.key === "Enter") send.click(); };
    box.append(inp, el("div", { class: "fb-btns" }, send));
    setTimeout(() => say(true), 350);   // automat cichy
    inp.focus();
  }

  async function check(it, val, rate) {
    box.querySelectorAll("button,input").forEach(b => b.disabled = true);
    const r = await API.post("/api/listen/check",
      { id: it.id, mode: it.mode, answer: val, rt: Date.now() - t0, rate });
    if (r.xp && r.correct) xpPop(r.xp);
    box.innerHTML = "";

    // wynik procentowy + podświetlenie błędnych słów
    let extra = null;
    const d = r.detail || {};
    if (r.kind === "dictation" && d.diff) {
      const words = d.diff.map(w => {
        if (w.ok) return `<span class="dw-ok">${escapeHtml(w.w)}</span>`;
        if (w.kind === "missing") return `<span class="dw-missing" title="brakujące słowo">${escapeHtml(w.exp)}</span>`;
        if (w.kind === "extra") return `<span class="dw-extra" title="słowo zbędne">${escapeHtml(w.w)}</span>`;
        return `<span class="dw-bad" title="powinno być: ${escapeHtml(w.exp)}">${escapeHtml(w.w || "—")}</span>`;
      }).join(" ");
      extra = `<div class="dict-score">Trafione słowa: <b>${d.hits}/${d.total}</b> · ${d.pct}%</div>
               <div class="diffbox">${words}</div>
               ${d.wrong && d.wrong.length
                 ? `<div class="dict-wrong">Do poprawy: <b>${d.wrong.map(escapeHtml).join(", ")}</b></div>` : ""}`;
    }
    box.append(feedbackPanel({
      correct: r.correct,
      score: typeof d.score === "number" ? d.score : undefined,
      your: val, answer: r.target, pl: r.pl,
      tts: r.target,
      explain: r.kind === "translate" && d.errors && d.errors.length
        ? d.errors.map(e => e.msg).join(" · ")
        : (r.correct ? "" : "Czerwone słowa napisałeś inaczej niż lektor."),
      extraHtml: extra || "",
      onNext: next,
    }));
  }
  next();
}

function escapeHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
