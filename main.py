# -*- coding: utf-8 -*-
"""LinguaForge — lokalna aplikacja do nauki angielskiego."""
import os, io, re, csv, json, sys, time, base64, random, shutil, zipfile, threading, webbrowser, datetime


# --------------------------------------------------------------------------
# Ustalenie katalogu aplikacji.
# Niektóre środowiska (np. Pydroid 3 na Androidzie) uruchamiają plik przez własny
# skrypt pośredniczący — wtedy Python nie zna położenia aplikacji i nie widzi
# katalogu "core". Poniższy fragment odnajduje właściwy folder w każdej sytuacji.
# --------------------------------------------------------------------------
def _find_app_dir():
    # W aplikacji Android (Chaquopy) katalog jest znany na pewno — start_server.py
    # ustawia go jawnie przed importem. Ufamy mu bez sprawdzania (system plików
    # assetów Chaquopy bywa niewiarygodny dla os.path.isdir na podkatalogach),
    # co zapobiega błędnemu odgadnięciu publicznego folderu "Documents".
    forced = os.environ.get("LF_APP_DIR", "").strip()
    if forced:
        return forced

    def looks_right(d):
        return bool(d) and os.path.isdir(os.path.join(d, "core")) \
            and os.path.isfile(os.path.join(d, "main.py"))

    candidates = []
    try:
        candidates.append(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        pass
    if sys.argv and sys.argv[0]:
        candidates.append(os.path.dirname(os.path.abspath(sys.argv[0])))
    candidates.append(os.getcwd())
    candidates += [p for p in sys.path if p]
    # typowe miejsca na Androidzie, gdy nic powyższego nie zadziała
    home = os.path.expanduser("~")
    for base in ("/storage/emulated/0", "/sdcard", home):
        for sub in ("Documents", "Download", "Downloads", "", "Pydroid3"):
            candidates.append(os.path.join(base, sub, "LinguaForge") if sub
                              else os.path.join(base, "LinguaForge"))
    for d in candidates:
        if looks_right(d):
            return d
    return candidates[0] if candidates else os.getcwd()


ROOT = _find_app_dir()
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
try:
    os.chdir(ROOT)
except OSError:
    pass

try:
    from fastapi import FastAPI, Request, HTTPException
except ModuleNotFoundError:
    print("\n  [BLAD] Brakuje biblioteki 'fastapi'.")
    print("  Pydroid 3: menu ☰ → Pip → wpisz 'fastapi' → INSTALL, potem to samo dla 'uvicorn'.")
    print("  Komputer: uruchom start.bat, który instaluje biblioteki automatycznie.\n")
    raise SystemExit(1)
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from core import storage, auth, fsrs, skills as sk, grader, placement, composer

APP_VERSION = "2.8.1"
START_TIME = time.time()   # do sprawdzania, jak długo serwer działa
LAN_MODE = os.environ.get("LF_LAN", "") == "1"   # tryb dostępu z telefonu
PORT = int(os.environ.get("PORT", "8177"))   # hosting nadpisuje przez PORT


def local_ip():
    """Adres komputera w sieci domowej — do wpisania na telefonie."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))        # nic nie wysyła, tylko sprawdza interfejs
        return s.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"
    finally:
        s.close()


app = FastAPI(title="LinguaForge", version=APP_VERSION)
auth.ensure_teacher()

PLACEMENTS = {}
LEVEL_ORDER = {"A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4, "C2": 5}
GRADE_SCALE = [(95, 6, "celujący"), (85, 5, "bardzo dobry"), (70, 4, "dobry"),
               (55, 3, "dostateczny"), (40, 2, "dopuszczający"), (0, 1, "niedostateczny")]


# ---------------------------------------------------------------- helpers
def current_user(request: Request):
    who = auth.who(request.headers.get("x-token", ""))
    if not who:
        raise HTTPException(401, "Zaloguj się ponownie.")
    return who


def require_teacher(request: Request):
    who = current_user(request)
    if who["role"] != "teacher":
        raise HTTPException(403, "Tylko dla nauczyciela.")
    return who


def load_cards(u): return storage.user_file(u, "cards.json", {})
def save_cards(u, c): storage.save_user_file(u, "cards.json", c)


def add_error(username, err_type, context):
    errs = storage.user_file(username, "errors.json", {})
    e = errs.setdefault(err_type, {"count": 0, "examples": []})
    e["count"] += 1
    e["examples"].append({"ctx": context, "day": datetime.date.today().isoformat()})
    e["examples"] = e["examples"][-20:]
    storage.save_user_file(username, "errors.json", errs)


def merged_topics():
    topics = []
    for f in storage.list_data_files("gramatyka/"):
        topics += storage.load_data(f, {}).get("topics", [])
    return topics


def merged_items(prefix):
    items = []
    for f in storage.list_data_files(prefix):
        items += storage.load_data(f, {}).get("items", [])
    return items


def vocab_pool(profile):
    pool = []
    for f in storage.list_data_files("slownictwo/"):
        data = storage.load_data(f, {})
        if data.get("items") and "pl" not in data["items"][0]:
            continue  # plik odmian czasowników — inny schemat
        if data.get("domain", "general") in profile.get("domains", ["general"]):
            for it in data.get("items", []):
                it2 = dict(it)
                it2["deck"] = data.get("domain")
                it2["cat"] = data.get("cat", "mixed")
                it2["theme"] = it.get("theme", data.get("theme", "inne"))
                it2["level"] = it.get("level", data.get("level", "A1"))
                pool.append(it2)
    for it in storage.user_file(profile["username"], "custom_cards.json", []):
        it2 = dict(it)
        it2["deck"] = "custom"
        pool.append(it2)
    return pool


def fill_blanks(text, good):
    """Wstawia poprawną odpowiedź w luki ___. Przy wielu lukach rozdziela tokeny."""
    if not text or "___" not in text:
        return good if text == "" or not text else None
    n = text.count("___")
    if n == 1:
        return text.replace("___", good)
    toks = [t for t in str(good).replace(",", " ").split() if t != "/"]
    if len(toks) == n:
        out = text
        for tk in toks:
            out = out.replace("___", tk, 1)
        return out
    return None


def grade_for(pct):
    for th, g, name in GRADE_SCALE:
        if pct >= th:
            return {"grade": g, "name": name}
    return {"grade": 1, "name": "niedostateczny"}


# ---------------------------------------------------------------- auth / konto
@app.post("/api/register")
async def api_register(request: Request):
    body = await request.json()
    tok, err = auth.register(body.get("username", ""), body.get("password", ""))
    if err:
        return JSONResponse({"error": err}, status_code=400)
    storage.log_event(tok["username"], {"type": "register"})
    return tok


@app.post("/api/login")
async def api_login(request: Request):
    body = await request.json()
    tok, err = auth.login(body.get("username", ""), body.get("password", ""))
    if err:
        return JSONResponse({"error": err}, status_code=400)
    storage.log_event(tok["username"], {"type": "login"})
    return tok


@app.post("/api/reset")
async def api_reset(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    fresh = auth.new_profile(who["username"], "x", role=prof.get("role", "student"))
    fresh["salt"], fresh["pass"] = prof["salt"], prof["pass"]  # hasło zostaje
    fresh["created"] = prof.get("created")
    storage.save_profile(who["username"], fresh)
    storage.reset_account(who["username"])
    storage.log_event(who["username"], {"type": "account_reset"})
    return {"ok": True}


@app.post("/api/placement/skip")
async def placement_skip(request: Request):
    """Pominięcie testu — poziom ustawiany deklaratywnie, można go później zweryfikować."""
    who = current_user(request)
    body = await request.json()
    lvl = body.get("level", "A1")
    if lvl not in sk.LEVELS:
        lvl = "A1"
    base = sk.LEVEL_SCORE.get(lvl, 12)
    prof = storage.load_profile(who["username"])
    for k in ("vocab", "grammar", "reading", "listening", "writing"):
        prof["skills"][k] = base
    prof["skills"]["vocab_size_est"] = sk.VOCAB_SIZE.get(lvl, 600)
    prof["level"] = lvl
    prof["placement_done"] = True
    prof["placement_skipped"] = True
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "placement_skipped", "level": lvl})
    return {"ok": True, "level": lvl}


@app.post("/api/settings")
async def api_settings(request: Request):
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    for k in ("target_level", "domains"):
        if k in body:
            prof[k] = body[k]
    for flag in ("dark", "tts_auto", "haptics", "fc_retype", "fc_learn"):
        if flag in body:
            prof["settings"][flag] = bool(body[flag])
    if "tts_rate" in body:
        try:
            prof["settings"]["tts_rate"] = max(0.5, min(1.5, float(body["tts_rate"])))
        except (TypeError, ValueError):
            pass
    if body.get("fc_dir") in ("mix", "pl_en", "en_pl"):
        prof["settings"]["fc_dir"] = body["fc_dir"]
    if "daily_goal_xp" in body:
        prof["settings"]["daily_goal_xp"] = int(body["daily_goal_xp"])
    storage.save_profile(who["username"], prof)
    return {"ok": True}


# ---------------------------------------------------------------- liczniki treści
@app.get("/api/content/stats")
async def content_stats(request: Request):
    current_user(request)
    d = storage.load_data("testy/poziomujacy.json", {})
    topics = merged_topics()
    lessons = {"units": sum((storage.load_data(f, {}).get("units", []) for f in storage.list_data_files("lekcje/")), [])}
    lstats = []
    for u in lessons["units"]:
        ch = [{"id": c["id"], "name": c["name"],
               "exercises": len(c.get("exercises", [])),
               "homework": len(c.get("homework", [])),
               "quiz": len(c.get("quiz", []))} for c in u["chapters"]]
        lstats.append({"id": u["id"], "name": u["name"], "chapters": ch,
                       "exam": len(u.get("exam", {}).get("questions", []))})
    vocab_files = []
    for f in storage.list_data_files("slownictwo/"):
        if "odmiana" in f:
            continue
        data = storage.load_data(f, {})
        vocab_files.append({"file": f, "name": data.get("name", f),
                            "domain": data.get("domain"), "items": len(data.get("items", []))})
    return {
        "placement": {"grammar": len(d.get("grammar", [])), "vocab": len(d.get("vocab", [])),
                      "vocab_produce": len(d.get("vocab_produce", [])),
                      "reading_texts": len(d.get("reading", [])),
                      "reading_questions": sum(len(t["questions"]) for t in d.get("reading", [])),
                      "translation": len(d.get("translation", [])),
                      "listening": len(d.get("listening", [])),
                      "listening_pl": len(d.get("listening_pl", [])),
                      "per_test": placement.total_questions()},
        "vocab_files": vocab_files,
        "vocab_total": sum(v["items"] for v in vocab_files),
        "verbs": len(storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", [])),
        "grammar": {"topics": len(topics),
                    "exercises": sum(len(t.get("exercises", [])) for t in topics)},
        "lessons": lstats,
        "path": {"levels": len(_path_data()["levels"]),
                 "links": sum(len(l["links"]) for l in _path_data()["levels"])},
        "dialogs": sum(len(storage.load_data(f, {}).get("dialogs", []))
                       for f in storage.list_data_files("rozmowy/")),
        "themes": sorted({storage.load_data(f, {}).get("theme", "inne")
                          for f in storage.list_data_files("slownictwo/")
                          if (storage.load_data(f, {}).get("items") or [{}])[0].get("pl")}),
        "knowledge": len(storage.load_data("wiedza/baza.json", {}).get("articles", [])),
        "reading": len(_reading_texts()),
        "writing": len(_writing_tasks()),
        "translations": len(merged_items("tlumaczenia/")),
        "listening": len(merged_items("sluchanie/")),
    }


# ---------------------------------------------------------------- dashboard
@app.get("/api/dashboard")
async def api_dashboard(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    cards = load_cards(who["username"])
    vcards = storage.user_file(who["username"], "verb_cards.json", {})
    now = time.time()
    due = sum(1 for c in cards.values() if c["fsrs"]["due"] <= now)
    vdue = sum(1 for c in vcards.values() if c["fsrs"]["due"] <= now)
    leeches = sum(1 for c in cards.values() if fsrs.is_leech(c["fsrs"]))
    mature = sum(1 for c in cards.values() if fsrs.is_mature(c["fsrs"]))
    est = sk.estimate_weeks(prof, cards, prof["target_level"]) if prof.get("target_level") else None
    today = datetime.date.today().isoformat()
    daily = prof.get("daily", {}).get(today, {"answers": 0, "correct": 0, "xp": 0})
    days = []
    for i in range(13, -1, -1):
        d = (datetime.date.today() - datetime.timedelta(days=i)).isoformat()
        dd = prof.get("daily", {}).get(d, {})
        days.append({"day": d[5:], "xp": dd.get("xp", 0), "answers": dd.get("answers", 0)})

    # etap nauki per dziedzina (gating)
    pool = vocab_pool(prof)
    stages = {}
    for dom in prof.get("domains", ["general"]):
        dom_items = [it for it in pool if it["deck"] == dom]
        known = [it for it in dom_items if it["id"] in cards]
        mat = [it for it in known if fsrs.is_mature(cards[it["id"]]["fsrs"])]
        n = len(dom_items) or 1
        kr, mr = len(known) / n, len(mat) / n
        if kr < 0.3:
            stage, name = 1, "Fundament: poznawanie słów"
        elif kr < 0.6:
            stage, name = 2, "Rozbudowa słownictwa"
        elif mr < 0.3:
            stage, name = 3, "Utrwalanie (powtórki)"
        elif mr < 0.6:
            stage, name = 4, "Zdania i tłumaczenia"
        else:
            stage, name = 5, "Swobodna produkcja"
        stages[dom] = {"stage": stage, "name": name, "known": len(known),
                       "total": len(dom_items), "mature": len(mat),
                       "translate_unlocked": kr >= 0.25}
    lp = storage.user_file(who["username"], "lessons.json", {})
    return {
        "profile": {**{k: prof[k] for k in ("username", "role", "level", "target_level",
                                          "domains", "xp", "streak", "placement_done", "settings")},
                    "admin": prof.get("admin", False),
                    "role": user_role(prof),
                    "allowed": allowed_modules(prof)},
        "skills": prof["skills"], "cefr": sk.cefr_profile(prof["skills"]),
        "overall": sk.overall(prof["skills"]),
        "due": due, "verb_due": vdue, "leeches": leeches, "mature": mature,
        "cards_total": len(cards), "daily": daily, "days": days, "estimate": est,
        "stages": stages,
        "lesson_progress": lp.get("summary", None),
        "focus": composer.focus_message(prof) if prof.get("placement_done") else None,
        "word_of_day": random.choice(pool) if pool else None,
    }


# ---------------------------------------------------------------- placement
@app.post("/api/placement/start")
async def placement_start(request: Request):
    who = current_user(request)
    PLACEMENTS[who["username"]] = placement.new_state()
    storage.log_event(who["username"], {"type": "placement_start",
                                        "questions": placement.total_questions()})
    return placement.next_question(PLACEMENTS[who["username"]])


@app.post("/api/placement/answer")
async def placement_answer(request: Request):
    who = current_user(request)
    body = await request.json()
    state = PLACEMENTS.get(who["username"])
    if not state:
        raise HTTPException(400, "Test nie został rozpoczęty.")
    if body.get("unknown"):
        body["answer"] = -1 if isinstance(body.get("answer"), int) else ""
    fb = placement.answer(state, body["id"], body["answer"], body.get("rt", 0))
    fb["unknown"] = bool(body.get("unknown"))
    storage.log_event(who["username"], {
        "type": "placement_answer", "module": state["module"], "q": body["id"],
        "question": fb.get("question", ""), "answer": body["answer"],
        "your": fb.get("your", ""), "correct_answer": fb.get("answer", ""),
        "correct": fb.get("correct"), "rt": body.get("rt")})
    return {"feedback": fb}


@app.post("/api/placement/confirm")
async def placement_confirm(request: Request):
    """Po feedbacku: zapis wyniku (guessed=true jeśli zgadywał) i następne pytanie."""
    who = current_user(request)
    body = await request.json()
    state = PLACEMENTS.get(who["username"])
    if not state:
        raise HTTPException(400, "Test nie został rozpoczęty.")
    if body.get("guessed"):
        storage.log_event(who["username"], {"type": "placement_guessed"})
    placement.confirm(state, guessed=body.get("guessed", False))
    nxt = placement.next_question(state)
    if state["done"]:
        result = placement.finalize(state)
        prof = storage.load_profile(who["username"])
        prof["skills"].update(result["skills"])
        prof["level"] = result["level"]
        prof["placement_done"] = True
        storage.save_profile(who["username"], prof)
        storage.log_event(who["username"], {"type": "placement_done", "result": result})
        del PLACEMENTS[who["username"]]
        return {"done": True, "result": result}
    return {"next": nxt}


# ---------------------------------------------------------------- fiszki
@app.get("/api/cards/session")
async def cards_session(request: Request, cat: str = "all", n: str = "15"):
    who = guard_module(request, "flashcards")
    prof = storage.load_profile(who["username"])
    cards = load_cards(who["username"])
    now = time.time()
    pool = vocab_pool(prof)
    if cat and cat != "all":
        pool = [it for it in pool if it.get("cat", "mixed") == cat] or pool
    theme = request.query_params.get("theme")
    if theme and theme != "all":
        pool = [it for it in pool if it.get("theme") == theme] or pool
    if theme == "all" or cat == "all":
        random.shuffle(pool)          # cała baza — losowa kolejność
    by_id = {it["id"]: it for it in pool}

    due = [(cid, c) for cid, c in cards.items() if c["fsrs"]["due"] <= now and cid in by_id]
    due.sort(key=lambda x: x[1]["fsrs"]["due"])
    limit = len(pool) if n == "all" else max(1, min(len(pool) or 1, int(n or 15)))
    batch = [_card_payload(by_id[cid], c, prof) for cid, c in due[:limit]]

    if len(batch) < limit:
        known = set(cards.keys())
        user_lvl = LEVEL_ORDER.get(prof.get("level") or "A1", 0)
        fresh = [it for it in pool if it["id"] not in known
                 and LEVEL_ORDER.get(it.get("level", "A1"), 0) <= user_lvl + 1]
        tsc = prof["skills"].get("themes", {})
        if theme == "all":
            random.shuffle(fresh)     # losowo z całej bazy
        else:
            fresh.sort(key=lambda it: (tsc.get(it.get("theme", "inne"), 55), it.get("rank", 9999)))
        for it in fresh[: limit - len(batch)]:
            c = {"fsrs": fsrs.new_card(), "added": time.time()}
            cards[it["id"]] = c
            batch.append(_card_payload(it, c, prof, is_new=True))
        save_cards(who["username"], cards)
    random.shuffle(batch)   # losowa kolejność w sesji
    return {"cards": batch, "pool": len(pool), "due": len(due),
            "due_left": max(0, len(due) - limit)}


def _card_payload(it, c, prof, is_new=False):
    lvl = LEVEL_ORDER.get(prof.get("level") or "A1", 0)
    mode = prof["settings"].get("typing_mode", "auto")
    typing = (lvl >= 1) if mode == "auto" else (mode == "typing")
    return {"id": it["id"], "en": it["en"], "pl": it["pl"],
            "nr": it.get("nr"), "theme": it.get("theme", "inne"),
            "example": it.get("example", ""), "example_pl": it.get("example_pl", ""),
            "img": it.get("img", ""), "hint": it.get("hint", ""),
            "deck": it.get("deck", "general"), "level": it.get("level", "A1"),
            "new": is_new, "typing": typing,
            "leech": fsrs.is_leech(c["fsrs"]), "reps": c["fsrs"]["reps"]}


@app.post("/api/cards/review")
async def cards_review(request: Request):
    who = current_user(request)
    body = await request.json()
    cid, rating = body["id"], int(body["rating"])
    cards = load_cards(who["username"])
    if cid not in cards:
        raise HTTPException(404, "Nie ma takiej karty.")
    fsrs.review(cards[cid]["fsrs"], rating)
    save_cards(who["username"], cards)
    prof = storage.load_profile(who["username"])
    correct = rating >= 3
    xp = {1: 1, 2: 3, 3: 5, 4: 6}[rating]
    sk.register_activity(prof, correct, xp)
    prof["skills"]["vocab"] = sk.update_skill(
        prof["skills"]["vocab"], body.get("level", "A1"), correct, body.get("rt"))
    th = body.get("theme")
    if th:
        tm = prof["skills"].setdefault("themes", {})
        tm[th] = round(min(100, max(0, tm.get(th, 55) + (3 if correct else -5))), 1)
    storage.save_profile(who["username"], prof)
    if rating == 1:
        add_error(who["username"], "vocab_lapse", body.get("en", cid))
    storage.log_event(who["username"], {"type": "card_review", "card": cid,
                                        "question": body.get("pl", ""), "en": body.get("en"),
                                        "rating": rating, "rt": body.get("rt"), "xp": xp})
    c = cards[cid]["fsrs"]
    days = max(0.007, (c["due"] - time.time()) / 86400)
    nxt = f"{round(days*24*60)} min" if days < 0.6 else (f"{round(days)} dni" if days >= 1.5 else "1 dzień")
    return {"ok": True, "next_in": nxt, "xp": xp,
            "mature": fsrs.is_mature(c), "leech": fsrs.is_leech(c)}


@app.post("/api/cards/custom")
async def cards_custom(request: Request):
    who = current_user(request)
    body = await request.json()
    custom = storage.user_file(who["username"], "custom_cards.json", [])
    item = {"id": "cust_" + str(int(time.time() * 1000)),
            "en": body["en"].strip(), "pl": body["pl"].strip(),
            "example": body.get("example", "").strip(),
            "hint": body.get("hint", "").strip(), "level": body.get("level", "A1"),
            "rank": 0}
    custom.append(item)
    storage.save_user_file(who["username"], "custom_cards.json", custom)
    storage.log_event(who["username"], {"type": "custom_card_created", "en": item["en"]})
    return {"ok": True, "item": item}


@app.get("/api/cards/custom")
async def cards_custom_list(request: Request):
    who = current_user(request)
    return {"items": storage.user_file(who["username"], "custom_cards.json", [])}


# ---------------------------------------------------------------- czasowniki
TENSES = [("past", "przeszły"), ("present", "teraźniejszy"), ("future", "przyszły")]
FORM_INFO = [
    ("base", "forma podstawowa — bezokolicznik i Present Simple (czas teraźniejszy)"),
    ("past", "2. forma — Past Simple (czas przeszły)"),
    ("perf", "3. forma — Past Participle, używana w Present Perfect i stronie biernej"),
]


def third_person(en):
    if en == "be":
        return "is"
    if en == "have":
        return "has"
    if en.endswith(("o", "sh", "ch", "x", "s", "z")):
        return en + "es"
    if en.endswith("y") and en[-2] not in "aeiou":
        return en[:-1] + "ies"
    return en + "s"


def verb_examples(v, form):
    """Wiele przykładów użycia danej formy, EN + PL."""
    en, past, perf = v["en"], v["past"], v["perf"]
    p_inf = v["pl_inf"].split(" / ")[0]
    p_past = v["pl_past"][0]
    p_pres = v["pl_pres"]
    p_fut = v["pl_fut"][0]
    if form == "base":
        return [
            (f"I {en} every day.", f"{p_pres.capitalize()} codziennie. (Present Simple)"),
            (f"They {en} together.", f"Oni to robią razem — „{p_inf}” w cz. teraźniejszym."),
            (f"He {third_person(en)} on Mondays.", f"On {p_pres.replace('ę','e') if p_pres.endswith('ę') else p_pres} w poniedziałki — 3. os. dostaje -s: {third_person(en)}."),
            (f"I want to {en}.", f"Chcę {p_inf} — po „to” zawsze forma podstawowa."),
            (f"Do you {en}?", f"Czy ty…? — po „do/does” forma podstawowa (bez -s)."),
            (f"I don't {en} at night.", f"Przeczenie: don't + {en} (forma podstawowa)."),
        ]
    if form == "past":
        return [
            (f"Yesterday I {past}.", f"Wczoraj {p_past}. (Past Simple — zamknięta przeszłość)"),
            (f"She {past} last week.", f"Ona to zrobiła w zeszłym tygodniu — 2. forma bez zmian dla osób."),
            (f"We {past} two hours ago.", f"…dwie godziny temu. Sygnały Past Simple: yesterday, ago, last…"),
            (f"I {past}, but it didn't help.", f"{p_past.capitalize()}, ale to nie pomogło."),
            (f"Did you {en}? — Yes, I {past}.", f"Pytanie przez „did” + forma PODSTAWOWA; w odpowiedzi wraca 2. forma."),
        ]
    return [
        (f"I have {perf} many times.", f"Robiłem to wiele razy. (Present Perfect: have + 3. forma)"),
        (f"She has just {perf}.", f"Ona właśnie to zrobiła — has, bo 3. osoba."),
        (f"Have you ever {perf}?", f"Czy kiedykolwiek…? — pytanie o doświadczenie życiowe."),
        (f"I haven't {perf} yet.", f"Jeszcze tego nie zrobiłem (yet = jeszcze)."),
        (f"It was {perf} yesterday.", f"To zostało zrobione wczoraj — strona bierna: be + 3. forma."),
    ]


@app.get("/api/verbs/forms/{vid}")
async def verbs_forms(vid: str, request: Request):
    current_user(request)
    v = next((x for x in storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", []) if x["id"] == vid), None)
    if not v:
        raise HTTPException(404, "Brak czasownika.")
    out = []
    for key, desc in FORM_INFO:
        word = {"base": v["en"], "past": v["past"], "perf": v["perf"]}[key]
        out.append({"form": key, "word": word, "desc": desc,
                    "examples": [{"en": e, "pl": p} for e, p in verb_examples(v, key)]})
    return {"id": vid, "en": v["en"], "forms": out}


def _verb_prompt(v, tense, direction):
    if direction == "pl_en":
        pl = {"past": v["pl_past"][0], "present": v["pl_pres"], "future": v["pl_fut"][0]}[tense]
        en = {"past": "I " + v["past"], "present": "I " + v["en"],
              "future": "I will " + v["en"]}[tense]
        return {"prompt": pl, "accept": [en.lower(), en.lower().replace("i will", "i'll")],
                "answer": en, "lang": "pl"}
    else:
        en = {"past": "I " + v["past"], "present": "I " + v["en"],
              "future": "I will " + v["en"]}[tense]
        acc = {"past": v["pl_past"], "present": [v["pl_pres"]],
               "future": v["pl_fut"]}[tense]
        return {"prompt": en, "accept": [a.lower() for a in acc],
                "answer": acc[0], "lang": "en"}


@app.get("/api/verbs/session")
async def verbs_session(request: Request, n: str = "10"):
    who = current_user(request)
    verbs = storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", [])
    vcards = storage.user_file(who["username"], "verb_cards.json", {})
    now = time.time()
    by_id = {v["id"]: v for v in verbs}
    due = [vid for vid, c in vcards.items() if c["fsrs"]["due"] <= now and vid in by_id]
    random.shuffle(due)
    limit = len(verbs) if n == "all" else max(1, min(len(verbs), int(n or 10)))
    batch_ids = due[:limit]
    if len(batch_ids) < limit:
        fresh = [v["id"] for v in verbs if v["id"] not in vcards]
        random.shuffle(fresh)
        for vid in fresh[: limit - len(batch_ids)]:
            vcards[vid] = {"fsrs": fsrs.new_card()}
            batch_ids.append(vid)
        storage.save_user_file(who["username"], "verb_cards.json", vcards)
    out = []
    for vid in batch_ids:
        v = by_id[vid]
        # Trener trzech form: pokazujemy JEDNĄ losową kratkę, resztę uzupełnia uczeń.
        cells = ["base", "past", "perf", "pl"]
        out.append({"id": vid,
                    "base": v["en"], "past": v["past"], "perf": v["perf"],
                    "pl": v["pl_inf"],
                    "reveal": random.choice(cells),
                    "forms": f"{v['en']} → {v['past']} → {v['perf']}",
                    "form_words": {"base": v["en"], "past": v["past"], "perf": v["perf"]},
                    "irregular": not (v["past"].lower() == v["en"].lower() + "ed"
                                      or v["past"].lower() == v["en"].lower() + "d"),
                    "example": v.get("example", ""),
                    "reps": vcards[vid]["fsrs"]["reps"]})
    random.shuffle(out)
    return {"cards": out, "pool": len(verbs), "due": len(due),
            "due_left": max(0, len(due) - limit)}


@app.post("/api/verbs/review")
async def verbs_review(request: Request):
    who = current_user(request)
    body = await request.json()
    vcards = storage.user_file(who["username"], "verb_cards.json", {})
    vid = body["id"]
    if vid not in vcards:
        raise HTTPException(404, "Brak karty.")
    correct = bool(body.get("correct"))
    rt = body.get("rt", 9999)
    rating = 1 if not correct else (4 if rt < 7000 else 3)
    fsrs.review(vcards[vid]["fsrs"], rating)
    storage.save_user_file(who["username"], "verb_cards.json", vcards)
    prof = storage.load_profile(who["username"])
    xp = 6 if correct else 1
    sk.register_activity(prof, correct, xp)
    prof["skills"]["grammar"] = sk.update_skill(prof["skills"]["grammar"], "A2", correct, rt)
    prof["skills"]["vocab"] = sk.update_skill(prof["skills"]["vocab"], "A2", correct, rt)
    tm = prof["skills"].setdefault("themes", {})
    tm["czasowniki"] = round(min(100, max(0, tm.get("czasowniki", 55) + (3 if correct else -5))), 1)
    storage.save_profile(who["username"], prof)
    if not correct:
        add_error(who["username"], "verb_forms", body.get("prompt", vid))
    storage.log_event(who["username"], {"type": "verb_review", "verb": vid,
                                        "question": body.get("prompt", ""),
                                        "tense": body.get("tense"),
                                        "direction": body.get("direction"),
                                        "answer": body.get("answer_given", ""),
                                        "correct_answer": body.get("answer_good", ""),
                                        "correct": correct, "rt": rt, "xp": xp})
    return {"ok": True, "xp": xp, "rating": rating}


# ---------------------------------------------------------------- gramatyka
@app.get("/api/grammar/topics")
async def grammar_topics(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    out = []
    for t in merged_topics():
        stat = prof["skills"].get("grammar_topics", {}).get(t["id"], None)
        out.append({"id": t["id"], "name": t["name"], "level": t["level"],
                    "mastery": stat, "n_ex": len(t.get("exercises", []))})
    return {"topics": out}


@app.get("/api/grammar/topic/{tid}")
async def grammar_topic(tid: str, request: Request):
    current_user(request)
    t = next((x for x in merged_topics() if x["id"] == tid), None)
    if not t:
        raise HTTPException(404, "Nie ma takiego tematu.")
    ex = list(t["exercises"])
    random.shuffle(ex)
    return {"id": t["id"], "name": t["name"], "level": t["level"],
            "theory": t["theory"], "exercises": ex[:8],
            "total_ex": len(t["exercises"])}


@app.post("/api/grammar/mixed")
async def grammar_mixed(request: Request):
    """Trening mieszany: losuje ćwiczenia z wybranych tematów."""
    current_user(request)
    body = await request.json()
    want = body.get("topics", [])
    n = int(body.get("n", 10))
    pool = []
    for t in merged_topics():
        if not want or t["id"] in want:
            for e in t["exercises"]:
                e2 = dict(e)
                e2["topic"] = t["id"]
                e2["topic_name"] = t["name"]
                pool.append(e2)
    random.shuffle(pool)
    return {"exercises": pool[:n], "pool_size": len(pool)}


@app.post("/api/grammar/answer")
async def grammar_answer(request: Request):
    who = current_user(request)
    body = await request.json()
    t = next((x for x in merged_topics() if x["id"] == body["topic"]), None)
    ex = next((e for e in t["exercises"] if e["id"] == body["ex"]), None)
    if not ex:
        raise HTTPException(404, "Brak zadania.")
    ans = str(body["answer"]).strip().lower()
    if ex["type"] == "choice":
        correct = int(body["answer"]) == ex["answer"]
        good = ex["options"][ex["answer"]]
        your = ex["options"][int(body["answer"])] if str(body["answer"]).isdigit() else str(body["answer"])
    else:
        accepted = [a.lower() for a in ex.get("accept", [str(ex.get("answer", ""))])]
        correct = ans in accepted
        good = accepted[0]
        your = str(body["answer"])
    prof = storage.load_profile(who["username"])
    gt = prof["skills"].setdefault("grammar_topics", {})
    old = gt.get(t["id"], 40.0)
    gt[t["id"]] = round(min(100, max(0, old + (6 if correct else -5))), 1)
    prof["skills"]["grammar"] = sk.update_skill(
        prof["skills"]["grammar"], t["level"], correct, body.get("rt"))
    xp = 6 if correct else 1
    sk.register_activity(prof, correct, xp)
    storage.save_profile(who["username"], prof)
    if not correct:
        add_error(who["username"], "grammar_" + t["id"],
                  f"{ex.get('text','')} | odp: {your}")
    storage.log_event(who["username"], {"type": "grammar_answer", "topic": t["id"],
                                        "ex": ex["id"], "question": ex.get("text", ""),
                                        "answer": body["answer"], "your": your,
                                        "correct_answer": good,
                                        "correct": correct, "rt": body.get("rt"), "xp": xp})
    full_en = fill_blanks(ex.get("text", ""), good) or (good if "___" not in ex.get("text", "") else None)
    return {"correct": correct, "answer": good, "your": your, "en": full_en,
            "pl": ex.get("pl", ""), "explain": ex.get("explain", ""),
            "rule": t.get("rule", ""), "topic_name": t["name"], "xp": xp}


@app.post("/api/grammar/guessed")
async def grammar_guessed(request: Request):
    """Uczeń przyznał, że zgadł — cofamy część przyrostu opanowania."""
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    gt = prof["skills"].setdefault("grammar_topics", {})
    tid = body.get("topic")
    if tid in gt:
        gt[tid] = round(max(0, gt[tid] - 4), 1)
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "grammar_guessed", "topic": tid})
    return {"ok": True}


# ---------------------------------------------------------------- lekcje
def _lessons_data():
    return {"units": sum((storage.load_data(f, {}).get("units", []) for f in storage.list_data_files("lekcje/")), [])}


def _lesson_state(username):
    return storage.user_file(username, "lessons.json", {"chapters": {}, "exams": {}, "summary": None})


def _save_lesson_state(username, st):
    # podsumowanie do dashboardu
    total_ch = sum(len(u["chapters"]) for u in _lessons_data()["units"])
    done_ch = sum(1 for c in st["chapters"].values() if c.get("quiz_passed"))
    st["summary"] = {"chapters_done": done_ch, "chapters_total": total_ch,
                     "exams": {k: v.get("grade") for k, v in st.get("exams", {}).items()}}
    storage.save_user_file(username, "lessons.json", st)


@app.get("/api/lessons")
async def lessons_list(request: Request):
    who = current_user(request)
    st = _lesson_state(who["username"])
    out = []
    for u in _lessons_data()["units"]:
        chapters = []
        prev_done = True
        for c in u["chapters"]:
            cs = st["chapters"].get(c["id"], {})
            chapters.append({
                "id": c["id"], "name": c["name"], "intro": c["intro"],
                "n_ex": len(c.get("exercises", [])), "n_hw": len(c.get("homework", [])),
                "n_quiz": len(c.get("quiz", [])),
                "exercises_done": cs.get("exercises_done", 0),
                "homework_done": cs.get("homework_done", 0),
                "quiz_score": cs.get("quiz_score"), "quiz_passed": cs.get("quiz_passed", False),
                "unlocked": prev_done,
            })
            prev_done = cs.get("quiz_passed", False)
        exam_state = st.get("exams", {}).get(u["id"])
        all_done = all(ch["quiz_passed"] for ch in chapters)
        out.append({"id": u["id"], "name": u["name"], "level": u["level"],
                    "desc": u["desc"], "chapters": chapters,
                    "exam_questions": len(u.get("exam", {}).get("questions", [])),
                    "exam_unlocked": all_done, "exam": exam_state})
    return {"units": out}


@app.get("/api/lesson/{uid}/exam")
async def lesson_exam_questions(uid: str, request: Request):
    current_user(request)
    u = next((x for x in _lessons_data()["units"] if x["id"] == uid), None)
    if not u:
        raise HTTPException(404, "Brak działu.")
    qs = []
    for q in u["exam"]["questions"]:
        q2 = {k: q[k] for k in ("id", "type") if k in q}
        if q["type"] == "choice":
            q2.update({"text": q["text"], "options": q["options"]})
        else:
            q2.update({"text": q.get("text", ""), "pl": q.get("pl", "")})
        qs.append(q2)
    return {"unit": uid, "questions": qs, "pass_note": u["exam"].get("pass_note", "")}


@app.get("/api/lesson/{uid}/{cid}")
async def lesson_chapter(uid: str, cid: str, request: Request):
    current_user(request)
    u = next((x for x in _lessons_data()["units"] if x["id"] == uid), None)
    c = next((x for x in u["chapters"] if x["id"] == cid), None) if u else None
    if not c:
        raise HTTPException(404, "Brak rozdziału.")
    return {"unit": uid, "id": c["id"], "name": c["name"], "intro": c["intro"],
            "pages": c["pages"], "exercises": c["exercises"],
            "homework": c["homework"], "quiz": c["quiz"]}


def _grade_lesson_item(item, answer_value):
    if item["type"] == "choice":
        correct = int(answer_value) == item["answer"]
        good = item["options"][item["answer"]]
        your = item["options"][int(answer_value)] if str(answer_value).isdigit() else str(answer_value)
        detail = None
    elif item["type"] == "translate":
        res = grader.grade_translation(str(answer_value), item)
        correct, good, your, detail = res["score"] >= 0.7, res["ref"], str(answer_value), res
    elif item["type"] == "order":
        ans = str(answer_value).strip().lower()
        accepted = [a.lower() for a in item.get("accept", [])]
        correct = ans in accepted
        good = item.get("accept", ["?"])[0]
        your, detail = str(answer_value), None
    else:  # gap
        ans = str(answer_value).strip().lower()
        accepted = [a.lower() for a in item.get("accept", [])]
        correct = ans in accepted
        good = item.get("accept", ["?"])[0]
        your, detail = str(answer_value), None
    return correct, good, your, detail


@app.post("/api/lesson/answer")
async def lesson_answer(request: Request):
    """body: {unit, chapter, section: exercises|homework|quiz, item, answer, rt}"""
    who = current_user(request)
    body = await request.json()
    u = next((x for x in _lessons_data()["units"] if x["id"] == body["unit"]), None)
    c = next((x for x in u["chapters"] if x["id"] == body["chapter"]), None)
    sec = c[body["section"]]
    item = next((x for x in sec if x["id"] == body["item"]), None)
    if not item:
        raise HTTPException(404, "Brak zadania.")
    correct, good, your, detail = _grade_lesson_item(item, body["answer"])
    prof = storage.load_profile(who["username"])
    xp = {"exercises": 4, "homework": 8, "quiz": 6}[body["section"]] if correct else 1
    sk.register_activity(prof, correct, xp)
    lvl = u["level"]
    prof["skills"]["grammar"] = sk.update_skill(prof["skills"]["grammar"], lvl, correct, body.get("rt"))
    if item["type"] == "translate":
        prof["skills"]["writing"] = sk.update_skill(prof["skills"]["writing"], lvl, correct, body.get("rt"))
    storage.save_profile(who["username"], prof)
    if not correct:
        add_error(who["username"], "lesson_" + c["id"], f"{item.get('text', item.get('pl',''))} | odp: {your}")
    storage.log_event(who["username"], {"type": "lesson_answer", "unit": u["id"],
                                        "chapter": c["id"], "section": body["section"],
                                        "item": item["id"],
                                        "question": item.get("text", item.get("pl", "")),
                                        "your": your, "correct_answer": good,
                                        "correct": correct, "rt": body.get("rt"), "xp": xp})
    txt = item.get("text", "")
    full_en = fill_blanks(txt, good) or (good if "___" not in txt else None)
    return {"correct": correct, "answer": good, "your": your, "en": full_en,
            "pl": item.get("pl", ""), "explain": item.get("explain", ""),
            "detail": detail, "xp": xp}


@app.post("/api/lesson/progress")
async def lesson_progress(request: Request):
    """Zapis postępu sekcji rozdziału. body: {unit, chapter, section, done, score?}"""
    who = current_user(request)
    body = await request.json()
    st = _lesson_state(who["username"])
    cs = st["chapters"].setdefault(body["chapter"], {})
    if body["section"] == "exercises":
        cs["exercises_done"] = max(cs.get("exercises_done", 0), int(body.get("done", 0)))
    elif body["section"] == "homework":
        cs["homework_done"] = max(cs.get("homework_done", 0), int(body.get("done", 0)))
    elif body["section"] == "quiz":
        score = float(body.get("score", 0))
        cs["quiz_score"] = max(cs.get("quiz_score") or 0, score)
        if score >= 0.6:
            cs["quiz_passed"] = True
    _save_lesson_state(who["username"], st)
    storage.log_event(who["username"], {"type": "lesson_progress", **{k: body.get(k) for k in ("chapter", "section", "done", "score")}})
    return {"ok": True}


@app.post("/api/lesson/exam")
async def lesson_exam(request: Request):
    """Ocenia cały sprawdzian. body: {unit, answers: {item_id: value}, rt}"""
    who = current_user(request)
    body = await request.json()
    u = next((x for x in _lessons_data()["units"] if x["id"] == body["unit"]), None)
    qs = u["exam"]["questions"]
    results = []
    pts = 0.0
    for q in qs:
        val = body.get("answers", {}).get(q["id"], "")
        correct, good, your, detail = _grade_lesson_item(q, val)
        score = (detail["score"] if detail else (1.0 if correct else 0.0))
        pts += score
        results.append({"id": q["id"], "question": q.get("text", q.get("pl", "")),
                        "your": your, "answer": good, "correct": correct,
                        "pl": q.get("pl", ""), "score": round(score, 2)})
    pct = round(100 * pts / len(qs), 1)
    grade = grade_for(pct)
    st = _lesson_state(who["username"])
    prev = st.setdefault("exams", {}).get(u["id"], {})
    if pct >= (prev.get("pct") or 0):
        st["exams"][u["id"]] = {"pct": pct, "grade": grade["grade"],
                                "grade_name": grade["name"],
                                "date": datetime.date.today().isoformat()}
    _save_lesson_state(who["username"], st)
    prof = storage.load_profile(who["username"])
    xp = round(pct / 4)
    sk.register_activity(prof, pct >= 55, xp)
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "lesson_exam", "unit": u["id"],
                                        "pct": pct, "grade": grade["grade"],
                                        "results": results, "xp": xp})
    return {"pct": pct, "grade": grade, "results": results, "xp": xp,
            "pass_note": u["exam"].get("pass_note", "")}


# ---------------------------------------------------------------- silnik luk
THEME_NAMES = {"zwierzeta":"Zwierzęta","jedzenie":"Jedzenie","dom":"Dom","transport":"Transport",
 "cialo":"Ciało i zdrowie","rodzina":"Rodzina i ludzie","ubrania":"Ubrania","miasto":"Miasto i zakupy",
 "natura":"Natura i pogoda","uczucia":"Uczucia i cechy","liczebniki":"Liczebniki","kalendarz":"Kalendarz",
 "kolory":"Kolory","czasowniki":"Czasowniki","praca":"Praca / magazyn","przedmioty":"Przedmioty codzienne",
 "ogolne":"Ogólne","inne":"Inne","rozmowy":"Rozmowy","phrasal":"Phrasal verbs",
 "pulapki":"False friends","czytanie":"Z czytania","biuro":"Praca i biuro",
 "technologia":"Technologia","przymiotniki":"Przymiotniki","zwroty":"Zwroty codzienne"}


@app.get("/api/gaps")
async def api_gaps(request: Request):
    """Heatmapa kategorii: wynik + pokrycie (znane/wszystkie)."""
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    cards = load_cards(who["username"])
    pool = vocab_pool(prof)
    tm = prof["skills"].get("themes", {})
    agg = {}
    for it in pool:
        t = it.get("theme", "inne")
        a = agg.setdefault(t, {"total": 0, "known": 0})
        a["total"] += 1
        if it["id"] in cards:
            a["known"] += 1
    out = []
    for t, a in agg.items():
        score = tm.get(t)
        cov = round(100 * a["known"] / max(1, a["total"]))
        eff = score if score is not None else (cov * 0.6 if a["known"] else None)
        out.append({"theme": t, "name": THEME_NAMES.get(t, t), "score": score,
                    "known": a["known"], "total": a["total"], "coverage": cov,
                    "eff": round(eff, 1) if eff is not None else None})
    out.sort(key=lambda x: (x["eff"] is None, x["eff"] if x["eff"] is not None else 999))
    weak = [x for x in out if x["eff"] is not None and x["eff"] < 55]
    total = sum(a["total"] for a in agg.values())
    known = sum(a["known"] for a in agg.values())
    scored = [x["eff"] for x in out if x["eff"] is not None]
    return {"themes": out, "weak": weak[:4],
            "all": {"total": total, "known": known,
                    "eff": round(sum(scored) / len(scored), 1) if scored else None}}


@app.get("/api/continue")
async def api_continue(request: Request):
    """Jeden przycisk: co teraz? powtórki -> łatanie luk -> następne ogniwo ścieżki."""
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    cards = load_cards(who["username"])
    vcards = storage.user_file(who["username"], "verb_cards.json", {})
    now = time.time()
    due = sum(1 for c in cards.values() if c["fsrs"]["due"] <= now)
    vdue = sum(1 for c in vcards.values() if c["fsrs"]["due"] <= now)
    if due >= 5:
        return {"action": "reviews", "label": f"Powtórz {due} fiszek", "hash": "#flashcards"}
    if vdue >= 5:
        return {"action": "verbs", "label": f"Powtórz {vdue} czasowników", "hash": "#verbs"}
    tm = prof["skills"].get("themes", {})
    weak = sorted([(v, k) for k, v in tm.items() if v < 50 and k != "rozmowy"])
    if weak:
        t = weak[0][1]
        return {"action": "theme", "theme": t,
                "label": f"Załataj lukę: {THEME_NAMES.get(t, t)} ({weak[0][0]:.0f}%)",
                "hash": "#flashcards", "param": t}
    nxt = _next_path_link(who["username"])
    if nxt:
        return {"action": "path", "link": nxt["id"],
                "label": f"Ścieżka: {nxt['name']}", "hash": "#path"}
    return {"action": "free", "label": "Wszystko na bieżąco — wybierz tryb wolny", "hash": "#dashboard"}


# ---------------------------------------------------------------- ścieżka nauki
class _SessionStore:
    """Sesje ćwiczeń trzymane na dysku — restart aplikacji nie kasuje postępu."""

    def __getitem__(self, user):
        s = storage.user_file(user, "session.json", None)
        if not s:
            raise KeyError(user)
        return s

    def __setitem__(self, user, value):
        storage.save_user_file(user, "session.json", value)

    def get(self, user, default=None):
        return storage.user_file(user, "session.json", None) or default

    def pop(self, user, default=None):
        s = storage.user_file(user, "session.json", None)
        storage.save_user_file(user, "session.json", {})
        return s or default


PATH_SESS = _SessionStore()


def _path_data():
    return storage.load_data("sciezka.json", {"levels": []})


def _path_state(u):
    return storage.user_file(u, "path.json", {"done": {}, "levels_passed": {}})


def _lesson_passed(u, chapter):
    st = storage.user_file(u, "lessons.json", {})
    return st.get("chapters", {}).get(chapter, {}).get("quiz_passed", False)


def _path_links(username):
    """Spłaszczona lista ogniw ze statusem."""
    st = _path_state(username)
    out = []
    prev_ok = True
    for lvl in _path_data()["levels"]:
        lvl_locked = any(not st["levels_passed"].get(req) for req in lvl.get("requires", []))
        for ln in lvl["links"]:
            done = ln["id"] in st["done"] or (
                ln["type"] == "lekcja" and _lesson_passed(username, ln["chapter"]))
            out.append({**ln, "level": lvl["level"], "done": done,
                        "unlocked": (not lvl_locked) and prev_ok})
            prev_ok = done
    return out


def _next_path_link(username):
    for ln in _path_links(username):
        if not ln["done"] and ln["unlocked"]:
            return ln
    return None


def _mark_path_link(username, key, value, score):
    """Zalicza ogniwo powiązane z modułem (czytanie/pisanie/rozmowa)."""
    pst = _path_state(username)
    hit = None
    for lvl in _path_data()["levels"]:
        for ln in lvl["links"]:
            if ln.get(key) == value and ln["id"] not in pst["done"]:
                pst["done"][ln["id"]] = {"score": score,
                                         "date": datetime.date.today().isoformat()}
                hit = ln["name"]
    if hit:
        storage.save_user_file(username, "path.json", pst)
    return hit


@app.get("/api/path")
async def api_path(request: Request):
    who = current_user(request)
    links = _path_links(who["username"])
    st = _path_state(who["username"])
    levels = []
    for lvl in _path_data()["levels"]:
        ids = [l["id"] for l in lvl["links"]]
        mine = [l for l in links if l["id"] in ids]
        levels.append({"level": lvl["level"], "name": lvl["name"],
                       "passed": st["levels_passed"].get(lvl["level"], False),
                       "links": mine,
                       "done": sum(1 for l in mine if l["done"]), "total": len(mine)})
    return {"levels": levels, "scores": st["done"]}


def _mk_vocab_tasks(items, n, produce_ratio=0.5):
    random.shuffle(items)
    tasks = []
    for it in items[:n]:
        if random.random() < produce_ratio:
            tasks.append({"kind": "produce", "nr": it.get("nr"),
                          "text": f"Napisz po angielsku: „{it['pl']}”",
                          "accept": [it["en"].lower()], "answer": it["en"], "pl": it["pl"],
                          "item": it})
        else:
            wrong = random.sample([x["pl"] for x in items if x["id"] != it["id"]],
                                  min(3, max(1, len(items) - 1)))
            opts = wrong + [it["pl"]]
            random.shuffle(opts)
            tasks.append({"kind": "choice", "nr": it.get("nr"),
                          "text": f"Co znaczy „{it['en']}”?", "options": opts,
                          "answer_idx": opts.index(it["pl"]), "answer": it["pl"],
                          "pl": it["pl"], "en": it["en"], "tts": it["en"], "item": it})
    return tasks


def _covered_content(username):
    """Tematy/tematy gramatyki ukończone na ścieżce — do powtórek skumulowanych."""
    themes, gtopics, chapters = [], [], []
    for ln in _path_links(username):
        if not ln["done"]:
            continue
        if ln["type"] == "slowka":
            themes.append(ln["theme"])
        if ln["type"] == "gramatyka":
            gtopics.append(ln["topic"])
        if ln["type"] == "lekcja":
            chapters.append(ln["chapter"])
    return themes, gtopics, chapters


@app.get("/api/path/session/{lid}")
async def path_session(lid: str, request: Request, n: str = ""):
    """n: liczba zadań albo 'all' albo puste (wtedy tylko informacja o puli)."""
    who = current_user(request)
    if lid == "repair":
        return await _repair_session(who)
    ln = next((l for lvl in _path_data()["levels"] for l in lvl["links"] if l["id"] == lid), None)
    if not ln:
        raise HTTPException(404, "Brak ogniwa.")
    prof = storage.load_profile(who["username"])
    pool = vocab_pool(prof)
    tasks, extra = [], {}
    if ln["type"] == "slowka":
        items = [it for it in pool if it.get("theme") == ln["theme"]]
        tasks = _mk_vocab_tasks(items, len(items))
    elif ln["type"] == "wiedza":
        a = next(x for x in storage.load_data("wiedza/baza.json", {})["articles"]
                 if x["id"] == ln["article"])
        extra["theory"] = a
        for i, q in enumerate(a["quiz"]):
            tasks.append({"kind": "openpl", "text": q["q"], "article": a["id"], "q_idx": i,
                          "answer": q["model"]})
    elif ln["type"] == "gramatyka":
        t = next(x for x in merged_topics() if x["id"] == ln["topic"])
        ex = list(t["exercises"])
        random.shuffle(ex)
        extra["theory_html"] = t["theory"]
        for e in ex:
            tasks.append(_grammar_task(e, t))
    elif ln["type"] == "lekcja":
        extra["redirect"] = {"unit": ln["unit"], "chapter": ln["chapter"]}
    elif ln["type"] == "rozmowa":
        extra["redirect_dialog"] = ln["dialog"]
    elif ln["type"] == "czytanie":
        extra["redirect_reading"] = ln["text"]
    elif ln["type"] == "pisanie":
        extra["redirect_writing"] = ln["task"]
    elif ln["type"] == "sluchanie":
        items = [i for i in merged_items("sluchanie/") +
                 storage.load_data("testy/poziomujacy.json", {}).get("listening", [])
                 if i["level"] in ("A1", "A2")]
        random.shuffle(items)
        for it in items:
            tasks.append({"kind": "dictation", "text": "Posłuchaj i zapisz zdanie.",
                          "tts": it["en"], "target": it["en"], "pl": it.get("pl", ""),
                          "answer": it["en"]})
    elif ln["type"] == "tlumaczenia":
        items = [i for i in merged_items("tlumaczenia/") if i["level"] in ("A1", "A2")]
        random.shuffle(items)
        for it in items:
            tasks.append({"kind": "translate", "text": f"Przetłumacz: „{it['pl']}”",
                          "item_data": it, "answer": it["en_ref"], "pl": it["pl"]})
    elif ln["type"] in ("powtorka", "sprawdzian", "egzamin"):
        themes, gtopics, _ = _covered_content(who["username"])
        if ln["type"] == "egzamin":
            themes = themes or [l["theme"] for lvl in _path_data()["levels"]
                                for l in lvl["links"] if l["type"] == "slowka"]
        vit = [it for it in pool if it.get("theme") in themes]
        tasks += _mk_vocab_tasks(vit, len(vit), produce_ratio=0.6)
        gex = []
        for t in merged_topics():
            if not gtopics or t["id"] in gtopics or ln["type"] == "egzamin":
                for e in t["exercises"]:
                    gex.append((e, t))
        random.shuffle(gex)
        for e, t in gex:
            tasks.append(_grammar_task(e, t))
        random.shuffle(tasks)
    pool_size = len(tasks)
    suggested = ln.get("n") or min(10, pool_size)
    if not n:                       # brak wyboru -> ekran doboru liczby zadań
        return {"link": {k: ln.get(k) for k in ("id", "name", "type")},
                "pool": pool_size, "suggested": min(suggested, pool_size),
                "choose": True, **{k: v for k, v in extra.items() if k.startswith("redirect")}}
    if n != "all":
        try:
            tasks = tasks[:max(1, min(pool_size, int(n)))]
        except ValueError:
            tasks = tasks[:suggested]
    PATH_SESS[who["username"]] = {"lid": lid, "tasks": tasks, "results": [], "answered": {}}
    pub = []
    for i, t in enumerate(tasks):
        pt = {"idx": i, "kind": t["kind"], "text": t["text"], "nr": t.get("nr")}
        for k in ("options", "tts", "hint", "words"):
            if k in t:
                pt[k] = t[k]
        pub.append(pt)
    return {"link": {k: ln.get(k) for k in ("id", "name", "type")} if ln else {"id": lid},
            "tasks": pub, "pool": pool_size, **extra}


def _grammar_task(e, t):
    task = {"kind": "gchoice" if e["type"] == "choice" else "ggap", "nr": e.get("nr"),
            "text": e.get("text", ""), "pl": e.get("pl", ""), "explain": e.get("explain", ""),
            "rule": t.get("rule", ""), "topic_name": t["name"],
            "topic": t["id"], "ex_id": e["id"]}
    if e["type"] == "choice":
        task["options"] = e["options"]
        task["answer_idx"] = e["answer"]
        task["answer"] = e["options"][e["answer"]]
    else:
        acc = [a.lower() for a in e.get("accept", [])]
        if e["type"] == "order":
            task["words"] = e.get("words", [])
        task["accept"] = acc
        task["answer"] = e.get("accept", ["?"])[0]
    return task


@app.post("/api/path/answer")
async def path_answer(request: Request):
    who = current_user(request)
    body = await request.json()
    sess = PATH_SESS.get(who["username"])
    if not sess:
        raise HTTPException(400, "Sesja wygasła — otwórz ogniwo ponownie.")
    t = sess["tasks"][int(body["idx"])]
    val = body.get("answer", "")
    unknown = bool(body.get("unknown"))
    if unknown:                       # „Nie wiem” = odpowiedź błędna, ale bez zgadywania
        val = -1 if t["kind"] in ("choice", "gchoice") else ""
    prof = storage.load_profile(who["username"])
    score, correct, good, your, pl, explain, en = 0.0, False, t.get("answer", ""), str(val), t.get("pl", ""), t.get("explain", ""), None
    if t["kind"] in ("choice", "gchoice"):
        try:
            iv = int(val)
        except (TypeError, ValueError):
            iv = -1
        correct = iv == t["answer_idx"]
        your = t["options"][iv] if 0 <= iv < len(t["options"]) else ("(nie wiem)" if unknown else str(val))
        score = 1.0 if correct else 0.0
        if t["kind"] == "gchoice" and "___" in t["text"]:
            en = t["text"].replace("___", good)
        if t["kind"] == "choice":
            en = t.get("en")
    elif t["kind"] in ("produce", "ggap"):
        v = str(val).strip().lower()
        correct = v in t.get("accept", [])
        score = 1.0 if correct else 0.0
        if t["kind"] == "produce":
            en = t["answer"]
    elif t["kind"] == "translate":
        res = grader.grade_translation(str(val), t["item_data"])
        score = res["score"]; correct = score >= grader.PASS
        explain = res["feedback"]; en = t["answer"]
    elif t["kind"] == "dictation":
        res = grader.grade_dictation(str(val), t["target"])
        score = res["score"]; correct = score >= 0.75; en = t["target"]
    elif t["kind"] == "openpl":
        a = next(x for x in storage.load_data("wiedza/baza.json", {})["articles"]
                 if x["id"] == t["article"])
        q = a["quiz"][t["q_idx"]]
        res = grader.grade_open_pl(str(val), q["keywords"])
        score = res["score"]; correct = score >= 0.6; explain = res["msg"]
    # jedna odpowiedź na zadanie — druga próba nie psuje wyniku (np. podwójne kliknięcie)
    answered = sess.setdefault("answered", {})
    key = str(body["idx"])
    if key not in answered:
        answered[key] = round(score, 3)
        sess["results"] = list(answered.values())
    PATH_SESS[who["username"]] = sess          # zapis po każdej odpowiedzi
    xp = round(6 * score) if score else (0 if unknown else 1)
    sk.register_activity(prof, correct, xp)
    it = t.get("item")
    if it:
        tm = prof["skills"].setdefault("themes", {})
        th = it.get("theme", "inne")
        tm[th] = round(min(100, max(0, tm.get(th, 55) + (3 if correct else -5))), 1)
    storage.save_profile(who["username"], prof)
    if not correct:
        if t["kind"] in ("gchoice", "ggap"):
            add_error(who["username"], "grammar_" + t.get("topic", "mix"),
                      f"{t['text']} | odp: {your}")
        elif t["kind"] in ("choice", "produce"):
            add_error(who["username"], "vocab_lapse", f"{t['text']} | odp: {your}")
        elif t["kind"] == "dictation":
            add_error(who["username"], "listening", str(val)[:80])
        elif t["kind"] == "translate":
            add_error(who["username"], "trans_sense", str(val)[:80])
    storage.log_event(who["username"], {"type": "path_answer", "link": sess["lid"],
                                        "question": t["text"],
                                        "your": "(nie wiem)" if unknown else your,
                                        "unknown": unknown,
                                        "correct_answer": good, "correct": correct,
                                        "score": round(score, 2), "xp": xp})
    state, label = grader.verdict(score)
    return {"correct": correct, "state": state, "label": label,
            "score": round(score, 2), "answer": good, "your": your,
            "pl": pl, "en": en, "tts": t.get("tts") or en, "explain": explain, "xp": xp,
            "rule": t.get("rule", ""), "topic_name": t.get("topic_name", ""),
            "model": t.get("answer") if t["kind"] == "openpl" else None}


@app.post("/api/path/complete")
async def path_complete(request: Request):
    who = current_user(request)
    body = await request.json()
    sess = PATH_SESS.pop(who["username"], None)
    lid = body.get("link") or (sess and sess["lid"])
    ln = next((l for lvl in _path_data()["levels"] for l in lvl["links"] if l["id"] == lid), None)
    results = sess["results"] if sess else []
    total = len(sess["tasks"]) if sess and sess.get("tasks") else len(results)
    score = round(sum(results) / total, 2) if total else 0.0
    if lid in ("custom", "repair"):
        return {"score": score, "passed": score >= 0.6, "need": 0.6, "grade": None}
    need = 0.7 if ln and ln["type"] in ("sprawdzian", "egzamin") else 0.6
    passed = score >= need
    st = _path_state(who["username"])
    if passed and ln:
        st["done"][lid] = {"score": score, "date": datetime.date.today().isoformat()}
        if ln["type"] == "egzamin":
            lvl = next(l for l in _path_data()["levels"] if any(x["id"] == lid for x in l["links"]))
            st["levels_passed"][lvl["level"]] = True
        storage.save_user_file(who["username"], "path.json", st)
        if ln["type"] == "slowka" and sess:
            cards = load_cards(who["username"])
            for t in sess["tasks"]:
                it = t.get("item")
                if it and it["id"] not in cards:
                    cards[it["id"]] = {"fsrs": fsrs.new_card(), "added": time.time()}
            save_cards(who["username"], cards)
    grade = grade_for(score * 100) if ln and ln["type"] in ("sprawdzian", "egzamin") else None
    storage.log_event(who["username"], {"type": "path_complete", "link": lid,
                                        "score": score, "passed": passed})
    return {"score": score, "passed": passed, "need": need, "grade": grade}


# ---------------------------------------------------------------- własny program nauki
TRAINING_KINDS = {
    "vocab_recognise": "Słownictwo — rozpoznawanie (wybierasz znaczenie)",
    "vocab_produce": "Słownictwo — pisanie (wpisujesz słowo po angielsku)",
    "grammar": "Gramatyka — ćwiczenia",
    "translate": "Tłumaczenie zdań PL → EN",
    "dictation": "Słuchanie — dyktando",
    "listen_pl": "Słuchanie PL → EN",
    "verbs": "Czasowniki — odmiana przez czasy",
    "knowledge": "Teoria — pytania opisowe",
}


@app.get("/api/training/options")
async def training_options(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    themes = {}
    for it in vocab_pool(prof):
        t = it.get("theme", "inne")
        themes[t] = themes.get(t, 0) + 1
    return {"kinds": [{"id": k, "name": v} for k, v in TRAINING_KINDS.items()],
            "themes": [{"id": k, "name": THEME_NAMES.get(k, k), "n": v}
                       for k, v in sorted(themes.items())],
            "topics": [{"id": t["id"], "name": t["name"], "n": len(t["exercises"])}
                       for t in merged_topics()],
            "articles": [{"id": a["id"], "name": a["name"]}
                         for a in _kb()["articles"]],
            "levels": ["A1", "A2", "B1", "B2", "C1"]}


@app.post("/api/training/build")
async def training_build(request: Request):
    """Uczeń/nauczyciel składa własny trening z wybranych kategorii."""
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    kinds = body.get("kinds", [])
    n_total = max(4, min(40, int(body.get("n", 12))))
    themes = body.get("themes", [])
    topics = body.get("topics", [])
    levels = body.get("levels", [])
    pool = vocab_pool(prof)
    if themes:
        pool = [it for it in pool if it.get("theme") in themes] or pool
    per = max(1, n_total // max(1, len(kinds)))
    tasks = []
    plc = storage.load_data("testy/poziomujacy.json", {})
    for kind in kinds:
        if kind == "vocab_recognise":
            tasks += _mk_vocab_tasks(list(pool), per, produce_ratio=0.0)
        elif kind == "vocab_produce":
            tasks += _mk_vocab_tasks(list(pool), per, produce_ratio=1.0)
        elif kind == "grammar":
            gex = [(e, t) for t in merged_topics()
                   if not topics or t["id"] in topics
                   for e in t["exercises"]]
            random.shuffle(gex)
            tasks += [_grammar_task(e, t) for e, t in gex[:per]]
        elif kind == "translate":
            items = [i for i in merged_items("tlumaczenia/")
                     if not levels or i["level"] in levels]
            random.shuffle(items)
            for it in items[:per]:
                tasks.append({"kind": "translate", "text": f"Przetłumacz: „{it['pl']}”",
                              "item_data": it, "answer": it["en_ref"], "pl": it["pl"]})
        elif kind == "dictation":
            items = [i for i in merged_items("sluchanie/") + plc.get("listening", [])
                     if not levels or i["level"] in levels]
            random.shuffle(items)
            for it in items[:per]:
                tasks.append({"kind": "dictation", "text": "Posłuchaj i zapisz zdanie.",
                              "tts": it["en"], "target": it["en"], "pl": it.get("pl", ""),
                              "answer": it["en"]})
        elif kind == "listen_pl":
            items = [i for i in plc.get("listening_pl", [])
                     if not levels or i["level"] in levels]
            random.shuffle(items)
            for it in items[:per]:
                tasks.append({"kind": "translate", "text": "Posłuchaj po polsku i napisz po angielsku.",
                              "tts_pl": it["pl"], "item_data": it,
                              "answer": it["en_ref"], "pl": it["pl"]})
        elif kind == "verbs":
            verbs = storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", [])
            for v in random.sample(verbs, min(per, len(verbs))):
                tense = random.choice(["past", "present", "future"])
                p = _verb_prompt(v, tense, "pl_en")
                tasks.append({"kind": "produce", "text": f"Napisz po angielsku: „{p['prompt']}”",
                              "accept": p["accept"], "answer": p["answer"], "pl": p["prompt"]})
        elif kind == "knowledge":
            arts = [a for a in _kb()["articles"]
                    if not topics or a["id"] in topics]
            random.shuffle(arts)
            for a in arts[:per]:
                q = random.choice(a["quiz"])
                i = a["quiz"].index(q)
                tasks.append({"kind": "openpl", "text": q["q"], "article": a["id"],
                              "q_idx": i, "answer": q["model"]})
    random.shuffle(tasks)
    tasks = tasks[:n_total]
    if not tasks:
        raise HTTPException(400, "Nie udało się złożyć treningu — wybierz inne kategorie.")
    PATH_SESS[who["username"]] = {"lid": "custom", "tasks": tasks, "results": [], "answered": {}}
    pub = []
    for i, t in enumerate(tasks):
        pt = {"idx": i, "kind": t["kind"], "text": t["text"], "nr": t.get("nr")}
        for k in ("options", "tts", "tts_pl", "words"):
            if k in t:
                pt[k] = t[k]
        pub.append(pt)
    storage.log_event(who["username"], {"type": "training_built", "kinds": kinds,
                                        "n": len(tasks), "name": body.get("name", "")})
    return {"link": {"id": "custom", "name": body.get("name") or "Mój trening",
                     "type": "custom"}, "tasks": pub}


# ---------------------------------------------------------------- napraw błędy
async def _repair_session(who):
    prof = storage.load_profile(who["username"])
    errs = storage.user_file(who["username"], "errors.json", {})
    pool = vocab_pool(prof)
    cards = load_cards(who["username"])
    by_id = {i["id"]: i for i in pool}
    tasks = []
    leech_items = [by_id[cid] for cid, c in cards.items()
                   if fsrs.is_leech(c["fsrs"]) and cid in by_id][:5]
    tasks += _mk_vocab_tasks(leech_items, len(leech_items), produce_ratio=1.0)
    gt = sorted([(v["count"], k) for k, v in errs.items() if k.startswith("grammar_")],
                reverse=True)[:2]
    for _, key in gt:
        tid = key.replace("grammar_", "")
        t = next((x for x in merged_topics() if x["id"] == tid), None)
        if t:
            ex = list(t["exercises"]); random.shuffle(ex)
            for e in ex[:3]:
                tasks.append(_grammar_task(e, t))
    if errs.get("verb_forms"):
        verbs = storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", [])
        for v in random.sample(verbs, min(3, len(verbs))):
            tasks.append({"kind": "produce", "text": f"Napisz po angielsku: „{v['pl_past'][0]}” (czas przeszły)",
                          "accept": [("i " + v["past"]).lower()], "answer": "I " + v["past"],
                          "pl": v["pl_past"][0]})
    random.shuffle(tasks)
    if not tasks:
        return {"link": {"id": "repair", "name": "Napraw błędy"}, "tasks": [],
                "empty_msg": "Brak zebranych błędów — świetnie! Wróć tu, gdy coś pójdzie nie tak."}
    PATH_SESS[who["username"]] = {"lid": "repair", "tasks": tasks, "results": [], "answered": {}}
    pub = []
    for i, t in enumerate(tasks):
        pt = {"idx": i, "kind": t["kind"], "text": t["text"], "nr": t.get("nr")}
        for k in ("options", "tts", "words"):
            if k in t:
                pt[k] = t[k]
        pub.append(pt)
    return {"link": {"id": "repair", "name": "Napraw błędy", "type": "repair"}, "tasks": pub}


# ---------------------------------------------------------------- rozmowy
@app.get("/api/dialogs")
async def dialogs_list(request: Request):
    who = current_user(request)
    st = storage.user_file(who["username"], "dialogs.json", {})
    out = []
    for f in storage.list_data_files("rozmowy/"):
        for dlg in storage.load_data(f, {}).get("dialogs", []):
            out.append({"id": dlg["id"], "name": dlg["name"], "desc": dlg["desc"],
                        "level": dlg["level"], "n": len(dlg["nodes"]),
                        "best": st.get(dlg["id"])})
    return {"dialogs": out}


@app.get("/api/dialog/{did}")
async def dialog_get(did: str, request: Request):
    current_user(request)
    for f in storage.list_data_files("rozmowy/"):
        for dlg in storage.load_data(f, {}).get("dialogs", []):
            if dlg["id"] == did:
                return dlg
    raise HTTPException(404, "Brak scenki.")


@app.post("/api/dialog/write_check")
async def dialog_write_check(request: Request):
    who = current_user(request)
    body = await request.json()
    dlg = await dialog_get(body["dialog"], request)
    node = next(n for n in dlg["nodes"] if n["id"] == body["node"])
    res = grader.grade_translation(str(body["answer"]),
                                   {"en_ref": node["write"]["model"],
                                    "keywords": node["write"]["keywords"],
                                    "tense_patterns": [], "forbidden": []})
    state, label = grader.verdict(res["score"])
    ok = state == "good"
    storage.log_event(who["username"], {"type": "dialog_write", "dialog": dlg["id"],
                                        "question": node["npc_en"], "your": body["answer"],
                                        "correct_answer": node["write"]["model"],
                                        "correct": ok, "score": res["score"]})
    return {"ok": ok, "state": state, "label": label, "score": res["score"],
            "model": node["write"]["model"], "feedback": res["feedback"]}


@app.post("/api/dialog/done")
async def dialog_done(request: Request):
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    good, total = int(body.get("good", 0)), max(1, int(body.get("total", 1)))
    pct = round(100 * good / total)
    xp = 10 + good * 3
    sk.register_activity(prof, pct >= 60, xp)
    tm = prof["skills"].setdefault("themes", {})
    tm["rozmowy"] = round(min(100, max(0, tm.get("rozmowy", 50) + (4 if pct >= 60 else -4))), 1)
    storage.save_profile(who["username"], prof)
    st = storage.user_file(who["username"], "dialogs.json", {})
    st[body["dialog"]] = max(st.get(body["dialog"], 0), pct)
    storage.save_user_file(who["username"], "dialogs.json", st)
    linked = _mark_path_link(who["username"], "dialog", body["dialog"], pct / 100) if pct >= 60 else None
    storage.log_event(who["username"], {"type": "dialog_done", "dialog": body["dialog"],
                                        "pct": pct, "xp": xp})
    return {"pct": pct, "xp": xp, "path_link": linked}


# ---------------------------------------------------------------- raport tygodniowy
@app.get("/api/report/week")
async def report_week(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    daily = prof.get("daily", {})
    def span(off):
        days = [(datetime.date.today() - datetime.timedelta(days=off + i)).isoformat()
                for i in range(7)]
        xp = sum(daily.get(d, {}).get("xp", 0) for d in days)
        ans = sum(daily.get(d, {}).get("answers", 0) for d in days)
        cor = sum(daily.get(d, {}).get("correct", 0) for d in days)
        return {"xp": xp, "answers": ans,
                "acc": round(100 * cor / ans) if ans else None,
                "active": sum(1 for d in days if daily.get(d, {}).get("answers", 0) > 0)}
    tm = prof["skills"].get("themes", {})
    weakest = sorted(tm.items(), key=lambda kv: kv[1])[:3]
    return {"this": span(0), "prev": span(7),
            "weakest": [{"theme": k, "name": THEME_NAMES.get(k, k), "score": v}
                        for k, v in weakest]}


# ---------------------------------------------------------------- edytor treści (nauczyciel)
@app.post("/api/teacher/content")
async def teacher_content(request: Request):
    who = require_teacher(request)
    body = await request.json()
    kind = body["kind"]
    if kind == "word":
        f = "slownictwo/dodane_nauczyciela.json"
        data = storage.load_data(f, None) or {"name": "Dodane przez nauczyciela",
                                              "domain": "general", "cat": "mixed",
                                              "theme": body.get("theme", "inne"),
                                              "level": "A1", "items": []}
        nr = len(data["items"]) + 1
        data["items"].append({"nr": nr, "id": f"tchw_{int(time.time()*1000)}",
                              "en": body["en"].strip(), "pl": body["pl"].strip(),
                              "theme": body.get("theme", "inne"),
                              "example": body.get("example", ""),
                              "level": body.get("level", "A1"), "rank": 5000 + nr})
    elif kind == "sentence":
        f = "tlumaczenia/dodane.json"
        data = storage.load_data(f, None) or {"items": []}
        nr = len(data["items"]) + 1
        kws = [g.split("|") for g in body.get("keywords", "").split(",") if g.strip()] or               [[w] for w in body["en"].lower().split() if len(w) > 3]
        data["items"].append({"nr": nr, "id": f"tcht_{int(time.time()*1000)}",
                              "level": body.get("level", "A1"), "pl": body["pl"].strip(),
                              "en_ref": body["en"].strip(), "keywords": kws,
                              "tense_name": body.get("tense_name", ""),
                              "tense_patterns": [], "forbidden": [],
                              "domain": "general"})
    elif kind == "dictation":
        f = "sluchanie/dodane.json"
        data = storage.load_data(f, None) or {"items": []}
        nr = len(data["items"]) + 1
        data["items"].append({"nr": nr, "id": f"tchd_{int(time.time()*1000)}",
                              "level": body.get("level", "A1"),
                              "en": body["en"].strip(), "pl": body.get("pl", "").strip()})
    else:
        raise HTTPException(400, "Nieznany typ treści.")
    storage.save_data(f, data)
    storage.log_event(who["username"], {"type": "teacher_content_added", "kind": kind,
                                        "file": f, "nr": nr})
    return {"ok": True, "file": f, "nr": nr}


# ---------------------------------------------------------------- czytanie
def _reading_texts():
    out = []
    for f in storage.list_data_files("czytanie/"):
        out += storage.load_data(f, {}).get("texts", [])
    return out


def _glossary():
    g = {}
    for f in storage.list_data_files("czytanie/"):
        g.update(storage.load_data(f, {}).get("words", {}))
    return g


@app.get("/api/reading")
async def reading_list(request: Request):
    who = current_user(request)
    st = storage.user_file(who["username"], "reading.json", {})
    return {"texts": [{"id": t["id"], "title": t["title"], "level": t["level"],
                       "emoji": t.get("emoji", "📖"),
                       "words": len(t["text"].split()),
                       "questions": len(t.get("questions", [])),
                       "done": st.get(t["id"])} for t in _reading_texts()]}


@app.get("/api/reading/{tid}")
async def reading_get(tid: str, request: Request, n: str = "all"):
    current_user(request)
    t = next((x for x in _reading_texts() if x["id"] == tid), None)
    if not t:
        raise HTTPException(404, "Brak tekstu.")
    t = dict(t)
    t["pool"] = len(t.get("questions", []))
    if n != "all":
        try:
            t["questions"] = t["questions"][:max(1, int(n))]
        except ValueError:
            pass
    return t


@app.get("/api/reading/word/{word}")
async def reading_word(word: str, request: Request):
    """Tłumaczenie klikniętego słowa: fiszki -> czasowniki -> słowniczek."""
    who = current_user(request)
    w = re.sub(r"[^a-zA-Z'-]", "", word).lower()
    if not w:
        raise HTTPException(404, "Brak słowa.")
    prof = storage.load_profile(who["username"])
    for it in vocab_pool(prof):
        if it["en"].lower() == w:
            return {"en": it["en"], "pl": it["pl"], "src": "fiszki",
                    "id": it["id"], "example": it.get("example", ""),
                    "known": it["id"] in load_cards(who["username"])}
    verbs = storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", [])
    for v in verbs:
        if w in (v["en"], v["past"], v["perf"]):
            names = []
            if w == v["en"]:
                names.append("forma podstawowa")
            if w == v["past"]:
                names.append("2. forma (Past Simple)")
            if w == v["perf"]:
                names.append("3. forma (Past Participle)")
            form = " i ".join(names)
            return {"en": w, "pl": v["pl_inf"], "src": "czasownik",
                    "note": f"{form} od „{v['en']}” ({v['en']} → {v['past']} → {v['perf']})",
                    "example": v.get("example", "")}
    g = _glossary()
    base = g.get(w) or g.get(w.rstrip("s")) or g.get(w.rstrip("ed")) or g.get(w.rstrip("ing"))
    if base:
        return {"en": w, "pl": base, "src": "słowniczek"}
    raise HTTPException(404, "Nie znam tego słowa — sprawdź w słowniku.")


@app.post("/api/reading/save_word")
async def reading_save_word(request: Request):
    """Dodaje kliknięte słowo do własnych fiszek."""
    who = current_user(request)
    body = await request.json()
    custom = storage.user_file(who["username"], "custom_cards.json", [])
    if any(c["en"].lower() == body["en"].lower() for c in custom):
        return {"ok": True, "dup": True}
    custom.append({"id": "read_" + str(int(time.time() * 1000)),
                   "en": body["en"], "pl": body["pl"],
                   "example": body.get("example", ""), "level": body.get("level", "A2"),
                   "theme": "czytanie", "rank": 0, "nr": len(custom) + 1})
    storage.save_user_file(who["username"], "custom_cards.json", custom)
    storage.log_event(who["username"], {"type": "word_saved", "en": body["en"]})
    return {"ok": True}


@app.post("/api/reading/done")
async def reading_done(request: Request):
    who = current_user(request)
    body = await request.json()
    t = next((x for x in _reading_texts() if x["id"] == body["id"]), None)
    qs = t.get("questions", [])
    results, pts = [], 0
    for i, q in enumerate(qs):
        val = body.get("answers", {}).get(str(i), -1)
        ok = int(val) == q["answer"] if str(val).lstrip("-").isdigit() else False
        pts += 1 if ok else 0
        results.append({"question": q["text"], "your": q["options"][int(val)] if 0 <= int(val) < len(q["options"]) else "—",
                        "answer": q["options"][q["answer"]], "correct": ok,
                        "pl": q.get("pl", ""),
                        "options": [{"en": o, "pl": (q.get("options_pl") or [""] * 9)[j],
                                     "correct": j == q["answer"], "chosen": j == int(val)}
                                    for j, o in enumerate(q["options"])]})
    pct = round(100 * pts / max(1, len(qs)))
    prof = storage.load_profile(who["username"])
    xp = 5 + pts * 4
    sk.register_activity(prof, pct >= 60, xp)
    prof["skills"]["reading"] = sk.update_skill(prof["skills"]["reading"], t["level"], pct >= 60, None)
    storage.save_profile(who["username"], prof)
    st = storage.user_file(who["username"], "reading.json", {})
    st[t["id"]] = max(st.get(t["id"], 0), pct)
    storage.save_user_file(who["username"], "reading.json", st)
    link = _mark_path_link(who["username"], "text", t["id"], pct / 100) if pct >= 60 else None
    storage.log_event(who["username"], {"type": "reading_done", "text": t["id"],
                                        "pct": pct, "xp": xp, "results": results})
    return {"pct": pct, "xp": xp, "results": results, "path_link": link,
            "saved_words": body.get("saved", 0)}


# ---------------------------------------------------------------- pisanie
def _writing_tasks():
    out = []
    for f in storage.list_data_files("pisanie/"):
        out += storage.load_data(f, {}).get("tasks", [])
    return out


@app.get("/api/writing")
async def writing_list(request: Request):
    who = current_user(request)
    st = storage.user_file(who["username"], "writing.json", {})
    return {"tasks": [{"id": t["id"], "title": t["title"], "level": t["level"],
                       "emoji": t.get("emoji", "✍️"), "brief": t["brief"],
                       "min_words": t.get("min_words", 40),
                       "elements": t.get("must_pl", []),
                       "best": (st.get(t["id"]) or {}).get("score")}
                      for t in _writing_tasks()]}


@app.get("/api/writing/{wid}")
async def writing_get(wid: str, request: Request):
    current_user(request)
    t = next((x for x in _writing_tasks() if x["id"] == wid), None)
    if not t:
        raise HTTPException(404, "Brak zadania.")
    return {k: t[k] for k in ("id", "title", "level", "emoji", "brief", "min_words",
                              "must_pl", "tense_hint") if k in t}


@app.post("/api/writing/check")
async def writing_check(request: Request):
    who = current_user(request)
    body = await request.json()
    t = next((x for x in _writing_tasks() if x["id"] == body["id"]), None)
    if not t:
        raise HTTPException(404, "Brak zadania.")
    res = grader.grade_writing(body.get("text", ""), t)
    prof = storage.load_profile(who["username"])
    xp = round(20 * res["score"])
    sk.register_activity(prof, res["state"] == "good", xp)
    prof["skills"]["writing"] = sk.update_skill(prof["skills"]["writing"], t["level"],
                                                res["state"] == "good", None)
    storage.save_profile(who["username"], prof)
    st = storage.user_file(who["username"], "writing.json", {})
    prev = st.get(t["id"], {})
    if res["score"] >= prev.get("score", 0):
        st[t["id"]] = {"score": res["score"], "text": body.get("text", "")[:2000],
                       "date": datetime.date.today().isoformat()}
        storage.save_user_file(who["username"], "writing.json", st)
    storage.log_event(who["username"], {"type": "writing_check", "task": t["id"],
                                        "question": t["title"],
                                        "your": body.get("text", "")[:1500],
                                        "correct_answer": t.get("model", ""),
                                        "score": res["score"], "correct": res["state"] == "good",
                                        "xp": xp, "missed": res["missed"], "issues": res["issues"]})
    link = _mark_path_link(who["username"], "task", t["id"], res["score"]) if res["state"] == "good" else None
    return {**res, "model": t.get("model", ""), "xp": xp, "path_link": link}


@app.get("/api/teacher/writings/{username}")
async def teacher_writings(username: str, request: Request):
    require_teacher(request)
    st = storage.user_file(username, "writing.json", {})
    tasks = {t["id"]: t for t in _writing_tasks()}
    out = []
    for wid, v in st.items():
        t = tasks.get(wid, {})
        out.append({"id": wid, "title": t.get("title", wid), "level": t.get("level", ""),
                    "score": v.get("score"), "date": v.get("date"), "text": v.get("text", ""),
                    "model": t.get("model", "")})
    return {"writings": sorted(out, key=lambda x: x.get("date") or "", reverse=True)}


# ---------------------------------------------------------------- baza wiedzy
def _kb():
    return storage.load_data("wiedza/baza.json", {"categories": [], "articles": []})


@app.get("/api/knowledge")
async def knowledge_list(request: Request):
    current_user(request)
    d = _kb()
    arts = [{"id": a["id"], "cat": a["cat"], "name": a["name"], "level": a["level"],
             "what": a["what"], "n_quiz": len(a.get("quiz", []))} for a in d["articles"]]
    return {"categories": d["categories"], "articles": arts}


@app.get("/api/knowledge/{aid}")
async def knowledge_article(aid: str, request: Request):
    current_user(request)
    a = next((x for x in _kb()["articles"] if x["id"] == aid), None)
    if not a:
        raise HTTPException(404, "Brak artykułu.")
    return a


@app.post("/api/knowledge/check")
async def knowledge_check(request: Request):
    """Sprawdzian opisowy PO POLSKU: oceniamy sens, nie słowo w słowo."""
    who = current_user(request)
    body = await request.json()
    a = next((x for x in _kb()["articles"] if x["id"] == body["article"]), None)
    q = next((x for i, x in enumerate(a["quiz"]) if i == int(body["q_idx"])), None)
    res = grader.grade_open_pl(str(body["answer"]), q["keywords"])
    correct = res["score"] >= 0.6
    prof = storage.load_profile(who["username"])
    xp = round(8 * res["score"])
    sk.register_activity(prof, correct, xp)
    prof["skills"]["grammar"] = sk.update_skill(prof["skills"]["grammar"], a["level"], correct, body.get("rt"))
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "knowledge_check", "article": a["id"],
                                        "question": q["q"], "your": str(body["answer"])[:300],
                                        "correct_answer": q["model"], "score": res["score"],
                                        "correct": correct, "xp": xp})
    return {"score": res["score"], "correct": correct, "msg": res["msg"],
            "model": q["model"], "xp": xp}


# ---------------------------------------------------------------- tłumaczenia
@app.get("/api/translate/next")
async def translate_next(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    items = merged_items("tlumaczenia/")
    lvl = LEVEL_ORDER.get(prof.get("level") or "A1", 0)
    # gating: dziedzina odblokowana od 25% poznanych słówek
    cards = load_cards(who["username"])
    pool_v = vocab_pool(prof)
    unlocked = {"general"}
    for dom in prof.get("domains", []):
        dom_items = [it for it in pool_v if it["deck"] == dom]
        if dom_items:
            kr = sum(1 for it in dom_items if it["id"] in cards) / len(dom_items)
            if kr >= 0.25:
                unlocked.add(dom)
    pool = [i for i in items if abs(LEVEL_ORDER.get(i["level"], 0) - lvl) <= 1
            and i.get("domain", "general") in unlocked]
    if not pool:
        pool = [i for i in items if i.get("domain", "general") == "general"] or items
    done = storage.user_file(who["username"], "translate_done.json", [])
    fresh = [i for i in pool if i["id"] not in done] or pool
    it = random.choice(fresh)
    locked = [d for d in prof.get("domains", []) if d not in unlocked]
    return {"id": it["id"], "pl": it["pl"], "level": it["level"],
            "tense_name": it.get("tense_name", ""),
            "locked_domains": locked}


@app.post("/api/translate/check")
async def translate_check(request: Request):
    who = current_user(request)
    body = await request.json()
    it = next((x for x in merged_items("tlumaczenia/") if x["id"] == body["id"]), None)
    if not it:
        raise HTTPException(404, "Brak zadania.")
    res = grader.grade_translation(body["answer"], it)
    prof = storage.load_profile(who["username"])
    correct = res["score"] >= grader.PASS
    res["state"], res["label"] = grader.verdict(res["score"])
    prof["skills"]["writing"] = sk.update_skill(
        prof["skills"]["writing"], it["level"], correct, body.get("rt"))
    xp = round(10 * res["score"])
    sk.register_activity(prof, correct, xp)
    storage.save_profile(who["username"], prof)
    done = storage.user_file(who["username"], "translate_done.json", [])
    if it["id"] not in done:
        done.append(it["id"])
        storage.save_user_file(who["username"], "translate_done.json", done)
    for e in res["errors"]:
        add_error(who["username"], "trans_" + e["type"], body["answer"][:80])
    storage.log_event(who["username"], {"type": "translate", "item": it["id"],
                                        "question": it["pl"], "answer": body["answer"],
                                        "your": body["answer"], "correct_answer": res["ref"],
                                        "score": res["score"], "correct": correct,
                                        "tense_ok": res["tense_ok"], "xp": xp})
    return {"result": res, "xp": xp}


# ---------------------------------------------------------------- słuchanie
@app.get("/api/listen/next")
async def listen_next(request: Request):
    who = guard_module(request, "listening")
    prof = storage.load_profile(who["username"])
    mode = random.choice(["en", "en", "pl"])   # 2/3 dyktando EN, 1/3 PL->EN
    plc = storage.load_data("testy/poziomujacy.json", {})
    lvl = LEVEL_ORDER.get(prof.get("level") or "A1", 0)
    if mode == "en":
        items = merged_items("sluchanie/") + plc.get("listening", [])
        pool = [i for i in items if abs(LEVEL_ORDER.get(i["level"], 0) - lvl) <= 1] or items
        it = random.choice(pool)
        return {"mode": "en", "id": it["id"], "tts": it["en"], "level": it["level"],
                "pl": it.get("pl", "")}
    items = plc.get("listening_pl", [])
    pool = [i for i in items if abs(LEVEL_ORDER.get(i["level"], 0) - lvl) <= 1] or items
    it = random.choice(pool)
    return {"mode": "pl", "id": it["id"], "tts_pl": it["pl"], "level": it["level"]}


@app.post("/api/listen/check")
async def listen_check(request: Request):
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    plc = storage.load_data("testy/poziomujacy.json", {})
    if body.get("mode") == "pl":
        it = next((x for x in plc.get("listening_pl", []) if x["id"] == body["id"]), None)
        res = grader.grade_translation(body["answer"], it)
        target, pl_txt = it["en_ref"], it["pl"]
        score = res["score"]
        out = {"kind": "translate", "detail": res}
    else:
        items = merged_items("sluchanie/") + plc.get("listening", [])
        it = next((x for x in items if x["id"] == body["id"]), None)
        res = grader.grade_dictation(body["answer"], it["en"])
        target, pl_txt = it["en"], it.get("pl", "")
        score = res["score"]
        out = {"kind": "dictation", "detail": res}
    # Dyktando: zaliczamy tylko komplet słów — jedno błędne słowo to błąd.
    # (Wcześniej próg 70% przepuszczał "way" zamiast "wear".)
    if out["kind"] == "dictation":
        correct = not res.get("wrong")
    else:
        correct = score >= 0.7
    prof["skills"]["listening"] = sk.update_skill(
        prof["skills"]["listening"], it["level"], correct, body.get("rt"))
    xp = round(8 * score)
    sk.register_activity(prof, correct, xp)
    storage.save_profile(who["username"], prof)
    if not correct:
        add_error(who["username"], "listening", body["answer"][:80])
    storage.log_event(who["username"], {"type": "dictation", "item": it["id"],
                                        "mode": body.get("mode", "en"),
                                        "question": pl_txt or target,
                                        "your": body["answer"], "correct_answer": target,
                                        "answer": body["answer"], "score": score,
                                        "correct": correct, "xp": xp})
    out.update({"score": score, "target": target, "pl": pl_txt, "xp": xp, "correct": correct})
    return out


# ---------------------------------------------------------------- gra: pary
# ---------------------------------------------------------------- GRY
GAME_IDS = ("pairs", "rain")
GAME_RANKS = [(0, "Nowicjusz"), (300, "Uczeń"), (900, "Bywalec"), (2000, "Znawca"),
              (4000, "Mistrz"), (8000, "Legenda")]


def _game_rank(points):
    name = GAME_RANKS[0][1]
    for need, label in GAME_RANKS:
        if points >= need:
            name = label
    return name


@app.get("/api/game/themes")
async def game_themes(request: Request):
    """Kategorie do wyboru w grach + ile słówek każda zawiera."""
    who = guard_module(request, "games")
    prof = storage.load_profile(who["username"])
    pool = vocab_pool(prof)
    agg = {}
    for it in pool:
        t = it.get("theme", "inne")
        agg[t] = agg.get(t, 0) + 1
    out = [{"theme": t, "name": THEME_NAMES.get(t, t.title()), "total": n}
           for t, n in agg.items()]
    out.sort(key=lambda x: -x["total"])
    return {"themes": out, "total": len(pool)}


@app.post("/api/game/words")
async def game_words(request: Request):
    """Słówka do gry: wybrane kategorie, po ile z każdej ('all' = wszystkie)."""
    who = current_user(request)
    body = await request.json()
    prof = storage.load_profile(who["username"])
    pool = vocab_pool(prof)
    picks = body.get("picks") or {}          # {"praca": 10, "dom": "all"}
    all_count = body.get("all_count")        # tryb "wszystkie kategorie": ile łącznie
    words = []
    if all_count is not None:                # cała baza, liczba wskazana przez gracza
        items = pool[:]
        random.shuffle(items)
        if all_count != "all":
            try:
                items = items[:max(2, int(all_count))]
            except (TypeError, ValueError):
                items = items[:30]
        words = items
    else:
        for theme, count in picks.items():
            items = [it for it in pool if it.get("theme", "inne") == theme]
            random.shuffle(items)
            if count != "all":
                try:
                    items = items[:max(1, int(count))]
                except (TypeError, ValueError):
                    items = items[:10]
            words += items
    if not words:                            # nic nie wybrano -> losowo z całości
        words = random.sample(pool, min(30, len(pool)))
    # deduplikacja po angielskim haśle (gra z parami nie znosi duplikatów)
    seen, uniq = set(), []
    for it in words:
        k = it["en"].lower()
        if k not in seen:
            seen.add(k)
            uniq.append({"id": it["id"], "en": it["en"],
                         "pl": it["pl"].split("/")[0].strip(),
                         "theme": it.get("theme", "inne")})
    random.shuffle(uniq)
    return {"words": uniq, "count": len(uniq)}


@app.post("/api/game/score")
async def game_score(request: Request):
    """Zapis wyniku gry: punkty, najdłuższa seria, ranga."""
    who = current_user(request)
    body = await request.json()
    game = body.get("game")
    if game not in GAME_IDS:
        raise HTTPException(400, "Nieznana gra.")
    st = storage.user_file(who["username"], "games.json", {})
    g = st.setdefault(game, {"points": 0, "best_score": 0, "best_streak": 0,
                             "plays": 0, "correct": 0, "wrong": 0})
    pts = max(0, int(body.get("points", 0)))
    g["points"] += pts
    g["plays"] += 1
    g["correct"] += int(body.get("correct", 0))
    g["wrong"] += int(body.get("wrong", 0))
    g["best_score"] = max(g["best_score"], pts)
    g["best_streak"] = max(g["best_streak"], int(body.get("streak", 0)))
    g["last"] = datetime.datetime.now().isoformat(timespec="seconds")
    storage.save_user_file(who["username"], "games.json", st)

    prof = storage.load_profile(who["username"])
    xp = min(40, pts // 10)
    sk.register_activity(prof, True, xp)
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "game_played", "game": game,
                                        "points": pts, "correct": body.get("correct", 0),
                                        "wrong": body.get("wrong", 0),
                                        "streak": body.get("streak", 0)})
    return {"ok": True, "total": g["points"], "rank": _game_rank(g["points"]),
            "best_score": g["best_score"], "best_streak": g["best_streak"], "xp": xp}


@app.get("/api/game/stats")
async def game_stats(request: Request):
    who = current_user(request)
    st = storage.user_file(who["username"], "games.json", {})
    out = {}
    for gid in GAME_IDS:
        g = st.get(gid, {"points": 0, "best_score": 0, "best_streak": 0,
                         "plays": 0, "correct": 0, "wrong": 0})
        acc = round(100 * g["correct"] / max(1, g["correct"] + g["wrong"]))
        out[gid] = {**g, "rank": _game_rank(g["points"]), "accuracy": acc}
    return {"games": out}


# ---------------------------------------------------------------- programy
@app.get("/api/programs")
async def my_programs(request: Request):
    who = current_user(request)
    return {"programs": storage.user_file(who["username"], "programs.json", [])}


@app.post("/api/program/answer")
async def program_answer(request: Request):
    who = current_user(request)
    body = await request.json()
    progs = storage.user_file(who["username"], "programs.json", [])
    prog = next((p for p in progs if p["id"] == body["program"]), None)
    task = next((t for t in prog["tasks"] if t["id"] == body["task"]), None)
    ans = str(body["answer"]).strip().lower()
    detail = None
    if task["type"] == "choice":
        correct = int(body["answer"]) == task["answer"]
        good = task["options"][task["answer"]]
    elif task["type"] == "translate":
        res = grader.grade_translation(body["answer"], task)
        correct, good, detail = res["score"] >= 0.7, res["ref"], res
    elif task["type"] == "dictation":
        res = grader.grade_dictation(body["answer"], task["en"])
        correct, good, detail = res["score"] >= 0.75, task["en"], res
    else:
        accepted = [a.lower() for a in task.get("accept", [])]
        correct = ans in accepted
        good = accepted[0] if accepted else ""
    task.setdefault("attempts", []).append({"answer": body["answer"], "correct": correct,
                                            "ts": time.time()})
    task["done"] = True
    task["last_correct"] = correct
    storage.save_user_file(who["username"], "programs.json", progs)
    prof = storage.load_profile(who["username"])
    xp = 6 if correct else 1
    sk.register_activity(prof, correct, xp)
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "program_answer", "program": prog["id"],
                                        "task": task["id"],
                                        "question": task.get("text", task.get("pl", task.get("en", ""))),
                                        "your": str(body["answer"]), "correct_answer": good,
                                        "answer": body["answer"], "correct": correct, "xp": xp})
    return {"correct": correct, "answer": good, "pl": task.get("pl", ""),
            "explain": task.get("explain", ""), "detail": detail, "xp": xp}


# ---------------------------------------------------------------- eksport
@app.get("/api/export")
async def export_own(request: Request, fmt: str = "json", days: int = 0):
    who = current_user(request)
    return _export(who["username"], fmt, days or None)


def _export(username, fmt, days):
    events = storage.read_events(username, days)
    stamp = datetime.date.today().isoformat()
    if fmt == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["dzień", "godzina", "typ", "pytanie", "odpowiedź ucznia",
                    "poprawna odpowiedź", "poprawne", "xp", "rt_ms"])
        for e in events:
            w.writerow([e.get("day"), e.get("time"), e.get("type"),
                        str(e.get("question", ""))[:160],
                        str(e.get("your", e.get("answer", e.get("rating", ""))))[:120],
                        str(e.get("correct_answer", ""))[:120],
                        e.get("correct", ""), e.get("xp", ""), e.get("rt", "")])
        buf.seek(0)
        return StreamingResponse(iter([buf.getvalue().encode("utf-8-sig")]),
                                 media_type="text/csv",
                                 headers={"Content-Disposition":
                                          f"attachment; filename={username}_sesje_{stamp}.csv"})
    payload = json.dumps({"user": username, "exported": stamp, "events": events},
                         ensure_ascii=False, indent=1)
    return StreamingResponse(iter([payload.encode("utf-8")]),
                             media_type="application/json",
                             headers={"Content-Disposition":
                                      f"attachment; filename={username}_sesje_{stamp}.json"})


# ---------------------------------------------------------------- nauczyciel
@app.get("/api/teacher/students")
async def teacher_students(request: Request):
    require_teacher(request)
    out = []
    for acc in storage.list_accounts():
        if acc["role"] == "teacher":
            continue
        prof = storage.load_profile(acc["username"])
        out.append({"username": prof["username"], "level": prof.get("level"),
                    "target": prof.get("target_level"), "xp": prof.get("xp", 0),
                    "streak": prof.get("streak", 0),
                    "last_active": prof.get("last_active_day"),
                    "placement_done": prof.get("placement_done", False)})
    return {"students": out}


@app.get("/api/teacher/student/{username}")
async def teacher_student(username: str, request: Request):
    require_teacher(request)
    prof = storage.load_profile(username)
    if not prof:
        raise HTTPException(404, "Brak ucznia.")
    cards = load_cards(username)
    errors = storage.user_file(username, "errors.json", {})
    leeches = []
    pool = {it["id"]: it for it in vocab_pool(prof)}
    for cid, c in cards.items():
        if fsrs.is_leech(c["fsrs"]) and cid in pool:
            leeches.append({"en": pool[cid]["en"], "pl": pool[cid]["pl"],
                            "lapses": c["fsrs"]["lapses"]})
    lessons_state = storage.user_file(username, "lessons.json", {})
    return {"profile": {k: prof.get(k) for k in ("username", "level", "target_level",
                                                  "domains", "xp", "streak", "daily")},
            "skills": prof["skills"], "cefr": sk.cefr_profile(prof["skills"]),
            "errors": errors, "leeches": leeches,
            "cards_total": len(cards),
            "mature": sum(1 for c in cards.values() if fsrs.is_mature(c["fsrs"])),
            "lessons": lessons_state.get("summary"),
            "exams": lessons_state.get("exams", {}),
            "programs": storage.user_file(username, "programs.json", [])}


ANSWER_TYPES = ("card_review", "grammar_answer", "translate", "dictation",
                "placement_answer", "program_answer", "verb_review",
                "lesson_answer", "lesson_exam", "knowledge_check", "path_answer", "dialog_write",
                "reading_done", "writing_check")


@app.get("/api/teacher/worksheets/{username}")
async def teacher_worksheets(username: str, request: Request):
    """Lista 'prac' ucznia: dni z liczbą odpowiedzi wg typu."""
    require_teacher(request)
    events = storage.read_events(username)
    days = {}
    for e in events:
        if e.get("type") in ANSWER_TYPES or e.get("type") in ("placement_done",):
            d = days.setdefault(e["day"], {"total": 0, "correct": 0, "types": {},
                                           "placement": False, "exam": False})
            if e["type"] == "placement_done":
                d["placement"] = True
                continue
            if e["type"] == "lesson_exam":
                d["exam"] = True
            d["total"] += 1
            ok = e.get("correct")
            if ok is None and e.get("score") is not None:
                ok = e["score"] >= 0.7
            if ok is None and e.get("rating") is not None:
                ok = e["rating"] >= 3
            d["correct"] += 1 if ok else 0
            d["types"][e["type"]] = d["types"].get(e["type"], 0) + 1
    return {"days": [{"day": k, **v} for k, v in sorted(days.items(), reverse=True)]}


@app.get("/api/teacher/worksheet/{username}/{day}")
async def teacher_worksheet(username: str, day: str, request: Request):
    """Pełny arkusz dnia: każde pytanie + odpowiedź ucznia + poprawna."""
    require_teacher(request)
    events = [e for e in storage.read_events(username) if e.get("day") == day]
    rows = []
    for e in events:
        t = e.get("type")
        if t not in ANSWER_TYPES:
            continue
        if t == "lesson_exam":
            for r in e.get("results", []):
                rows.append({"time": e.get("time"), "type": "sprawdzian",
                             "question": r["question"], "your": r["your"],
                             "good": r["answer"], "correct": r["correct"],
                             "extra": f"wynik {e.get('pct')}% (ocena {e.get('grade')})"})
            continue
        ok = e.get("correct")
        if ok is None and e.get("score") is not None:
            ok = e["score"] >= 0.7
        if ok is None and e.get("rating") is not None:
            ok = e["rating"] >= 3
        rows.append({"time": e.get("time"), "type": t,
                     "question": str(e.get("question", e.get("en", e.get("q", ""))))[:200],
                     "your": str(e.get("your", e.get("answer", e.get("rating", ""))))[:160],
                     "good": str(e.get("correct_answer", ""))[:160],
                     "correct": ok,
                     "extra": (f"rt {e.get('rt')}ms" if e.get("rt") else "") +
                              (" · zgadywał" if e.get("guessed") else "")})
    return {"day": day, "rows": rows}


@app.get("/api/teacher/bank")
async def teacher_bank(request: Request):
    """Bank gotowych zadań do kreatora programów."""
    require_teacher(request)
    bank = []
    for f in storage.list_data_files("slownictwo/"):
        data = storage.load_data(f, {})
        if data.get("items") and "pl" not in data["items"][0]:
            continue
        for it in data.get("items", []):
            bank.append({"kind": "vocab", "level": it.get("level", data.get("level", "A1")),
                         "domain": data.get("domain", "general"),
                         "label": f"{it['en']} — {it['pl']}",
                         "task": {"type": "vocab", "en": it["en"], "pl": it["pl"],
                                  "example": it.get("example", ""), "hint": it.get("hint", "")}})
    for t in merged_topics():
        for e in t["exercises"]:
            task = dict(e)
            task["type"] = "choice" if e["type"] == "choice" else "gap"
            if e["type"] == "order":
                task["text"] = e.get("text", "") + " (" + " / ".join(e.get("words", [])) + ")"
                task["type"] = "gap"
            bank.append({"kind": "grammar", "level": t["level"], "domain": "general",
                         "label": f"[{t['name']}] {e.get('text','')[:70]}",
                         "task": task})
    for it in merged_items("tlumaczenia/"):
        bank.append({"kind": "translate", "level": it["level"],
                     "domain": it.get("domain", "general"),
                     "label": f"PL→EN: {it['pl'][:70]}",
                     "task": {"type": "translate", **{k: it[k] for k in
                              ("pl", "en_ref", "keywords", "tense_name", "tense_patterns")
                              if k in it}, "forbidden": it.get("forbidden", [])}})
    for it in merged_items("sluchanie/"):
        bank.append({"kind": "dictation", "level": it["level"], "domain": "general",
                     "label": f"🎧 {it['en'][:70]}",
                     "task": {"type": "dictation", "en": it["en"], "pl": it.get("pl", "")}})
    return {"bank": bank, "total": len(bank)}


@app.post("/api/teacher/program")
async def teacher_program(request: Request):
    who = require_teacher(request)
    body = await request.json()
    student = body["student"]
    if not storage.account_exists(student):
        raise HTTPException(404, "Brak ucznia.")
    progs = storage.user_file(student, "programs.json", [])
    pid = "prog_" + str(int(time.time()))
    tasks = []
    for i, t in enumerate(body.get("tasks", [])):
        t = dict(t)
        t["id"] = f"{pid}_t{i}"
        t["done"] = False
        if t["type"] == "vocab":
            custom = storage.user_file(student, "custom_cards.json", [])
            custom.append({"id": f"tch_{pid}_{i}", "en": t["en"], "pl": t["pl"],
                           "example": t.get("example", ""), "hint": t.get("hint", ""),
                           "level": t.get("level", "A1"), "rank": 0, "from_teacher": True})
            storage.save_user_file(student, "custom_cards.json", custom)
        tasks.append(t)
    progs.append({"id": pid, "title": body.get("title", "Program nauki"),
                  "note": body.get("note", ""), "deadline": body.get("deadline", ""),
                  "by": who["username"],
                  "created": datetime.date.today().isoformat(), "tasks": tasks})
    storage.save_user_file(student, "programs.json", progs)
    storage.log_event(student, {"type": "program_assigned", "by": who["username"],
                                "program": pid, "n_tasks": len(tasks)})
    return {"ok": True, "id": pid}


@app.get("/api/teacher/export/{username}")
async def teacher_export(username: str, request: Request, fmt: str = "csv"):
    require_teacher(request)
    return _export(username, fmt, None)


# ---------------------------------------------------------------- PRZEGLĄD TREŚCI (ADMIN)
REVIEW_KINDS = [
    {"id": "question", "name": "Treść pytania / polecenia"},
    {"id": "good",     "name": "Poprawna odpowiedź"},
    {"id": "bad",      "name": "Odpowiedź błędna / komunikat"},
]

REVIEW_SECTIONS = [
    {"id": "vocab",     "name": "Fiszki — słownictwo", "emoji": "🃏"},
    {"id": "verbs",     "name": "Czasowniki (formy)",  "emoji": "⚙️"},
    {"id": "grammar",   "name": "Gramatyka — ćwiczenia", "emoji": "📐"},
    {"id": "placement", "name": "Test poziomujący",    "emoji": "🎯"},
    {"id": "translate", "name": "Tłumaczenia",         "emoji": "🌐"},
    {"id": "listening", "name": "Słuchanie / dyktanda", "emoji": "🎧"},
    {"id": "reading",   "name": "Czytanie — pytania",  "emoji": "📖"},
    {"id": "dialogs",   "name": "Rozmowy",             "emoji": "💬"},
    {"id": "knowledge", "name": "Baza wiedzy",         "emoji": "📚"},
]


def _review_items(section, username=None):
    """Ujednolicona lista pozycji danego działu: pytanie + obie odpowiedzi."""
    out = []
    if section == "vocab":
        # pełna baza słownictwa, niezależnie od dziedzin profilu
        prof = {"username": username or "", "domains": ["general", "warehouse", "work"]}
        for it in vocab_pool(prof):
            out.append({
                "id": it["id"],
                "title": f"[{it.get('nr','')}] {it['en']}",
                "question": f"PL→EN: „{it['pl']}”   ·   EN→PL: „{it['en']}”",
                "good": it["en"] + "  /  " + it["pl"],
                "bad": f"Poprawnie: {it['en']} = {it['pl']}",
                "extra": " · ".join(x for x in [it.get("hint", ""), it.get("example", "")] if x),
                "meta": f"kategoria: {it.get('theme','—')} · poziom {it.get('level','—')}",
            })
    elif section == "verbs":
        for v in storage.load_data("slownictwo/czasowniki_odmiana.json", {}).get("items", []):
            out.append({
                "id": v["id"],
                "title": f"[{v.get('nr','')}] {v['en']}",
                "question": f"Uzupełnij formy: {v['en']} → ? → ?   (znaczenie: {v['pl_inf']})",
                "good": f"{v['en']} → {v['past']} → {v['perf']}",
                "bad": f"Poprawnie: {v['en']} → {v['past']} → {v['perf']} = {v['pl_inf']}",
                "extra": v.get("example", ""),
                "meta": "nieregularny" if v["past"].lower() != v["en"].lower() + "ed" else "regularny",
            })
    elif section == "grammar":
        for t in merged_topics():
            for e in t.get("exercises", []):
                ans = (e["options"][e["answer"]] if e.get("type") == "choice"
                       else (e.get("accept") or ["—"])[0])
                out.append({
                    "id": f"{t['id']}:{e.get('id', e.get('nr',''))}",
                    "title": f"{t['name']} [{e.get('nr','')}]",
                    "question": e.get("text", ""),
                    "good": str(ans),
                    "bad": f"Poprawnie: {ans}" + (f" — {e.get('explain','')}" if e.get("explain") else ""),
                    "extra": " · ".join(x for x in [e.get("pl", ""), e.get("explain", "")] if x),
                    "meta": f"temat: {t['id']} · poziom {t.get('level','—')}"
                            + (f" · opcje: {', '.join(e['options'])}" if e.get("options") else ""),
                })
    elif section == "placement":
        p = storage.load_data("testy/poziomujacy.json", {})
        for key, label in [("grammar", "gramatyka"), ("vocab", "słownictwo"),
                           ("vocab_produce", "słownictwo — pisanie"),
                           ("translation", "tłumaczenie"), ("listening", "słuchanie"),
                           ("listening_pl", "słuchanie PL→EN")]:
            for i, q in enumerate(p.get(key, []), 1):
                good = (q["options"][q["answer"]] if q.get("options") is not None and "answer" in q
                        else q.get("en_ref") or q.get("en") or (q.get("accept") or ["—"])[0])
                out.append({
                    "id": f"{key}:{i}",
                    "title": f"{label} [{i}]",
                    "question": q.get("text") or q.get("pl") or q.get("en") or "",
                    "good": str(good),
                    "bad": f"Poprawnie: {good}",
                    "extra": q.get("explain", "") or q.get("pl", ""),
                    "meta": f"grupa: {label} · poziom {q.get('level','—')}"
                            + (f" · opcje: {', '.join(q['options'])}" if q.get("options") else ""),
                })
    elif section == "translate":
        for it in merged_items("tlumaczenia/"):
            out.append({
                "id": it.get("id") or f"tr{it.get('nr','')}",
                "title": f"[{it.get('nr','')}] {it.get('tense_name','')}",
                "question": f"Przetłumacz: „{it['pl']}”",
                "good": it.get("en_ref", ""),
                "bad": f"Wzorzec: {it.get('en_ref','')}",
                "extra": "słowa kluczowe: " + "; ".join("/".join(g) for g in it.get("keywords", [])),
                "meta": f"poziom {it.get('level','—')}",
            })
    elif section == "listening":
        p = storage.load_data("testy/poziomujacy.json", {})
        items = merged_items("sluchanie/") + p.get("listening", [])
        for i, it in enumerate(items, 1):
            en = it.get("en") or it.get("tts") or ""
            out.append({
                "id": it.get("id") or f"ls{i}",
                "title": f"dyktando [{i}]",
                "question": f"Lektor czyta: „{en}”",
                "good": en,
                "bad": f"Poprawnie: {en}",
                "extra": it.get("pl", ""),
                "meta": f"poziom {it.get('level','—')}",
            })
    elif section == "reading":
        for t in _reading_texts():
            for i, q in enumerate(t.get("questions", []), 1):
                opts = q.get("options", [])
                good = opts[q["answer"]] if opts else ""
                out.append({
                    "id": f"{t['id']}:{i}",
                    "title": f"{t['title']} [{i}]",
                    "question": q.get("text", ""),
                    "good": good,
                    "bad": f"Poprawnie: {good}" + (f" — {q.get('pl','')}" if q.get("pl") else ""),
                    "extra": " · ".join(opts),
                    "meta": f"tekst: {t['id']} · poziom {t.get('level','—')}",
                })
    elif section == "dialogs":
        for f in storage.list_data_files("rozmowy/"):
            for d in storage.load_data(f, {}).get("dialogs", []):
                for n in d.get("nodes", []):
                    if n.get("mode") == "choice":
                        good = "; ".join(o["en"] for o in n.get("options", []) if o.get("good"))
                        bad = " | ".join(f"{o['en']} → {o.get('feedback','')}"
                                         for o in n.get("options", []) if not o.get("good"))
                    else:
                        good = n.get("write", {}).get("model", "")
                        bad = "wzorzec: " + good
                    out.append({
                        "id": f"{d['id']}:{n['id']}",
                        "title": f"{d['name']} · {n['id']}",
                        "question": f"{n.get('npc_en','')}  ({n.get('npc_pl','')})",
                        "good": good, "bad": bad,
                        "extra": n.get("hint", ""),
                        "meta": f"rozmowa: {d['id']} · poziom {d.get('level','—')}",
                    })
    elif section == "knowledge":
        for a in _kb()["articles"]:
            for i, q in enumerate(a.get("quiz", []), 1):
                out.append({
                    "id": f"{a['id']}:{i}",
                    "title": f"{a['name']} [{i}]",
                    "question": q.get("q", ""),
                    "good": q.get("model", ""),
                    "bad": "Wzorzec: " + q.get("model", ""),
                    "extra": "wymagane słowa: " + "; ".join("/".join(g) for g in q.get("keywords", [])),
                    "meta": f"artykuł: {a['id']} · poziom {a.get('level','—')}",
                })
    return out


@app.get("/api/review/sections")
async def review_sections(request: Request):
    require_admin_role(request)
    who = current_user(request)
    notes = storage.user_file(who["username"], "review_notes.json", {})
    out = []
    for s in REVIEW_SECTIONS:
        out.append({**s, "count": len(_review_items(s["id"], who["username"])),
                    "notes": len(notes.get(s["id"], []))})
    return {"sections": out, "kinds": REVIEW_KINDS,
            "notes_total": sum(len(v) for v in notes.values())}


@app.get("/api/review/items")
async def review_items(request: Request, section: str, offset: int = 0, limit: int = 1):
    require_admin_role(request)
    who = current_user(request)
    items = _review_items(section, who["username"])
    notes = storage.user_file(who["username"], "review_notes.json", {}).get(section, [])
    flagged = {n["item_id"] for n in notes}
    sel = items[offset: offset + max(1, min(50, limit))]
    for it in sel:
        it["flagged"] = it["id"] in flagged
    return {"section": section, "total": len(items), "offset": offset, "items": sel}


@app.post("/api/review/note")
async def review_add_note(request: Request):
    """Oznaczenie pozycji jako 'do poprawy' wraz z notatką."""
    me = require_admin_role(request)
    body = await request.json()
    section = body.get("section")
    kind = body.get("kind")
    if kind not in [k["id"] for k in REVIEW_KINDS]:
        raise HTTPException(400, "Nieznany rodzaj uwagi.")
    notes = storage.user_file(me["username"], "review_notes.json", {})
    lst = notes.setdefault(section, [])
    entry = {"item_id": body.get("item_id"), "kind": kind,
             "note": (body.get("note") or "").strip(),
             "title": body.get("title", ""), "question": body.get("question", ""),
             "good": body.get("good", ""), "bad": body.get("bad", ""),
             "meta": body.get("meta", ""),
             "date": datetime.datetime.now().isoformat(timespec="seconds")}
    lst = [n for n in lst if not (n["item_id"] == entry["item_id"] and n["kind"] == kind)]
    lst.append(entry)
    notes[section] = lst
    storage.save_user_file(me["username"], "review_notes.json", notes)
    return {"ok": True, "count": len(lst)}


@app.get("/api/review/notes")
async def review_notes(request: Request):
    me = require_admin_role(request)
    notes = storage.user_file(me["username"], "review_notes.json", {})
    names = {s["id"]: s for s in REVIEW_SECTIONS}
    kinds = {k["id"]: k["name"] for k in REVIEW_KINDS}
    out = []
    for sec, lst in notes.items():
        for n in lst:
            out.append({**n, "section": sec,
                        "section_name": names.get(sec, {}).get("name", sec),
                        "emoji": names.get(sec, {}).get("emoji", "•"),
                        "kind_name": kinds.get(n["kind"], n["kind"])})
    out.sort(key=lambda x: x["date"], reverse=True)
    return {"notes": out, "total": len(out),
            "by_section": {s: len(v) for s, v in notes.items() if v}}


@app.post("/api/review/notes/delete")
async def review_delete_note(request: Request):
    me = require_admin_role(request)
    body = await request.json()
    notes = storage.user_file(me["username"], "review_notes.json", {})
    sec = body.get("section")
    if sec in notes:
        notes[sec] = [n for n in notes[sec]
                      if not (n["item_id"] == body.get("item_id") and n["kind"] == body.get("kind"))]
        storage.save_user_file(me["username"], "review_notes.json", notes)
    return {"ok": True}


@app.post("/api/review/notes/reset")
async def review_reset_notes(request: Request):
    """Kasowanie notatek: wszystkich albo z jednego działu."""
    me = require_admin_role(request)
    body = await request.json()
    notes = storage.user_file(me["username"], "review_notes.json", {})
    sec = body.get("section")
    if sec and sec != "all":
        removed = len(notes.get(sec, []))
        notes[sec] = []
    else:
        removed = sum(len(v) for v in notes.values())
        notes = {}
    storage.save_user_file(me["username"], "review_notes.json", notes)
    storage.log_event(me["username"], {"type": "review_notes_reset", "section": sec or "all"})
    return {"ok": True, "removed": removed}


@app.get("/api/review/notes/pdf")
async def review_notes_pdf(request: Request):
    """Notatki administratora w PDF (z zapasowym HTML, gdy brak reportlab)."""
    me = require_admin_role(request)
    data = (await review_notes(request))["notes"]
    stamp = datetime.date.today().isoformat()
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        fd = "/usr/share/fonts/truetype/dejavu"
        if os.path.exists(fd):
            pdfmetrics.registerFont(TTFont("DV", os.path.join(fd, "DejaVuSans.ttf")))
            pdfmetrics.registerFont(TTFont("DVB", os.path.join(fd, "DejaVuSans-Bold.ttf")))
            base, bold = "DV", "DVB"
        else:
            base, bold = "Helvetica", "Helvetica-Bold"
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                                topMargin=15 * mm, bottomMargin=15 * mm)
        S = getSampleStyleSheet()
        h1 = ParagraphStyle("h1", parent=S["Title"], fontName=bold, fontSize=20,
                            textColor=HexColor("#e8590c"), alignment=0)
        body = ParagraphStyle("b", parent=S["Normal"], fontName=base, fontSize=9.5, leading=13)
        small = ParagraphStyle("s", parent=body, fontSize=8.5, textColor=HexColor("#5c6672"))
        hd = ParagraphStyle("h", parent=body, fontName=bold, fontSize=11,
                            textColor=HexColor("#4c5fd5"), spaceBefore=10)

        def esc(t):
            return str(t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        story = [Paragraph("Notatki administratora — LinguaForge", h1),
                 Paragraph(f"{stamp} · pozycji do poprawy: {len(data)}", small), Spacer(1, 10)]
        cur = None
        for n in sorted(data, key=lambda x: (x["section_name"], x["title"])):
            if n["section_name"] != cur:
                cur = n["section_name"]
                story.append(Paragraph(f"{n['emoji']} {cur}", hd))
            rows = [
                [Paragraph("<b>Pozycja</b>", small), Paragraph(esc(n["title"]), body)],
                [Paragraph("<b>Uwaga do</b>", small), Paragraph(esc(n["kind_name"]), body)],
                [Paragraph("<b>Treść</b>", small), Paragraph(esc(n["question"]), body)],
                [Paragraph("<b>Poprawna</b>", small), Paragraph(esc(n["good"]), body)],
                [Paragraph("<b>Przy błędzie</b>", small), Paragraph(esc(n["bad"]), body)],
                [Paragraph("<b>NOTATKA</b>", small),
                 Paragraph(f"<b>{esc(n['note'])}</b>", body)],
            ]
            if n.get("meta"):
                rows.append([Paragraph("<b>Skąd</b>", small), Paragraph(esc(n["meta"]), small)])
            t = Table(rows, colWidths=[26 * mm, 152 * mm])
            t.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#dde5ec")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 5), (-1, 5), HexColor("#fff9db")),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story += [t, Spacer(1, 7)]
        if not data:
            story.append(Paragraph("Brak zaznaczonych pozycji.", body))
        doc.build(story)
        buf.seek(0)
        return StreamingResponse(iter([buf.getvalue()]), media_type="application/pdf",
                                 headers={"Content-Disposition":
                                          f"attachment; filename=notatki_admina_{stamp}.pdf"})
    except Exception:
        rows = []
        for n in data:
            rows.append(f"<h3>{n['emoji']} {n['section_name']} — {n['title']}</h3>"
                        f"<p><b>Uwaga do:</b> {n['kind_name']}</p>"
                        f"<p><b>Treść:</b> {n['question']}</p>"
                        f"<p><b>Poprawna:</b> {n['good']}</p>"
                        f"<p><b>Przy błędzie:</b> {n['bad']}</p>"
                        f"<p style='background:#fff9db;padding:6px'><b>NOTATKA:</b> {n['note']}</p><hr>")
        html = ("<!doctype html><meta charset='utf-8'><title>Notatki administratora</title>"
                "<body style=\"font-family:Arial;max-width:900px;margin:24px auto\">"
                f"<h1 style='color:#e8590c'>Notatki administratora</h1><p>{stamp} · {len(data)} pozycji</p>"
                + "".join(rows) + "</body>")
        return StreamingResponse(iter([html.encode("utf-8")]), media_type="text/html",
                                 headers={"Content-Disposition":
                                          f"attachment; filename=notatki_admina_{stamp}.html"})


# ---------------------------------------------------------------- kopia konta
ACCOUNT_FILES = ("profile.json", "cards.json", "verb_cards.json", "custom_cards.json",
                 "errors.json", "programs.json", "translate_done.json", "lessons.json",
                 "path.json", "dialogs.json", "reading.json", "writing.json")


@app.get("/api/account/backup")
async def account_backup(request: Request):
    """Pełna kopia postępów — do przeniesienia na inne urządzenie."""
    who = current_user(request)
    d = storage.account_dir(who["username"])
    data = {"app": "LinguaForge", "version": APP_VERSION, "username": who["username"],
            "date": datetime.datetime.now().isoformat(timespec="seconds"), "files": {}, "log": {}}
    for f in ACCOUNT_FILES:
        p = os.path.join(d, f)
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as fh:
                try:
                    data["files"][f] = json.load(fh)
                except json.JSONDecodeError:
                    pass
    logdir = os.path.join(d, "log")
    if os.path.isdir(logdir):
        for f in sorted(os.listdir(logdir))[-60:]:      # ostatnie 60 dni historii
            with open(os.path.join(logdir, f), encoding="utf-8") as fh:
                data["log"][f] = fh.read()
    payload = json.dumps(data, ensure_ascii=False, indent=1)
    stamp = datetime.date.today().isoformat()
    return StreamingResponse(iter([payload.encode("utf-8")]), media_type="application/json",
                             headers={"Content-Disposition":
                                      f"attachment; filename=LinguaForge_postepy_{who['username']}_{stamp}.json"})


@app.post("/api/account/restore")
async def account_restore(request: Request):
    """Wgranie kopii postępów (plik z drugiego urządzenia)."""
    who = current_user(request)
    body = await request.json()
    try:
        raw = base64.b64decode(body["data"].split(",")[-1]).decode("utf-8")
        data = json.loads(raw)
    except Exception:
        raise HTTPException(400, "Nie mogę odczytać pliku kopii.")
    if data.get("app") != "LinguaForge" or "files" not in data:
        raise HTTPException(400, "To nie jest plik kopii postępów LinguaForge.")
    d = storage.account_dir(who["username"])
    keep = storage.load_profile(who["username"])
    restored = []
    for f, content in data["files"].items():
        if f not in ACCOUNT_FILES:
            continue
        if f == "profile.json":                      # hasło zostaje z tego urządzenia
            content = dict(content)
            for k in ("salt", "pass", "username", "role", "admin"):
                if k in keep:
                    content[k] = keep[k]
        storage.save_json(os.path.join(d, f), content)
        restored.append(f)
    logdir = os.path.join(d, "log")
    os.makedirs(logdir, exist_ok=True)
    for f, content in (data.get("log") or {}).items():
        if "/" in f or ".." in f:
            continue
        with open(os.path.join(logdir, f), "w", encoding="utf-8") as fh:
            fh.write(content)
    storage.log_event(who["username"], {"type": "account_restored",
                                        "from": data.get("date"), "files": len(restored)})
    return {"ok": True, "files": len(restored), "from_device_date": data.get("date")}


def _seed_admin_account():
    """Zakłada konto administratora przy pierwszym uruchomieniu.

    Login: admin
    Hasło: wartość LF_ADMIN_PASSWORD albo domyślnie AdminAdministrator
    Jeśli konto już istnieje, tylko upewniamy się, że ma rolę administratora.
    """
    login = os.environ.get("LF_ADMIN_LOGIN", "admin").strip() or "admin"
    pwd = os.environ.get("LF_ADMIN_PASSWORD", "AdminAdministrator")
    try:
        if not storage.account_exists(login):
            auth.register(login, pwd)
            prof = storage.load_profile(login)
            prof["role"] = "admin"
            prof["admin"] = True
            prof["level"] = prof.get("level") or "B1"
            prof["placement_done"] = True
            storage.save_profile(login, prof)
            print(f"  [i] Utworzono konto administratora: {login}")
        else:
            prof = storage.load_profile(login)
            if prof.get("role") != "admin":
                prof["role"] = "admin"
                prof["admin"] = True
                storage.save_profile(login, prof)
    except Exception as e:
        print(f"  [!] Nie udało się przygotować konta administratora: {e}")


# ---------------------------------------------------------------- PODSTAWY (kurs)
def _basics():
    out = []
    for f in storage.list_data_files("podstawy/"):
        out += storage.load_data(f, {}).get("topics", [])
    return out


@app.get("/api/basics")
async def basics_list(request: Request):
    who = current_user(request)
    st = storage.user_file(who["username"], "basics.json", {})
    items = []
    for t in _basics():
        p = st.get(t["id"], {})
        items.append({"id": t["id"], "name": t["name"], "emoji": t["emoji"],
                      "order": t.get("order", 99),
                      "level": t["level"], "short": t.get("short", ""),
                      "pages": len(t.get("pages", [])),
                      "practice": len(t.get("practice", [])),
                      "test": len(t.get("test", [])),
                      "read": p.get("read", False),
                      "practice_pct": p.get("practice_pct"),
                      "test_pct": p.get("test_pct")})
    items.sort(key=lambda x: x["order"])
    return {"topics": items, "data_dir": storage.DATA_DIR,
            "files": storage.list_data_files("podstawy/")}


@app.get("/api/basics/{tid}")
async def basics_topic(tid: str, request: Request):
    current_user(request)
    t = next((x for x in _basics() if x["id"] == tid), None)
    if not t:
        raise HTTPException(404, "Brak tematu.")
    return t


@app.post("/api/basics/progress")
async def basics_progress(request: Request):
    """Zapis postępu: przeczytana teoria, wynik ćwiczeń, wynik testu."""
    who = current_user(request)
    body = await request.json()
    tid = body.get("topic")
    st = storage.user_file(who["username"], "basics.json", {})
    p = st.setdefault(tid, {})
    if body.get("read"):
        p["read"] = True
    for key in ("practice_pct", "test_pct"):
        if body.get(key) is not None:
            p[key] = max(p.get(key) or 0, int(body[key]))
    p["last"] = datetime.datetime.now().isoformat(timespec="seconds")
    storage.save_user_file(who["username"], "basics.json", st)

    prof = storage.load_profile(who["username"])
    xp = int(body.get("xp", 0))
    if xp:
        sk.register_activity(prof, True, min(40, xp))
        storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "basics_progress", "topic": tid,
                                        "kind": body.get("kind"),
                                        "pct": body.get("practice_pct") or body.get("test_pct")})
    return {"ok": True, "xp": min(40, xp)}


# ---------------------------------------------------------------- LEKTOR NA SERWERZE
# Część przeglądarek (zwłaszcza Chrome na Androidzie) ma zepsuty własny silnik mowy —
# zwraca listę głosów, ale synteza kończy się błędem synthesis-failed. Dlatego dźwięk
# generujemy na serwerze i odsyłamy jako zwykły plik MP3, który odtwarza się wszędzie.

TTS_CACHE_DIR = os.path.join(
    os.environ.get("LF_HOME", "").strip() or ROOT, "tts_cache")
TTS_ENGINE_USED = None          # który silnik ostatnio zadziałał


TTS_CACHE_MAX_MB = 120          # górny limit pamięci podręcznej nagrań


def _tts_cache_prune():
    """Kasuje najstarsze nagrania, gdy cache przekroczy limit.

    Bez tego katalog rósłby w nieskończoność i po miesiącach mógłby zapełnić dysk.
    """
    try:
        files = []
        total = 0
        for f in os.listdir(TTS_CACHE_DIR):
            p = os.path.join(TTS_CACHE_DIR, f)
            if os.path.isfile(p):
                st = os.stat(p)
                files.append((st.st_mtime, st.st_size, p))
                total += st.st_size
        limit = TTS_CACHE_MAX_MB * 1024 * 1024
        if total <= limit:
            return
        files.sort()                          # od najstarszych
        for _mtime, size, p in files:
            if total <= limit * 0.8:          # schodzimy do 80% limitu
                break
            try:
                os.remove(p)
                total -= size
            except OSError:
                pass
    except OSError:
        pass


def _tts_cache_path(text, lang, rate):
    import hashlib
    key = hashlib.sha256(f"{lang}|{rate}|{text}".encode("utf-8")).hexdigest()[:40]
    return os.path.join(TTS_CACHE_DIR, f"{lang}_{key}.mp3")


def _tts_edge(text, lang, rate):
    """Microsoft Edge TTS — dobra jakość, darmowy, bez klucza."""
    import asyncio
    import edge_tts
    voice = "en-GB-SoniaNeural" if lang == "en" else "pl-PL-ZofiaNeural"
    pct = int(round((float(rate) - 1.0) * 100))
    rate_str = f"{pct:+d}%"

    async def run():
        buf = b""
        comm = edge_tts.Communicate(text, voice, rate=rate_str)
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                buf += chunk["data"]
        return buf

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            return ex.submit(lambda: asyncio.run(run())).result(timeout=25)
    return asyncio.run(run())


def _tts_gtts(text, lang, rate):
    """Zapasowy silnik Google Translate (wolniejsze tempo przy rate < 0.8)."""
    from gtts import gTTS
    slow = float(rate) < 0.8
    buf = io.BytesIO()
    gTTS(text=text, lang=("pl" if lang == "pl" else "en"), slow=slow).write_to_fp(buf)
    return buf.getvalue()


def _tts_espeak(text, lang, rate):
    """Silnik offline (eSpeak NG). Brzmi surowo, ale NIE wymaga internetu —
    to gwarancja, że lektor odezwie się nawet bez dostępu do usług zewnętrznych."""
    import subprocess
    import shutil as _sh
    exe = _sh.which("espeak-ng") or _sh.which("espeak")
    if not exe:
        raise RuntimeError("espeak-ng nie jest zainstalowany")
    speed = int(max(90, min(200, 165 * float(rate))))
    voice = "pl" if lang == "pl" else "en-gb"
    out = subprocess.run(
        [exe, "-v", voice, "-s", str(speed), "--stdout", text],
        capture_output=True, timeout=20)
    if out.returncode != 0 or not out.stdout:
        raise RuntimeError((out.stderr or b"").decode("utf-8", "ignore")[:120] or "brak wyniku")
    return out.stdout            # WAV — przeglądarki odtwarzają go tak samo dobrze


def _tts_generate(text, lang, rate):
    """Próbuje kolejnych silników; zwraca (bajty, nazwa_silnika, komunikaty_błędów)."""
    global TTS_ENGINE_USED
    errors = []
    for name, fn in (("edge", _tts_edge), ("gtts", _tts_gtts), ("espeak", _tts_espeak)):
        try:
            data = fn(text, lang, rate)
            if data and len(data) > 500:
                TTS_ENGINE_USED = name
                return data, name, errors
            errors.append(f"{name}: pusty wynik")
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__} {e}")
    return None, None, errors


@app.get("/api/tts")
async def tts_audio(request: Request, text: str, lang: str = "en",
                    rate: float = 0.95, token: str = ""):
    """Zwraca gotowe nagranie dla podanego tekstu.

    Token można podać nagłówkiem (zwykła droga) albo w adresie — to drugie
    przydaje się, gdy odtwarzacz audio nie potrafi wysłać nagłówków.
    """
    if token and not request.headers.get("x-token"):
        who = auth.who(token)
        if not who:
            raise HTTPException(401, "Sesja wygasła.")
    else:
        current_user(request)
    text = (text or "").strip()[:400]
    if not text:
        raise HTTPException(400, "Brak tekstu.")
    lang = "pl" if lang == "pl" else "en"
    rate = max(0.5, min(1.5, float(rate)))

    path = _tts_cache_path(text, lang, round(rate, 2))
    if os.path.isfile(path) and os.path.getsize(path) > 500:
        with open(path, "rb") as fh:
            head = fh.read(4)
            fh.seek(0)
            mime = "audio/wav" if head == b"RIFF" else "audio/mpeg"
            return Response(fh.read(), media_type=mime,
                            headers={"Cache-Control": "public, max-age=604800"})

    data, engine, errors = _tts_generate(text, lang, rate)
    if not data:
        raise HTTPException(503, "Lektor serwerowy niedostępny: " + " | ".join(errors))
    try:
        os.makedirs(TTS_CACHE_DIR, exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
        _tts_cache_prune()
    except OSError:
        pass
    mime = "audio/wav" if engine == "espeak" else "audio/mpeg"
    return Response(data, media_type=mime,
                    headers={"Cache-Control": "public, max-age=604800",
                             "X-TTS-Engine": engine})


@app.get("/api/tts/status")
async def tts_status(request: Request):
    """Sprawdza, czy lektor serwerowy działa i który silnik odpowiada."""
    current_user(request)
    data, engine, errors = _tts_generate("test", "en", 0.95)
    return {"ok": bool(data), "engine": engine, "errors": errors,
            "cache_dir": TTS_CACHE_DIR,
            "cached": len(os.listdir(TTS_CACHE_DIR)) if os.path.isdir(TTS_CACHE_DIR) else 0}


# ---------------------------------------------------------------- ROLE I DOSTĘP
ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT = "admin", "teacher", "student"
ADMIN_UNLOCK = os.environ.get("LF_ADMIN_PASSWORD", "AdminAdministrator")

# Moduły, których widoczność administrator może włączać/wyłączać dla uczniów.
MODULES = [
    {"id": "placement", "name": "Test poziomujący", "emoji": "🎯"},
    {"id": "basics",    "name": "Podstawy (kurs)",   "emoji": "🎒"},
    {"id": "path",      "name": "Ścieżka nauki",    "emoji": "🧭"},
    {"id": "flashcards","name": "Fiszki",            "emoji": "🃏"},
    {"id": "verbs",     "name": "Czasowniki",        "emoji": "⚙️"},
    {"id": "dialogs",   "name": "Rozmowy",           "emoji": "💬"},
    {"id": "reading",   "name": "Czytanie",          "emoji": "📖"},
    {"id": "listening", "name": "Słuchanie",         "emoji": "🎧"},
    {"id": "translate", "name": "Tłumaczenia",       "emoji": "🌐"},
    {"id": "grammar",   "name": "Gramatyka",         "emoji": "📐"},
    {"id": "knowledge", "name": "Baza wiedzy",       "emoji": "📚"},
    {"id": "lessons",   "name": "Lekcje",            "emoji": "🎓"},
    {"id": "training",  "name": "Mój trening",       "emoji": "🛠"},
    {"id": "games",     "name": "Gry",               "emoji": "🎮"},
    {"id": "programs",  "name": "Programy",          "emoji": "📋"},
    {"id": "custom",    "name": "Własne fiszki",     "emoji": "➕"},
]
ALL_MODULE_IDS = [m["id"] for m in MODULES]


@app.on_event("startup")
async def _startup_seed():
    _seed_admin_account()


def _access_cfg():
    """Globalna konfiguracja dostępu ustawiana przez administratora.

    Moduły dodane w nowszych wersjach aplikacji są domyślnie WIDOCZNE — inaczej
    każda aktualizacja z nowym działem wymagałaby ręcznego odblokowania go w panelu.
    Pamiętamy więc listę modułów, o których konfiguracja już „wie”.
    """
    cfg = storage.load_data("_dostep.json", None)
    if not cfg:
        cfg = {"student_modules": list(ALL_MODULE_IDS), "known": list(ALL_MODULE_IDS)}
        storage.save_data("_dostep.json", cfg)
        return cfg
    cfg.setdefault("student_modules", list(ALL_MODULE_IDS))
    known = cfg.setdefault("known", list(cfg["student_modules"]))
    fresh = [m for m in ALL_MODULE_IDS if m not in known]
    if fresh:                                   # nowe działy — włączamy je od razu
        cfg["student_modules"] = list(dict.fromkeys(cfg["student_modules"] + fresh))
        cfg["known"] = list(dict.fromkeys(known + fresh))
        storage.save_data("_dostep.json", cfg)
    return cfg


def user_role(prof):
    """Rola konta. Starsze profile miały tylko flagę admin=True."""
    r = prof.get("role", ROLE_STUDENT)
    if prof.get("admin") and r != ROLE_ADMIN:
        return ROLE_ADMIN
    return r


def allowed_modules(prof):
    """Do czego konto ma dostęp. Nauczyciel i administrator — do wszystkiego."""
    role = user_role(prof)
    if role in (ROLE_ADMIN, ROLE_TEACHER):
        return list(ALL_MODULE_IDS)
    return list(_access_cfg()["student_modules"])


def require_admin_role(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    if user_role(prof) != ROLE_ADMIN:
        raise HTTPException(403, "Tylko dla administratora.")
    return who


def guard_module(request: Request, module_id: str):
    """Blokuje wejście do modułu ukrytego przez administratora."""
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    if module_id not in allowed_modules(prof):
        raise HTTPException(403, "Ten dział został wyłączony przez administratora.")
    return who


@app.post("/api/admin/unlock")
async def admin_unlock(request: Request):
    """Podniesienie konta do roli administratora hasłem."""
    who = current_user(request)
    body = await request.json()
    if body.get("password", "") != ADMIN_UNLOCK:
        storage.log_event(who["username"], {"type": "admin_login_failed"})
        raise HTTPException(403, "Błędne hasło administratora.")
    prof = storage.load_profile(who["username"])
    prof["role"] = ROLE_ADMIN
    prof["admin"] = True
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "admin_login"})
    return {"ok": True, "role": ROLE_ADMIN}


@app.get("/api/admin/users")
async def admin_users(request: Request):
    require_admin_role(request)
    out = []
    for acc in storage.list_accounts():
        prof = storage.load_profile(acc["username"])
        out.append({"username": acc["username"], "role": user_role(prof),
                    "level": prof.get("level"), "xp": prof.get("xp", 0),
                    "streak": prof.get("streak", {}).get("days", 0)
                              if isinstance(prof.get("streak"), dict) else prof.get("streak", 0),
                    "teacher": prof.get("teacher")})
    out.sort(key=lambda x: (x["role"] != ROLE_ADMIN, x["role"] != ROLE_TEACHER, x["username"]))
    return {"users": out, "roles": [ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN]}


@app.post("/api/admin/user_role")
async def admin_set_role(request: Request):
    me = require_admin_role(request)
    body = await request.json()
    target, role = body.get("username"), body.get("role")
    if role not in (ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN):
        raise HTTPException(400, "Nieznana rola.")
    if target == me["username"] and role != ROLE_ADMIN:
        raise HTTPException(400, "Nie możesz odebrać uprawnień samemu sobie.")
    if not storage.account_exists(target):
        raise HTTPException(404, "Nie ma takiego konta.")
    prof = storage.load_profile(target)
    prof["role"] = role
    prof["admin"] = (role == ROLE_ADMIN)
    storage.save_profile(target, prof)
    storage.log_event(me["username"], {"type": "role_changed", "user": target, "role": role})
    return {"ok": True, "username": target, "role": role}


@app.get("/api/admin/access")
async def admin_get_access(request: Request):
    require_admin_role(request)
    cfg = _access_cfg()
    return {"modules": MODULES, "student_modules": cfg["student_modules"]}


@app.post("/api/admin/access")
async def admin_set_access(request: Request):
    me = require_admin_role(request)
    body = await request.json()
    mods = [m for m in (body.get("student_modules") or []) if m in ALL_MODULE_IDS]
    cfg = _access_cfg()
    cfg["student_modules"] = mods
    cfg["known"] = list(ALL_MODULE_IDS)
    storage.save_data("_dostep.json", cfg)
    storage.log_event(me["username"], {"type": "access_changed", "modules": mods})
    return {"ok": True, "student_modules": mods}


# ---------------------------------------------------------------- ADMINISTRATOR
ADMIN_PASSWORD = os.environ.get("LF_ADMIN_PASSWORD", "administrator")

# Rejestr modułów treści: plik -> (etykieta, klucz listy, opis formatu)
CONTENT_MODULES = [
    {"id": "fiszki", "file": "slownictwo/dodane_fiszki.json", "key": "items",
     "label": "Fiszki (słówka)", "emoji": "🃏",
     "fields": "en, pl, example, hint, theme (kategoria), level",
     "folder": "slownictwo/"},
    {"id": "gramatyka", "file": "gramatyka/dodane_gramatyka.json", "key": "topics",
     "label": "Gramatyka (tematy i ćwiczenia)", "emoji": "📐",
     "fields": "id, name, level, rule, theory (HTML), exercises[]",
     "folder": "gramatyka/"},
    {"id": "tlumaczenia", "file": "tlumaczenia/dodane_zdania.json", "key": "items",
     "label": "Zdania do tłumaczenia PL→EN", "emoji": "🌐",
     "fields": "pl, en_ref, keywords[[]], tense_name, level",
     "folder": "tlumaczenia/"},
    {"id": "dyktanda", "file": "sluchanie/dodane_dyktanda.json", "key": "items",
     "label": "Dyktanda (słuchanie)", "emoji": "🎧",
     "fields": "en, pl, level — głos generowany automatycznie",
     "folder": "sluchanie/"},
    {"id": "rozmowy", "file": "rozmowy/dodane_rozmowy.json", "key": "dialogs",
     "label": "Rozmowy (scenki dialogowe)", "emoji": "💬",
     "fields": "id, name, desc, level, nodes[] (npc_en, npc_pl, mode, options/write)",
     "folder": "rozmowy/"},
    {"id": "czytanie", "file": "czytanie/dodane_teksty.json", "key": "texts",
     "label": "Teksty do czytania", "emoji": "📖",
     "fields": "id, title, level, text, text_pl, questions[]",
     "folder": "czytanie/"},
    {"id": "pisanie", "file": "pisanie/dodane_zadania.json", "key": "tasks",
     "label": "Zadania pisemne", "emoji": "✍️",
     "fields": "id, title, level, brief, must[[]], must_pl[], min_words, model",
     "folder": "pisanie/"},
    {"id": "wiedza", "file": "wiedza/dodane_artykuly.json", "key": "articles",
     "label": "Artykuły teorii (Baza wiedzy)", "emoji": "📘",
     "fields": "id, cat, name, level, what, when[], form{}, examples[], mistakes[], quiz[]",
     "folder": "wiedza/"},
]


def require_admin(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    if user_role(prof) != ROLE_ADMIN:
        raise HTTPException(403, "Wymagane logowanie administratora.")
    return who


@app.post("/api/admin/login")
async def admin_login(request: Request):
    who = current_user(request)
    body = await request.json()
    if body.get("password", "") not in (ADMIN_PASSWORD, ADMIN_UNLOCK):
        storage.log_event(who["username"], {"type": "admin_login_failed"})
        raise HTTPException(403, "Błędne hasło administratora.")
    prof = storage.load_profile(who["username"])
    prof["role"] = ROLE_ADMIN
    prof["admin"] = True
    storage.save_profile(who["username"], prof)
    storage.log_event(who["username"], {"type": "admin_login"})
    return {"ok": True}


@app.post("/api/admin/logout")
async def admin_logout(request: Request):
    who = current_user(request)
    prof = storage.load_profile(who["username"])
    prof["admin"] = False
    storage.save_profile(who["username"], prof)
    return {"ok": True}


def _count_items(data):
    if not isinstance(data, dict):
        return 0
    for k in ("items", "topics", "dialogs", "texts", "tasks", "articles", "units", "words", "levels"):
        if isinstance(data.get(k), list):
            return len(data[k])
        if isinstance(data.get(k), dict):
            return len(data[k])
    return sum(len(v) for v in data.values() if isinstance(v, list))


@app.get("/api/admin/files")
async def admin_files(request: Request):
    """Lista wszystkich plików treści z etykietami — mapa materiału."""
    require_admin(request)
    root = storage.DATA_DIR
    out = []
    for dirpath, _, files in os.walk(root):
        for f in sorted(files):
            if not f.endswith(".json"):
                continue
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, root).replace("\\", "/")
            data = storage.load_data(rel, {})
            mod = next((c for c in CONTENT_MODULES if c["file"] == rel), None)
            out.append({"path": rel,
                        "label": (data.get("etykieta") or data.get("name") or rel) if isinstance(data, dict) else rel,
                        "opis": data.get("opis", "") if isinstance(data, dict) else "",
                        "items": _count_items(data),
                        "size_kb": round(os.path.getsize(full) / 1024, 1),
                        "editable": bool(mod), "module": mod["id"] if mod else None,
                        "folder": os.path.dirname(rel) or "."})
    return {"files": sorted(out, key=lambda x: x["path"]),
            "modules": CONTENT_MODULES}


@app.get("/api/admin/file")
async def admin_file_get(request: Request, path: str):
    require_admin(request)
    if ".." in path or path.startswith("/"):
        raise HTTPException(400, "Nieprawidłowa ścieżka.")
    data = storage.load_data(path, None)
    if data is None:
        raise HTTPException(404, "Brak pliku.")
    return {"path": path, "content": json.dumps(data, ensure_ascii=False, indent=1)}


@app.post("/api/admin/file")
async def admin_file_save(request: Request):
    """Zapis surowej treści pliku (z walidacją JSON i kopią zapasową)."""
    require_admin(request)
    body = await request.json()
    path = body["path"]
    if ".." in path or path.startswith("/"):
        raise HTTPException(400, "Nieprawidłowa ścieżka.")
    try:
        data = json.loads(body["content"])
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Błąd składni JSON w linii {e.lineno}: {e.msg}")
    full = os.path.join(storage.DATA_DIR, path)
    if os.path.exists(full):
        bak = os.path.join(storage.DATA_DIR, "_kopie")
        os.makedirs(bak, exist_ok=True)
        shutil.copy2(full, os.path.join(bak, path.replace("/", "_") +
                                        "." + datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + ".bak"))
    storage.save_data(path, data)
    storage.log_event(current_user(request)["username"],
                      {"type": "admin_file_saved", "file": path})
    return {"ok": True, "items": _count_items(data)}


@app.post("/api/admin/add")
async def admin_add(request: Request):
    """Dodanie pojedynczej pozycji do właściwego modułu (z automatycznym numerem)."""
    require_admin(request)
    body = await request.json()
    mod = next((c for c in CONTENT_MODULES if c["id"] == body["module"]), None)
    if not mod:
        raise HTTPException(400, "Nieznany moduł.")
    data = storage.load_data(mod["file"], None) or {"name": mod["label"], mod["key"]: []}
    lst = data.setdefault(mod["key"], [])
    item = body["item"]
    item["nr"] = len(lst) + 1
    item.setdefault("id", f"{mod['id']}_{int(time.time() * 1000)}")
    lst.append(item)
    storage.save_data(mod["file"], data)
    storage.log_event(current_user(request)["username"],
                      {"type": "admin_content_added", "module": mod["id"],
                       "file": mod["file"], "nr": item["nr"]})
    return {"ok": True, "file": mod["file"], "nr": item["nr"], "total": len(lst)}


# ---------------------------------------------------------------- eksport / import
@app.get("/api/admin/export/pack")
async def admin_export_pack(request: Request):
    """ZIP z całym folderem data/ — do edycji i odesłania."""
    require_admin(request)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, _, files in os.walk(storage.DATA_DIR):
            if "_kopie" in dirpath:
                continue
            for f in files:
                if f.endswith(".json"):
                    full = os.path.join(dirpath, f)
                    z.write(full, os.path.join("data", os.path.relpath(full, storage.DATA_DIR)))
        z.writestr("JAK_DODAWAC_TRESCI.md", _import_instructions())
        z.writestr("data/_szablon_nowe_tresci.json",
                   json.dumps(_template_pack(), ensure_ascii=False, indent=1))
    buf.seek(0)
    stamp = datetime.date.today().isoformat()
    return StreamingResponse(iter([buf.getvalue()]), media_type="application/zip",
                             headers={"Content-Disposition":
                                      f"attachment; filename=LinguaForge_materialy_{stamp}.zip"})


def _template_pack():
    return {
        "_instrukcja": "Wypełnij wybrane sekcje i odeślij ten plik. Puste sekcje zostaną pominięte. Pola z gwiazdką są wymagane.",
        "fiszki": [{"en*": "hammer", "pl*": "młotek", "example": "Pass me the hammer.",
                    "hint": "narzędzie", "theme": "praca", "level": "A1"}],
        "tlumaczenia": [{"pl*": "Potrzebuję młotka.", "en_ref*": "I need a hammer.",
                         "keywords": [["need"], ["hammer"]], "tense_name": "Present Simple",
                         "level": "A1"}],
        "dyktanda": [{"en*": "Bring me the hammer, please.", "pl": "Przynieś mi młotek, proszę.",
                      "level": "A1"}],
        "czytanie": [{"id*": "r_wlasny_1", "title*": "Mój tekst", "level": "A2",
                      "text*": "Angielski tekst…", "text_pl": "Tłumaczenie…",
                      "questions": [{"text": "Pytanie?", "options": ["a", "b", "c", "d"],
                                     "answer": 1, "options_pl": ["a", "b", "c", "d"],
                                     "pl": "Wyjaśnienie po polsku"}]}],
        "pisanie": [{"id*": "w_wlasny_1", "title*": "Temat pracy", "level": "A2",
                     "brief*": "Co ma napisać uczeń", "min_words": 40,
                     "must": [["hammer", "tool"]], "must_pl": ["nazwa narzędzia"],
                     "model": "Wzorcowa wypowiedź po angielsku."}],
        "rozmowy": [{"id*": "dlg_wlasny_1", "name*": "Nazwa scenki", "desc": "Opis",
                     "level": "A2", "emoji": "💬",
                     "nodes*": [
                         {"id": "n1", "npc_en": "Kwestia rozmówcy po angielsku",
                          "npc_pl": "Tłumaczenie kwestii", "mode": "choice",
                          "hint": "Podpowiedź dla ucznia",
                          "options": [{"en": "Odpowiedź A", "pl": "Tłumaczenie A",
                                       "good": True, "feedback": "Dlaczego dobra",
                                       "next": "n2"}]},
                         {"id": "n2", "npc_en": "Kolejna kwestia", "npc_pl": "Tłumaczenie",
                          "mode": "write", "hint": "Co ma napisać uczeń",
                          "write": {"model": "Wzorcowa odpowiedź",
                                    "keywords": [["słowo"], ["drugie"]], "next": "END"}}]}],
        "gramatyka": [{"id*": "wlasny_temat", "name*": "Nazwa tematu", "level": "A2",
                       "rule": "Reguła w jednym zdaniu.",
                       "theory": "<p>Teoria w HTML</p>",
                       "exercises*": [{"id": "ex1", "type": "choice",
                                       "text": "She ___ to work.", "options": ["go", "goes"],
                                       "answer": 1, "pl": "Ona chodzi do pracy.",
                                       "explain": "3. osoba → goes"}]}],
        "wiedza": [{"id*": "kb_wlasny", "cat": "tenses", "name*": "Nazwa zagadnienia",
                    "level": "A2", "what*": "Krótkie wyjaśnienie",
                    "when": ["kiedy używać"], "form": {"plus": "…", "minus": "…", "question": "…"},
                    "signals": ["słowo-sygnał"],
                    "examples": [["English example", "Polskie tłumaczenie"]],
                    "mistakes": ["typowy błąd"],
                    "quiz": [{"q": "Pytanie po polsku?",
                              "keywords": [["rdzeń1", "synonim"], ["rdzeń2"]],
                              "model": "Wzorcowa odpowiedź"}]}],
    }


def _import_instructions():
    lines = ["# Jak dodać własne materiały do LinguaForge", "",
             "Masz dwie drogi — obie kończą się tym samym: wgraniem pliku w panelu administratora.",
             "",
             "## Droga 1 (najprostsza): plik szablonu",
             "1. Otwórz `data/_szablon_nowe_tresci.json`.",
             "2. Wypełnij tylko te sekcje, które Cię interesują (resztę zostaw pustą lub usuń).",
             "3. Usuń gwiazdki z nazw pól — służą tylko do oznaczenia pól wymaganych.",
             "4. Odeślij plik. W aplikacji: Panel administratora → Import → wybierz plik.",
             "",
             "## Droga 2: edycja istniejących plików",
             "Każdy typ treści ma własny plik w folderze `data/`:", ""]
    for c in CONTENT_MODULES:
        lines.append(f"- **{c['label']}** → `data/{c['file']}` (pola: {c['fields']})")
    lines += ["", "Możesz też dopisywać do plików fabrycznych (np. `data/slownictwo/ogolne.json`).",
              "Po edycji spakuj folder `data` i odeślij — w panelu administratora wybierz Import ZIP.",
              "",
              "## Zasady",
              "- Pliki są w formacie JSON i kodowaniu UTF-8 (polskie znaki działają normalnie).",
              "- Każda pozycja dostaje numer `nr` automatycznie — po nim odnajdziesz ją w aplikacji, np. `[30]`.",
              "- Nagrań nie trzeba dostarczać: **głos jest generowany automatycznie** z tekstu angielskiego",
              "  (i polskiego tam, gdzie potrzeba). Wystarczy poprawnie zapisany tekst.",
              "- `level` to poziom CEFR: A1, A2, B1, B2, C1.",
              "- `theme` przy fiszkach to kategoria używana przez mapę luk, np. praca, dom, zwierzeta.",
              "",
              "## Kontrola po imporcie",
              "Po wgraniu plik trafia do modułu `dodane_*` w odpowiednim folderze, a aplikacja pokazuje,",
              "ile pozycji dodano. Jeśli coś jest niepoprawne, import zostaje odrzucony z opisem błędu",
              "— dane w aplikacji nie zostaną uszkodzone."]
    return "\n".join(lines)


@app.get("/api/admin/export/pdf")
async def admin_export_pdf(request: Request):
    """Czytelny katalog wszystkich materiałów w PDF."""
    require_admin(request)
    import sys
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    try:
        import catalog_pdf
        import importlib
        importlib.reload(catalog_pdf)
        pdf_ok = True
    except Exception:
        catalog_pdf, pdf_ok = None, False

    # --- zbieranie treści
    vocab_files, verbs = [], []
    for f in storage.list_data_files("slownictwo/"):
        d = storage.load_data(f, {})
        items = d.get("items", [])
        if not items:
            continue
        if "pl" not in items[0]:
            verbs = items
            continue
        vocab_files.append({"label": d.get("etykieta") or d.get("name") or f,
                            "theme": d.get("theme", "inne"), "file": f, "items": items})

    grammar = []
    for f in storage.list_data_files("gramatyka/"):
        for t in storage.load_data(f, {}).get("topics", []):
            ex = []
            for e in t.get("exercises", []):
                e2 = dict(e)
                e2["answer_text"] = (e["options"][e["answer"]] if e.get("type") == "choice"
                                     else (e.get("accept") or ["—"])[0])
                ex.append(e2)
            grammar.append({**t, "exercises": ex, "file": f})

    plc = storage.load_data("testy/poziomujacy.json", {})
    dialogs = []
    for f in storage.list_data_files("rozmowy/"):
        dialogs += storage.load_data(f, {}).get("dialogs", [])
    lessons = []
    for f in storage.list_data_files("lekcje/"):
        lessons += storage.load_data(f, {}).get("units", [])

    data = {
        "vocab_files": vocab_files, "verbs": verbs, "grammar": grammar,
        "translations": merged_items("tlumaczenia/"),
        "listening": merged_items("sluchanie/") + plc.get("listening", []),
        "reading": _reading_texts(), "writing": _writing_tasks(),
        "dialogs": dialogs, "knowledge": _kb()["articles"],
        "lessons": lessons, "path": _path_data()["levels"],
    }
    counts = {
        "Fiszki (słówka)": sum(len(g["items"]) for g in vocab_files),
        "Czasowniki z odmianą": len(verbs),
        "Tematy gramatyczne": len(grammar),
        "Ćwiczenia gramatyczne": sum(len(t["exercises"]) for t in grammar),
        "Zdania do tłumaczenia": len(data["translations"]),
        "Dyktanda": len(data["listening"]),
        "Teksty do czytania": len(data["reading"]),
        "Zadania pisemne": len(data["writing"]),
        "Rozmowy (scenki)": len(dialogs),
        "Artykuły teorii": len(data["knowledge"]),
        "Pytania testu poziomującego": sum(len(plc.get(k, [])) for k in
                                           ("grammar", "vocab", "vocab_produce", "translation",
                                            "listening", "listening_pl")),
        "Ogniwa Ścieżki nauki": sum(len(l["links"]) for l in data["path"]),
    }
    files = (await admin_files(request))["files"]
    meta = {"version": APP_VERSION, "counts": counts,
            "instructions": _import_instructions().replace("\\n", "\n"),
            "files": [f for f in files if f["items"]]}

    stamp = datetime.date.today().isoformat()
    if not pdf_ok:
        # brak biblioteki reportlab — oddajemy katalog HTML gotowy do wydruku/zapisu jako PDF
        html = _catalog_html(data, meta)
        return StreamingResponse(iter([html.encode("utf-8")]), media_type="text/html",
                                 headers={"Content-Disposition":
                                          f"attachment; filename=LinguaForge_materialy_{stamp}.html"})
    tmp = os.environ.get("TEMP") or os.environ.get("TMP") or "/tmp"
    out = os.path.join(tmp, f"LinguaForge_materialy_{stamp}.pdf")
    try:
        catalog_pdf.build_catalog(out, data, meta)
        with open(out, "rb") as fh:
            payload = fh.read()
    except Exception as e:
        html = _catalog_html(data, meta, note=f"Nie udało się zbudować PDF ({e}). "
                                              "Ten dokument HTML możesz wydrukować do PDF (Ctrl+P).")
        return StreamingResponse(iter([html.encode("utf-8")]), media_type="text/html",
                                 headers={"Content-Disposition":
                                          f"attachment; filename=LinguaForge_materialy_{stamp}.html"})
    return StreamingResponse(iter([payload]), media_type="application/pdf",
                             headers={"Content-Disposition":
                                      f"attachment; filename={os.path.basename(out)}"})


def _catalog_html(data, meta, note=""):
    """Zapasowy katalog w HTML — otwiera się w przeglądarce, Ctrl+P zapisuje jako PDF."""
    def esc(t):
        return (str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    P = ["<!doctype html><html lang='pl'><head><meta charset='utf-8'>",
         "<title>LinguaForge — katalog materiałów</title><style>",
         "body{font-family:'Segoe UI',Arial,sans-serif;color:#1b2430;max-width:1000px;margin:24px auto;padding:0 16px;line-height:1.5}",
         "h1{color:#e8590c;margin-bottom:2px} h2{color:#4c5fd5;border-bottom:2px solid #dde5ec;padding-top:18px}",
         "h3{margin:14px 0 6px} table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px}",
         "th{background:#e9eef5;text-align:left} th,td{border:1px solid #dde5ec;padding:5px 8px;vertical-align:top}",
         "tr:nth-child(even) td{background:#fbfcfe} .note{background:#fff9db;border:1px solid #ffe066;padding:10px;border-radius:8px}",
         "@media print{h2{page-break-before:always} body{margin:0}}</style></head><body>",
         f"<h1>LinguaForge</h1><p>Katalog materiałów · wersja {meta['version']} · {datetime.date.today().isoformat()}</p>"]
    if note:
        P.append(f"<p class='note'>{esc(note)}</p>")
    P.append("<p>Każda pozycja ma numer — ten sam, który widać w aplikacji, np. <b>[30]</b>. "
             "Aby zapisać ten dokument jako PDF, otwórz go i wciśnij Ctrl+P → „Zapisz jako PDF”.</p>")
    P.append("<h2>Zawartość w liczbach</h2><table><tr><th>Rodzaj materiału</th><th>Liczba</th></tr>")
    for k, v in meta["counts"].items():
        P.append(f"<tr><td>{esc(k)}</td><td>{v}</td></tr>")
    P.append("</table>")
    for g in data["vocab_files"]:
        P.append(f"<h2>🃏 {esc(g['label'])} ({len(g['items'])})</h2><table>"
                 "<tr><th>Nr</th><th>Angielski</th><th>Polski</th><th>Przykład</th></tr>")
        for it in g["items"]:
            P.append(f"<tr><td>{it.get('nr','')}</td><td><b>{esc(it['en'])}</b></td>"
                     f"<td>{esc(it['pl'])}</td><td>{esc(it.get('example') or it.get('hint') or '')}</td></tr>")
        P.append("</table>")
    if data.get("verbs"):
        P.append(f"<h2>⚙️ Czasowniki — odmiana ({len(data['verbs'])})</h2><table>"
                 "<tr><th>Nr</th><th>Formy</th><th>Znaczenie</th><th>Polskie formy</th></tr>")
        for v in data["verbs"]:
            P.append(f"<tr><td>{v.get('nr','')}</td><td><b>{esc(v['en'])} → {esc(v['past'])} → {esc(v['perf'])}</b></td>"
                     f"<td>{esc(v['pl_inf'])}</td><td>{esc(v['pl_past'][0])} · {esc(v['pl_pres'])} · {esc(v['pl_fut'][0])}</td></tr>")
        P.append("</table>")
    P.append(f"<h2>📐 Gramatyka ({len(data['grammar'])} tematów)</h2>")
    for t in data["grammar"]:
        P.append(f"<h3>{esc(t['name'])} ({t['level']})</h3>")
        if t.get("rule"):
            P.append(f"<p><b>Reguła:</b> {esc(t['rule'])}</p>")
        P.append("<table><tr><th>Nr</th><th>Ćwiczenie</th><th>Odpowiedź</th><th>Wyjaśnienie</th></tr>")
        for e in t["exercises"]:
            P.append(f"<tr><td>{e.get('nr','')}</td><td>{esc(e.get('text',''))}</td>"
                     f"<td><b>{esc(e.get('answer_text',''))}</b></td>"
                     f"<td>{esc(e.get('pl',''))} {esc(e.get('explain',''))}</td></tr>")
        P.append("</table>")
    P.append(f"<h2>🌐 Zdania do tłumaczenia ({len(data['translations'])})</h2><table>"
             "<tr><th>Nr</th><th>Polski</th><th>Wzorzec EN</th><th>Czas/poziom</th></tr>")
    for i in data["translations"]:
        P.append(f"<tr><td>{i.get('nr','')}</td><td>{esc(i['pl'])}</td><td><b>{esc(i.get('en_ref',''))}</b></td>"
                 f"<td>{esc(i.get('tense_name',''))} {esc(i.get('level',''))}</td></tr>")
    P.append("</table>")
    P.append(f"<h2>🎧 Dyktanda ({len(data['listening'])})</h2><table><tr><th>Nr</th><th>Angielski</th><th>Polski</th></tr>")
    for i in data["listening"]:
        P.append(f"<tr><td>{i.get('nr','')}</td><td><b>{esc(i.get('en',''))}</b></td><td>{esc(i.get('pl',''))}</td></tr>")
    P.append("</table>")
    P.append(f"<h2>📖 Teksty do czytania ({len(data['reading'])})</h2>")
    for t in data["reading"]:
        P.append(f"<h3>{esc(t['title'])} ({t['level']})</h3><p>{esc(t['text']).replace(chr(10),'<br>')}</p>"
                 f"<p><i>{esc(t.get('text_pl','')).replace(chr(10),'<br>')}</i></p><table>"
                 "<tr><th>Pytanie</th><th>Odpowiedzi (✔ poprawna)</th></tr>")
        for q in t.get("questions", []):
            opts = " · ".join(("✔ " if j == q["answer"] else "") + esc(o) for j, o in enumerate(q["options"]))
            P.append(f"<tr><td>{esc(q['text'])}</td><td>{opts}</td></tr>")
        P.append("</table>")
    P.append(f"<h2>✍️ Zadania pisemne ({len(data['writing'])})</h2>")
    for w in data["writing"]:
        P.append(f"<h3>{esc(w['title'])} ({w['level']})</h3><p>{esc(w['brief'])}</p>"
                 f"<p><b>Wymagane elementy:</b> {esc(', '.join(w.get('must_pl', [])))}</p>"
                 f"<p><b>Wzorzec:</b> <i>{esc(w.get('model',''))}</i></p>")
    P.append(f"<h2>💬 Rozmowy ({len(data['dialogs'])})</h2>")
    for d in data["dialogs"]:
        P.append(f"<h3>{esc(d['name'])} ({d['level']})</h3><p>{esc(d.get('desc',''))}</p><table>"
                 "<tr><th>Kwestia rozmówcy</th><th>Odpowiedzi ucznia</th></tr>")
        for n in d["nodes"]:
            if n.get("mode") == "choice":
                ans = "<br>".join(("✔ " if o.get("good") else "✘ ") + esc(o["en"]) +
                                  " <i>" + esc(o.get("pl", "")) + "</i>" for o in n.get("options", []))
            else:
                ans = "✍️ uczeń pisze sam · wzorzec: <b>" + esc(n.get("write", {}).get("model", "")) + "</b>"
            P.append(f"<tr><td><b>{esc(n['npc_en'])}</b><br><i>{esc(n.get('npc_pl',''))}</i></td><td>{ans}</td></tr>")
        P.append("</table>")
    P.append(f"<h2>📘 Baza wiedzy ({len(data['knowledge'])})</h2>")
    for a in data["knowledge"]:
        P.append(f"<h3>{esc(a['name'])} ({a['level']})</h3><p>{esc(a['what'])}</p>")
        exs = a.get("examples", [])
        if exs:
            P.append("<table><tr><th>Przykład</th><th>Tłumaczenie</th></tr>")
            for e in exs:
                P.append(f"<tr><td><b>{esc(e[0])}</b></td><td>{esc(e[1])}</td></tr>")
            P.append("</table>")
    P.append("<h2>🧭 Ścieżka nauki</h2>")
    for lvl in data["path"]:
        P.append(f"<h3>{esc(lvl['name'])}</h3><table><tr><th>Rozdział</th><th>Ogniwo</th><th>Typ</th></tr>")
        for ln in lvl["links"]:
            P.append(f"<tr><td>{esc(ln.get('section',''))}</td><td>{esc(ln['name'])}</td><td>{esc(ln['type'])}</td></tr>")
        P.append("</table>")
    P.append("<h2>🛠 Jak dodać nowe treści</h2><pre style='white-space:pre-wrap'>"
             + esc(meta["instructions"].replace("\\n", "\n")) + "</pre>")
    P.append("</body></html>")
    return "".join(P)


@app.post("/api/admin/import")
async def admin_import(request: Request):
    """Import: plik JSON (szablon lub moduł) albo ZIP z folderem data/.
    Plik przychodzi jako base64 w polu 'data' — bez dodatkowych bibliotek."""
    require_admin(request)
    body = await request.json()
    try:
        raw = base64.b64decode(body["data"].split(",")[-1])
    except Exception:
        raise HTTPException(400, "Nie mogę odczytać przesłanego pliku.")
    name = (body.get("filename") or "").lower()
    report = []

    if name.endswith(".zip"):
        try:
            z = zipfile.ZipFile(io.BytesIO(raw))
        except zipfile.BadZipFile:
            raise HTTPException(400, "To nie jest poprawny plik ZIP.")
        for info in z.infolist():
            if not info.filename.endswith(".json") or info.is_dir():
                continue
            rel = info.filename.split("data/", 1)[-1]
            if ".." in rel or rel.startswith("/"):
                continue
            try:
                data = json.loads(z.read(info).decode("utf-8"))
            except Exception as e:
                report.append({"file": rel, "ok": False, "msg": f"błąd JSON: {e}"})
                continue
            if rel.endswith("_szablon_nowe_tresci.json"):
                report += _import_template(data)
                continue
            full = os.path.join(storage.DATA_DIR, rel)
            if os.path.exists(full):
                bak = os.path.join(storage.DATA_DIR, "_kopie")
                os.makedirs(bak, exist_ok=True)
                shutil.copy2(full, os.path.join(bak, rel.replace("/", "_") + "." +
                                                datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + ".bak"))
            storage.save_data(rel, data)
            report.append({"file": rel, "ok": True, "msg": f"zapisano ({_count_items(data)} pozycji)"})
    else:
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise HTTPException(400, f"Nie mogę odczytać pliku JSON: {e}")
        if any(k in data for k in [c["id"] for c in CONTENT_MODULES]):
            report += _import_template(data)
        else:
            mod = next((c for c in CONTENT_MODULES if c["key"] in data), None)
            if not mod:
                raise HTTPException(400, "Nie rozpoznaję formatu pliku. Użyj szablonu z paczki materiałów.")
            report += _merge_into_module(mod, data.get(mod["key"], []))

    storage.log_event(current_user(request)["username"],
                      {"type": "admin_import", "file": body.get("filename"),
                       "added": sum(r.get("added", 0) for r in report)})
    return {"report": report, "added": sum(r.get("added", 0) for r in report)}


def _clean_keys(item):
    """Usuwa gwiazdki z nazw pól szablonu (en* -> en)."""
    if isinstance(item, dict):
        return {k.rstrip("*"): _clean_keys(v) for k, v in item.items() if not k.startswith("_")}
    if isinstance(item, list):
        return [_clean_keys(x) for x in item]
    return item


def _merge_into_module(mod, items):
    if not items:
        return []
    data = storage.load_data(mod["file"], None) or {"name": mod["label"], mod["key"]: []}
    lst = data.setdefault(mod["key"], [])
    added = 0
    for it in items:
        it = _clean_keys(it)
        if not isinstance(it, dict) or not it:
            continue
        it["nr"] = len(lst) + 1
        it.setdefault("id", f"{mod['id']}_{int(time.time()*1000)}_{added}")
        lst.append(it)
        added += 1
    storage.save_data(mod["file"], data)
    return [{"file": mod["file"], "ok": True, "added": added,
             "msg": f"{mod['label']}: dodano {added} pozycji (razem {len(lst)})"}]


def _import_template(data):
    report = []
    for mod in CONTENT_MODULES:
        items = data.get(mod["id"])
        if isinstance(items, list) and items:
            report += _merge_into_module(mod, items)
    if not report:
        report.append({"ok": False, "msg": "Plik nie zawierał żadnych pozycji do dodania."})
    return report


# ---------------------------------------------------------------- statyczne
@app.get("/api/network")
async def api_network():
    """Adres do wpisania na telefonie (widoczny też w aplikacji)."""
    ip = local_ip()
    return {"ip": ip, "port": PORT, "lan": LAN_MODE, "url": f"http://{ip}:{PORT}"}


@app.get("/api/ping")
async def api_ping():
    """Bardzo lekkie sprawdzenie, czy serwer żyje (używane przez telefon)."""
    return {"ok": True, "up": round(time.time() - START_TIME)}


@app.get("/api/version")
async def api_version():
    return {"version": APP_VERSION}


@app.middleware("http")
async def no_cache_static(request: Request, call_next):
    """Pliki aplikacji nigdy nie są cache'owane — po aktualizacji od razu widać zmiany."""
    resp = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".js", ".css", ".html", ".json")):
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
    return resp


@app.get("/sw.js")
async def service_worker():
    with open(os.path.join(ROOT, "static", "sw.js"), encoding="utf-8") as f:
        return Response(f.read(), media_type="application/javascript",
                        headers={"Cache-Control": "no-store", "Service-Worker-Allowed": "/"})


@app.get("/")
async def index():
    """Doklejamy numer wersji do adresów skryptów — wymusza świeże pliki po aktualizacji."""
    with open(os.path.join(ROOT, "static", "index.html"), encoding="utf-8") as f:
        html = f.read()
    html = re.sub(r'(src|href)="(/(?:js|css)/[^"?]+)"',
                  lambda mm: f'{mm.group(1)}="{mm.group(2)}?v={APP_VERSION}"', html)
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


app.mount("/", StaticFiles(directory=os.path.join(ROOT, "static"), html=True), name="static")


def on_android():
    """Czy aplikacja działa bezpośrednio na telefonie (aplikacja APK/Termux/Pydroid)?"""
    return (os.environ.get("LF_ANDROID") == "1" or "ANDROID_ROOT" in os.environ
            or "TERMUX_VERSION" in os.environ or os.path.isdir("/data/data/com.termux"))


def open_browser():
    time.sleep(1.2)
    try:
        webbrowser.open(f"http://127.0.0.1:{PORT}")
    except Exception:
        pass


if __name__ == "__main__":
    import uvicorn
    # Tryb chmurowy: hosting ustawia PORT i oczekuje nasłuchu na 0.0.0.0
    if os.environ.get("LF_CLOUD") == "1" or os.environ.get("PORT"):
        print(f"LinguaForge v{APP_VERSION} — tryb serwerowy, port {PORT}")
        uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
        raise SystemExit
    phone = on_android()
    host = "0.0.0.0" if (LAN_MODE and not phone) else "127.0.0.1"
    ip = local_ip()
    print()
    print("  " + "=" * 56)
    print(f"   LinguaForge v{APP_VERSION}")
    print("  " + "=" * 56)
    if phone:
        print("   Tryb telefonu — aplikacja działa samodzielnie na tym urządzeniu.")
        print(f"   Otwórz w przeglądarce:  http://127.0.0.1:{PORT}")
        print()
        print("   Nie zamykaj tego okna w trakcie nauki.")
        print("  " + "=" * 56)
        print()
        uvicorn.run(app, host=host, port=PORT, log_level="warning")
        raise SystemExit
    print(f"   Na tym komputerze:  http://127.0.0.1:{PORT}")
    if LAN_MODE:
        print(f"   Na telefonie:       http://{ip}:{PORT}")
        print()
        print("   Telefon musi być w TEJ SAMEJ sieci Wi-Fi co komputer.")
        print("   Jeśli strona się nie otwiera, zezwól Pythonowi na dostęp")
        print("   do sieci prywatnej w zaporze Windows.")
    else:
        print(f"   Telefon:            uruchom plik start_telefon.bat")
    print("  " + "=" * 56)
    print()
    if not LAN_MODE:
        threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host=host, port=PORT, log_level="warning")
