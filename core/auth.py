# -*- coding: utf-8 -*-
"""Konta i logowanie. Proste hashowanie SHA-256 + sól (użytek lokalny)."""
import hashlib, os, secrets, time, datetime
from . import storage

# Tokeny trzymane także na dysku — restart aplikacji (np. uśpienie telefonu)
# nie wylogowuje użytkownika.
TOKENS = {}  # token -> {username, role, created}
_TOKENS_FILE = os.path.join(storage.ACCOUNTS_DIR, "_sessions.json")


def _load_tokens():
    global TOKENS
    try:
        import json
        with open(_TOKENS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        now = time.time()
        TOKENS = {k: v for k, v in data.items()
                  if now - v.get("created", 0) < 60 * 60 * 24 * 90}   # ważne 90 dni
    except Exception:
        TOKENS = {}


def _prune_tokens():
    """Usuwa wygasłe sesje. Bez tego plik rósłby z każdym logowaniem."""
    now = time.time()
    dead = [k for k, v in TOKENS.items()
            if now - v.get("created", 0) >= 60 * 60 * 24 * 90]
    for k in dead:
        TOKENS.pop(k, None)


def _save_tokens():
    try:
        import json
        _prune_tokens()
        os.makedirs(os.path.dirname(_TOKENS_FILE), exist_ok=True)
        with open(_TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(TOKENS, f)
    except Exception:
        pass


def _hash(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def default_skills():
    return {
        "vocab": 0, "reading": 0, "listening": 0, "writing": 0,
        "grammar": 0,
        "grammar_topics": {},   # np. present_simple: 0-100
        "vocab_size_est": 0,
    }


def new_profile(username, password, role="student"):
    salt = secrets.token_hex(8)
    return {
        "username": username,
        "role": role,
        "salt": salt,
        "pass": _hash(password, salt),
        "created": datetime.date.today().isoformat(),
        "placement_done": False,
        "level": None,              # ogólny poziom CEFR po teście
        "target_level": None,
        "domains": ["general"],    # wybrane dziedziny
        "skills": default_skills(),
        "xp": 0,
        "streak": 0,
        "last_active_day": None,
        "daily": {},               # dzień -> {answers, correct, xp, minutes}
        "settings": {"daily_goal_xp": 50, "typing_mode": "auto"},
    }


def ensure_teacher():
    if not storage.account_exists("nauczyciel"):
        prof = new_profile("nauczyciel", "nauczyciel", role="teacher")
        storage.save_profile("nauczyciel", prof)


def register(username, password):
    username = username.strip()
    if len(username) < 3:
        return None, "Nazwa użytkownika musi mieć min. 3 znaki."
    if len(password) < 3:
        return None, "Hasło musi mieć min. 3 znaki."
    if storage.account_exists(username):
        return None, "Takie konto już istnieje."
    prof = new_profile(username, password)
    storage.save_profile(username, prof)
    return make_token(username, "student"), None


def login(username, password):
    prof = storage.load_profile(username)
    if not prof:
        return None, "Nie ma takiego konta."
    if _hash(password, prof["salt"]) != prof["pass"]:
        return None, "Błędne hasło."
    return make_token(prof["username"], prof.get("role", "student")), None


def make_token(username, role):
    t = secrets.token_hex(16)
    TOKENS[t] = {"username": username, "role": role, "created": time.time()}
    _save_tokens()
    return {"token": t, "username": username, "role": role}


def who(token):
    if token and token not in TOKENS:
        _load_tokens()
    return TOKENS.get(token)
