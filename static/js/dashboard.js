// Pulpit ucznia
async function viewDashboard() {
  clearMain();
  const main = document.querySelector("main");
  const d = await API.get("/api/dashboard");
  const p = d.profile;

  if (!p.placement_done && p.role !== "teacher") {
    main.append(hero("🧭", `Cześć, ${p.username}!`, "Wybierz, jak chcesz zacząć", "indigo"));
    const lvl = levelSelect("A1");
    main.append(el("div", { class: "start-grid" },
      el("div", { class: "card start-card" },
        el("div", { class: "start-emoji" }, "🎯"),
        el("h3", {}, "Zrób test poziomujący"),
        el("p", { class: "muted" }, "15–25 minut. Słownictwo (też pisanie), gramatyka, czytanie, tłumaczenie i słuchanie w obu kierunkach. Najdokładniej ustawi Twój plan."),
        el("button", { class: "btn primary big", onclick: () => { location.hash = "#placement"; } },
          "▶ Rozpocznij test")),
      el("div", { class: "card start-card start-skip" },
        el("div", { class: "start-emoji" }, "⏭"),
        el("h3", {}, "Pomiń test i zacznij od razu"),
        el("p", { class: "muted" }, "Wskaż poziom sam — aplikacja i tak zweryfikuje go podczas nauki (egzaminy na Ścieżce). Test możesz zrobić w dowolnej chwili."),
        el("div", { class: "set-row" }, "Mój poziom: ", lvl),
        el("button", { class: "btn ok big", onclick: async () => {
          await API.post("/api/placement/skip", { level: lvl.value || "A1" });
          toast("Pominięto test — zaczynamy naukę!");
          location.hash = "#path";
        } }, "⏭ Pomiń test i ucz się"))));
    return;
  }

  main.append(hero("🏠", `Witaj, ${p.username}!`,
    `Poziom ${p.level || "?"}${p.target_level ? " → cel " + p.target_level : ""} · ${p.streak} dni serii · ${p.xp} XP`,
    "ember"));

  // ---- KONTYNUUJ NAUKĘ: aplikacja sama wie, co dalej
  try {
    const c = await API.get("/api/continue");
    main.append(el("div", { class: "continue-box" },
      el("div", { class: "tile-emoji", style: "font-size:38px" }, "🧭"),
      el("div", { class: "continue-txt" },
        el("b", {}, "Kontynuuj naukę"),
        el("div", {}, c.label)),
      el("button", {
        class: "btn", style: "margin-left:auto",
        onclick: () => {
          if (c.action === "theme") return viewFlashcards("all", c.param);
          if (c.action === "path") return viewPath();
          location.hash = c.hash;
        },
      }, "▶ Start")));
  } catch (e) { /* brak danych — pomijamy */ }

  // ---- mapa luk (heatmapa kategorii)
  try {
    const g = await API.get("/api/gaps");
    const gapCard = el("div", { class: "card" },
      el("h3", {}, "🔍 Mapa Twojej wiedzy"),
      el("p", { class: "muted small" },
        g.weak.length
          ? "Wykryte braki: " + g.weak.map(w => `${w.name} (${Math.round(w.eff)}%)`).join(", ") +
            " — te kategorie dostaną priorytet w kolejnych sesjach."
          : "Za mało danych, by wskazać braki — ucz się dalej, a mapa się wypełni."));
    const grid = el("div", { class: "gap-grid" });
    if (g.all) {
      grid.append(el("div", { class: "gap-cell gap-all", title: "Losowe fiszki z całej bazy",
        onclick: () => viewFlashcards("all", "all") },
        el("div", { class: "gap-name" }, "🎲 WSZYSTKO"),
        el("div", { class: "gap-val" }, `${g.all.total} fiszek · poznane ${g.all.known}`)));
    }
    g.themes.forEach(t => {
      const v = t.eff;
      const cls = v == null ? "gap-none" : (v < 45 ? "gap-bad" : (v < 70 ? "gap-mid" : "gap-ok"));
      grid.append(el("div", { class: "gap-cell " + cls, title: "Kliknij, by trenować tę kategorię",
        onclick: () => viewFlashcards("all", t.theme) },
        el("div", { class: "gap-name" }, t.name),
        el("div", { class: "gap-val" }, (v == null ? "brak danych" : Math.round(v) + "%") + ` · ${t.known}/${t.total}`)));
    });
    gapCard.append(grid);
    main.append(gapCard);
  } catch (e) { /* pomijamy */ }

  // ---- rząd 1: dzienny cel + prognoza + skille
  const row1 = el("div", { class: "grid3" });
  const goal = p.settings.daily_goal_xp || 50;
  row1.append(el("div", { class: "card center" },
    el("h3", {}, "Dzisiaj"),
    ring(d.daily.xp, goal, `/ ${goal} XP`),
    el("div", { class: "muted" }, `${d.daily.answers} odpowiedzi · ${d.daily.correct} dobrych`)));
  const est = el("div", { class: "card" }, el("h3", {}, "Prognoza"));
  if (d.estimate && d.estimate.weeks != null)
    est.append(el("div", { class: "big" }, d.estimate.weeks + " tyg."),
      el("div", { class: "muted" }, `do poziomu ${p.target_level} przy obecnym tempie (${d.estimate.pace_per_week} pkt/tydz.)`));
  else est.append(el("p", { class: "muted" }, d.estimate ? d.estimate.msg : "Ustaw poziom docelowy w ustawieniach niżej."));
  row1.append(est);
  const sk = el("div", { class: "card" }, el("h3", {}, "Umiejętności"));
  const names = { vocab: "Słownictwo", grammar: "Gramatyka", reading: "Czytanie", listening: "Słuchanie", writing: "Pisanie" };
  for (const [k, label] of Object.entries(names))
    sk.append(skillBar(label, d.skills[k], d.cefr[k]));
  row1.append(sk);
  main.append(row1);

  // ---- rząd 2: etapy nauki per dziedzina
  const stg = el("div", { class: "card" }, el("h3", {}, "🪜 Etapy nauki"));
  const DOMN = { general: "Ogólny angielski", warehouse: "Magazyn / logistyka" };
  for (const [dom, s] of Object.entries(d.stages || {})) {
    stg.append(el("div", { class: "stage-row" },
      el("div", { class: "stage-dom" }, DOMN[dom] || dom),
      el("div", { class: "stage-steps" },
        ...[1, 2, 3, 4, 5].map(n => el("span", { class: "stage-dot" + (n <= s.stage ? " on" : "") }, n))),
      el("div", { class: "stage-name" }, `Etap ${s.stage}/5: ${s.name}`),
      el("div", { class: "muted small" },
        `poznane ${s.known}/${s.total} słówek · utrwalone ${s.mature}` +
        (s.translate_unlocked ? " · tłumaczenia 🔓" : " · tłumaczenia 🔒 (poznaj 25% słówek)"))));
  }
  main.append(stg);

  // ---- rząd 3: moduły z licznikami
  const stats = await API.get("/api/content/stats");
  const lessonsDone = d.lesson_progress ? `${d.lesson_progress.chapters_done}/${d.lesson_progress.chapters_total} rozdz.` : "nowość!";
  const tiles = el("div", { class: "tile-grid stagger" });
  const tileData = [
    ["#path", "🧭", "Ścieżka nauki", "prowadzi krok po kroku", "słówka → teoria → ćwiczenia → sprawdzian", "ember"],
    ["#dialogs", "💬", "Rozmowy", "symulacje z życia", "praca, urlop, lekarz, kantyna", "teal"],
    ["#repair", "🩹", "Napraw błędy", "sesja z Twoich potknięć", "pijawki + najczęstsze błędy", "gold"],
    ["#training", "🛠", "Mój trening", "sam wybierasz kategorie", "słownictwo, gramatyka, słuchanie…", "indigo"],
    ["#flashcards", "🃏", "Fiszki", d.due ? `${d.due} do powtórki` : "wszystko powtórzone", `${stats.vocab_total} słówek w bazie`, "ember"],
    ["#verbs", "⚙️", "Czasowniki z czasami", d.verb_due ? `${d.verb_due} do powtórki` : "trenuj odmianę", `${stats.verbs} czasowników × 3 czasy × 2 kierunki`, "teal"],
    ["#knowledge", "📖", "Baza wiedzy", "teoria + sprawdzian opisowy", "czasy, zaimki, przedimki", "indigo"],
    ["#lessons", "📚", "Lekcje", lessonsDone, `${stats.lessons[0] ? stats.lessons[0].chapters.length : 0} rozdziały + sprawdzian`, "violet"],
    ["#grammar", "📐", "Gramatyka", "tematy + mieszane", `${stats.grammar.topics} tematów · ${stats.grammar.exercises} ćwiczeń`, "indigo"],
    ["#translate", "🌐", "Tłumaczenia", "PL → EN z oceną czasu", `${stats.translations} zdań`, "teal"],
    ["#listening", "🎧", "Słuchanie", "EN i PL→EN", `${stats.listening + stats.placement.listening + stats.placement.listening_pl} nagrań`, "violet"],
    ["#games", "🎮", "Gry", "pary na czas", "utrwalanie przez zabawę", "gold"],
    ["#programs", "📋", "Programy", "od nauczyciela", "", "indigo"],
  ];
  tileData.forEach(([hash, emo, name, sub, cnt, theme], i) => {
    tiles.append(el("div", { class: "tile tile-" + theme, style: `animation-delay:${i * 55}ms`, onclick: () => { location.hash = hash; } },
      el("div", { class: "tile-emoji" }, emo),
      el("b", {}, name),
      el("div", { class: "small" }, sub),
      cnt ? el("div", { class: "tile-count" }, cnt) : null));
  });
  main.append(el("div", { class: "card" }, el("h3", {}, "🚀 Moduły"), tiles));

  // ---- rząd 4: wykres + słowo dnia + leeches
  const row4 = el("div", { class: "grid2" });
  const chart = el("div", { class: "card" }, el("h3", {}, "Ostatnie 14 dni"));
  const bars = el("div", { class: "bars" });
  const maxXp = Math.max(10, ...d.days.map(x => x.xp));
  d.days.forEach(day => bars.append(
    el("div", { class: "bar-col", title: `${day.day}: ${day.xp} XP` },
      el("div", { class: "bar", style: `height:${Math.round(64 * day.xp / maxXp)}px` }),
      el("div", { class: "bar-lbl" }, day.day.slice(3)))));
  chart.append(bars);
  row4.append(chart);
  const right = el("div", { class: "card" });
  if (d.word_of_day) right.append(el("h3", {}, "Słowo dnia"),
    el("div", { class: "wod" },
      el("b", {}, d.word_of_day.en), " — ", d.word_of_day.pl, " ",
      el("button", { class: "mini-tts", onclick: () => speak(d.word_of_day.en) }, "🔊")),
    el("div", { class: "muted small" }, d.word_of_day.example || ""));
  if (d.leeches) right.append(el("div", { class: "muted", style: "margin-top:8px" },
    d.leeches ? `⚠️ Uparte słówka (pijawki): ${d.leeches}` : ""));
  try {
    const w = await API.get("/api/report/week");
    const dxp = w.this.xp - w.prev.xp;
    right.append(el("h3", { style: "margin-top:12px" }, "📊 Raport tygodniowy"),
      el("div", { class: "week-row" },
        el("div", { class: "week-cell" }, el("div", { class: "big" }, String(w.this.xp)),
          el("div", { class: "muted small" }, "XP w tym tygodniu"),
          el("div", { class: dxp >= 0 ? "delta-up" : "delta-down" },
            (dxp >= 0 ? "▲ +" : "▼ ") + dxp + " vs poprzedni")),
        el("div", { class: "week-cell" }, el("div", { class: "big" }, String(w.this.answers)),
          el("div", { class: "muted small" }, "odpowiedzi"),
          el("div", { class: "muted small" }, w.this.acc != null ? w.this.acc + "% trafień" : "—")),
        el("div", { class: "week-cell" }, el("div", { class: "big" }, w.this.active + "/7"),
          el("div", { class: "muted small" }, "dni aktywnych"))));
    if (w.weakest.length) right.append(el("div", { class: "muted small", style: "margin-top:6px" },
      "Najsłabsze kategorie: " + w.weakest.map(x => `${x.name} ${Math.round(x.score)}%`).join(" · ")));
  } catch (e) { /* pomijamy */ }
  row4.append(right);
  main.append(row4);

  // ---- dostęp z telefonu
  try {
    const net = await API.get("/api/network");
    const phone = el("div", { class: "card" },
      el("h3", {}, "📱 Ucz się na telefonie"),
      el("button", { class: "btn ok", id: "installbtn", onclick: installApp },
        "⬇ Zainstaluj jako aplikację"),
      net.lan
        ? el("div", {},
            el("p", { class: "muted small" },
              "Aplikacja jest udostępniona w Twojej sieci Wi-Fi. Wpisz ten adres w przeglądarce telefonu:"),
            el("div", { class: "phone-url" }, net.url),
            el("p", { class: "muted small" },
              "Telefon musi być w tej samej sieci Wi-Fi co komputer. Po otwarciu wybierz w menu przeglądarki " +
              "„Dodaj do ekranu głównego” — aplikacja będzie działać jak zwykła apka."))
        : el("div", {},
            el("p", { class: "muted small" },
              "Dwie możliwości: (1) uruchom na komputerze plik start_telefon.bat — telefon połączy się " +
              "przez Wi-Fi; (2) zainstaluj aplikację bezpośrednio na telefonie, wtedy komputer nie jest " +
              "potrzebny — instrukcja w folderze telefon/CZYTAJ_TO_NAJPIERW.md."),
            el("div", { class: "phone-url muted" }, "obecnie: tylko ten komputer")));
    main.append(phone);
  } catch (e) { /* pomijamy */ }

  // ---- panel administratora
  const adminCard = el("div", { class: "card admin-card" });
  if (p.admin) {
    adminCard.append(
      el("div", { class: "pl-top" },
        el("h3", {}, "🛡 Tryb administratora aktywny"),
        el("span", { class: "badge" }, "zalogowano")),
      el("p", { class: "muted small" },
        "Masz dostęp do dodawania treści, edycji plików materiału oraz eksportu i importu paczek."),
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: () => { location.hash = "#admin"; } },
          "🛡 Otwórz panel administratora"),
        el("button", { class: "btn ghost", onclick: async () => {
          await API.post("/api/admin/logout", {});
          window.IS_ADMIN = false;
          toast("Wylogowano z trybu administratora");
          location.reload();
        } }, "Wyloguj z trybu admina")));
  } else {
    const pass = el("input", { class: "input short", type: "password", placeholder: "hasło" });
    const go = async () => {
      try {
        await API.post("/api/admin/unlock", { password: pass.value });
        window.IS_ADMIN = true;
        toast("Zalogowano jako administrator");
        location.hash = "#admin";
        location.reload();
      } catch (e) { toast("Błędne hasło administratora", true); pass.value = ""; }
    };
    pass.onkeydown = e => { if (e.key === "Enter") go(); };
    adminCard.append(
      el("h3", {}, "🛡 Administrator"),
      el("p", { class: "muted small" },
        "Hasło administratora: pełne uprawnienia — role kont, widoczność działów, materiały (fiszki, gramatykę, rozmowy, teksty), " +
        "edytować pliki treści oraz eksportować i importować paczki materiałów."),
      el("div", { class: "set-row" }, pass, el("button", { class: "btn ok", onclick: go }, "Zaloguj")));
  }
  main.append(adminCard);

  // ---- ustawienia + eksport + reset
  const set = el("div", { class: "card" }, el("h3", {}, "⚙️ Ustawienia"));
  const tgt = levelSelect(p.target_level);
  const lvlNote = el("p", { class: "muted small" },
    "Poziom badany jest automatycznie (test poziomujący + egzaminy na Ścieżce). Cel poniżej to tylko prognoza tempa.");
  const goalInp = el("input", { class: "input short", type: "number", value: goal, min: 10, max: 500 });
  const domWrap = el("div", {});
  const domains = new Set(p.domains || ["general"]);
  [["general", "Ogólny"], ["warehouse", "Magazyn"]].forEach(([id, label]) => {
    domWrap.append(el("label", { class: "chip chip-check" },
      el("input", { type: "checkbox", ...(domains.has(id) ? { checked: "" } : {}),
        onchange: e => e.target.checked ? domains.add(id) : domains.delete(id) }), " " + label));
  });
  set.append(lvlNote,
    el("div", { class: "set-row" }, "Poziom docelowy: ", tgt),
    el("div", { class: "set-row" }, "Cel dzienny XP: ", goalInp),
    el("div", { class: "set-row" }, "Dziedziny: ", domWrap),
    el("div", { class: "set-row" },
      el("label", { class: "chip chip-check" },
        el("input", { type: "checkbox", ...(LFSET.get("tts_auto", true) ? { checked: "" } : {}),
          onchange: e => LFSET.set("tts_auto", e.target.checked) }),
        " 🔊 Czytaj odpowiedzi na głos"),
      el("label", { class: "chip chip-check" },
        el("input", { type: "checkbox", ...(LFSET.get("haptics", true) ? { checked: "" } : {}),
          onchange: e => LFSET.set("haptics", e.target.checked) }),
        " 📳 Wibracje przy odpowiedzi"),
      el("button", { class: "btn ok", onclick: ttsDiagnose }, "🔊 Sprawdź lektora")),
    el("button", { class: "btn ok", onclick: async () => {
      await API.post("/api/settings", { target_level: tgt.value || null, daily_goal_xp: +goalInp.value, domains: [...domains] });
      toast("Zapisano ✔"); viewDashboard();
    } }, "Zapisz"),
    el("hr", {}),
    el("div", { class: "set-row" },
      el("button", { class: "btn ghost", onclick: () => API.download("/api/export?fmt=csv") }, "⬇ Eksport CSV"),
      el("button", { class: "btn ghost", onclick: () => API.download("/api/export?fmt=json") }, "⬇ Eksport JSON")),
    el("hr", {}),
    el("h4", {}, "💾 Kopia postępów (przeniesienie na inne urządzenie)"),
    el("p", { class: "muted small" },
      "Pobierz kopię na komputerze i wgraj ją na telefonie (lub odwrotnie) — przeniesiesz poziom, " +
      "fiszki, powtórki, ukończone ogniwa i historię. Konto musi mieć tę samą nazwę."),
    (() => {
      const inp = el("input", { type: "file", accept: ".json", style: "display:none" });
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = async () => {
          try {
            const r = await API.post("/api/account/restore", { data: rd.result });
            toast(`Wgrano kopię z ${r.from_device_date || "innego urządzenia"} ✔`);
            confetti();
            setTimeout(() => location.reload(), 900);
          } catch (e) { toast("Nie udało się wgrać kopii", true); }
          inp.value = "";
        };
        rd.readAsDataURL(f);
      };
      return el("div", { class: "set-row" },
        el("button", { class: "btn ok", onclick: () => API.download("/api/account/backup") },
          "⬇ Pobierz kopię postępów"),
        el("button", { class: "btn ghost", onclick: () => inp.click() }, "⬆ Wgraj kopię"), inp);
    })(),
    el("hr", {}),
    el("details", {},
      el("summary", { class: "danger-sum" }, "🗑 Resetuj postępy (strefa niebezpieczna)"),
      el("p", { class: "muted small" }, "Kasuje WSZYSTKO: poziom, fiszki, czasowniki, lekcje, XP, historię. Zostaje tylko login i hasło. Wpisz RESET aby potwierdzić."),
      (() => {
        const conf = el("input", { class: "input short", placeholder: "RESET" });
        const btn = el("button", { class: "btn danger", onclick: async () => {
          if (conf.value.trim().toUpperCase() !== "RESET") { toast("Wpisz RESET aby potwierdzić", true); return; }
          await API.post("/api/reset", {});
          toast("Konto wyzerowane. Zaczynamy od nowa!");
          location.hash = "#dashboard"; viewDashboard();
        } }, "Resetuj wszystko");
        return el("div", { class: "set-row" }, conf, btn);
      })()));
  main.append(set);
}


// ---------- diagnostyka lektora ----------
function ttsDiagnose() {
  const bg = el("div", { class: "modal-bg", onclick: e => { if (e.target === bg) bg.remove(); } });
  const out = el("div", { class: "tts-diag" });
  const modal = el("div", { class: "modal card", style: "max-width:560px" },
    el("h3", {}, "🔊 Sprawdzenie lektora"),
    el("p", { class: "muted small" },
      "Dotknij przycisku poniżej. Na telefonie dźwięk odezwie się tylko po Twoim dotknięciu — " +
      "to zasada przeglądarek, nie błąd aplikacji."),
    el("div", { class: "fb-btns" },
      el("button", { class: "btn primary big", onclick: () => {
        speak("Hello, this is a test of the English voice.", undefined, "en", false);
        refresh("odtwarzam po angielsku…");
      } }, "▶ Test angielski"),
      el("button", { class: "btn ok big", onclick: () => {
        speak("To jest test polskiego lektora.", undefined, "pl", false);
        refresh("odtwarzam po polsku…");
      } }, "▶ Test polski")),
    out,
    el("div", { class: "opt-group-title" }, "Skąd brać głos"),
    (() => {
      const row = el("div", { class: "opt-row-btns" });
      let cur = LFSET_str("tts_mode", "server");
      [["auto", "🤖 Automatycznie", "najpierw serwer, w razie kłopotów przeglądarka"],
       ["server", "☁️ Zawsze z serwera", "gotowe nagranie — działa nawet gdy przeglądarka zawodzi"],
       ["browser", "📱 Zawsze przeglądarka", "szybsze, ale na części telefonów nie działa"]]
        .forEach(([v, label, sub]) => {
          const b = el("button", { class: "mode-btn" + (cur === v ? " active" : ""),
            onclick: () => {
              cur = v; LFSET_setStr("tts_mode", v);
              row.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("active"));
              b.classList.add("active");
              toast("Tryb lektora: " + label);
            } }, el("b", {}, label), el("div", { class: "small" }, sub));
          row.append(b);
        });
      return row;
    })(),
    el("button", { class: "btn ok big", style: "width:100%;margin-top:10px",
      onclick: async () => {
        out.innerHTML = "";
        out.append(el("div", { class: "muted small" }, "sprawdzam serwer…"));
        try {
          const s = await API.get("/api/tts/status");
          out.innerHTML = "";
          out.append(el("div", { class: "tts-line" },
            s.ok ? `✅ Lektor serwerowy działa (silnik: ${s.engine})`
                 : "❌ Lektor serwerowy nie działa"));
          (s.errors || []).forEach(e => out.append(el("div", { class: "tts-line" }, "• " + e)));
          out.append(el("div", { class: "muted small" }, `nagrań w pamięci: ${s.cached}`));
        } catch (e) {
          out.innerHTML = "";
          out.append(el("div", { class: "kb-mistake" }, "Błąd sprawdzania: " + (e.message || e)));
        }
      } }, "☁️ Sprawdź lektora serwerowego"),
    el("button", { class: "btn primary big", style: "width:100%;margin-top:10px",
      onclick: () => runStrategyTest(out) }, "🔬 Wypróbuj 4 sposoby (przeglądarka)"),
    el("div", { class: "fb-btns" },
      el("button", { class: "btn ghost", onclick: () => refresh("odświeżono") }, "🔄 Odśwież stan"),
      el("button", { class: "btn ghost", onclick: () => bg.remove() }, "Zamknij")));
  bg.append(modal);
  document.body.append(bg);
  refresh("");

  function refresh(msg) {
    out.innerHTML = "";
    const info = typeof ttsInfo === "function" ? ttsInfo() : "brak danych";
    out.append(
      msg ? el("div", { class: "muted small" }, msg) : null,
      el("div", { class: "tts-line" }, el("b", {}, "Stan: "), info));
    setTimeout(() => {
      const i2 = typeof ttsInfo === "function" ? ttsInfo() : "";
      out.append(el("div", { class: "tts-line" }, el("b", {}, "Po chwili: "), i2));
      if (/głosy EN: 0/.test(i2)) {
        out.append(el("div", { class: "kb-mistake" },
          "⚠ Przeglądarka nie widzi żadnych głosów. Na Androidzie: Ustawienia → " +
          "Ułatwienia dostępu → Zamiana tekstu na mowę → sprawdź silnik Google " +
          "i zainstaluj dane głosowe (angielski, polski)."));
      }
      if (/brak reakcji/.test(i2)) {
        out.append(el("div", { class: "kb-mistake" },
          "⚠ Przeglądarka zignorowała żądanie. Spróbuj: wyłącz tryb oszczędzania danych/baterii, " +
          "odśwież stronę i dotknij przycisku testu ponownie."));
      }
    }, 1500);
  }
}


// Wypróbowuje kolejno cztery sposoby uruchomienia mowy i pokazuje, który zadziałał.
// Dzięki temu nie zgadujemy — telefon sam mówi, co u niego działa.
function runStrategyTest(out) {
  if (!("speechSynthesis" in window)) { toast("Brak obsługi mowy", true); return; }
  out.innerHTML = "";
  const log = el("div", {});
  out.append(el("b", {}, "Wynik prób:"), log);

  const strategies = [
    ["A. najprościej (bez języka i głosu)", u => { }],
    ["B. z językiem en-US", u => { u.lang = "en-US"; }],
    ["C. z konkretnym głosem", u => {
      const v = speechSynthesis.getVoices().filter(x => (x.lang || "").startsWith("en"))[0];
      if (v) { u.voice = v; u.lang = v.lang; }
    }],
    ["D. po przerwaniu kolejki", u => { u.lang = "en-US"; }],
  ];

  const keep = [];
  let i = 0;
  next();

  function next() {
    if (i >= strategies.length) {
      log.append(el("div", { class: "muted small", style: "margin-top:8px" },
        "Koniec prób. Napisz, przy którym punkcie usłyszałeś dźwięk."));
      return;
    }
    const [name, setup] = strategies[i];
    const row = el("div", { class: "tts-line" }, `${name}: …`);
    log.append(row);
    try {
      if (name.startsWith("D")) { try { speechSynthesis.cancel(); } catch (e) {} }
      const u = new SpeechSynthesisUtterance("Test " + (i + 1));
      keep.push(u);
      setup(u);
      u.rate = 0.9;
      let ok = false;
      u.onstart = () => { ok = true; row.textContent = `${name}: ✅ RUSZYŁ`; };
      u.onerror = ev => { row.textContent = `${name}: ❌ ${(ev && ev.error) || "błąd"}`; };
      speechSynthesis.speak(u);
      try { speechSynthesis.resume(); } catch (e) {}
      setTimeout(() => {
        if (!ok && !/❌/.test(row.textContent)) row.textContent = `${name}: ⚪ brak reakcji`;
        i++;
        next();
      }, 2200);
    } catch (e) {
      row.textContent = `${name}: ❌ ${e.message}`;
      i++; setTimeout(next, 300);
    }
  }
}
