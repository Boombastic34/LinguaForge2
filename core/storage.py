# -*- coding: utf-8 -*-
"""Warstwa zapisu danych. Każde konto = osobny folder w accounts/."""
import json, os, time, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Na Androidzie (aplikacja z Play) katalog programu jest tylko do odczytu,
# dlatego pozwalamy wskazać zapisywalny katalog danych przez zmienną LF_HOME.
LF_HOME = os.environ.get("LF_HOME", "").strip()
FACTORY_DATA = os.path.join(ROOT, "data")      # treść dostarczana z kodem aplikacji


def _prepare_data_dir():
    """Katalog z treścią (fiszki, ćwiczenia, teksty).

    Bez LF_HOME: zwykły katalog data/ obok programu.
    Z LF_HOME (hosting z dyskiem, Android): kopiujemy tam treść fabryczną,
    dzięki czemu materiały dodane przez administratora przetrwają aktualizacje,
    a jednocześnie nowe pliki z kolejnych wersji trafiają na dysk.
    """
    explicit = os.environ.get("LF_DATA", "").strip()
    if explicit:
        return explicit
    if not LF_HOME:
        return FACTORY_DATA

    target = os.path.join(LF_HOME, "data")
    try:
        os.makedirs(target, exist_ok=True)
        for dirpath, _dirs, files in os.walk(FACTORY_DATA):
            rel = os.path.relpath(dirpath, FACTORY_DATA)
            dst_dir = target if rel == "." else os.path.join(target, rel)
            os.makedirs(dst_dir, exist_ok=True)
            for f in files:
                if not f.endswith(".json"):
                    continue
                src, dst = os.path.join(dirpath, f), os.path.join(dst_dir, f)
                # pliki "dodane_*" należą do administratora — nigdy ich nie nadpisujemy
                if f.startswith("dodane_") and os.path.exists(dst):
                    continue
                # pozostałe pliki fabryczne odświeżamy, gdy w nowej wersji się zmieniły
                if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                    continue
                with open(src, "rb") as a, open(dst, "wb") as b:
                    b.write(a.read())
        return target
    except OSError as e:
        print(f"  [!] Nie mogę przygotować katalogu treści w {target}: {e}")
        return FACTORY_DATA


DATA_DIR = _prepare_data_dir()


def _writable_accounts_dir():
    """Folder na konta. Gdy katalog aplikacji jest tylko do odczytu (zdarza się
    na Androidzie), przenosimy dane w miejsce, gdzie zapis jest dozwolony."""
    candidates = ([os.path.join(LF_HOME, "accounts")] if LF_HOME else []) + [
                  os.path.join(ROOT, "accounts"),
                  os.path.join(os.path.expanduser("~"), "LinguaForge_dane", "accounts"),
                  os.path.join(os.path.expanduser("~"), ".linguaforge", "accounts")]
    for d in candidates:
        try:
            os.makedirs(d, exist_ok=True)
            probe = os.path.join(d, ".zapis_test")
            with open(probe, "w", encoding="utf-8") as fh:
                fh.write("ok")
            os.remove(probe)
            if d != candidates[0]:
                print(f"  [i] Katalog aplikacji jest tylko do odczytu — dane kont zapisuję w: {d}")
            return d
        except OSError:
            continue
    return candidates[0]


ACCOUNTS_DIR = _writable_accounts_dir()


def _safe(name: str) -> str:
    return "".join(c for c in name if c.isalnum() or c in "-_").lower()


def account_dir(username: str) -> str:
    d = os.path.join(ACCOUNTS_DIR, _safe(username))
    os.makedirs(d, exist_ok=True)
    os.makedirs(os.path.join(d, "log"), exist_ok=True)
    return d


def account_exists(username: str) -> bool:
    return os.path.isfile(os.path.join(ACCOUNTS_DIR, _safe(username), "profile.json"))


def list_accounts():
    out = []
    if not os.path.isdir(ACCOUNTS_DIR):
        return out
    for name in sorted(os.listdir(ACCOUNTS_DIR)):
        p = os.path.join(ACCOUNTS_DIR, name, "profile.json")
        if os.path.isfile(p):
            prof = load_json(p, {})
            out.append({"username": prof.get("username", name), "role": prof.get("role", "student")})
    return out


def load_json(path: str, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path: str, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


# ---------- profil ----------

def profile_path(username):
    return os.path.join(account_dir(username), "profile.json")


def load_profile(username):
    return load_json(profile_path(username), None)


def save_profile(username, prof):
    save_json(profile_path(username), prof)


# ---------- pliki użytkownika ----------

def user_file(username, fname, default):
    return load_json(os.path.join(account_dir(username), fname), default)


def save_user_file(username, fname, data):
    save_json(os.path.join(account_dir(username), fname), data)


# ---------- reset konta ----------

def reset_account(username):
    """Kasuje wszystkie postępy; zostaje tylko login, hasło i rola."""
    import shutil
    d = account_dir(username)
    for fname in ("cards.json", "custom_cards.json", "errors.json",
                  "programs.json", "translate_done.json", "lessons.json",
                  "verb_cards.json"):
        p = os.path.join(d, fname)
        if os.path.isfile(p):
            os.remove(p)
    logdir = os.path.join(d, "log")
    if os.path.isdir(logdir):
        shutil.rmtree(logdir)
        os.makedirs(logdir, exist_ok=True)


# ---------- log sesji (JSONL, 1 zdarzenie = 1 linia) ----------

def log_event(username, event: dict):
    event["ts"] = time.time()
    event["time"] = datetime.datetime.now().strftime("%H:%M:%S")
    day = datetime.date.today().isoformat()
    path = os.path.join(account_dir(username), "log", f"{day}.jsonl")
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def read_events(username, days=None):
    """Zwraca listę zdarzeń; days=None -> wszystkie dni."""
    logdir = os.path.join(account_dir(username), "log")
    events = []
    if not os.path.isdir(logdir):
        return events
    files = sorted(os.listdir(logdir))
    if days:
        files = files[-days:]
    for fn in files:
        if not fn.endswith(".jsonl"):
            continue
        day = fn[:-6]
        with open(os.path.join(logdir, fn), "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        ev = json.loads(line)
                        ev["day"] = day
                        events.append(ev)
                    except Exception:
                        pass
    return events


# ---------- dane treningowe (data/) ----------

def load_data(fname, default=None):
    return load_json(os.path.join(DATA_DIR, fname), default)


def list_data_files(prefix):
    """Prefiks pliku ('vocab_') albo folder z '/' na końcu ('slownictwo/')."""
    if not os.path.isdir(DATA_DIR):
        return []
    if prefix.endswith("/"):
        d = os.path.join(DATA_DIR, prefix.rstrip("/"))
        if not os.path.isdir(d):
            return []
        return sorted(prefix + f for f in os.listdir(d) if f.endswith(".json"))
    return sorted(f for f in os.listdir(DATA_DIR) if f.startswith(prefix) and f.endswith(".json"))


def save_data(fname, data):
    path = os.path.join(DATA_DIR, fname)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    save_json(path, data)
