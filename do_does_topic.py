# -*- coding: utf-8 -*-
"""Rozdział „DO i DOES" napisany od nowa w schemacie TO BE (tools/to_be_topic.py)."""

DO_DOES = {
    "id": "do_does",
    "name": "DO i DOES — pytania i przeczenia (Present Simple)",
    "emoji": "❓",
    "level": "A1",
    "order": 4,
    "short": "Pomocnik do pytań i przeczeń ze zwykłymi czasownikami: work, like, go…",
    "intro": (
        "Po polsku, żeby zapytać, wystarczy zmienić intonację: „Pracujesz tu?”. Po angielsku "
        "zwykły czasownik (work, like, go, have) NIE potrafi sam zrobić pytania ani przeczenia. "
        "Potrzebuje pomocnika — i tym pomocnikiem jest DO (a przy he / she / it: DOES). "
        "W zdaniu twierdzącym pomocnika nie ma. Ten rozdział pokazuje, kiedy DO, kiedy DOES, "
        "co się dzieje z końcówką -s i dlaczego przy TO BE pomocnik nie jest potrzebny."
    ),
    "cheatsheet": {
        "title": "DO / DOES — pytanie, przeczenie, krótka odpowiedź",
        "head": ["Osoba", "Twierdzenie (+)", "Pytanie (?)", "Przeczenie (−)", "Krótka odpowiedź"],
        "rows": [
            ["I / you / we / they", "I work", "Do I work?", "I don't work", "Yes, I do. / No, I don't."],
            ["he / she / it", "he works", "Does he work?", "he doesn't work", "Yes, he does. / No, he doesn't."],
            ["TO BE (am/is/are)", "she is here", "Is she here?", "she isn't here", "Yes, she is. / No, she isn't."],
            ["can / must", "he can swim", "Can he swim?", "he can't swim", "Yes, he can. / No, he can't."],
        ],
        "note": "Po DO / DOES / DON'T / DOESN'T czasownik zawsze w formie podstawowej: Does he WORK? (nie: works). "
                "Końcówka -s zostaje tylko w zdaniu twierdzącym: he works.",
    },
    "pages": [
        {
            "title": "Po co w ogóle jest DO",
            "sections": [
                {
                    "title": "Zwykły czasownik nie umie zapytać",
                    "emoji": "💡", "color": "indigo",
                    "text": (
                        "Zdanie „You work here.” jest twierdzeniem. Żeby z niego zrobić pytanie, po polsku "
                        "zmieniasz tylko ton głosu. Po angielsku „You work here?” brzmi jak zdziwienie, a nie "
                        "pytanie. Prawdziwe pytanie potrzebuje słowa-pomocnika na początku: „DO you work here?”.\n"
                        "To samo z przeczeniem: nie ma „I work not”. Jest „I DO NOT work” (I don't work).\n"
                        "DO nic nie znaczy — nie tłumaczy się go na polski. To tylko sygnał: „uwaga, pytanie” "
                        "albo „uwaga, przeczenie”."
                    ),
                    "examples": [
                        ["Do you like coffee?", "Lubisz kawę?"],
                        ["I don't like tea.", "Nie lubię herbaty."],
                        ["Do they live here?", "Czy oni tu mieszkają?"],
                    ],
                    "examples_work": [
                        ["Do you work on Saturdays?", "Pracujesz w soboty?"],
                        ["I don't have a scanner.", "Nie mam skanera."],
                        ["Do they start at six?", "Czy oni zaczynają o szóstej?"],
                    ],
                },
                {
                    "title": "W zdaniu twierdzącym DO nie ma",
                    "emoji": "⛔", "color": "rose",
                    "text": (
                        "Pomocnik pojawia się TYLKO w pytaniu i przeczeniu. W zwykłym zdaniu go nie ma: "
                        "„I work here.”, a nie „I do work here.” (to znaczy „naprawdę tu pracuję” — mocne podkreślenie, "
                        "rzadko potrzebne).\n"
                        "Zapamiętaj trójkę: twierdzenie BEZ do · pytanie Z do · przeczenie Z don't."
                    ),
                    "examples": [
                        ["We live in Kraków.", "Mieszkamy w Krakowie. (bez do)"],
                        ["Do we live in Kraków?", "Czy mieszkamy w Krakowie? (z do)"],
                        ["We don't live in Kraków.", "Nie mieszkamy w Krakowie. (z don't)"],
                    ],
                    "examples_work": [
                        ["I drive a forklift.", "Jeżdżę wózkiem widłowym. (bez do)"],
                        ["Do you drive a forklift?", "Jeździsz wózkiem widłowym? (z do)"],
                        ["I don't drive a forklift.", "Nie jeżdżę wózkiem widłowym. (z don't)"],
                    ],
                },
            ],
        },
        {
            "title": "DO czy DOES — kto dostaje które",
            "sections": [
                {
                    "title": "DOES tylko dla he / she / it",
                    "emoji": "👤", "color": "teal",
                    "text": (
                        "Ta sama zasada co przy „is”: trzecia osoba liczby pojedynczej (on, ona, ono — a także "
                        "„mój brat”, „ta firma”, „ten telefon”) dostaje osobną formę. Wszyscy pozostali: DO.\n"
                        "DO — I, you, we, they (i każda liczba mnoga: my parents, the boxes)\n"
                        "DOES — he, she, it (i każda pojedyncza osoba lub rzecz: my boss, the machine)"
                    ),
                    "table": {
                        "head": ["Podmiot", "Pomocnik", "Przykład"],
                        "rows": [
                            ["I / you / we / they", "DO", "Do you know him?"],
                            ["my parents, the boxes (mnoga)", "DO", "Do the boxes fit?"],
                            ["he / she / it", "DOES", "Does she know him?"],
                            ["my boss, the machine (pojedyncza)", "DOES", "Does the machine work?"],
                        ],
                    },
                    "examples": [
                        ["Does your sister live here?", "Czy twoja siostra tu mieszka?"],
                        ["Do your parents live here?", "Czy twoi rodzice tu mieszkają?"],
                        ["Does it work?", "Czy to działa?"],
                    ],
                    "examples_work": [
                        ["Does the manager speak Polish?", "Czy kierownik mówi po polsku?"],
                        ["Do the drivers wear vests?", "Czy kierowcy noszą kamizelki?"],
                        ["Does the scanner work?", "Czy skaner działa?"],
                    ],
                },
                {
                    "title": "Końcówka -s przenosi się na DOES",
                    "emoji": "⚠️", "color": "gold",
                    "text": (
                        "Najczęstszy błąd Polaków. W twierdzeniu mówimy „She workS”. W pytaniu i przeczeniu "
                        "to -s przechodzi na pomocnika (doeS), a czasownik wraca do formy podstawowej:\n"
                        "She works. → Does she work? → She doesn't work.\n"
                        "Dwa razy -s (Does she works?) to błąd — końcówka jest tylko RAZ, zawsze na pomocniku."
                    ),
                    "examples": [
                        ["He likes football. → Does he like football?", "On lubi piłkę. → Czy on lubi piłkę?"],
                        ["She has a car. → She doesn't have a car.", "Ona ma samochód. → Ona nie ma samochodu."],
                        ["It costs a lot. → Does it cost a lot?", "To dużo kosztuje. → Czy to dużo kosztuje?"],
                    ],
                    "examples_work": [
                        ["He starts at six. → Does he start at six?", "On zaczyna o szóstej. → Czy on zaczyna o szóstej?"],
                        ["She checks the labels. → She doesn't check the labels.", "Ona sprawdza etykiety. → Ona nie sprawdza etykiet."],
                        ["The truck leaves at noon. → Does the truck leave at noon?", "Ciężarówka odjeżdża w południe. → Czy…?"],
                    ],
                    "tip": "Zasada jednego -s: albo na czasowniku (works), albo na pomocniku (does) — nigdy na obu.",
                },
            ],
        },
        {
            "title": "Przeczenie i krótkie odpowiedzi",
            "sections": [
                {
                    "title": "don't / doesn't",
                    "emoji": "🚫", "color": "rose",
                    "text": (
                        "Przeczenie = pomocnik + not: do not → don't, does not → doesn't. Skrót jest normalny w mowie "
                        "i w wiadomościach; pełna forma brzmi oficjalnie albo stanowczo.\n"
                        "Przeczenie stoi PRZED czasownikiem: I don't KNOW. She doesn't LIKE it."
                    ),
                    "table": {
                        "head": ["Osoba", "Pełna forma", "Skrót"],
                        "rows": [
                            ["I / you / we / they", "do not work", "don't work"],
                            ["he / she / it", "does not work", "doesn't work"],
                        ],
                    },
                    "examples": [
                        ["I don't understand.", "Nie rozumiem."],
                        ["He doesn't smoke.", "On nie pali."],
                        ["We don't have time.", "Nie mamy czasu."],
                    ],
                    "examples_work": [
                        ["I don't have a badge.", "Nie mam identyfikatora."],
                        ["She doesn't work nights.", "Ona nie pracuje na nocki."],
                        ["They don't use this door.", "Oni nie używają tych drzwi."],
                    ],
                },
                {
                    "title": "Krótka odpowiedź powtarza pomocnika",
                    "emoji": "💬", "color": "indigo",
                    "text": (
                        "Anglicy rzadko odpowiadają samym „Yes” — brzmi to sucho. Dodają pomocnika z pytania:\n"
                        "Do you like it? — Yes, I do. / No, I don't.\n"
                        "Does she work here? — Yes, she does. / No, she doesn't.\n"
                        "Nie powtarza się całego czasownika: nie „Yes, I like”, tylko „Yes, I do”."
                    ),
                    "examples": [
                        ["Do you speak English? — Yes, I do.", "Mówisz po angielsku? — Tak."],
                        ["Does he live here? — No, he doesn't.", "Czy on tu mieszka? — Nie."],
                        ["Do they know? — Yes, they do.", "Czy oni wiedzą? — Tak."],
                    ],
                    "examples_work": [
                        ["Do you have a licence? — Yes, I do.", "Masz uprawnienia? — Tak."],
                        ["Does the line stop at 12? — No, it doesn't.", "Czy linia staje o 12? — Nie."],
                        ["Do we need gloves? — Yes, you do.", "Potrzebujemy rękawic? — Tak."],
                    ],
                },
            ],
        },
        {
            "title": "Kiedy DO NIE jest potrzebne",
            "sections": [
                {
                    "title": "TO BE radzi sobie samo",
                    "emoji": "🔤", "color": "teal",
                    "text": (
                        "Pamiętasz z rozdziału o TO BE: am / is / are robią pytanie przez przestawienie "
                        "(Are you…?) i przeczenie samym NOT (I'm not). Nie potrzebują pomocnika.\n"
                        "Błąd: „Do you are tired?” — dwa czasowniki naraz. Poprawnie: „Are you tired?”.\n"
                        "Jak rozpoznać? Jeśli w zdaniu jest am / is / are — DO nie ma wstępu. Jeśli jest inny "
                        "czasownik (work, like, have…) — DO jest konieczne."
                    ),
                    "table": {
                        "head": ["W zdaniu jest…", "Pytanie", "Przeczenie"],
                        "rows": [
                            ["am / is / are", "Are you tired?", "I'm not tired."],
                            ["inny czasownik (work, like…)", "Do you work?", "I don't work."],
                        ],
                    },
                    "examples": [
                        ["Are you hungry? (nie: Do you are hungry?)", "Jesteś głodny?"],
                        ["Do you want lunch? (nie: Are you want lunch?)", "Chcesz obiad?"],
                        ["Is he a driver? / Does he drive?", "Czy on jest kierowcą? / Czy on jeździ?"],
                    ],
                    "examples_work": [
                        ["Are you on the morning shift?", "Jesteś na porannej zmianie?"],
                        ["Do you work the morning shift?", "Pracujesz na porannej zmianie?"],
                        ["Is the gate open? / Does the gate open at 6?", "Czy brama jest otwarta? / Czy brama otwiera się o 6?"],
                    ],
                },
                {
                    "title": "can, must, will — też same",
                    "emoji": "🔑", "color": "gold",
                    "text": (
                        "Czasowniki modalne (can, could, must, will, should) działają jak TO BE: same robią pytanie "
                        "przez przestawienie i przeczenie przez NOT. „Do you can swim?” to błąd — poprawnie „Can you swim?”."
                    ),
                    "examples": [
                        ["Can you help me?", "Możesz mi pomóc?"],
                        ["I can't hear you.", "Nie słyszę cię."],
                        ["Must we go?", "Musimy iść?"],
                    ],
                    "examples_work": [
                        ["Can you lift 20 kilos?", "Możesz podnieść 20 kilo?"],
                        ["I can't find the pallet.", "Nie mogę znaleźć palety."],
                        ["Will the truck come today?", "Czy ciężarówka przyjedzie dziś?"],
                    ],
                },
            ],
        },
        {
            "title": "Pytania ze słówkiem pytającym",
            "sections": [
                {
                    "title": "Where do you…? What does she…?",
                    "emoji": "🧭", "color": "indigo",
                    "text": (
                        "Słówko pytające (what, where, when, why, how, who) idzie na sam początek, a potem "
                        "wszystko jak zwykle: pomocnik + osoba + czasownik.\n"
                        "Where DO you live? · What DOES she do? · When DO they start?\n"
                        "Ciekawostka: „What do you do?” znaczy „Czym się zajmujesz?” — pierwsze do to pomocnik, "
                        "drugie do to zwykły czasownik „robić”."
                    ),
                    "table": {
                        "head": ["Słówko", "Pomocnik", "Osoba", "Czasownik", "Znaczenie"],
                        "rows": [
                            ["Where", "do", "you", "live?", "Gdzie mieszkasz?"],
                            ["What", "does", "she", "do?", "Czym ona się zajmuje?"],
                            ["When", "do", "they", "start?", "Kiedy oni zaczynają?"],
                            ["Why", "doesn't", "he", "come?", "Czemu on nie przychodzi?"],
                        ],
                    },
                    "examples": [
                        ["Where do you work?", "Gdzie pracujesz?"],
                        ["What time does the shop open?", "O której otwiera się sklep?"],
                        ["How do you spell it?", "Jak to się pisze?"],
                    ],
                    "examples_work": [
                        ["Where do you put the empty pallets?", "Gdzie kładziecie puste palety?"],
                        ["What time does the shift end?", "O której kończy się zmiana?"],
                        ["How does this scanner work?", "Jak działa ten skaner?"],
                    ],
                },
            ],
        },
    ],
    "practice": [
        {"type": "choice", "text": "___ you like coffee?", "options": ["Do", "Does", "Are"], "answer": 0,
         "pl": "Lubisz kawę?",
         "why": "„Like” to zwykły czasownik → potrzebny pomocnik. You → DO.",
         "why_not": {"Does": "DOES jest dla he / she / it, nie dla you.",
                     "Are": "ARE to TO BE — tu jest inny czasownik (like), więc pomocnikiem jest DO."}},
        {"type": "choice", "text": "___ your brother work here?", "options": ["Do", "Does", "Is"], "answer": 1,
         "pl": "Czy twój brat tu pracuje?",
         "why": "Your brother = he → DOES. Czasownik „work” w formie podstawowej.",
         "why_not": {"Do": "DO jest dla I / you / we / they. Brat to jedna osoba (he).",
                     "Is": "IS to TO BE — ale w zdaniu jest czasownik „work”, więc trzeba DOES."}},
        {"type": "choice", "text": "She ___ like fish.", "options": ["don't", "doesn't", "isn't"], "answer": 1,
         "pl": "Ona nie lubi ryb.",
         "why": "She → DOESN'T + czasownik podstawowy (like).",
         "why_not": {"don't": "DON'T jest dla I / you / we / they.",
                     "isn't": "ISN'T to TO BE — tu jest czasownik „like”."}},
        {"type": "choice", "text": "Does he ___ English?", "options": ["speak", "speaks", "speaking"], "answer": 0,
         "pl": "Czy on mówi po angielsku?",
         "why": "Po DOES czasownik wraca do formy podstawowej — końcówka -s jest już na DOES.",
         "why_not": {"speaks": "Podwójne -s (does + speaks) to błąd. -s tylko RAZ.",
                     "speaking": "Forma -ing jest dla Present Continuous (is speaking), nie po does."}},
        {"type": "gap", "text": "___ they live in Warsaw?", "answer": "Do",
         "pl": "Czy oni mieszkają w Warszawie?", "hint": "they → który pomocnik?",
         "why_not": {"does": "DOES tylko dla he / she / it — they to liczba mnoga.",
                     "are": "ARE to TO BE; w zdaniu jest czasownik „live”."}},
        {"type": "gap", "text": "My mother ___ not drive.", "answer": "does", "accept": ["doesn't"],
         "pl": "Moja mama nie prowadzi auta.", "hint": "my mother = ona → pomocnik w przeczeniu",
         "why": "My mother = she → does not / doesn't.",
         "why_not": {"do": "DO jest dla I / you / we / they.", "is": "IS to TO BE — tu jest czasownik „drive”."}},
        {"type": "gap", "text": "I ___ understand this word.", "answer": "don't", "accept": ["do not"],
         "pl": "Nie rozumiem tego słowa.", "hint": "przeczenie przy I",
         "why_not": {"doesn't": "DOESN'T jest dla he / she / it.", "am not": "AM NOT to TO BE; tu jest czasownik „understand”."}},
        {"type": "choice", "text": "Które zdanie jest poprawne?",
         "options": ["Do you are tired?", "Are you tired?", "Does you tired?"], "answer": 1,
         "pl": "Jesteś zmęczony?",
         "why": "W zdaniu jest TO BE (are) → pytanie przez przestawienie, bez pomocnika.",
         "why_not": {"Do you are tired?": "Dwa czasowniki naraz (do + are). TO BE nie potrzebuje DO.",
                     "Does you tired?": "Brak czasownika i zły pomocnik dla you."}},
        {"type": "choice", "text": "Do you speak Polish? — Yes, I ___.",
         "options": ["speak", "do", "am"], "answer": 1,
         "pl": "Mówisz po polsku? — Tak.",
         "why": "Krótka odpowiedź powtarza pomocnika z pytania: Yes, I do.",
         "why_not": {"speak": "Nie powtarza się czasownika — tylko pomocnika.",
                     "am": "AM to TO BE; w pytaniu był pomocnik DO."}},
        {"type": "choice", "text": "Where ___ she work?", "options": ["do", "does", "is"], "answer": 1,
         "pl": "Gdzie ona pracuje?",
         "why": "Słówko pytające + DOES (she) + work.",
         "why_not": {"do": "She → DOES.", "is": "IS to TO BE; w zdaniu jest „work”."}},
        {"type": "fix", "wrong": "Does she works in a bank?", "bad": 2, "right": "work",
         "fixed": "Does she work in a bank?", "pl": "Czy ona pracuje w banku?",
         "why": "Po DOES czasownik bez -s. Końcówka jest już na pomocniku."},
        {"type": "fix", "wrong": "I not like this film.", "bad": 1, "right": "don't",
         "fixed": "I don't like this film.", "pl": "Nie lubię tego filmu.",
         "why": "Przeczenie zwykłego czasownika wymaga pomocnika: don't + like."},
        {"type": "order", "en": "Does your sister live here?", "pl": "Czy twoja siostra tu mieszka?",
         "why": "Pomocnik (does) → osoba (your sister) → czasownik (live) → reszta."},
        {"type": "order", "en": "We don't work on Sundays.", "pl": "Nie pracujemy w niedziele.",
         "why": "Osoba → don't → czasownik → reszta."},
        {"type": "listen_choice", "en": "Does he have a car?", "text": "Posłuchaj. Co znaczy to zdanie?",
         "options": ["Czy on ma samochód?", "On ma samochód.", "Czy oni mają samochód?"], "answer": 0,
         "why": "DOES na początku = pytanie; he = on; have a car = mieć samochód.",
         "why_not": {"On ma samochód.": "Zdanie zaczyna się od DOES — to pytanie.",
                     "Czy oni mają samochód?": "Słychać DOES HE — on, nie oni (they → do)."}},
        {"type": "listen_choice", "en": "I don't know her name.", "text": "Posłuchaj. Które zdanie usłyszałeś?",
         "options": ["I don't know her name.", "I know her name.", "Do you know her name?"], "answer": 0,
         "why": "Słychać DON'T — przeczenie.",
         "why_not": {"I know her name.": "Zabrakło DON'T, które wyraźnie słychać.",
                     "Do you know her name?": "To pytanie zaczynałoby się od DO YOU."}},
        {"type": "listen", "en": "Do you work here?", "pl": "Pracujesz tutaj?",
         "why": "Pomocnik DO + you + work."},
        {"type": "listen", "en": "She doesn't like coffee.", "pl": "Ona nie lubi kawy.",
         "why": "She → doesn't + like (bez -s)."},
        {"type": "cloze", "text": "Uzupełnij rozmowę:",
         "body": "A: [[Do|Does|Are]] you work in the city? B: No, I [[=don't]]. I work in a village. "
                 "A: [[Does|Do|Is]] your wife work? B: Yes, she [[=does]]. She [[=doesn't]] like it, but the money is good. "
                 "A: [[Are|Do|Does]] you happy there? B: Yes, we [[are|do|does]].",
         "pl": "A: Pracujesz w mieście? B: Nie. Pracuję na wsi. A: Czy twoja żona pracuje? B: Tak. Nie lubi tego, ale pieniądze są dobre. A: Jesteście tam szczęśliwi? B: Tak.",
         "why": "you → do/don't · your wife (she) → does/doesn't · „happy” to cecha → TO BE (are)."},
        {"type": "match", "pairs": [["I", "don't"], ["she", "doesn't"], ["they", "don't"], ["it", "doesn't"], ["we", "don't"]]},
    ],
    "test": [
        {"type": "choice", "text": "___ your parents speak English?", "options": ["Does", "Do", "Are"], "answer": 1,
         "pl": "Czy twoi rodzice mówią po angielsku?",
         "why": "Parents = they → DO.",
         "why_not": {"Does": "DOES tylko dla jednej osoby (he / she / it).", "Are": "W zdaniu jest czasownik „speak” → pomocnik DO, nie TO BE."}},
        {"type": "gap", "text": "___ she like her job?", "answer": "Does",
         "pl": "Czy ona lubi swoją pracę?",
         "why_not": {"do": "She → DOES.", "is": "IS to TO BE; tu jest czasownik „like”."}},
        {"type": "choice", "text": "He ___ have a car.", "options": ["don't", "doesn't", "hasn't"], "answer": 1,
         "pl": "On nie ma samochodu.",
         "why": "He → doesn't + have.",
         "why_not": {"don't": "DON'T jest dla I / you / we / they.", "hasn't": "„Hasn't” działa tylko w have got / czasach perfect — w Present Simple mówimy doesn't have."}},
        {"type": "choice", "text": "Które zdanie jest poprawne?",
         "options": ["Do you can swim?", "Can you swim?", "Does you swim can?"], "answer": 1,
         "pl": "Umiesz pływać?",
         "why": "CAN robi pytanie samo — bez DO.",
         "why_not": {"Do you can swim?": "Dwa pomocniki naraz (do + can) — błąd.", "Does you swim can?": "Zły szyk i zły pomocnik."}},
        {"type": "gap", "text": "Where ___ they live?", "answer": "do",
         "pl": "Gdzie oni mieszkają?",
         "why_not": {"does": "They → DO.", "are": "W zdaniu jest czasownik „live”."}},
        {"type": "fix", "wrong": "My brother don't eat meat.", "bad": 2, "right": "doesn't",
         "fixed": "My brother doesn't eat meat.", "pl": "Mój brat nie je mięsa.",
         "why": "My brother = he → doesn't."},
        {"type": "listen_choice", "en": "Do they start at seven?", "text": "Posłuchaj. Co znaczy to zdanie?",
         "options": ["Czy oni zaczynają o siódmej?", "Oni zaczynają o siódmej.", "Czy on zaczyna o siódmej?"], "answer": 0,
         "why": "DO THEY = pytanie o „oni”.",
         "why_not": {"Oni zaczynają o siódmej.": "Zdanie zaczyna się od DO — to pytanie.", "Czy on zaczyna o siódmej?": "Słychać THEY, nie HE."}},
        {"type": "choice", "text": "Does she work here? — No, she ___.", "options": ["doesn't", "isn't", "not"], "answer": 0,
         "pl": "Czy ona tu pracuje? — Nie.",
         "why": "Krótka odpowiedź powtarza pomocnika: No, she doesn't.",
         "why_not": {"isn't": "W pytaniu był DOES, nie IS.", "not": "Samo „not” nie tworzy odpowiedzi."}},
        {"type": "listen", "en": "What time does the shop open?", "pl": "O której otwiera się sklep?",
         "why": "Słówko pytające + does (the shop = it) + open."},
        {"type": "cloze", "text": "Uzupełnij:",
         "body": "My friend Tom [[=doesn't]] live in Poland. He [[lives|live|does live]] in Ireland. [[Does|Do|Is]] he like it? Yes, he [[=does]]. "
                 "His parents [[don't|doesn't|aren't]] visit him often, because the tickets [[are|do|does]] expensive.",
         "pl": "Mój kolega Tom nie mieszka w Polsce. Mieszka w Irlandii. Czy mu się tam podoba? Tak. Jego rodzice nie odwiedzają go często, bo bilety są drogie.",
         "why": "he → doesn't / does · twierdzenie: lives (z -s, bez do) · parents → don't · „expensive” to cecha → are."},
    ],
}

if __name__ == "__main__":
    import json, os
    path = os.path.join(os.path.dirname(__file__), "..", "data", "podstawy", "kursy.json")
    d = json.load(open(path, encoding="utf-8"))
    d["topics"] = [DO_DOES if t["id"] == "do_does" else t for t in d["topics"]]
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("do_does zapisane:", len(DO_DOES["pages"]), "stron,", len(DO_DOES["practice"]), "ćwiczeń,", len(DO_DOES["test"]), "pytań")
