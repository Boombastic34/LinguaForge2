// Panel administratora — dodawanie treści, przegląd plików, eksport i import
async function viewAdmin() {
  clearMain();
  const main = document.querySelector("main");
  const data = await API.get("/api/admin/files");
  main.append(hero("🛡", "Panel administratora",
    "Dodawaj treści, przeglądaj i edytuj pliki materiału, eksportuj i importuj paczki", "gold",
    `${data.files.length} plików`));

  // ---------- ZARZĄDZANIE UŻYTKOWNIKAMI ----------
  const usersCard = el("div", { class: "card" },
    el("h3", {}, "👥 Użytkownicy i role"),
    el("p", { class: "muted small" },
      "Uczeń widzi tylko działy odblokowane niżej. Nauczyciel i administrator widzą wszystko."));
  main.append(usersCard);
  loadUsers();

  async function loadUsers() {
    try {
      const { users, roles } = await API.get("/api/admin/users");
      usersCard.querySelectorAll(".users-tbl").forEach(x => x.remove());
      const tbl = el("table", { class: "table users-tbl" });
      tbl.innerHTML = "<tr><th>Konto</th><th>Rola</th><th>Poziom</th><th>XP</th><th>Nauczyciel</th></tr>";
      users.forEach(u => {
        const tr = el("tr", {});
        const sel = el("select", {});
        roles.forEach(r => sel.append(el("option", {
          value: r, ...(u.role === r ? { selected: "" } : {}),
        }, { student: "Uczeń", teacher: "Nauczyciel", admin: "Administrator" }[r])));
        sel.onchange = async () => {
          try {
            await API.post("/api/admin/user_role", { username: u.username, role: sel.value });
            toast(`${u.username}: rola zmieniona`);
          } catch (e) { toast(String(e.message || e), true); sel.value = u.role; }
        };
        tr.append(el("td", {}, el("b", {}, u.username)));
        const tdRole = el("td", {}); tdRole.append(sel); tr.append(tdRole);
        tr.append(el("td", {}, u.level || "—"), el("td", {}, String(u.xp || 0)),
                  el("td", {}, u.teacher || "—"));
        tbl.append(tr);
      });
      usersCard.append(tbl);
    } catch (e) { usersCard.append(el("p", { class: "muted" }, "Nie udało się wczytać listy kont.")); }
  }

  // ---------- DOSTĘP DO DZIAŁÓW ----------
  const accessCard = el("div", { class: "card" },
    el("h3", {}, "🔒 Co widzi uczeń"),
    el("p", { class: "muted small" },
      "Odznaczone działy znikają uczniom z menu i są blokowane także po wpisaniu adresu. " +
      "Nauczycieli i administratorów to nie dotyczy."));
  main.append(accessCard);
  loadAccess();

  async function loadAccess() {
    const { modules, student_modules } = await API.get("/api/admin/access");
    const chosen = new Set(student_modules);
    const grid = el("div", { class: "access-grid" });
    modules.forEach(mo => {
      const chk = el("input", { type: "checkbox", ...(chosen.has(mo.id) ? { checked: "" } : {}) });
      chk.onchange = () => { chk.checked ? chosen.add(mo.id) : chosen.delete(mo.id); };
      grid.append(el("label", { class: "access-item" }, chk,
        el("span", { class: "acc-emo" }, mo.emoji), mo.name));
    });
    const save = el("button", { class: "btn ok", onclick: async () => {
      await API.post("/api/admin/access", { student_modules: [...chosen] });
      toast("Zapisano — uczniowie zobaczą zmianę po odświeżeniu");
    } }, "💾 Zapisz dostęp");
    const all = el("button", { class: "btn ghost", onclick: () => {
      grid.querySelectorAll("input").forEach(c => { c.checked = true; });
      modules.forEach(mo => chosen.add(mo.id));
    } }, "Zaznacz wszystko");
    const none = el("button", { class: "btn ghost", onclick: () => {
      grid.querySelectorAll("input").forEach(c => { c.checked = false; });
      chosen.clear();
    } }, "Odznacz wszystko");
    accessCard.append(grid, el("div", { class: "fb-btns" }, save, all, none));
  }

  // ---------- eksport / import ----------
  const io = el("div", { class: "card" },
    el("h3", {}, "📦 Eksport i import materiałów"),
    el("p", { class: "muted small" },
      "Chcesz, żeby ktoś przygotował dodatkowe treści? Wyślij mu paczkę do edycji — zawiera wszystkie pliki, " +
      "gotowy szablon i instrukcję. Gdy odeśle plik, wgraj go tutaj. PDF służy do czytania i sprawdzania materiału."),
    el("div", { class: "fb-btns" },
      el("button", { class: "btn primary", onclick: () => API.download("/api/admin/export/pdf") },
        "📄 Pobierz katalog PDF (do czytania)"),
      el("button", { class: "btn ok", onclick: () => API.download("/api/admin/export/pack") },
        "🗂 Pobierz paczkę do edycji (ZIP)")));

  const fileInput = el("input", { type: "file", accept: ".json,.zip", style: "display:none" });
  const importBox = el("div", { class: "import-box" },
    el("div", { style: "font-size:30px" }, "⬆️"),
    el("div", {},
      el("b", {}, "Import materiałów"),
      el("div", { class: "muted small" }, "Wybierz plik JSON (szablon) albo ZIP z folderem data/")),
    el("button", { class: "btn ok", style: "margin-left:auto", onclick: () => fileInput.click() }, "Wybierz plik"));
  const importLog = el("div", {});
  io.append(importBox, fileInput, importLog);
  fileInput.onchange = async () => {
    const f = fileInput.files[0];
    if (!f) return;
    importLog.innerHTML = "";
    importLog.append(el("p", { class: "muted" }, "Wgrywam " + f.name + "…"));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r = await API.post("/api/admin/import", { filename: f.name, data: reader.result });
        importLog.innerHTML = "";
        importLog.append(el("div", { class: "feedback fb-good" },
          el("div", { class: "fb-head" }, `✔ Zaimportowano: ${r.added} nowych pozycji`),
          ...r.report.map(x => el("div", { class: "check-item " + (x.ok ? "done" : "miss") },
            (x.ok ? "✔ " : "✘ ") + (x.msg || x.file)))));
        confetti();
        toast("Import zakończony");
      } catch (e) {
        importLog.innerHTML = "";
        importLog.append(el("div", { class: "feedback fb-bad" },
          el("div", { class: "fb-head" }, "✘ Import nieudany"),
          el("div", {}, String(e.message || e))));
      }
      fileInput.value = "";
    };
    reader.readAsDataURL(f);
  };
  main.append(io);

  // ---------- dodawanie treści ----------
  const add = el("div", { class: "card" },
    el("h3", {}, "➕ Dodaj nową treść"),
    el("p", { class: "muted small" },
      "Każdy rodzaj treści trafia do własnego, podpisanego pliku — możesz go potem otworzyć niżej i poprawić. " +
      "Lektor (głos) generuje się automatycznie z tekstu, nie trzeba nagrań."));
  const modSel = el("select", {});
  data.modules.forEach(mo => modSel.append(el("option", { value: mo.id }, `${mo.emoji} ${mo.label}`)));
  const form = el("div", {});
  add.append(el("div", { class: "set-row" }, "Rodzaj: ", modSel,
    el("span", { class: "muted small", id: "modfile" }, "")), form);
  main.append(add);
  modSel.onchange = renderForm;

  function lvl() {
    const s = el("select", {});
    ["A1", "A2", "B1", "B2", "C1"].forEach(L => s.append(el("option", { value: L }, L)));
    return s;
  }
  function themeSel() {
    const s = el("select", {});
    [["praca", "Praca / magazyn"], ["dom", "Dom"], ["jedzenie", "Jedzenie"], ["zwierzeta", "Zwierzęta"],
     ["transport", "Transport"], ["cialo", "Ciało i zdrowie"], ["rodzina", "Rodzina"], ["ubrania", "Ubrania"],
     ["miasto", "Miasto"], ["natura", "Natura"], ["uczucia", "Uczucia"], ["liczebniki", "Liczebniki"],
     ["kalendarz", "Kalendarz"], ["kolory", "Kolory"], ["czasowniki", "Czasowniki"], ["phrasal", "Phrasal verbs"],
     ["pulapki", "False friends"], ["ogolne", "Ogólne"], ["inne", "Inne"]].forEach(([v, n]) =>
      s.append(el("option", { value: v }, n)));
    return s;
  }

  async function save(module, item, label, clear) {
    try {
      const r = await API.post("/api/admin/add", { module, item });
      toast(`Zapisano jako [${r.nr}] w ${r.file}`);
      xpPop(1);
      if (clear) clear();
    } catch (e) { toast("Błąd zapisu", true); }
  }

  function renderForm() {
    const mo = data.modules.find(x => x.id === modSel.value);
    document.getElementById("modfile").textContent = "→ plik: data/" + mo.file;
    form.innerHTML = "";
    const k = mo.id;

    if (k === "fiszki") {
      const en = el("input", { class: "input", placeholder: "Słowo po angielsku" });
      const pl = el("input", { class: "input", placeholder: "Znaczenie po polsku" });
      const ex = el("input", { class: "input", placeholder: "Przykładowe zdanie (opcjonalnie)" });
      const hint = el("input", { class: "input", placeholder: "Podpowiedź / ostrzeżenie (opcjonalnie)" });
      const th = themeSel(), lv = lvl();
      form.append(en, pl, ex, hint, el("div", { class: "set-row" }, "Kategoria: ", th, " Poziom: ", lv,
        el("button", { class: "btn mini", onclick: () => en.value && speak(en.value) }, "🔊 Posłuchaj")),
        el("button", { class: "btn ok", onclick: () => {
          if (!en.value.trim() || !pl.value.trim()) return toast("Uzupełnij EN i PL", true);
          save("fiszki", { en: en.value.trim(), pl: pl.value.trim(), example: ex.value,
            hint: hint.value, theme: th.value, level: lv.value }, null,
            () => { en.value = pl.value = ex.value = hint.value = ""; en.focus(); });
        } }, "💾 Zapisz fiszkę"));
    }

    else if (k === "tlumaczenia") {
      const pl = el("input", { class: "input", placeholder: "Zdanie po polsku" });
      const en = el("input", { class: "input", placeholder: "Wzorcowe tłumaczenie EN" });
      const kw = el("input", { class: "input", placeholder: "Słowa kluczowe: przecinki, warianty przez | (puste = automat)" });
      const tn = el("input", { class: "input", placeholder: "Nazwa czasu, np. Past Simple" });
      const lv = lvl();
      form.append(pl, en, kw, tn, el("div", { class: "set-row" }, "Poziom: ", lv),
        el("button", { class: "btn ok", onclick: () => {
          if (!pl.value.trim() || !en.value.trim()) return toast("Uzupełnij PL i EN", true);
          const keywords = kw.value
            ? kw.value.split(",").map(g => g.split("|").map(s => s.trim()).filter(Boolean))
            : en.value.toLowerCase().split(/\s+/).filter(w => w.length > 3).map(w => [w]);
          save("tlumaczenia", { pl: pl.value.trim(), en_ref: en.value.trim(), keywords,
            tense_name: tn.value, tense_patterns: [], forbidden: [], level: lv.value, domain: "general" },
            null, () => { pl.value = en.value = kw.value = ""; pl.focus(); });
        } }, "💾 Zapisz zdanie"));
    }

    else if (k === "dyktanda") {
      const en = el("input", { class: "input", placeholder: "Zdanie EN (będzie czytane głosem)" });
      const pl = el("input", { class: "input", placeholder: "Tłumaczenie PL" });
      const lv = lvl();
      form.append(en, pl, el("div", { class: "set-row" }, "Poziom: ", lv,
        el("button", { class: "btn mini", onclick: () => en.value && speak(en.value) }, "🔊 Sprawdź brzmienie")),
        el("button", { class: "btn ok", onclick: () => {
          if (!en.value.trim()) return toast("Wpisz zdanie EN", true);
          save("dyktanda", { en: en.value.trim(), pl: pl.value, level: lv.value }, null,
            () => { en.value = pl.value = ""; en.focus(); });
        } }, "💾 Zapisz dyktando"));
    }

    else if (k === "gramatyka") {
      const id = el("input", { class: "input", placeholder: "Identyfikator tematu, np. passive_voice" });
      const name = el("input", { class: "input", placeholder: "Nazwa tematu, np. Strona bierna" });
      const rule = el("input", { class: "input", placeholder: "Reguła w jednym zdaniu (pokazuje się przy błędzie)" });
      const theory = el("textarea", { class: "input", placeholder: "Teoria (może zawierać HTML: <p>, <b>, <br>)" });
      const lv = lvl();
      const exWrap = el("div", {});
      const exercises = [];
      function addEx() {
        const text = el("input", { class: "input", placeholder: "Treść, np. She ___ to work." });
        const o1 = el("input", { class: "input opt-inp", placeholder: "Opcja A" });
        const o2 = el("input", { class: "input opt-inp", placeholder: "Opcja B" });
        const o3 = el("input", { class: "input opt-inp", placeholder: "Opcja C (opcjonalnie)" });
        const o4 = el("input", { class: "input opt-inp", placeholder: "Opcja D (opcjonalnie)" });
        let correct = 0;
        const radios = [o1, o2, o3, o4].map((o, i) =>
          el("label", { class: "opt-row" },
            el("input", { type: "radio", name: "gr" + exercises.length, ...(i === 0 ? { checked: 1 } : {}),
              onchange: () => { correct = i; } }), o));
        const plt = el("input", { class: "input", placeholder: "Tłumaczenie zdania PL" });
        const exp = el("input", { class: "input", placeholder: "Wyjaśnienie, dlaczego ta odpowiedź" });
        const box = el("div", { class: "task-row", style: "display:block" }, text, ...radios, plt, exp);
        exWrap.append(box);
        exercises.push(() => {
          const opts = [o1, o2, o3, o4].map(o => o.value.trim()).filter(Boolean);
          if (!text.value.trim() || opts.length < 2) return null;
          return { id: "ex" + Math.random().toString(36).slice(2, 7), type: "choice",
            text: text.value.trim(), options: opts, answer: Math.min(correct, opts.length - 1),
            pl: plt.value, explain: exp.value };
        });
      }
      addEx();
      form.append(id, name, rule, theory, el("div", { class: "set-row" }, "Poziom: ", lv),
        el("h4", {}, "Ćwiczenia"), exWrap,
        el("button", { class: "btn mini", onclick: addEx }, "+ dodaj ćwiczenie"),
        el("button", { class: "btn ok", onclick: () => {
          const ex = exercises.map(f => f()).filter(Boolean);
          if (!id.value.trim() || !name.value.trim() || !ex.length)
            return toast("Podaj identyfikator, nazwę i min. 1 ćwiczenie", true);
          ex.forEach((e, i) => e.nr = i + 1);
          save("gramatyka", { id: id.value.trim(), name: name.value.trim(), level: lv.value,
            rule: rule.value, theory: theory.value || "<p>" + rule.value + "</p>", exercises: ex },
            null, () => viewAdmin());
        } }, "💾 Zapisz temat gramatyczny"));
    }

    else if (k === "czytanie") {
      const title = el("input", { class: "input", placeholder: "Tytuł tekstu" });
      const txt = el("textarea", { class: "input", style: "min-height:150px", placeholder: "Tekst po angielsku (akapity oddziel pustą linią)" });
      const txtPl = el("textarea", { class: "input", style: "min-height:120px", placeholder: "Tłumaczenie tekstu na polski" });
      const lv = lvl();
      const qWrap = el("div", {});
      const questions = [];
      function addQ() {
        const qt = el("input", { class: "input", placeholder: "Pytanie po angielsku" });
        const os = [1, 2, 3, 4].map(i => el("input", { class: "input opt-inp", placeholder: "Odpowiedź " + i }));
        const ospl = [1, 2, 3, 4].map(i => el("input", { class: "input opt-inp", placeholder: "Tłumaczenie odpowiedzi " + i }));
        let corr = 0;
        const rows = os.map((o, i) => el("label", { class: "opt-row" },
          el("input", { type: "radio", name: "rq" + questions.length, ...(i === 0 ? { checked: 1 } : {}),
            onchange: () => { corr = i; } }), o, ospl[i]));
        const exp = el("input", { class: "input", placeholder: "Wyjaśnienie po polsku" });
        qWrap.append(el("div", { class: "task-row", style: "display:block" }, qt, ...rows, exp));
        questions.push(() => {
          const opts = os.map(o => o.value.trim()).filter(Boolean);
          if (!qt.value.trim() || opts.length < 2) return null;
          return { text: qt.value.trim(), options: opts, answer: Math.min(corr, opts.length - 1),
            options_pl: ospl.map(o => o.value.trim()), pl: exp.value };
        });
      }
      addQ();
      form.append(title, txt, txtPl, el("div", { class: "set-row" }, "Poziom: ", lv),
        el("h4", {}, "Pytania"), qWrap,
        el("button", { class: "btn mini", onclick: addQ }, "+ dodaj pytanie"),
        el("button", { class: "btn ok", onclick: () => {
          if (!title.value.trim() || !txt.value.trim()) return toast("Podaj tytuł i tekst", true);
          save("czytanie", { id: "r_" + Date.now(), title: title.value.trim(), level: lv.value,
            emoji: "📖", text: txt.value.trim(), text_pl: txtPl.value.trim(),
            questions: questions.map(f => f()).filter(Boolean) }, null, () => viewAdmin());
        } }, "💾 Zapisz tekst"));
    }

    else if (k === "pisanie") {
      const title = el("input", { class: "input", placeholder: "Tytuł zadania" });
      const brief = el("input", { class: "input", placeholder: "Polecenie dla ucznia" });
      const must = el("input", { class: "input", placeholder: "Wymagane elementy (PL), oddziel przecinkami" });
      const kw = el("input", { class: "input", placeholder: "Słowa-klucze do wykrycia elementów: grupa1a|grupa1b, grupa2a" });
      const minw = el("input", { class: "input short", type: "number", value: 40 });
      const model = el("textarea", { class: "input", placeholder: "Wzorcowa wypowiedź po angielsku" });
      const hint = el("input", { class: "input", placeholder: "Podpowiedź gramatyczna" });
      const lv = lvl();
      form.append(title, brief, must, kw,
        el("div", { class: "set-row" }, "Min. słów: ", minw, " Poziom: ", lv), hint, model,
        el("button", { class: "btn ok", onclick: () => {
          if (!title.value.trim() || !brief.value.trim()) return toast("Podaj tytuł i polecenie", true);
          save("pisanie", { id: "w_" + Date.now(), title: title.value.trim(), level: lv.value,
            emoji: "✍️", brief: brief.value.trim(),
            must: kw.value.split(",").map(g => g.split("|").map(s => s.trim()).filter(Boolean)).filter(g => g.length),
            must_pl: must.value.split(",").map(s => s.trim()).filter(Boolean),
            min_words: +minw.value, tense_hint: hint.value, model: model.value.trim() },
            null, () => viewAdmin());
        } }, "💾 Zapisz zadanie pisemne"));
    }

    else if (k === "rozmowy") {
      const name = el("input", { class: "input", placeholder: "Nazwa scenki, np. Rozmowa z kurierem" });
      const desc = el("input", { class: "input", placeholder: "Krótki opis sytuacji" });
      const lv = lvl();
      const nodesWrap = el("div", {});
      const nodes = [];
      function addNode() {
        const idx = nodes.length;
        const npcEn = el("input", { class: "input", placeholder: "Kwestia rozmówcy po angielsku" });
        const npcPl = el("input", { class: "input", placeholder: "Tłumaczenie kwestii" });
        const hint = el("input", { class: "input", placeholder: "Podpowiedź: co ma zrobić uczeń" });
        const mode = el("select", {}, el("option", { value: "choice" }, "Wybór odpowiedzi"),
          el("option", { value: "write" }, "Uczeń pisze sam"));
        const body = el("div", {});
        const opts = [];
        const model = el("input", { class: "input", placeholder: "Wzorcowa odpowiedź (tryb pisania)" });
        const kws = el("input", { class: "input", placeholder: "Słowa kluczowe: grupa1a|grupa1b, grupa2" });
        function renderMode() {
          body.innerHTML = "";
          opts.length = 0;
          if (mode.value === "choice") {
            [1, 2, 3].forEach(i => {
              const en = el("input", { class: "input", placeholder: `Odpowiedź ${i} (EN)` });
              const pl = el("input", { class: "input", placeholder: `Tłumaczenie ${i}` });
              const good = el("input", { type: "checkbox", ...(i === 1 ? { checked: 1 } : {}) });
              const fb = el("input", { class: "input", placeholder: "Komentarz: dlaczego dobra/zła" });
              body.append(el("div", { class: "task-row", style: "display:block" },
                el("label", { class: "opt-row" }, good, el("span", { class: "muted small" }, "naturalna odpowiedź")),
                en, pl, fb));
              opts.push(() => en.value.trim() ? { en: en.value.trim(), pl: pl.value,
                good: good.checked, feedback: fb.value } : null);
            });
          } else {
            body.append(model, kws);
          }
        }
        mode.onchange = renderMode;
        renderMode();
        nodesWrap.append(el("div", { class: "path-sec", style: "padding:10px" },
          el("b", {}, `Kwestia ${idx + 1}`), npcEn, npcPl, hint,
          el("div", { class: "set-row" }, "Tryb: ", mode,
            el("button", { class: "btn mini", onclick: () => npcEn.value && speak(npcEn.value) }, "🔊 Posłuchaj")),
          body));
        nodes.push(() => {
          if (!npcEn.value.trim()) return null;
          const nid = "n" + (idx + 1);
          const next = "n" + (idx + 2);
          const base = { id: nid, npc_en: npcEn.value.trim(), npc_pl: npcPl.value,
            hint: hint.value, mode: mode.value };
          if (mode.value === "choice") {
            base.options = opts.map(f => f()).filter(Boolean).map(o => ({ ...o, next }));
          } else {
            base.write = { model: model.value.trim(),
              keywords: kws.value.split(",").map(g => g.split("|").map(s => s.trim()).filter(Boolean)).filter(g => g.length),
              next };
          }
          return base;
        });
      }
      addNode();
      form.append(name, desc, el("div", { class: "set-row" }, "Poziom: ", lv),
        el("p", { class: "muted small" }, "Kwestie łączą się po kolei; ostatnia kończy rozmowę. Głos rozmówcy generuje się automatycznie."),
        nodesWrap,
        el("button", { class: "btn mini", onclick: addNode }, "+ dodaj kwestię"),
        el("button", { class: "btn ok", onclick: () => {
          const ns = nodes.map(f => f()).filter(Boolean);
          if (!name.value.trim() || !ns.length) return toast("Podaj nazwę i min. 1 kwestię", true);
          ns[ns.length - 1].options?.forEach(o => o.next = "END");
          if (ns[ns.length - 1].write) ns[ns.length - 1].write.next = "END";
          save("rozmowy", { id: "dlg_" + Date.now(), name: name.value.trim(), desc: desc.value,
            level: lv.value, emoji: "💬", nodes: ns }, null, () => viewAdmin());
        } }, "💾 Zapisz rozmowę"));
    }

    else if (k === "wiedza") {
      const name = el("input", { class: "input", placeholder: "Nazwa zagadnienia" });
      const what = el("textarea", { class: "input", placeholder: "Czym to jest — krótko" });
      const when = el("input", { class: "input", placeholder: "Kiedy używać (oddziel średnikami)" });
      const plus = el("input", { class: "input", placeholder: "Twierdzenie — wzór" });
      const minus = el("input", { class: "input", placeholder: "Przeczenie — wzór" });
      const quest = el("input", { class: "input", placeholder: "Pytanie — wzór" });
      const exs = el("textarea", { class: "input", placeholder: "Przykłady, po jednym w linii: English = tłumaczenie" });
      const mist = el("input", { class: "input", placeholder: "Typowe błędy (średniki)" });
      const lv = lvl();
      form.append(name, what, when, plus, minus, quest, exs, mist,
        el("div", { class: "set-row" }, "Poziom: ", lv),
        el("button", { class: "btn ok", onclick: () => {
          if (!name.value.trim() || !what.value.trim()) return toast("Podaj nazwę i opis", true);
          save("wiedza", { id: "kb_" + Date.now(), cat: "basics", name: name.value.trim(),
            level: lv.value, what: what.value.trim(),
            when: when.value.split(";").map(s => s.trim()).filter(Boolean),
            form: { plus: plus.value, minus: minus.value, question: quest.value },
            signals: [],
            examples: exs.value.split("\n").map(l => l.split("=").map(s => s.trim()))
              .filter(p => p.length === 2 && p[0]),
            mistakes: mist.value.split(";").map(s => s.trim()).filter(Boolean),
            quiz: [] }, null, () => viewAdmin());
        } }, "💾 Zapisz artykuł"));
    }
  }
  renderForm();

  // ---------- przegląd plików ----------
  const filesCard = el("div", { class: "card" },
    el("h3", {}, "🗂 Pliki materiałów"),
    el("p", { class: "muted small" }, "Każdy plik ma etykietę i licznik pozycji. Kliknij, aby podejrzeć i poprawić zawartość."));
  const byFolder = {};
  data.files.forEach(f => (byFolder[f.folder] = byFolder[f.folder] || []).push(f));
  Object.entries(byFolder).forEach(([folder, list]) => {
    const det = el("details", { class: "path-sec" });
    det.append(el("summary", {}, el("b", {}, "📁 data/" + folder),
      el("span", { class: "muted small" }, ` — ${list.length} plików`)));
    list.forEach(f => det.append(el("div", { class: "bank-row" },
      el("span", { class: "badge" }, String(f.items)),
      el("span", { class: "task-label" }, el("b", {}, f.label),
        el("div", { class: "muted small" }, f.path + (f.opis ? " · " + f.opis : ""))),
      el("button", { class: "btn mini", onclick: () => editFile(f.path) }, "✏️ Otwórz"))));
    filesCard.append(det);
  });
  main.append(filesCard);

  async function editFile(path) {
    const r = await API.get("/api/admin/file?path=" + encodeURIComponent(path));
    const bg = el("div", { class: "modal-bg", onclick: e => { if (e.target === bg) bg.remove(); } });
    const ta = el("textarea", { class: "input code-area" });
    ta.value = r.content;
    const status = el("span", { class: "muted small" });
    const modal = el("div", { class: "modal card", style: "max-width:900px" },
      el("h3", {}, "✏️ " + path),
      el("p", { class: "muted small" }, "Edytujesz plik bezpośrednio. Przed zapisem tworzona jest kopia zapasowa w data/_kopie."),
      ta,
      el("div", { class: "fb-btns" },
        el("button", { class: "btn ok", onclick: async () => {
          try {
            const res = await API.post("/api/admin/file", { path, content: ta.value });
            status.textContent = `zapisano · ${res.items} pozycji`;
            toast("Zapisano " + path);
          } catch (e) { status.textContent = String(e.message || e); toast("Błąd zapisu", true); }
        } }, "💾 Zapisz"),
        el("button", { class: "btn ghost", onclick: () => bg.remove() }, "Zamknij"), status));
    bg.append(modal);
    document.body.append(bg);
  }
}
