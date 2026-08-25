// ============ PRZEGLĄD TREŚCI PRZEZ ADMINISTRATORA ============
// Wszystkie pozycje działu po kolei (nie losowo): treść, poprawna odpowiedź,
// komunikat przy błędzie. Można oznaczyć „do poprawy” z notatką.

async function viewReview() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/review/sections");
  main.append(hero("🔍", "Przegląd treści", "Sprawdź pytania i odpowiedzi dział po dziale", "indigo",
    `${d.notes_total} zaznaczonych`));

  const card = el("div", { class: "card" }, el("h3", {}, "Wybierz dział"));
  const list = el("div", { class: "chapter-list" });
  d.sections.forEach(s => list.append(el("div", {
    class: "chapter" + (s.notes ? " ch-flagged" : ""),
    onclick: () => reviewSection(s.id, s.name, s.emoji),
  },
    el("div", { class: "ch-status" }, s.emoji),
    el("div", { class: "ch-body" },
      el("b", {}, s.name),
      el("div", { class: "muted small" },
        `${s.count} pozycji` + (s.notes ? ` · 🚩 ${s.notes} do poprawy` : ""))))));
  card.append(list);
  main.append(card);

  main.append(el("div", { class: "card" },
    el("h3", {}, "📋 Notatki administratora"),
    el("p", { class: "muted small" },
      `Zaznaczone pozycje: ${d.notes_total}. Zostają zapisane do czasu zresetowania.`),
    el("div", { class: "fb-btns" },
      el("button", { class: "btn primary", onclick: viewReviewNotes }, "📋 Zobacz notatki"),
      el("button", { class: "btn ok", onclick: () => API.download("/api/review/notes/pdf") },
        "📄 Pobierz PDF"))));
}

// ---------- przeglądanie działu pozycja po pozycji ----------
async function reviewSection(section, name, emoji, offset = 0) {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get(`/api/review/items?section=${section}&offset=${offset}&limit=1`);
  if (!d.items.length) {
    main.append(el("div", { class: "card" }, el("p", {}, "Koniec działu."),
      el("button", { class: "btn primary", onclick: viewReview }, "← Działy")));
    return;
  }
  const it = d.items[0];
  main.append(hero(emoji, name, `pozycja ${offset + 1} z ${d.total}`, "indigo",
    it.flagged ? "🚩 zaznaczona" : ""));

  const box = el("div", { class: "card" });
  main.append(box);

  // pasek nawigacji po pozycjach
  const jump = el("input", { class: "input short", type: "number", min: 1, max: d.total,
    value: offset + 1 });
  jump.onkeydown = e => {
    if (e.key === "Enter") reviewSection(section, name, emoji,
      Math.max(0, Math.min(d.total - 1, (+jump.value || 1) - 1)));
  };
  box.append(el("div", { class: "pl-top" },
    el("button", { class: "btn mini", disabled: offset === 0,
      onclick: () => reviewSection(section, name, emoji, offset - 1) }, "← Poprzednia"),
    jump,
    el("button", { class: "btn mini", disabled: offset + 1 >= d.total,
      onclick: () => reviewSection(section, name, emoji, offset + 1) }, "Następna →")));

  box.append(
    el("div", { class: "rv-title" }, it.title),
    el("div", { class: "rv-block rv-q" },
      el("div", { class: "rv-label" }, "TREŚĆ PYTANIA / POLECENIA"),
      el("div", { class: "rv-text" }, it.question)),
    el("div", { class: "rv-block rv-good" },
      el("div", { class: "rv-label" }, "✔ CO PRZY POPRAWNEJ ODPOWIEDZI"),
      el("div", { class: "rv-text" }, it.good)),
    el("div", { class: "rv-block rv-bad" },
      el("div", { class: "rv-label" }, "✘ CO PRZY BŁĘDNEJ ODPOWIEDZI"),
      el("div", { class: "rv-text" }, it.bad)));
  if (it.extra) {
    box.append(el("div", { class: "rv-block rv-extra" },
      el("div", { class: "rv-label" }, "DODATKOWO (podpowiedzi, opcje, przykłady)"),
      el("div", { class: "rv-text" }, it.extra)));
  }
  if (it.meta) box.append(el("div", { class: "muted small", style: "margin-top:6px" }, it.meta));

  // odsłuch, jeśli jest co czytać
  box.append(el("div", { class: "fb-btns", style: "margin-top:10px" },
    el("button", { class: "btn mini", onclick: () => speak(it.good) }, "🔊 Odsłuchaj odpowiedź")));

  // --- oznaczenie do poprawy
  const flagBox = el("div", { class: "rv-flag" });
  const kinds = [["question", "Treść pytania"], ["good", "Poprawna odpowiedź"], ["bad", "Odpowiedź błędna"]];
  let chosenKind = "question";
  const kindRow = el("div", { class: "opt-row-btns" });
  kinds.forEach(([v, label]) => {
    const b = el("button", { class: "mode-btn" + (v === chosenKind ? " active" : ""),
      onclick: () => {
        chosenKind = v;
        kindRow.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      } }, el("b", {}, label));
    kindRow.append(b);
  });
  const noteInp = el("textarea", { class: "input", placeholder: "Co jest do poprawy?" });
  flagBox.append(
    el("div", { class: "rv-label" }, "🚩 ZAZNACZ DO POPRAWY"),
    el("div", { class: "muted small" }, "Czego dotyczy uwaga:"),
    kindRow, noteInp,
    el("div", { class: "fb-btns" },
      el("button", { class: "btn ok", onclick: save }, "🚩 Zapisz uwagę"),
      el("button", { class: "btn primary", disabled: offset + 1 >= d.total,
        onclick: () => reviewSection(section, name, emoji, offset + 1) }, "Dalej bez uwag →"),
      el("button", { class: "btn ghost", onclick: viewReview }, "← Działy")));
  box.append(flagBox);

  async function save() {
    if (!noteInp.value.trim()) return toast("Napisz, co jest do poprawy", true);
    await API.post("/api/review/note", {
      section, item_id: it.id, kind: chosenKind, note: noteInp.value.trim(),
      title: it.title, question: it.question, good: it.good, bad: it.bad, meta: it.meta,
    });
    toast("Zaznaczono do poprawy");
    if (typeof haptic === "function") haptic("good");
    if (offset + 1 < d.total) reviewSection(section, name, emoji, offset + 1);
    else viewReview();
  }
}

// ---------- lista notatek ----------
async function viewReviewNotes() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/review/notes");
  main.append(hero("📋", "Notatki administratora",
    "Wszystko, co zaznaczyłeś do poprawy", "gold", `${d.total} pozycji`));

  const top = el("div", { class: "card" },
    el("div", { class: "fb-btns" },
      el("button", { class: "btn ok", onclick: () => API.download("/api/review/notes/pdf") },
        "📄 Pobierz PDF"),
      el("button", { class: "btn ghost", onclick: viewReview }, "← Przegląd treści")));
  // reset
  const resetSel = el("select", {}, el("option", { value: "all" }, "wszystkie działy"));
  Object.keys(d.by_section || {}).forEach(s => resetSel.append(el("option", { value: s }, s)));
  top.append(el("hr", {}),
    el("div", { class: "set-row" },
      el("span", { class: "muted small" }, "Resetuj notatki:"), resetSel,
      el("button", { class: "btn", style: "background:#c92a2a;color:#fff", onclick: async () => {
        if (!confirm("Na pewno skasować notatki? Tej operacji nie da się cofnąć.")) return;
        const r = await API.post("/api/review/notes/reset", { section: resetSel.value });
        toast(`Skasowano ${r.removed} notatek`);
        viewReviewNotes();
      } }, "🗑 Resetuj")));
  main.append(top);

  if (!d.notes.length) {
    main.append(el("div", { class: "card" }, el("p", { class: "muted" }, "Brak zaznaczonych pozycji.")));
    return;
  }
  const card = el("div", { class: "card" });
  let curSec = null;
  d.notes.forEach(n => {
    if (n.section_name !== curSec) {
      curSec = n.section_name;
      card.append(el("h4", { style: "margin-top:14px" }, `${n.emoji} ${curSec}`));
    }
    card.append(el("div", { class: "rv-note" },
      el("div", { class: "rv-note-head" },
        el("b", {}, n.title),
        el("span", { class: "badge" }, n.kind_name)),
      el("div", { class: "rv-note-q" }, n.question),
      el("div", { class: "rv-note-txt" }, "📝 " + n.note),
      el("div", { class: "muted small" }, n.date.replace("T", " ")),
      el("button", { class: "btn mini ghost", onclick: async () => {
        await API.post("/api/review/notes/delete",
          { section: n.section, item_id: n.item_id, kind: n.kind });
        toast("Usunięto notatkę");
        viewReviewNotes();
      } }, "✕ Usuń")));
  });
  main.append(card);
}
