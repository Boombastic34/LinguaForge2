# -*- coding: utf-8 -*-
"""Rozdział „A czy AN" napisany od nowa w schemacie TO BE."""

A_AN = {
    "id": "a_an",
    "name": "A czy AN — przedimek nieokreślony",
    "emoji": "🅰️",
    "level": "A1",
    "order": 2,
    "short": "Małe słówko przed rzeczownikiem, którego po polsku nie ma: a car, an apple.",
    "intro": (
        "Po polsku mówimy „Mam samochód”. Po angielsku samo „I have car” brzmi niepełnie — "
        "przed rzeczownikiem w liczbie pojedynczej MUSI stać przedimek: I have A car. "
        "A i AN znaczą to samo („jakiś, jeden z wielu”); różnica jest tylko w brzmieniu następnego "
        "słowa. Ten rozdział wyjaśnia, skąd bierze się przedimek, kiedy A, kiedy AN, kiedy nic — "
        "i gdzie Polacy najczęściej go gubią (zawody!)."
    ),
    "cheatsheet": {
        "title": "A / AN / nic — w skrócie",
        "head": ["Sytuacja", "Przedimek", "Przykład"],
        "rows": [
            ["następne słowo zaczyna się od DŹWIĘKU spółgłoski", "a", "a car, a big apple, a university (ju-)"],
            ["następne słowo zaczyna się od DŹWIĘKU samogłoski", "an", "an apple, an old car, an hour (nieme h)"],
            ["liczba mnoga", "— (nic)", "cars, apples"],
            ["rzecz niepoliczalna (woda, mleko, czas)", "— (nic)", "water, milk, time"],
            ["zawód, kim ktoś jest", "a / an", "She is a nurse. He is an engineer."],
            ["coś konkretnego, znanego obu stronom", "the", "the car (ten konkretny) — osobny rozdział"],
        ],
        "note": "Liczy się DŹWIĘK, nie litera: an hour (h nieme), a university (czytane „ju”), an MP (czytane „em”).",
    },
    "pages": [
        {
            "title": "Skąd się bierze A i AN",
            "sections": [
                {
                    "title": "Jeden z wielu",
                    "emoji": "💡", "color": "indigo",
                    "text": (
                        "A / AN pochodzi od słowa „one” (jeden). Znaczy: „jakiś, jeden z wielu, dowolny”. "
                        "Kiedy mówisz „I need a pen”, nie chodzi o konkretny długopis — o jakikolwiek.\n"
                        "Po polsku tego słowa nie ma, więc mózg Polaka je pomija. Po angielsku rzeczownik "
                        "w liczbie pojedynczej bez przedimka brzmi jak niedokończone zdanie."
                    ),
                    "examples": [
                        ["I have a dog.", "Mam psa. (jakiegoś, jednego)"],
                        ["She wants an apple.", "Ona chce jabłko."],
                        ["Is there a shop near here?", "Czy jest tu gdzieś sklep?"],
                    ],
                    "examples_work": [
                        ["I need a pallet.", "Potrzebuję palety."],
                        ["There is an empty box here.", "Jest tu puste pudło."],
                        ["Do you have a scanner?", "Masz skaner?"],
                    ],
                },
                {
                    "title": "A czy AN: decyduje DŹWIĘK następnego słowa",
                    "emoji": "👂", "color": "teal",
                    "text": (
                        "A — gdy następne słowo zaczyna się od dźwięku spółgłoski: a car, a table, a big dog.\n"
                        "AN — gdy następne słowo zaczyna się od dźwięku samogłoski (a, e, i, o, u): an apple, an egg, "
                        "an idea, an old man.\n"
                        "Uwaga: patrz na słowo BEZPOŚREDNIO po przedimku. „an apple”, ale „a red apple” "
                        "— bo po przedimku stoi „red”."
                    ),
                    "table": {
                        "head": ["A + spółgłoska", "AN + samogłoska"],
                        "rows": [
                            ["a book", "an egg"],
                            ["a house", "an idea"],
                            ["a red apple", "an apple"],
                            ["a big elephant", "an elephant"],
                        ],
                    },
                    "examples": [
                        ["an orange, a big orange", "pomarańcza, duża pomarańcza"],
                        ["an umbrella, a black umbrella", "parasol, czarny parasol"],
                        ["a friend, an old friend", "przyjaciel, stary przyjaciel"],
                    ],
                    "examples_work": [
                        ["an order, a big order", "zamówienie, duże zamówienie"],
                        ["an aisle, a long aisle", "alejka, długa alejka"],
                        ["a forklift, an electric forklift", "wózek widłowy, elektryczny wózek"],
                    ],
                    "tip": "Powiedz na głos. Jeśli „a” zlewa się z następnym słowem (a-apple), to potrzebne jest AN.",
                },
            ],
        },
        {
            "title": "Pułapki: nieme H i „ju”",
            "sections": [
                {
                    "title": "an hour, ale a university",
                    "emoji": "⚠️", "color": "gold",
                    "text": (
                        "Litera to nie dźwięk. W „hour” H jest nieme — słyszysz „aur”, samogłoskę → AN hour.\n"
                        "W „university” U czyta się „ju” — to dźwięk spółgłoski → A university.\n"
                        "Podobnie: an honest man (nieme h), a European country (czytane „ju”), a one-way street (czytane „łan”)."
                    ),
                    "table": {
                        "head": ["Pisownia", "Brzmienie", "Przedimek"],
                        "rows": [
                            ["hour", "aur", "an hour"],
                            ["honest", "onest", "an honest man"],
                            ["university", "ju-ni-", "a university"],
                            ["European", "ju-ro-", "a European"],
                            ["uniform", "ju-ni-", "a uniform"],
                            ["one", "łan", "a one-way street"],
                        ],
                    },
                    "examples": [
                        ["I'll be back in an hour.", "Wrócę za godzinę."],
                        ["She studies at a university.", "Ona studiuje na uniwersytecie."],
                        ["He is an honest person.", "On jest uczciwą osobą."],
                    ],
                    "examples_work": [
                        ["The break is an hour long.", "Przerwa trwa godzinę."],
                        ["You need a uniform.", "Potrzebujesz munduru."],
                        ["It's a one-way road.", "To droga jednokierunkowa."],
                    ],
                },
                {
                    "title": "Skróty: liczy się NAZWA litery",
                    "emoji": "🔡", "color": "indigo",
                    "text": (
                        "Przy skrótach czytanych literami liczy się to, jak brzmi nazwa pierwszej litery:\n"
                        "an MP („em”), an SMS („es”), an FBI agent („ef”) — ale a USB cable („ju”), a BMW („bi”)."
                    ),
                    "examples": [
                        ["Send me an SMS.", "Wyślij mi SMS-a."],
                        ["I need a USB cable.", "Potrzebuję kabla USB."],
                        ["She is an HR manager.", "Ona jest menedżerką HR."],
                    ],
                    "examples_work": [
                        ["We need an ID badge.", "Potrzebujemy identyfikatora."],
                        ["Take a PPE kit.", "Weź zestaw ochronny."],
                        ["He is an HGV driver.", "On jest kierowcą ciężarówki."],
                    ],
                },
            ],
        },
        {
            "title": "Kiedy przedimka NIE ma",
            "sections": [
                {
                    "title": "Liczba mnoga i rzeczy niepoliczalne",
                    "emoji": "⛔", "color": "rose",
                    "text": (
                        "A / AN znaczy „jeden”, więc nie łączy się z liczbą mnogą: „a cars” nie istnieje — mówimy "
                        "„cars” albo „some cars”.\n"
                        "Nie łączy się też z rzeczami, których nie liczymy na sztuki: water, milk, money, time, "
                        "information, advice. Nie mówimy „a water” — mówimy „water” albo „a glass of water”."
                    ),
                    "table": {
                        "head": ["Z A/AN (jeden, policzalny)", "Bez (mnoga / niepoliczalny)"],
                        "rows": [
                            ["a car", "cars"],
                            ["an apple", "apples"],
                            ["a bottle of water", "water"],
                            ["a piece of advice", "advice"],
                        ],
                    },
                    "examples": [
                        ["I like apples. (nie: a apples)", "Lubię jabłka."],
                        ["Can I have some water?", "Mogę prosić o wodę?"],
                        ["We need information.", "Potrzebujemy informacji."],
                    ],
                    "examples_work": [
                        ["We need boxes. (nie: a boxes)", "Potrzebujemy pudeł."],
                        ["There is water on the floor.", "Na podłodze jest woda."],
                        ["I need some tape.", "Potrzebuję taśmy."],
                    ],
                },
                {
                    "title": "A/AN a THE — na razie tylko rozróżnij",
                    "emoji": "🔎", "color": "teal",
                    "text": (
                        "A / AN = jakiś, jeden z wielu. THE = ten konkretny, o którym oboje wiemy.\n"
                        "„I bought a phone. The phone is black.” — pierwszy raz: jakiś telefon (a); "
                        "drugi raz: ten telefon, o którym mówię (the). Przedimek THE ma osobny rozdział; "
                        "tu wystarczy, że widzisz różnicę."
                    ),
                    "examples": [
                        ["I have a cat. The cat is old.", "Mam kota. Ten kot jest stary."],
                        ["There's a man at the door.", "Jakiś mężczyzna jest przy drzwiach."],
                        ["Open the window, please.", "Otwórz okno (to konkretne)."],
                    ],
                    "examples_work": [
                        ["There's a truck at the gate. The truck is late.", "Przy bramie jest ciężarówka. Ta ciężarówka się spóźnia."],
                        ["Take a pallet. Put the pallet here.", "Weź paletę. Postaw tę paletę tutaj."],
                        ["Close the door.", "Zamknij drzwi (te konkretne)."],
                    ],
                },
            ],
        },
        {
            "title": "Zawody i „kim jesteś”",
            "sections": [
                {
                    "title": "She is A nurse — tu Polacy gubią przedimek najczęściej",
                    "emoji": "👩‍⚕️", "color": "gold",
                    "text": (
                        "Po polsku: „Jestem kierowcą”. Po angielsku ZAWSZE z przedimkiem: „I am A driver”. "
                        "Bez przedimka („I am driver”) zdanie jest błędne i brzmi obco.\n"
                        "Dotyczy to każdego zawodu i roli: a student, a teacher, an engineer, a mother, a fan."
                    ),
                    "examples": [
                        ["I am a student.", "Jestem studentem."],
                        ["She is an engineer.", "Ona jest inżynierem."],
                        ["My father is a teacher.", "Mój tata jest nauczycielem."],
                    ],
                    "examples_work": [
                        ["I am a forklift driver.", "Jestem operatorem wózka."],
                        ["He is an operator.", "On jest operatorem."],
                        ["She is a team leader.", "Ona jest liderką zespołu."],
                    ],
                    "tip": "Test: jeśli możesz zapytać „Kim jesteś? — X”, to przed X musi być a / an.",
                },
                {
                    "title": "A w wyrażeniach z liczbą i częstością",
                    "emoji": "🔢", "color": "indigo",
                    "text": (
                        "A / AN pojawia się też tam, gdzie po polsku mówimy „raz”, „na”, „za”:\n"
                        "twice a week (dwa razy w tygodniu), £10 an hour (10 funtów za godzinę), "
                        "a hundred (sto), a lot of (dużo), a few (kilka), half an hour (pół godziny)."
                    ),
                    "examples": [
                        ["I go to the gym twice a week.", "Chodzę na siłownię dwa razy w tygodniu."],
                        ["It costs a hundred pounds.", "To kosztuje sto funtów."],
                        ["Wait half an hour.", "Poczekaj pół godziny."],
                    ],
                    "examples_work": [
                        ["We get £12 an hour.", "Dostajemy 12 funtów za godzinę."],
                        ["The truck comes once a day.", "Ciężarówka przyjeżdża raz dziennie."],
                        ["There are a lot of orders today.", "Dziś jest dużo zamówień."],
                    ],
                },
            ],
        },
    ],
    "practice": [
        {"type": "choice", "text": "I have ___ dog.", "options": ["a", "an", "—"], "answer": 0,
         "pl": "Mam psa.",
         "why": "„Dog” zaczyna się od dźwięku spółgłoski → a.",
         "why_not": {"an": "AN tylko przed dźwiękiem samogłoski (an apple).", "—": "Rzeczownik pojedynczy, policzalny → przedimek jest konieczny."}},
        {"type": "choice", "text": "She wants ___ apple.", "options": ["a", "an", "—"], "answer": 1,
         "pl": "Ona chce jabłko.",
         "why": "„Apple” zaczyna się od samogłoski → an.",
         "why_not": {"a": "„A apple” zlewa się w wymowie — dlatego jest AN.", "—": "Jedno jabłko → przedimek konieczny."}},
        {"type": "choice", "text": "It's ___ red apple.", "options": ["a", "an", "the"], "answer": 0,
         "pl": "To czerwone jabłko.",
         "why": "Po przedimku stoi „red” (spółgłoska) → a. Patrzymy na NASTĘPNE słowo, nie na rzeczownik.",
         "why_not": {"an": "AN byłoby przed „apple”, ale tu po przedimku jest „red”.", "the": "THE = to konkretne jabłko; tu mówimy „jakieś, jedno”."}},
        {"type": "choice", "text": "I'll be back in ___ hour.", "options": ["a", "an", "—"], "answer": 1,
         "pl": "Wrócę za godzinę.",
         "why": "H w „hour” jest nieme — słyszysz samogłoskę → an.",
         "why_not": {"a": "Liczy się dźwięk, nie litera: „hour” brzmi „aur”.", "—": "Jedna godzina → przedimek konieczny."}},
        {"type": "choice", "text": "He studies at ___ university.", "options": ["a", "an", "—"], "answer": 0,
         "pl": "On studiuje na uniwersytecie.",
         "why": "„University” czyta się „ju-” — dźwięk spółgłoski → a.",
         "why_not": {"an": "Litera U, ale dźwięk „ju” — spółgłoska.", "—": "Jeden uniwersytet → przedimek konieczny."}},
        {"type": "choice", "text": "My sister is ___ nurse.", "options": ["a", "—", "the"], "answer": 0,
         "pl": "Moja siostra jest pielęgniarką.",
         "why": "Zawód zawsze z przedimkiem: a nurse.",
         "why_not": {"—": "Po polsku bez, po angielsku ZAWSZE „is a nurse”.", "the": "THE wskazywałoby konkretną pielęgniarkę (tę jedyną)."}},
        {"type": "choice", "text": "I like ___ apples.", "options": ["—", "a", "an"], "answer": 0,
         "pl": "Lubię jabłka.",
         "why": "Liczba mnoga — bez a / an.",
         "why_not": {"a": "A znaczy „jeden” — nie łączy się z liczbą mnogą.", "an": "To samo: AN to „jeden”."}},
        {"type": "choice", "text": "Can I have ___ water?", "options": ["some", "a", "an"], "answer": 0,
         "pl": "Mogę prosić o wodę?",
         "why": "Woda jest niepoliczalna — bez a / an. „Some water” albo „a glass of water”.",
         "why_not": {"a": "„A water” — wody nie liczymy na sztuki.", "an": "Jak wyżej; poza tym „water” zaczyna się spółgłoską."}},
        {"type": "gap", "text": "She is ___ engineer.", "answer": "an",
         "pl": "Ona jest inżynierem.", "hint": "zawód + jak brzmi pierwsze słowo?",
         "why_not": {"a": "„Engineer” zaczyna się od samogłoski → an.", "the": "Zawód, jeden z wielu → a / an."}},
        {"type": "gap", "text": "This is ___ big house.", "answer": "a",
         "pl": "To duży dom.", "hint": "patrz na słowo tuż po przedimku",
         "why_not": {"an": "Po przedimku stoi „big” — spółgłoska.", "the": "„Jakiś duży dom”, nie konkretny."}},
        {"type": "gap", "text": "Send me ___ SMS.", "answer": "an",
         "pl": "Wyślij mi SMS-a.", "hint": "jak brzmi nazwa litery S?",
         "why_not": {"a": "Litera S brzmi „es” — samogłoska na początku → an."}},
        {"type": "fix", "wrong": "I am driver in a warehouse.", "bad": 2, "right": "a driver",
         "fixed": "I am a driver in a warehouse.", "pl": "Jestem kierowcą w magazynie.",
         "why": "Zawód wymaga przedimka: a driver."},
        {"type": "fix", "wrong": "We have a old car.", "bad": 2, "right": "an",
         "fixed": "We have an old car.", "pl": "Mamy stary samochód.",
         "why": "„Old” zaczyna się od samogłoski → an old car."},
        {"type": "order", "en": "There is an orange on the table.", "pl": "Na stole jest pomarańcza.",
         "why": "There is + an orange (samogłoska) + miejsce."},
        {"type": "listen_choice", "en": "He is an honest man.", "text": "Posłuchaj. Który przedimek słyszysz i dlaczego?",
         "options": ["an — bo H w „honest” jest nieme", "a — bo „honest” zaczyna się od spółgłoski", "the — bo to konkretny człowiek"], "answer": 0,
         "why": "„Honest” brzmi „onest” — samogłoska → an.",
         "why_not": {"a — bo „honest” zaczyna się od spółgłoski": "Litera H tak, ale dźwięku H nie ma.", "the — bo to konkretny człowiek": "Słychać wyraźnie „an”."}},
        {"type": "listen_choice", "en": "I need a uniform and an ID badge.", "text": "Posłuchaj. Co znaczy to zdanie?",
         "options": ["Potrzebuję munduru i identyfikatora.", "Potrzebuję mundurów i identyfikatorów.", "Mam mundur i identyfikator."], "answer": 0,
         "why": "a uniform (ju-), an ID (aj-) — liczba pojedyncza; „need” = potrzebować.",
         "why_not": {"Potrzebuję mundurów i identyfikatorów.": "Słychać a / an — liczba pojedyncza.", "Mam mundur i identyfikator.": "Słychać „need”, nie „have”."}},
        {"type": "listen", "en": "My brother is a teacher.", "pl": "Mój brat jest nauczycielem.",
         "why": "Zawód → a teacher."},
        {"type": "cloze", "text": "Uzupełnij tekst — wybierz a / an / nic (—):",
         "body": "I am [[a|an|—]] driver. I have [[an|a|—]] old van. Every day I drive for [[an|a|—]] hour to work. "
                 "My wife is [[a|an|—]] nurse and my son is [[a|an|—]] student at [[a|an|—]] university. We like [[—|a|an]] dogs — we have two.",
         "pl": "Jestem kierowcą. Mam starą furgonetkę. Codziennie jadę godzinę do pracy. Moja żona jest pielęgniarką, a syn studentem na uniwersytecie. Lubimy psy — mamy dwa.",
         "why": "zawody → a/an · old (samogłoska) → an · hour (nieme h) → an · university (ju) → a · dogs (mnoga) → nic."},
        {"type": "match", "pairs": [["hour", "an"], ["university", "a"], ["egg", "an"], ["house", "a"], ["idea", "an"]]},
    ],
    "test": [
        {"type": "choice", "text": "She has ___ umbrella.", "options": ["a", "an", "—"], "answer": 1,
         "pl": "Ona ma parasol.",
         "why": "„Umbrella” brzmi „am-” — samogłoska → an.",
         "why_not": {"a": "Tu U brzmi jak samogłoska (inaczej niż w „university”).", "—": "Jeden parasol → przedimek konieczny."}},
        {"type": "choice", "text": "He is ___ doctor.", "options": ["—", "a", "an"], "answer": 1,
         "pl": "On jest lekarzem.",
         "why": "Zawód → a doctor.",
         "why_not": {"—": "Zawód zawsze z przedimkiem.", "an": "„Doctor” zaczyna się spółgłoską."}},
        {"type": "gap", "text": "It takes ___ hour.", "answer": "an",
         "pl": "To zajmuje godzinę.",
         "why_not": {"a": "Nieme H → an hour."}},
        {"type": "choice", "text": "We need ___ information.", "options": ["—", "a", "an"], "answer": 0,
         "pl": "Potrzebujemy informacji.",
         "why": "„Information” jest niepoliczalne — bez a / an.",
         "why_not": {"a": "Informacji nie liczymy na sztuki.", "an": "Jak wyżej — niepoliczalne."}},
        {"type": "choice", "text": "This is ___ European company.", "options": ["a", "an", "—"], "answer": 0,
         "pl": "To europejska firma.",
         "why": "„European” czyta się „ju-” → a.",
         "why_not": {"an": "Litera E, ale dźwięk „ju”.", "—": "Jedna firma → przedimek konieczny."}},
        {"type": "fix", "wrong": "My mother is teacher.", "bad": 3, "right": "a teacher",
         "fixed": "My mother is a teacher.", "pl": "Moja mama jest nauczycielką.",
         "why": "Zawód → a teacher."},
        {"type": "listen_choice", "en": "I have a cat and an old dog.", "text": "Posłuchaj. Co znaczy to zdanie?",
         "options": ["Mam kota i starego psa.", "Mam koty i stare psy.", "Mam kota i psa."], "answer": 0,
         "why": "a cat, an old dog — liczba pojedyncza, „old” = stary.",
         "why_not": {"Mam koty i stare psy.": "Słychać a / an → pojedyncza.", "Mam kota i psa.": "Zabrakło „old”."}},
        {"type": "listen", "en": "There is an egg in the fridge.", "pl": "W lodówce jest jajko.",
         "why": "an egg (samogłoska), the fridge (ta konkretna lodówka)."},
        {"type": "cloze", "text": "Uzupełnij:",
         "body": "Anna is [[an|a|—]] engineer. She works in [[a|an|—]] big factory. She drinks [[—|a|an]] coffee every morning and eats [[an|a|—]] apple for lunch. "
                 "She goes to the gym twice [[a|an|—]] week.",
         "pl": "Anna jest inżynierem. Pracuje w dużej fabryce. Codziennie rano pije kawę i je jabłko na lunch. Chodzi na siłownię dwa razy w tygodniu.",
         "why": "engineer → an · big → a · coffee (niepoliczalne) → nic · apple → an · twice a week."},
    ],
}

if __name__ == "__main__":
    import json, os
    path = os.path.join(os.path.dirname(__file__), "..", "data", "podstawy", "kursy.json")
    d = json.load(open(path, encoding="utf-8"))
    d["topics"] = [A_AN if t["id"] == "a_an" else t for t in d["topics"]]
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("a_an zapisane:", len(A_AN["pages"]), "stron,", len(A_AN["practice"]), "ćwiczeń,", len(A_AN["test"]), "pytań")
