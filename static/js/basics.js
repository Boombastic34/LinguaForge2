// ================= PODSTAWY — kurs: teoria, ćwiczenia, test =================
// Rozdział = teoria (z tabelą-ściągą) → ćwiczenia z wyjaśnieniem „dlaczego tak i dlaczego
// nie inaczej" → test bez podpowiedzi. Zdany test (≥70%) zalicza ogniwo Ścieżki.

async function viewBasics() {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("🎒", "Podstawy", "Gramatyka A1–A2: teoria, ćwiczenia i test w każdym temacie", "indigo"));

  let data;
  try {
    data = await API.get("/api/basics");
  } catch (e) {
    main.append(el("div", { class: "card" },
      el("h3", {}, "Nie udało się wczytać Podstaw"),
      el("p", { class: "muted" }, String(e.message || e)),
      el("button", { class: "btn primary", onclick: () => location.reload() }, "🔄 Odśwież")));
    return;
  }
  const topics = data.topics || [];
  if (!topics.length) {
    main.append(el("div", { class: "card" },
      el("h3", {}, "Brak treści do wyświetlenia"),
      el("p", { class: "muted" }, "Serwer nie znalazł pliku data/podstawy/kursy.json.")));
    return;
  }

  const list = el("div", { class: "basics-grid" });
  topics.forEach(t => {
    const pct = t.test_pct != null ? t.test_pct : null;
    const state = pct != null && pct >= 70 ? "done" : (t.read || t.practice_pct != null ? "started" : "new");
    list.append(el("div", { class: "basics-card bc-" + state, onclick: () => viewBasicsTopic(t.id) },
      el("div", { class: "bc-top" },
        el("span", { class: "bc-step" }, String(t.order || "•")),
        el("span", { class: "bc-level" }, t.level),
        state === "done" ? el("span", { class: "bc-badge" }, "✓ zaliczone") : null),
      el("div", { class: "bc-emoji" }, t.emoji),
      el("b", { class: "bc-name" }, t.name),
      el("div", { class: "bc-short" }, t.short),
      el("div", { class: "bc-meta" },
        el("span", {}, `📖 ${t.pages}`), el("span", {}, `✍️ ${t.practice}`), el("span", {}, `🎓 ${t.test}`)),
      el("div", { class: "bc-progress" },
        el("div", { class: "bc-progress-fill", style: `width:${pct != null ? pct : (t.practice_pct != null ? t.practice_pct / 2 : (t.read ? 15 : 0))}%` }))));
  });
  main.append(list);
}

// ---------- ekran tematu: ściąga + wybór trybu ----------
// pathLink: identyfikator ogniwa Ścieżki, z którego przyszliśmy (powrót na Ścieżkę)
async function viewBasicsTopic(tid, pathLink) {
  clearMain();
  const main = document.querySelector("main");
  const t = await API.get("/api/basics/" + tid);
  t._path = pathLink || t.path_link || null;
  main.append(hero(t.emoji, t.name, t.short, "indigo", t.level));

  const card = el("div", { class: "card bt-topic" });
  card.append(el("div", { class: "bt-intro" }, t.intro));
  if (t.cheatsheet) {
    card.append(el("details", { class: "bt-cheat", open: "" },
      el("summary", {}, "📋 " + (t.cheatsheet.title || "Ściąga")),
      dataTable(t.cheatsheet),
      t.cheatsheet.note ? el("div", { class: "kb-tip" }, "💡 " + t.cheatsheet.note) : null));
  }
  // Przykłady w teorii: ogólne albo z pracy w magazynie. Domyślnie wg celu z pulpitu
  // („Uczę się do:"), ale można przełączyć tutaj — i od razu widać, co się zmienia.
  const domRow = el("div", { class: "dom-toggle" });
  const cur = btDomain(t);
  [["general", "🌍 przykłady ogólne"], ["warehouse", "🏭 przykłady z pracy"]].forEach(([v, label]) => {
    domRow.append(el("button", { class: v === cur ? "active" : "", onclick: () => {
      LFSET_setStr("bt_domain", v); viewBasicsTopic(t.id, t._path);
    } }, label));
  });
  card.append(el("div", { class: "muted small" }, "Przykłady w teorii i zadaniach:"), domRow);
  const modes = el("div", { class: "bt-modes" });
  [["📖", "Teoria", `${t.pages.length} stron · z lektorem`, "indigo", () => basicsTheory(t, 0)],
   ["✍️", "Ćwiczenia", `${t.practice.length} zadań · z wyjaśnieniami`, "teal", () => basicsRun(t, "practice")],
   ["🎓", "Test", `${t.test.length} pytań · bez podpowiedzi`, "gold", () => basicsRun(t, "test")]]
    .forEach(([emo, name, sub, th, fn]) => modes.append(
      el("button", { class: "bt-mode bt-mode-" + th, onclick: fn },
        el("span", { class: "bt-mode-emo" }, emo),
        el("span", { class: "bt-mode-txt" }, el("b", {}, name), el("span", { class: "small" }, sub)),
        el("span", { class: "bt-mode-arrow" }, "→"))));
  card.append(modes,
    el("div", { class: "fb-btns", style: "margin-top:12px" },
      t._path ? el("button", { class: "btn ghost", onclick: viewPath }, "← Ścieżka") : null,
      t._path ? el("button", { class: "btn ghost", title: "Znasz to — pomiń ogniwo na Ścieżce", onclick: async () => {
        if (!confirm("Pominąć ten temat na Ścieżce? Możesz do niego wrócić w każdej chwili.")) return;
        await API.post("/api/path/skip", { link: t._path }); toast("⏭ Pominięto"); viewPath();
      } }, "⏭ Umiem to — pomiń") : null,
      el("button", { class: "btn ghost", onclick: viewBasics }, "← Wszystkie tematy")));
  main.append(card);
}

// przykłady sekcji: wariant „praca" gdy uczeń uczy się do magazynu, inaczej ogólne
function btDomain(t) {
  const v = LFSET_str("bt_domain", "auto");
  return v === "auto" ? (t.domain || "general") : v;
}
function sectionExamples(t, s) {
  if (btDomain(t) === "warehouse" && s.examples_work && s.examples_work.length) return s.examples_work;
  return s.examples || [];
}

// ---------- TEORIA (wielostronicowa, opcjonalnie dwie kolumny) ----------
function basicsTheory(t, pageIdx) {
  clearMain();
  const main = document.querySelector("main");
  const page = t.pages[pageIdx];
  enterFocus({ title: t.emoji + " " + t.name, subtitle: page.title, theme: "indigo",
    cheatsheet: () => cheatTable(t.cheatsheet),
    onExit: () => viewBasicsTopic(t.id, t._path) });
  focusProgress(pageIdx, t.pages.length, `strona ${pageIdx + 1}/${t.pages.length}`);

  const twoCol = LFSET.get("bt_twocol", true);
  const box = el("div", { class: "card bt-theory" + (twoCol ? " bt-twocol" : "") });
  main.append(box);

  const pageText = [page.title].concat(page.sections.map(s =>
    s.title + ". " + (s.text || "").replace(/\n/g, ". ") + (s.tip ? " Wskazówka: " + s.tip : ""))).join(". ");
  box.append(el("div", { class: "kb-toolbar" },
    el("button", { class: "btn primary", onclick: () => speak(pageText, undefined, "pl") }, "🔊 Odsłuchaj stronę"),
    el("button", { class: "btn ghost", onclick: stopSpeaking }, "⏹ Stop"),
    speedPicker(ttsRate(), null),
    el("button", { class: "btn ghost bt-col-toggle", onclick: () => {
      LFSET.set("bt_twocol", !LFSET.get("bt_twocol", true)); basicsTheory(t, pageIdx);
    } }, twoCol ? "▤ Jedna kolumna" : "▥ Dwie kolumny")));
  prefetchTts(pageText, "pl");

  box.append(el("h3", { class: "bt-page-title" }, `${pageIdx + 1}. ${page.title}`));

  page.sections.forEach(s => {
    const c = el("section", { class: "kb-block kb-" + (s.color || "indigo") });
    const left = el("div", { class: "kb-left" });
    const right = el("div", { class: "kb-right" });
    left.append(el("div", { class: "kb-block-head" },
      el("span", { class: "kb-block-emo" }, s.emoji || "•"), el("b", {}, s.title)));
    (s.text || "").split("\n").forEach(line => {
      if (line.trim()) left.append(el("p", { class: "kb-block-txt" }, line));
    });
    if (s.table) left.append(dataTable(s.table));
    if (s.tip) left.append(el("div", { class: "kb-tip" }, "💡 " + s.tip));
    const exs = sectionExamples(t, s);
    if (exs.length) {
      right.append(el("div", { class: "kb-ex-head" }, btDomain(t) === "warehouse" && s.examples_work && s.examples_work.length ? "Przykłady 🏭 z pracy" : "Przykłady"));
      exs.forEach(([en, pl]) => right.append(el("div", { class: "kb-ex" },
        el("div", { class: "en" }, el("b", {}, en), " ",
          el("button", { class: "mini-tts", onclick: () => speak(en) }, "🔊")),
        el("div", { class: "muted" }, pl))));
      prefetchTts(exs.map(x => x[0]), "en");
    }
    c.append(left, exs.length ? right : null);
    box.append(c);
  });

  const nav = el("div", { class: "fb-btns", style: "margin-top:14px" });
  if (pageIdx > 0) nav.append(el("button", { class: "btn ghost", onclick: () => basicsTheory(t, pageIdx - 1) }, "← Poprzednia"));
  if (pageIdx + 1 < t.pages.length) {
    nav.append(el("button", { class: "btn primary big", onclick: () => basicsTheory(t, pageIdx + 1) }, "Dalej →"));
  } else {
    nav.append(el("button", { class: "btn ok big", onclick: async () => {
      await API.post("/api/basics/progress", { topic: t.id, read: true, kind: "theory", xp: 5 }).catch(() => {});
      basicsRun(t, "practice");
    } }, "✍️ Teraz poćwicz →"),
    el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(t.id, t._path) }, "Wróć"));
  }
  box.append(nav);
}

// ---------- ĆWICZENIA / TEST ----------
// skróty uznawane na równi z pełną formą (teoria je poleca, więc nie mogą być błędem)
const BT_CONTRACT = { "am": ["'m"], "is": ["'s"], "are": ["'re"], "is not": ["isn't"], "are not": ["aren't"],
                      "was not": ["wasn't"], "were not": ["weren't"], "do not": ["don't"], "does not": ["doesn't"],
                      "did not": ["didn't"], "cannot": ["can't"], "will not": ["won't"], "have": ["'ve"], "has": ["'s"],
                      "will": ["'ll"], "would": ["'d"] };
function btGapOk(given, q) {
  const alts = [q.answer].concat(q.accept || [], BT_CONTRACT[String(q.answer).toLowerCase()] || []);
  const g = String(given).trim().replace(/[’`´]/g, "'");
  return alts.some(a => answersMatch(g, a, { lang: "en" }) ||
    g.toLowerCase() === String(a).toLowerCase());
}

function basicsRun(t, kind) {
  clearMain();
  const main = document.querySelector("main");
  const isTest = kind === "test";
  const items = (isTest ? t.test : t.practice).slice();
  enterFocus({ title: (isTest ? "🎓 " : "✍️ ") + t.name,
    subtitle: isTest ? "test" : "ćwiczenia", theme: isTest ? "gold" : "teal",
    cheatsheet: isTest ? null : () => cheatTable(t.cheatsheet),   // w teście bez ściągi
    onExit: () => viewBasicsTopic(t.id, t._path) });
  const box = el("div", { class: "card" });
  main.append(box);
  let i = 0, good = 0;
  show();

  function dunno(q) {
    return el("button", { class: "btn ghost", onclick: () => judge(false, "", q, true) }, "🤷 Nie wiem");
  }

  function show() {
    if (i >= items.length) return finish();
    const q = items[i];
    box.innerHTML = "";
    focusProgress(i, items.length, `poprawnych: ${good}`);
    prefetchTts(items.slice(i, i + 3).map(x => x.en || (x.options && x.answer !== undefined ? x.options[x.answer] : x.answer)).filter(Boolean), "en");
    box.append(el("div", { class: "pl-top" },
      el("span", { class: "badge" }, `${i + 1}/${items.length}`),
      el("span", { class: "badge" }, { choice: "wybór", gap: "uzupełnij", listen: "🎧 zapisz ze słuchu", match: "dopasuj", listen_choice: "🎧 wybór ze słuchu", order: "🧩 ułóż zdanie", fix: "🔍 znajdź błąd", cloze: "📝 uzupełnij tekst" }[q.type] || q.type)));
    if (q.type === "choice") return renderChoice(q);
    if (q.type === "gap") return renderGap(q);
    if (q.type === "listen") return renderListen(q);
    if (q.type === "match") return renderMatch(q);
    if (q.type === "listen_choice") return renderListenChoice(q);
    if (q.type === "order") return renderOrder(q);
    if (q.type === "fix") return renderFix(q);
    if (q.type === "cloze") return renderCloze(q);
    i++; show();
  }

  // 🎧 ABCD ze słuchu: lektor czyta zdanie, uczeń wybiera znaczenie / usłyszane zdanie
  function renderListenChoice(q) {
    const say = quiet => speak(q.en, undefined, "en", quiet);
    box.append(el("div", { class: "qtext" }, q.text || "Posłuchaj i wybierz, co znaczy to zdanie:"),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big-play", onclick: () => say(false) }, "▶ Odtwórz"),
        el("button", { class: "btn ghost", onclick: () => say(false) }, "🔁 Powtórz")),
      speedPicker(ttsRate(), () => say(false)));
    const opts = el("div", { class: "options lc-opts" });
    q.options.forEach((o, n) => opts.append(
      el("button", { class: "option", onclick: () => judge(n === q.answer, o, q) }, o)));
    box.append(opts, el("div", { class: "fb-btns" }, dunno(q)));
    say(true);
  }

  // 🧩 Ułóż zdanie z klocków (kolejność słów)
  function renderOrder(q) {
    const words = q.en.split(/\s+/);
    const shuffled = words.map((w, k) => ({ w, k })).sort(() => Math.random() - .5);
    box.append(el("div", { class: "qtext" }, q.text || "Ułóż zdanie z klocków:"),
      q.pl ? el("div", { class: "muted", style: "margin-bottom:8px" }, q.pl) : null);
    const line = el("div", { class: "order-line" }), pool = el("div", { class: "order-pool" });
    const chosen = [];
    const mk = it => {
      const b = el("button", { class: "order-w" }, it.w);
      b.onclick = () => {
        if (b.parentNode === pool) { chosen.push(it); line.append(b); }
        else { chosen.splice(chosen.indexOf(it), 1); pool.append(b); }
        if (chosen.length === words.length) {
          const given = chosen.map(x => x.w).join(" ");
          setTimeout(() => judge(answersMatch(given, q.en, { lang: "en", strict: true }), given, q), 250);
        }
      };
      return b;
    };
    shuffled.forEach(it => pool.append(mk(it)));
    box.append(line, pool, el("div", { class: "fb-btns" }, dunno(q)));
  }

  // 🔍 Znajdź błąd: kliknij słowo, które jest źle
  function renderFix(q) {
    const words = q.wrong.split(/\s+/);
    box.append(el("div", { class: "qtext" }, q.text || "W tym zdaniu jest jeden błąd — kliknij niepoprawne słowo:"),
      q.pl ? el("div", { class: "muted", style: "margin-bottom:8px" }, q.pl) : null);
    const line = el("div", { class: "gap-line" });
    words.forEach((w, k) => line.append(el("button", { class: "fix-w", onclick: () =>
      judge(k === q.bad, w, q) }, w), " "));
    box.append(line, el("div", { class: "fb-btns" }, dunno(q)));
  }

  // 📝 Uzupełnij tekst: [[a|b|c]] = wybór z listy (pierwsza opcja poprawna), [[=slowo]] = wpisz
  function renderCloze(q) {
    box.append(el("div", { class: "qtext" }, q.text || "Uzupełnij tekst:"),
      q.pl ? el("div", { class: "muted small", style: "margin-bottom:8px" }, q.pl) : null);
    const wrap = el("div", { class: "cloze-text" });
    const fields = [];
    q.body.split(/(\[\[[^\]]+\]\])/).forEach(part => {
      const m = part.match(/^\[\[(.+)\]\]$/);
      if (!m) { wrap.append(part); return; }
      if (m[1].startsWith("=")) {
        const ans = m[1].slice(1);
        const inp = el("input", { class: "cloze-inp", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "…" });
        inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); check(); } };
        fields.push({ el: inp, ok: () => btGapOk(inp.value, { answer: ans, accept: [] }), ans });
        wrap.append(inp);
      } else {
        const opts = m[1].split("|");
        const sel = el("select", { class: "cloze-sel" }, el("option", { value: "" }, "— wybierz —"));
        opts.slice().sort(() => Math.random() - .5).forEach(o => sel.append(el("option", { value: o }, o)));
        fields.push({ el: sel, ok: () => sel.value === opts[0], ans: opts[0] });
        wrap.append(sel);
      }
    });
    box.append(wrap);
    const send = el("button", { class: "btn ok", onclick: check }, "Sprawdź ⏎");
    box.append(el("div", { class: "fb-btns" }, send, dunno(q)));
    function check() {
      let bad = 0;
      fields.forEach(f => { const ok = f.ok(); f.el.classList.toggle("cloze-ok", ok); f.el.classList.toggle("cloze-bad", !ok); if (!ok) bad++; });
      const given = fields.map(f => f.el.value || "—").join(", ");
      // wynik zapada po chwili — uczeń widzi, które luki były źle
      setTimeout(() => judge(bad === 0, given, q, false, bad), 900);
    }
    const first = fields[0] && fields[0].el; if (first && first.focus) first.focus();
  }

  function renderChoice(q) {
    box.append(el("div", { class: "qtext" }, q.text));
    if (q.pl) box.append(el("div", { class: "muted", style: "margin-bottom:8px" }, q.pl));
    const opts = el("div", { class: "options" });
    q.options.forEach((o, n) => opts.append(
      el("button", { class: "option", onclick: () => judge(n === q.answer, o, q) }, o)));
    box.append(opts, el("div", { class: "fb-btns" }, dunno(q)));
  }

  function renderGap(q) {
    const parts = q.text.split(/_{2,}/);
    const line = el("div", { class: "gap-line" });
    const inp = el("input", { class: "gap-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", size: 8 });
    inp.oninput = () => { inp.size = Math.max(8, inp.value.length + 1); };
    line.append(el("span", { class: "gap-text" }, parts[0] || ""), inp, el("span", { class: "gap-text" }, parts[1] || ""));
    box.append(line);
    if (q.pl) box.append(el("div", { class: "muted" }, q.pl));
    if (!isTest && q.hint) box.append(el("div", { class: "muted small" }, "💡 " + q.hint));   // w teście bez podpowiedzi
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(btGapOk(inp.value, q), inp.value, q);
    } }, "Sprawdź ⏎");
    // stopPropagation: to samo naciśnięcie Enter nie może dotrzeć do „Dalej" ekranu wyniku
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };
    box.append(el("div", { class: "fb-btns" }, send, dunno(q)));
    inp.focus();
  }

  function renderListen(q) {
    const say = quiet => speak(q.en, undefined, "en", quiet);      // zadanie ze słuchu: lektor gra zawsze
    box.append(
      el("div", { class: "qtext" }, "Posłuchaj i zapisz po angielsku:"),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary big-play", onclick: () => say(false) }, "▶ Odtwórz"),
        el("button", { class: "btn ghost", onclick: () => say(false) }, "🔁 Powtórz")),
      speedPicker(ttsRate(), () => say(false)));
    const inp = el("input", { class: "input", placeholder: "wpisz po angielsku…", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
    const send = el("button", { class: "btn ok", onclick: () => {
      if (!inp.value.trim()) return;
      judge(answersMatch(inp.value, q.en, { lang: "en", strict: true }), inp.value, q);
    } }, "Sprawdź ⏎");
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send.click(); } };
    box.append(inp, el("div", { class: "fb-btns" }, send, dunno(q)));
    say(true);
    inp.focus();
  }

  function renderMatch(q) {
    box.append(el("div", { class: "qtext" }, "Połącz w pary:"));
    const left = q.pairs.map((p, n) => ({ txt: p[0], n }));
    const right = q.pairs.map((p, n) => ({ txt: p[1], n })).sort(() => Math.random() - .5);
    let sel = null, hit = 0, misses = 0;
    const grid = el("div", { class: "pairs-two" });
    const cL = el("div", { class: "pairs-col" }), cR = el("div", { class: "pairs-col" });
    left.forEach(x => cL.append(mk(x, "en")));
    right.forEach(x => cR.append(mk(x, "pl")));
    grid.append(cL, cR);
    box.append(grid, el("div", { class: "fb-btns" }, dunno(q)));
    function mk(x, side) {
      const b = el("button", { class: "pair-tile pair-" + side }, x.txt);
      b.onclick = () => {
        if (b.classList.contains("done")) return;
        if (side === "en") speak(x.txt);
        if (!sel) { sel = { x, b, side }; b.classList.add("sel"); return; }
        if (sel.side === side) { sel.b.classList.remove("sel"); sel = { x, b, side }; b.classList.add("sel"); return; }
        // porównujemy TREŚĆ (she is / it is → oba pasują do „is"), nie numer pary
        const okPair = (sel.side === "en" ? [sel.x, x] : [x, sel.x]);
        const good = q.pairs.some(pp => pp[0] === okPair[0].txt && pp[1] === okPair[1].txt);
        if (good) {
          sel.b.classList.add("done"); b.classList.add("done"); sel.b.classList.remove("sel"); sel = null; hit++;
          haptic("good");
          if (hit === q.pairs.length) judge(misses <= 1, "", q);
        } else {
          misses++;
          b.classList.add("bad"); sel.b.classList.add("bad");
          const s = sel;
          setTimeout(() => { b.classList.remove("bad"); s.b.classList.remove("bad", "sel"); }, 500);
          sel = null;
          haptic("bad");
        }
      };
      return b;
    }
  }

  // ok: poprawnie; given: co wpisał/wybrał uczeń; unknown: kliknął „Nie wiem"
  // pełne zdanie z wstawioną odpowiedzią — do wyświetlenia i dla lektora
  function fullSentence(q, correct) {
    if (q.type === "fix") return q.fixed || "";
    if (q.type === "order" || q.type === "listen" || q.type === "listen_choice") return q.en || "";
    if (q.type === "cloze") return "";
    const txt = q.text || "";
    if (/_{2,}/.test(txt) && correct) return txt.replace(/_{2,}/, String(correct) === "—" ? "" : String(correct)).replace(/\s{2,}/g, " ");
    if (q.type === "choice" && correct && /\s/.test(String(correct)) && !/[?:]$/.test(txt)) return "";
    return "";
  }

  function judge(ok, given, q, unknown, badCount) {
    if (ok) good++;
    haptic(ok ? "good" : "bad");
    let correct = q.options && q.answer !== undefined ? q.options[q.answer] : (q.answer || q.en || "");
    if (q.type === "fix") correct = q.right || "";
    if (q.type === "cloze") correct = "";
    const sentence = fullSentence(q, correct);
    // skrót obok pełnej formy (She is not… = She isn't…)
    const contr = q.type === "gap" && BT_CONTRACT[String(q.answer).toLowerCase()];
    let contrNote = "";
    if (contr && /\bnot\b/.test(q.text || "") && /^(is|are|was|were)$/i.test(q.answer))
      contrNote = " (= " + q.text.replace(/_{2,}\s+not/, q.answer.replace(/^(is|are|was|were)$/i, m => ({ is: "isn't", are: "aren't", was: "wasn't", were: "weren't" })[m.toLowerCase()])) + ")";
    else if (contr && q.type === "gap")
      contrNote = " (skrót: " + contr[0] + ")";
    // lektor czyta CAŁE zdanie, nie samą lukę
    if (q.en) speakAuto(q.en);
    else if (sentence) speakAuto(sentence);
    else if (correct && /^[a-z' ]+$/i.test(String(correct))) speakAuto(String(correct));
    // zdania pisane (słuchanie): porównanie słowo po słowie + zgłoszenie błędnych słów
    let diff = null;
    if (q.type === "listen" && given && !unknown) { diff = wordDiff(given, q.en); reportHardWords(diff, q.en, q.pl); }
    // „nie wiem" przy zdaniu ze słuchu: słowa treści z tego zdania do utrwalenia (serwer odsiewa gramatyczne)
    if ((q.type === "listen" || q.type === "listen_choice") && unknown && q.en)
      reportHardWords({ wrong: [], missing: q.en.split(/\s+/).map(_wdNorm), right: [] }, q.en, q.pl);
    if (q.type === "order" && given && !unknown) diff = wordDiff(given, q.en);
    box.innerHTML = "";
    const fb = el("div", { class: "feedback " + (ok ? "fb-good" : "fb-bad") },
      el("div", { class: "fb-head" }, ok ? "✔ Dobrze!" : (unknown ? "🤷 Nic nie szkodzi — zobacz dlaczego" :
        (badCount ? `✘ Błędy: ${badCount} z ${(q.body || "").split("[[").length - 1} luk` : "✘ Niestety nie"))),
      (!ok && given && q.type !== "cloze") ? el("div", {}, "Twoja odpowiedź: ", diff ? diff.your : el("b", {}, given)) : null,
      correct ? el("div", { class: "fb-pair" }, "Poprawnie: ", el("b", {}, String(correct)), contrNote, " ",
        el("button", { class: "mini-tts", onclick: () => speak(String(q.en || sentence || correct)) }, "🔊")) : null,
      (sentence && sentence !== correct) ? el("div", { class: "fb-en" }, "Całe zdanie: ", el("b", {}, sentence), " ",
        el("button", { class: "mini-tts", onclick: () => speak(sentence) }, "🔊")) : null,
      q.type === "cloze" ? el("div", { class: "fb-en" }, "Poprawnie: ", el("b", {}, q.body.replace(/\[\[=?([^\]|]+)[^\]]*\]\]/g, "$1"))) : null,
      q.pl ? el("div", { class: "muted" }, q.pl) : null,
      q.why ? el("div", { class: "fb-explain" }, "💡 Dlaczego tak: " + q.why) : null);
    // klikalne słowa (dodaj do utrwalenia) + „powiedz to zdanie"
    const chipSrc = q.en || sentence || (q.type === "cloze" ? q.body.replace(/\[\[=?([^\]|]+)[^\]]*\]\]/g, "$1") : "");
    if (chipSrc) {
      fb.append(wordChips(chipSrc, q.pl));
      const sb = speakCheckButton(chipSrc, "en"); if (sb) fb.append(sb);
    }
    // dlaczego NIE inaczej: po błędzie — o wybranej opcji; po „nie wiem" — o wszystkich pozostałych
    if (q.why_not) {
      const all = Object.keys(q.why_not);
      const g = String(given || "").trim().toLowerCase().replace(/[.?!]$/, "");
      const hit = all.filter(k => k.toLowerCase().replace(/[.?!]$/, "") === g);
      // po błędzie: o wybranej opcji (jeśli ją znamy), inaczej o wszystkich pozostałych
      const keys = (unknown || ok || !hit.length) ? all : hit;
      if (keys.length) {
        const wn = el("div", { class: "fb-whynot" }, el("b", {}, "Dlaczego nie inaczej:"));
        keys.forEach(k => wn.append(el("div", { class: "fb-whynot-row" }, el("span", { class: "fb-whynot-opt" }, k), " — " + q.why_not[k])));
        fb.append(wn);
      }
    }
    box.append(fb);
    const nx = el("button", { class: "btn primary big", onclick: next }, i + 1 >= items.length ? "Podsumowanie →" : "Dalej →");
    box.append(el("div", { class: "fb-btns" }, nx));
    nx.focus();
    // handler zakładamy w następnej klatce — nie może go trafić to samo naciśnięcie Enter
    setTimeout(() => { document.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); next(); } }; }, 0);
    function next() { document.onkeydown = null; i++; show(); }
  }

  async function finish() {
    document.onkeydown = null;
    exitFocus();
    const pct = Math.round(100 * good / items.length);
    if (pct >= 80) confetti();
    let r = {};
    try {
      r = await API.post("/api/basics/progress", { topic: t.id, kind, [isTest ? "test_pct" : "practice_pct"]: pct, xp: Math.round(pct / 5) });
    } catch (e) { /* offline — pomijamy */ }
    box.innerHTML = "";
    const passed = isTest && pct >= 70;
    box.append(el("h3", {}, isTest ? "🎓 Wynik testu" : "✍️ Ćwiczenia zakończone"),
      el("div", { class: "game-result" },
        el("div", { class: "gr-big" }, pct + "%"),
        el("div", { class: "muted" }, `${good} z ${items.length} poprawnych`)),
      el("p", { class: "muted" }, isTest
        ? (passed ? "Test zdany — temat zaliczony" + (r.path_link_done ? ", ogniwo Ścieżki odhaczone." : ".") : "Do zaliczenia potrzeba 70%. Wróć do teorii i spróbuj ponownie.")
        : (pct >= 80 ? "Świetnie — możesz przejść do testu." : "Warto wrócić do teorii i poćwiczyć jeszcze raz.")),
      el("div", { class: "fb-btns" },
        passed && t._path ? el("button", { class: "btn primary", onclick: viewPath }, "🧭 Wróć na Ścieżkę") : null,
        el("button", { class: "btn " + (passed ? "ghost" : "primary"), onclick: () => basicsRun(t, kind) }, "🔁 Jeszcze raz"),
        !isTest ? el("button", { class: "btn ok", onclick: () => basicsRun(t, "test") }, "🎓 Test") : null,
        el("button", { class: "btn ghost", onclick: () => basicsTheory(t, 0) }, "📖 Teoria"),
        el("button", { class: "btn ghost", onclick: () => viewBasicsTopic(t.id, t._path) }, "← Temat")));
  }
}
