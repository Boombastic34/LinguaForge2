// ============================================================
// Zakładka „Czasowniki" — spis wszystkich czasowników w aplikacji.
// To NIE jest kolejny trener (ćwiczysz w fiszkach i na Ścieżce), tylko miejsce
// do przeglądania i sprawdzania: wpisujesz słowo, widzisz znaczenie, przykład,
// a przy czasownikach z odmianą — pełną tabelę form i czasów.
// Trzy listy: ⚙️ z odmianą · 📖 pozostałe · 🔗 frazowe.
// ============================================================

let VERBS_DATA = null;          // pobierane raz na sesję
let VERBS_TAB = "conjugated";
let VERBS_Q = "";
let VERBS_ONLY = "all";         // all | irregular | new | known

async function viewVerbs() {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero("⚙️", "Czasowniki",
    "Wszystkie czasowniki w jednym miejscu — z odmianą, przykładem i lektorem", "teal"));

  const box = el("div", { class: "card" });
  main.append(box);
  box.append(el("p", { class: "muted" }, "Wczytuję listę…"));

  if (!VERBS_DATA) {
    try { VERBS_DATA = await API.get("/api/verbs/all"); }
    catch (e) { box.innerHTML = ""; box.append(el("p", {}, "Nie udało się wczytać listy.")); return; }
  }
  renderVerbsPage(box);
}

function renderVerbsPage(box) {
  const d = VERBS_DATA;
  box.innerHTML = "";

  // --- przełącznik list
  const tabs = el("div", { class: "vt-tabs" });
  [["conjugated", "⚙️ Z odmianą", d.counts.conjugated],
   ["plain", "📖 Pozostałe", d.counts.plain],
   ["phrasal", "🔗 Frazowe", d.counts.phrasal]].forEach(([id, label, n]) => {
    tabs.append(el("button", {
      class: "vt-tab" + (VERBS_TAB === id ? " active" : ""),
      onclick: () => { VERBS_TAB = id; VERBS_ONLY = "all"; renderVerbsPage(box); },
    }, label, el("span", { class: "vt-count" }, n)));
  });
  box.append(tabs);

  // --- szukanie i filtr
  const search = el("input", { class: "input vt-search", placeholder: "Szukaj po angielsku lub po polsku…",
    value: VERBS_Q, autocomplete: "off" });
  search.oninput = () => { VERBS_Q = search.value; paint(); };
  const filters = el("div", { class: "vt-filters" });
  const FILTERS = VERBS_TAB === "conjugated"
    ? [["all", "wszystkie"], ["irregular", "nieregularne"], ["new", "jeszcze nieuczone"], ["known", "w powtórkach"]]
    : [["all", "wszystkie"], ["new", "jeszcze nieuczone"], ["known", "w powtórkach"]];
  FILTERS.forEach(([id, label]) => filters.append(el("button", {
    class: "vt-filter" + (VERBS_ONLY === id ? " active" : ""),
    onclick: () => { VERBS_ONLY = id; paint(); },
  }, label)));
  box.append(el("div", { class: "vt-bar" }, search, filters));

  const info = el("div", { class: "muted small vt-info" });
  const list = el("div", { class: "vt-list" });
  box.append(info, list);

  box.append(el("div", { class: "fb-btns", style: "margin-top:14px" },
    el("button", { class: "btn primary", onclick: () =>
      viewFlashcards("all", VERBS_TAB === "conjugated" ? "odmiana"
        : (VERBS_TAB === "phrasal" ? "phrasal" : "czasowniki")) },
      "▶ Ćwicz te czasowniki w fiszkach")));

  function match(v) {
    const q = VERBS_Q.trim().toLowerCase();
    if (q && !(v.en.toLowerCase().includes(q) || v.pl.toLowerCase().includes(q))) return false;
    if (VERBS_ONLY === "irregular" && !v.irregular) return false;
    if (VERBS_ONLY === "new" && v.card.known) return false;
    if (VERBS_ONLY === "known" && !v.card.known) return false;
    return true;
  }

  function paint() {
    filters.querySelectorAll(".vt-filter").forEach((b, k) =>
      b.classList.toggle("active", FILTERS[k][0] === VERBS_ONLY));
    const rows = d[VERBS_TAB].filter(match);
    info.textContent = rows.length + " z " + d[VERBS_TAB].length +
      (VERBS_TAB === "conjugated" ? " · dotknij czasownika, żeby zobaczyć całą odmianę"
                                  : " · dotknij, żeby zobaczyć przykład");
    list.innerHTML = "";
    rows.slice(0, 400).forEach(v => list.append(verbRow(v)));
    if (rows.length > 400)
      list.append(el("p", { class: "muted small" }, "Pokazano pierwsze 400 — zawęź wyszukiwanie."));
    if (!rows.length)
      list.append(el("p", { class: "muted" }, "Nic nie pasuje do wyszukiwania."));
  }
  paint();
}

function verbRow(v) {
  const row = el("div", { class: "vt-row" });
  const head = el("div", { class: "vt-head" },
    el("button", { class: "fc-speak", onclick: e => { e.stopPropagation(); speak(v.en); } }, "🔊"),
    el("div", { class: "vt-main" },
      el("div", { class: "vt-en" }, v.en,
        v.forms ? el("span", { class: "vt-forms" }, " · " + v.forms.past + " · " + v.forms.perf) : null),
      el("div", { class: "vt-pl" }, v.pl)),
    v.irregular ? el("span", { class: "vt-badge vt-irr" }, "nieregularny") : null,
    v.card.known
      ? el("span", { class: "vt-badge vt-known" }, v.card.mature ? "✔ umiesz" : "w powtórkach")
      : el("span", { class: "vt-badge" }, "nowy"));
  row.append(head);

  const body = el("div", { class: "vt-body" });
  let open = false;
  head.onclick = () => {
    open = !open;
    row.classList.toggle("vt-open", open);
    body.innerHTML = "";
    if (!open) return;
    if (v.rows) {
      // pełna odmiana — ten sam układ co na odwrocie fiszki
      const forms = el("div", { class: "vb-forms" });
      [["base", "podstawowa"], ["third", "he / she / it"], ["ing", "-ing"],
       ["past", "2. forma"], ["perf", "3. forma"]].forEach(([k, label]) =>
        forms.append(el("div", { class: "vb-form" },
          el("div", { class: "vb-form-label" }, label),
          el("div", { class: "vb-form-word" }, v.forms[k], " ",
            el("button", { class: "mini-tts", onclick: e => { e.stopPropagation(); speak(v.forms[k]); } }, "🔊")))));
      body.append(el("div", { class: "vb-table" }, forms,
        ...v.rows.map(r => el("div", { class: "vb-row" },
          el("div", { class: "vb-row-tense" }, r.tense),
          el("div", { class: "vb-row-body" },
            el("div", { class: "vb-row-en" }, r.en, " ",
              el("button", { class: "mini-tts", onclick: e => { e.stopPropagation(); speak(r.en.split(" · ")[0]); } }, "🔊")),
            el("div", { class: "vb-row-pl" }, r.pl))))));
    }
    if (v.example)
      body.append(el("div", { class: "vt-example",
        onclick: e => { e.stopPropagation(); speak(v.example.split(" / ")[0]); } },
        "„" + v.example + "” 🔊"));
    body.append(el("div", { class: "fb-btns", style: "margin-top:8px" },
      el("button", { class: "btn ghost mini", onclick: async e => {
        e.stopPropagation();
        try {
          await API.post("/api/hardwords/add", { en: v.en, pl: v.pl, ctx_en: (v.example || "").split(" / ")[0] });
          toast("🔥 Dodano do utrwalenia: " + v.en);
        } catch (err) { toast(String(err.message || err), true); }
      } }, "🔥 Dodaj do utrwalenia")));
  };
  row.append(body);
  return row;
}
