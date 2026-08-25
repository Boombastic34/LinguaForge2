// ================= GRY: pary EN-PL oraz spadający deszcz słówek =================

async function viewGames() {
  clearMain();
  const main = document.querySelector("main");
  const st = await API.get("/api/game/stats").catch(() => ({ games: {} }));
  main.append(hero("🎮", "Gry", "Nauka na czas — punkty, serie i rangi", "violet"));

  const card = el("div", { class: "card" });
  card.append(el("h3", {}, "Wybierz grę"));
  const grid = el("div", { class: "tile-grid" });
  [["pairs", "🃏", "Pary", "Łącz słówko z tłumaczeniem", "indigo"],
   ["rain", "🌧", "Spadający deszcz", "Kliknij tłumaczenie, zanim spadnie", "teal"]]
    .forEach(([id, emo, name, sub, th]) => {
      const g = st.games[id] || {};
      grid.append(el("div", { class: "tile tile-" + th, onclick: () => gameSetup(id, name) },
        el("div", { class: "tile-emoji" }, emo),
        el("b", {}, name),
        el("div", { class: "small" }, sub),
        el("div", { class: "game-rank" },
          `${g.rank || "Nowicjusz"} · ${g.points || 0} pkt`)));
    });
  card.append(grid);
  main.append(card);

  // podsumowanie w profilu
  const sum = el("div", { class: "card" }, el("h3", {}, "📊 Twoje wyniki"));
  const rows = [];
  [["pairs", "🃏 Pary"], ["rain", "🌧 Spadający deszcz"]].forEach(([id, name]) => {
    const g = st.games[id] || {};
    rows.push([name, g.rank || "Nowicjusz", String(g.points || 0),
      String(g.best_score || 0), String(g.best_streak || 0),
      (g.plays ? g.accuracy + "%" : "—")]);
  });
  const tbl = el("table", { class: "table" });
  tbl.innerHTML = "<tr><th>Gra</th><th>Ranga</th><th>Punkty</th><th>Rekord</th><th>Seria</th><th>Trafność</th></tr>"
    + rows.map(r => "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>").join("");
  sum.append(tbl);
  main.append(sum);
}

// ---------- ekran doboru słówek (wspólny dla obu gier) ----------
async function gameSetup(game, title) {
  clearMain();
  const main = document.querySelector("main");
  main.append(hero(game === "pairs" ? "🃏" : "🌧", title, "Wybierz, z czego chcesz grać", "violet"));
  const { themes, total } = await API.get("/api/game/themes");

  const card = el("div", { class: "card" });
  card.append(el("h3", {}, "Kategorie i liczba słówek"),
    el("p", { class: "muted small" },
      "Zaznacz kategorie i ustaw, ile słówek z każdej ma trafić do gry."));

  const picks = {};

  // --- WSZYSTKIE KATEGORIE: jedna liczba dla całej bazy
  let allMode = false, allValue = 30;
  const allNum = el("input", { class: "input short", type: "number", min: 2, max: total,
    value: Math.min(30, total), disabled: true });
  const allEvery = el("button", { class: "chip chip-btn", disabled: true }, `wszystkie (${total})`);
  const allChk = el("input", { type: "checkbox" });
  allChk.onchange = () => {
    allMode = allChk.checked;
    allNum.disabled = !allMode;
    allEvery.disabled = !allMode;
    list.classList.toggle("dimmed", allMode);
    list.querySelectorAll("input,button").forEach(x => { x.disabled = allMode; });
    updateTotal();
  };
  allNum.oninput = () => { allEvery.classList.remove("active"); allValue = +allNum.value || 30; updateTotal(); };
  allEvery.onclick = () => {
    allEvery.classList.toggle("active");
    allValue = allEvery.classList.contains("active") ? "all" : (+allNum.value || 30);
    allNum.disabled = allEvery.classList.contains("active");
    updateTotal();
  };
  card.append(el("div", { class: "game-all-row" },
    el("label", { class: "gt-name" }, allChk, " 🎲 Wszystkie kategorie razem"),
    el("span", { class: "muted small gt-count" }, `${total} słówek`),
    allNum, allEvery));

  const list = el("div", { class: "game-themes" });
  themes.forEach(t => {
    const chk = el("input", { type: "checkbox" });
    const num = el("input", { class: "input short", type: "number", min: 1, max: t.total,
      value: Math.min(10, t.total), disabled: true });
    const allBtn = el("button", { class: "chip chip-btn", disabled: true }, "wszystkie");
    let useAll = false;

    const sync = () => {
      if (!chk.checked) { delete picks[t.theme]; return; }
      picks[t.theme] = useAll ? "all" : Math.max(1, Math.min(t.total, +num.value || 1));
      updateTotal();
    };
    chk.onchange = () => {
      num.disabled = !chk.checked; allBtn.disabled = !chk.checked;
      sync(); updateTotal();
    };
    num.oninput = () => { useAll = false; allBtn.classList.remove("active"); sync(); };
    allBtn.onclick = () => {
      useAll = !useAll;
      allBtn.classList.toggle("active", useAll);
      num.disabled = useAll || !chk.checked;
      sync();
    };

    list.append(el("div", { class: "game-theme-row" },
      el("label", { class: "gt-name" }, chk, ` ${t.name}`),
      el("span", { class: "muted small gt-count" }, `${t.total} słówek`),
      num, allBtn));
  });
  card.append(list);

  const totalBadge = el("div", { class: "pool-badge" }, "wybrano: 0 słówek");
  function updateTotal() {
    let n = 0;
    if (allMode) {
      n = allValue === "all" ? total : Math.min(total, allValue);
    } else {
      Object.entries(picks).forEach(([th, v]) => {
        const t = themes.find(x => x.theme === th);
        n += v === "all" ? t.total : v;
      });
    }
    totalBadge.textContent = `wybrano: ${n} słówek`;
  }

  card.append(totalBadge,
    el("div", { class: "fb-btns" },
      el("button", { class: "btn primary big", onclick: start }, "▶ Graj"),
      el("button", { class: "btn ghost", onclick: () => {
        // zaznacz wszystkie kategorie z ich pełną zawartością
        allChk.checked = false; allMode = false;
        allNum.disabled = true; allEvery.disabled = true;
        list.classList.remove("dimmed");
        list.querySelectorAll("input,button").forEach(x => { x.disabled = false; });
        list.querySelectorAll(".game-theme-row").forEach((row, i) => {
          const chk = row.querySelector("input[type=checkbox]");
          if (!chk.checked) { chk.checked = true; chk.dispatchEvent(new Event("change")); }
          const allB = row.querySelector(".chip-btn");
          if (!allB.classList.contains("active")) allB.click();
        });
        toast("Zaznaczono wszystkie kategorie w całości");
      } }, "✅ Zaznacz wszystkie kategorie"),
      el("button", { class: "btn ghost", onclick: viewGames }, "← Wróć")));
  main.append(card);

  async function start() {
    if (allMode) return startWith({ all_count: allValue });
    if (!Object.keys(picks).length) return toast("Zaznacz przynajmniej jedną kategorię", true);
    startWith({ picks });
  }
  async function startWith(body) {
    const { words } = await API.post("/api/game/words", body);
    if (words.length < 4) return toast("Za mało słówek — wybierz więcej", true);
    if (game === "pairs") playPairs(words, () => gameSetup(game, title));
    else playRain(words, () => gameSetup(game, title));
  }
}

// ================= GRA 1: PARY (karty zakryte) =================
function playPairs(words, onBack) {
  clearMain();
  const main = document.querySelector("main");
  enterFocus({ title: "🃏 Pary", subtitle: "odkrywaj i łącz", theme: "indigo",
    onExit: () => { clearTimers(); onBack(); } });
  const box = el("div", { class: "card" });
  main.append(box);

  const ROUND = 6;
  let pool = words.slice();
  let points = 0, streak = 0, bestStreak = 0, correct = 0, wrong = 0;
  const t0 = Date.now();
  let timerIv = null;

  const scoreBar = el("div", { class: "game-bar" },
    el("span", { class: "badge" }, "0 pkt"),
    el("span", { class: "badge streak-badge" }, "seria 0"),
    el("span", { class: "badge" }, "0.0 s"));
  function clearTimers() { if (timerIv) clearInterval(timerIv); timerIv = null; }
  timerIv = setInterval(() => {
    scoreBar.children[2].textContent = ((Date.now() - t0) / 1000).toFixed(1) + " s";
  }, 100);

  deal();

  function deal() {
    if (pool.length < 2) return finish();
    const round = pool.splice(0, Math.min(ROUND, pool.length));
    box.innerHTML = "";
    box.append(scoreBar);
    focusProgress(words.length - pool.length - round.length, words.length, points + " pkt");
    box.append(el("p", { class: "muted small" },
      "Odkryj kartę po lewej, potem szukaj jej tłumaczenia po prawej."));

    const left = round.map(w => ({ ...w })).sort(() => Math.random() - .5);
    const right = round.map(w => ({ ...w })).sort(() => Math.random() - .5);

    let selL = null, selR = null, busy = false, remaining = round.length;
    const grid = el("div", { class: "pairs-two" });
    const colL = el("div", { class: "pairs-col" });
    const colR = el("div", { class: "pairs-col" });
    left.forEach(w => colL.append(mkCard(w, w.en, "en")));
    right.forEach(w => colR.append(mkCard(w, w.pl, "pl")));
    grid.append(colL, colR);
    box.append(grid);

    // karta: zakryta rewersem, odkrywa się po kliknięciu
    function mkCard(w, txt, side) {
      const face = el("span", { class: "pc-face" }, txt);
      const back = el("span", { class: "pc-back" }, side === "en" ? "🇬🇧" : "🇵🇱");
      const b = el("button", { class: "pair-card pair-" + side }, back, face);
      b.dataset.side = side;
      b.onclick = () => {
        if (busy || b.classList.contains("done") || b.classList.contains("open")) return;
        // w jednej kolumnie tylko jedna odkryta naraz
        const cur = side === "en" ? selL : selR;
        if (cur) { cur.b.classList.remove("open"); }
        b.classList.add("open");
        if (side === "en") { selL = { w, b }; speak(w.en); }
        else { selR = { w, b }; }
        if (selL && selR) resolve();
      };
      return b;
    }

    function resolve() {
      busy = true;
      const a = selL, c = selR;
      if (a.w.id === c.w.id) {
        correct++; streak++; bestStreak = Math.max(bestStreak, streak);
        points += 10 + Math.min(20, streak * 2);
        a.b.classList.add("done"); c.b.classList.add("done");
        if (typeof haptic === "function") haptic("good");
        selL = selR = null; remaining--;
        paint(); busy = false;
        if (remaining === 0) setTimeout(deal, 500);
      } else {
        wrong++; streak = 0;
        points = Math.max(0, points - 4);
        a.b.classList.add("bad"); c.b.classList.add("bad");
        if (typeof haptic === "function") haptic("bad");
        paint();
        // pomyłka: zakrywamy z powrotem kolumnę polską (i zwalniamy angielską)
        setTimeout(() => {
          a.b.classList.remove("bad", "open");
          c.b.classList.remove("bad", "open");
          selL = selR = null; busy = false;
        }, 800);
      }
    }
  }

  function paint() {
    scoreBar.children[0].textContent = points + " pkt";
    scoreBar.children[1].textContent = "seria " + streak;
    scoreBar.children[1].classList.toggle("hot", streak >= 3);
  }

  async function finish() {
    clearTimers();
    exitFocus();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const r = await API.post("/api/game/score",
      { game: "pairs", points, correct, wrong, streak: bestStreak }).catch(() => ({}));
    box.innerHTML = "";
    confetti();
    box.append(el("h3", {}, "🏁 Koniec gry"),
      el("div", { class: "game-result" },
        el("div", { class: "gr-big" }, points + " pkt"),
        el("div", { class: "muted" },
          `${correct} trafień · ${wrong} pomyłek · najdłuższa seria ${bestStreak} · ${secs} s`)),
      r.rank ? el("p", {}, `Ranga: ${r.rank} · łącznie ${r.total} pkt`) : null,
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: onBack }, "▶ Jeszcze raz"),
        el("button", { class: "btn ghost", onclick: viewGames }, "← Gry")));
  }
}

// ================= GRA 2: SPADAJĄCY DESZCZ =================
function playRain(words, onBack) {
  clearMain();
  const main = document.querySelector("main");
  enterFocus({ title: "🌧 Spadający deszcz", subtitle: "kliknij tłumaczenie", theme: "teal",
    onExit: () => { stop(); onBack(); } });
  const box = el("div", { class: "card" });
  main.append(box);

  let pool = words.slice().sort(() => Math.random() - .5);
  let idx = 0, points = 0, streak = 0, bestStreak = 0, correct = 0, wrong = 0;
  let raf = null, dropTop = 0, current = null, speedPx = 0.55, running = true;

  const scoreBar = el("div", { class: "game-bar" },
    el("span", { class: "badge" }, "0 pkt"),
    el("span", { class: "badge streak-badge" }, "seria 0"),
    el("span", { class: "badge" }, `0/${pool.length}`));
  const stage = el("div", { class: "rain-stage" });
  const drop = el("div", { class: "rain-drop" });
  const opts = el("div", { class: "rain-opts" });
  stage.append(drop);
  box.append(scoreBar, stage, opts);

  nextWord();

  function nextWord() {
    if (idx >= pool.length) return finish();
    current = pool[idx];
    dropTop = 0;
    drop.textContent = current.en;
    drop.style.top = "0px";
    drop.classList.remove("hit", "miss");
    speak(current.en);

    // 4 opcje: poprawna + 3 losowe inne
    const others = pool.filter(w => w.id !== current.id).sort(() => Math.random() - .5).slice(0, 3);
    const choices = [current, ...others].sort(() => Math.random() - .5);
    opts.innerHTML = "";
    choices.forEach(c => {
      const b = el("button", { class: "rain-opt" }, c.pl);
      b.onclick = () => answer(c, b);
      opts.append(b);
    });
    scoreBar.children[2].textContent = `${idx + 1}/${pool.length}`;
    focusProgress(idx, pool.length, `${points} pkt`);
    // tempo rośnie z serią — im lepiej idzie, tym szybciej pada
    speedPx = 0.5 + Math.min(0.9, streak * 0.06);
    running = true;
    raf = requestAnimationFrame(tick);
  }

  function tick() {
    if (!running) return;
    dropTop += speedPx;
    drop.style.top = dropTop + "px";
    const limit = stage.clientHeight - drop.offsetHeight - 4;
    if (dropTop >= limit) { miss(); return; }
    raf = requestAnimationFrame(tick);
  }

  function answer(choice, btn) {
    if (!running) return;
    if (choice.id === current.id) {
      running = false; cancelAnimationFrame(raf);
      correct++; streak++; bestStreak = Math.max(bestStreak, streak);
      // im wyżej złapane, tym więcej punktów
      const height = 1 - dropTop / Math.max(1, stage.clientHeight);
      points += 10 + Math.round(15 * height) + Math.min(20, streak * 2);
      drop.classList.add("hit");
      btn.classList.add("ok");
      if (typeof haptic === "function") haptic("good");
      paint();
      idx++;
      setTimeout(nextWord, 500);
    } else {
      wrong++; streak = 0;
      points = Math.max(0, points - 5);
      btn.classList.add("bad");
      setTimeout(() => btn.classList.remove("bad"), 400);
      if (typeof haptic === "function") haptic("bad");
      paint();
    }
  }

  function miss() {
    running = false; cancelAnimationFrame(raf);
    wrong++; streak = 0;
    drop.classList.add("miss");
    if (typeof haptic === "function") haptic("bad");
    // pokaż poprawną odpowiedź
    opts.querySelectorAll(".rain-opt").forEach(b => {
      if (b.textContent === current.pl) b.classList.add("ok");
    });
    box.append(el("div", { class: "rain-answer", id: "rain-ans" },
      `${current.en} = ${current.pl}`));
    paint();
    idx++;
    setTimeout(() => {
      const a = document.getElementById("rain-ans");
      if (a) a.remove();
      nextWord();
    }, 1400);
  }

  function paint() {
    scoreBar.children[0].textContent = points + " pkt";
    scoreBar.children[1].textContent = "seria " + streak;
    scoreBar.children[1].classList.toggle("hot", streak >= 3);
  }

  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  async function finish() {
    stop();
    exitFocus();
    const r = await API.post("/api/game/score",
      { game: "rain", points, correct, wrong, streak: bestStreak }).catch(() => ({}));
    box.innerHTML = "";
    confetti();
    box.append(el("h3", {}, "🏁 Koniec gry"),
      el("div", { class: "game-result" },
        el("div", { class: "gr-big" }, points + " pkt"),
        el("div", { class: "muted" }, `${correct} trafień · ${wrong} pomyłek · najdłuższa seria ${bestStreak}`)),
      r.rank ? el("p", {}, `Ranga: ${r.rank} · łącznie ${r.total} pkt`) : null,
      el("div", { class: "fb-btns" },
        el("button", { class: "btn primary", onclick: onBack }, "▶ Jeszcze raz"),
        el("button", { class: "btn ghost", onclick: viewGames }, "← Gry")));
  }
}
