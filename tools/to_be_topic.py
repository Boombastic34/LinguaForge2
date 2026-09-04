# -*- coding: utf-8 -*-
"""Rozdział „TO BE” napisany od nowa — wzorzec dla pozostałych tematów Podstaw.

Schemat tematu (rozszerzony, zgodny wstecz):
  cheatsheet   – tabela-ściąga (pokazywana na wstępie i pod przyciskiem 📋 w pasku zadania)
  pages[].sections[].table          – tabela w sekcji
  pages[].sections[].examples       – przykłady ogólne
  pages[].sections[].examples_work  – przykłady „praca w magazynie” (gdy uczeń ma ten cel)
  practice/test[].accept            – dodatkowe akceptowane odpowiedzi (skróty)
  practice/test[].why_not           – {opcja: dlaczego ta forma jest zła}
"""

TO_BE = {
    "id": "to_be",
    "name": "TO BE — być (am / is / are)",
    "emoji": "🔤",
    "level": "A1",
    "order": 1,
    "short": "Najważniejszy czasownik angielskiego: jestem, jesteś, jest…",
    "intro": (
        "TO BE znaczy „być”. To najczęściej używane słowo w całym angielskim — pojawia się w co "
        "trzecim zdaniu. Po polsku często je pomijamy („Zmęczony.” zamiast „Jestem zmęczony.”), "
        "po angielsku NIGDY nie wolno go opuścić. Ma trzy formy w teraźniejszości (am, is, are) "
        "i dwie w przeszłości (was, were). Ten rozdział pokazuje je wszystkie w jednym miejscu, "
        "a potem tłumaczy krok po kroku."
    ),
    "cheatsheet": {
        "title": "TO BE — cała odmiana w jednym miejscu",
        "head": ["Osoba", "Teraz (+)", "Skrót", "Przeczenie (−)", "Pytanie (?)", "Przeszłość"],
        "rows": [
            ["I (ja)", "I am", "I'm", "I am not / I'm not", "Am I…?", "I was"],
            ["you (ty / wy)", "you are", "you're", "you aren't", "Are you…?", "you were"],
            ["he (on)", "he is", "he's", "he isn't", "Is he…?", "he was"],
            ["she (ona)", "she is", "she's", "she isn't", "Is she…?", "she was"],
            ["it (ono / to)", "it is", "it's", "it isn't", "Is it…?", "it was"],
            ["we (my)", "we are", "we're", "we aren't", "Are we…?", "we were"],
            ["they (oni / one)", "they are", "they're", "they aren't", "Are they…?", "they were"],
        ],
        "note": "Zasada w skrócie: I → am · he/she/it → is · you/we/they → are. "
                "W przeszłości tylko dwie formy: was (I/he/she/it) i were (you/we/they).",
    },
    "pages": [
        {
            "title": "Czym jest TO BE i dlaczego nie wolno go pominąć",
            "sections": [
                {
                    "title": "Co to w ogóle jest",
                    "emoji": "💡", "color": "indigo",
                    "text": (
                        "TO BE to czasownik „być”. Używamy go, żeby powiedzieć KIM ktoś jest, "
                        "JAKI jest albo GDZIE jest.\n"
                        "Kim: I am a driver. — Jestem kierowcą.\n"
                        "Jaki: She is tired. — Ona jest zmęczona.\n"
                        "Gdzie: They are at home. — Oni są w domu.\n"
                        "Po polsku to „jestem, jesteś, jest, jesteśmy, jesteście, są” — jeden czasownik, "
                        "wiele form. Po angielsku form jest tylko trzy."
                    ),
                    "examples": [
                        ["I am a student.", "Jestem studentem. (kim)"],
                        ["The coffee is hot.", "Kawa jest gorąca. (jaka)"],
                        ["We are in the kitchen.", "Jesteśmy w kuchni. (gdzie)"],
                    ],
                    "examples_work": [
                        ["I am a picker.", "Jestem pikerem (kompletuję zamówienia). (kim)"],
                        ["The pallet is heavy.", "Paleta jest ciężka. (jaka)"],
                        ["We are at the gate.", "Jesteśmy przy bramie. (gdzie)"],
                    ],
                },
                {
                    "title": "Po polsku można pominąć, po angielsku — nigdy",
                    "emoji": "⛔", "color": "rose",
                    "text": (
                        "Po polsku powiesz „Zmęczony.” albo „On w domu.” i każdy zrozumie. "
                        "Po angielsku zdanie bez czasownika nie istnieje — „I tired” i „He at home” "
                        "to błędy, które od razu zdradzają, że ktoś dopiero się uczy.\n"
                        "Zasada: jeśli w zdaniu nie ma innego czasownika (nie ma „pracuję”, „idę”, "
                        "„lubię”), to musi tam być forma TO BE."
                    ),
                    "examples": [
                        ["I am tired.", "Jestem zmęczony. — nie: I tired"],
                        ["He is at home.", "On jest w domu. — nie: He at home"],
                        ["It is cold today.", "Dziś jest zimno. — nie: Today cold"],
                    ],
                    "examples_work": [
                        ["I am ready.", "Jestem gotowy. — nie: I ready"],
                        ["The truck is late.", "Ciężarówka jest spóźniona. — nie: The truck late"],
                        ["The scanner is broken.", "Skaner jest zepsuty. — nie: Scanner broken"],
                    ],
                    "tip": "Najczęstszy błąd Polaków na starcie. Zanim powiesz zdanie, sprawdź: jest w nim czasownik? Jeśli nie — wstaw am / is / are.",
                },
            ],
        },
        {
            "title": "Trzy formy: am, is, are",
            "sections": [
                {
                    "title": "Kto dostaje którą formę",
                    "emoji": "🧩", "color": "indigo",
                    "text": (
                        "To jedyny czasownik z trzema różnymi formami w czasie teraźniejszym. "
                        "Forma zależy wyłącznie od tego, KTO jest podmiotem zdania:\n"
                        "AM — tylko z I (ja). Nigdy z nikim innym.\n"
                        "IS — z he, she, it oraz z każdą pojedynczą osobą lub rzeczą (my brother, the car, Anna).\n"
                        "ARE — z you, we, they oraz z każdą liczbą mnogą (my parents, the boxes, Anna and Tom)."
                    ),
                    "table": {
                        "head": ["Podmiot", "Forma", "Przykład"],
                        "rows": [
                            ["I", "am", "I am here."],
                            ["he / she / it, jedna osoba lub rzecz", "is", "She is here. / The box is here."],
                            ["you / we / they, więcej osób lub rzeczy", "are", "They are here. / The boxes are here."],
                        ],
                    },
                    "examples": [
                        ["My brother is a doctor.", "Mój brat jest lekarzem. (my brother = he → is)"],
                        ["My parents are at work.", "Moi rodzice są w pracy. (my parents = they → are)"],
                        ["You are my friend.", "Jesteś moim przyjacielem."],
                    ],
                    "examples_work": [
                        ["The forklift is new.", "Wózek widłowy jest nowy. (the forklift = it → is)"],
                        ["The boxes are ready.", "Pudełka są gotowe. (the boxes = they → are)"],
                        ["You are on the night shift.", "Jesteś na nocnej zmianie."],
                    ],
                    "tip": "Rytm do zapamiętania: I am, you are, he is. Reszta wynika z tych trzech.",
                },
                {
                    "title": "Uwaga na „you”: ty i wy to to samo słowo",
                    "emoji": "👥", "color": "teal",
                    "text": (
                        "„You” znaczy i „ty”, i „wy” — i zawsze bierze ARE, nawet gdy mówisz do jednej osoby. "
                        "„You is” nie istnieje."
                    ),
                    "examples": [
                        ["You are late, Tom.", "Spóźniłeś się, Tom. (jedna osoba, ale ARE)"],
                        ["You are all welcome.", "Wszyscy jesteście mile widziani. (wiele osób)"],
                    ],
                },
            ],
        },
        {
            "title": "Skróty — tak mówi się naprawdę",
            "sections": [
                {
                    "title": "I'm, you're, he's…",
                    "emoji": "✂️", "color": "gold",
                    "text": (
                        "W mowie i w wiadomościach prawie nikt nie mówi „I am”. Mówi się „I'm”. "
                        "Apostrof zastępuje wyciętą literę. Skrót znaczy DOKŁADNIE to samo co pełna forma — "
                        "w tej aplikacji obie odpowiedzi są uznawane.\n"
                        "Pełne formy zostaw na oficjalne pisma i na sytuacje, gdy coś podkreślasz: "
                        "„I AM ready!” — „Naprawdę jestem gotowy!”."
                    ),
                    "table": {
                        "head": ["Pełna forma", "Skrót", "Wymowa (w przybliżeniu)"],
                        "rows": [
                            ["I am", "I'm", "ajm"],
                            ["you are", "you're", "jor"],
                            ["he is / she is / it is", "he's / she's / it's", "hiz / sziz / yts"],
                            ["we are", "we're", "łir"],
                            ["they are", "they're", "der"],
                        ],
                    },
                    "examples": [
                        ["I'm hungry.", "Jestem głodny."],
                        ["She's my sister.", "Ona jest moją siostrą."],
                        ["They're here.", "Oni tu są."],
                    ],
                    "examples_work": [
                        ["I'm on break.", "Jestem na przerwie."],
                        ["He's the supervisor.", "On jest brygadzistą."],
                        ["They're in the loading area.", "Oni są w strefie załadunku."],
                    ],
                    "tip": "„It's” (= it is) to co innego niż „its” (= jego/jej, o rzeczy). Apostrof robi różnicę.",
                },
            ],
        },
        {
            "title": "Przeczenie i pytanie — bez do / does",
            "sections": [
                {
                    "title": "Przeczenie: dodaj NOT po czasowniku",
                    "emoji": "🚫", "color": "rose",
                    "text": (
                        "Żeby zaprzeczyć, wstaw „not” zaraz po am / is / are. Nic więcej.\n"
                        "am not · is not · are not\n"
                        "W mowie: isn't, aren't. Uwaga: „amn't” nie istnieje — mówi się „I'm not”."
                    ),
                    "table": {
                        "head": ["Twierdzenie", "Przeczenie", "Skrót"],
                        "rows": [
                            ["I am", "I am not", "I'm not"],
                            ["he is", "he is not", "he isn't"],
                            ["they are", "they are not", "they aren't"],
                        ],
                    },
                    "examples": [
                        ["I am not tired.", "Nie jestem zmęczony."],
                        ["She isn't here.", "Jej tu nie ma."],
                        ["We aren't ready.", "Nie jesteśmy gotowi."],
                    ],
                    "examples_work": [
                        ["I'm not on shift today.", "Nie mam dziś zmiany."],
                        ["The pallet isn't full.", "Paleta nie jest pełna."],
                        ["The doors aren't closed.", "Drzwi nie są zamknięte."],
                    ],
                },
                {
                    "title": "Pytanie: zamień miejscami",
                    "emoji": "❓", "color": "indigo",
                    "text": (
                        "Żeby zapytać, przestaw czasownik PRZED osobę. Tylko tyle.\n"
                        "You are ready. → Are you ready?\n"
                        "She is here. → Is she here?\n"
                        "Krótka odpowiedź powtarza czasownik: Yes, I am. / No, she isn't."
                    ),
                    "examples": [
                        ["Are you ready?", "Jesteś gotowy? — Yes, I am."],
                        ["Is he your brother?", "Czy on jest twoim bratem? — No, he isn't."],
                        ["Where are they?", "Gdzie oni są?"],
                    ],
                    "examples_work": [
                        ["Are you the new driver?", "Jesteś nowym kierowcą? — Yes, I am."],
                        ["Is the truck here?", "Czy ciężarówka już jest? — No, it isn't."],
                        ["Where are the empty pallets?", "Gdzie są puste palety?"],
                    ],
                },
                {
                    "title": "A co z DO i DOES? — dlaczego tu ich NIE ma",
                    "emoji": "🔁", "color": "gold",
                    "text": (
                        "Wkrótce poznasz zdania z innymi czasownikami: I work, she likes, they go. "
                        "Takie czasowniki NIE potrafią same zrobić pytania ani przeczenia — potrzebują "
                        "pomocnika. Tym pomocnikiem jest DO (a przy he/she/it: DOES).\n"
                        "I work. → Do you work? / I don't work.\n"
                        "She likes coffee. → Does she like coffee? / She doesn't like coffee.\n"
                        "TO BE jest wyjątkowe: pomocnika nie potrzebuje, bo samo się przestawia "
                        "i samo przyjmuje „not”. Dlatego „Do you are ready?” to podwójny błąd — "
                        "to jak wysłać dwóch kierowców do jednej ciężarówki."
                    ),
                    "table": {
                        "head": ["Zdanie", "Pytanie", "Przeczenie", "Dlaczego"],
                        "rows": [
                            ["You are tired.", "Are you tired?", "You aren't tired.", "TO BE — bez pomocnika"],
                            ["You work here.", "Do you work here?", "You don't work here.", "zwykły czasownik — pomocnik DO"],
                            ["She is late.", "Is she late?", "She isn't late.", "TO BE — bez pomocnika"],
                            ["She works late.", "Does she work late?", "She doesn't work late.", "zwykły czasownik — pomocnik DOES"],
                        ],
                    },
                    "tip": "Test: jeśli w zdaniu jest am / is / are — NIE dodawaj do / does. Jeśli nie ma — dodaj. DO i DOES dostaną osobny rozdział.",
                },
            ],
        },
        {
            "title": "Przeszłość: was i were",
            "sections": [
                {
                    "title": "Tylko dwie formy",
                    "emoji": "⏪", "color": "teal",
                    "text": (
                        "W przeszłości jest łatwiej — zamiast trzech form są dwie:\n"
                        "WAS — I, he, she, it (i każda pojedyncza osoba lub rzecz)\n"
                        "WERE — you, we, they (i każda liczba mnoga)\n"
                        "Przeczenie i pytanie działają tak samo jak w teraźniejszości: wasn't / weren't, Was he…? / Were you…?"
                    ),
                    "table": {
                        "head": ["Teraz", "Przeszłość", "Przeczenie", "Pytanie"],
                        "rows": [
                            ["I am", "I was", "I wasn't", "Was I…?"],
                            ["he / she / it is", "he was", "he wasn't", "Was he…?"],
                            ["you / we / they are", "you were", "you weren't", "Were you…?"],
                        ],
                    },
                    "examples": [
                        ["I was at home yesterday.", "Wczoraj byłem w domu."],
                        ["They were happy.", "Byli szczęśliwi."],
                        ["Were you at the party?", "Byłeś na imprezie?"],
                    ],
                    "examples_work": [
                        ["I was on the early shift yesterday.", "Wczoraj byłem na porannej zmianie."],
                        ["The boxes were damaged.", "Pudełka były uszkodzone."],
                        ["Was the truck late?", "Czy ciężarówka się spóźniła?"],
                    ],
                    "tip": "Wskazówka: WAS pasuje tam, gdzie teraz jest AM albo IS. WERE — tam, gdzie jest ARE.",
                },
            ],
        },
        {
            "title": "Pułapki: wiek, głód, zimno, racja",
            "sections": [
                {
                    "title": "Tu Polacy potykają się najczęściej",
                    "emoji": "⚠️", "color": "rose",
                    "text": (
                        "Po polsku „mam 30 lat”, „mam rację”, „jest mi zimno”. Po angielsku we wszystkich "
                        "tych sytuacjach używa się TO BE, nie „have” ani „mam”.\n"
                        "Angielski traktuje wiek, głód, pragnienie, zimno, strach i rację jak CECHY — "
                        "a cechy opisuje się przez „być”."
                    ),
                    "table": {
                        "head": ["Po polsku", "Po angielsku", "Błąd"],
                        "rows": [
                            ["Mam 30 lat.", "I am 30 (years old).", "I have 30 years"],
                            ["Jestem głodny.", "I am hungry.", "I have hunger"],
                            ["Chce mi się pić.", "I am thirsty.", "I want drink"],
                            ["Jest mi zimno.", "I am cold.", "It is cold to me"],
                            ["Masz rację.", "You are right.", "You have right"],
                            ["Boję się.", "I am afraid.", "I have fear"],
                        ],
                    },
                    "examples": [
                        ["How old are you? — I am 25.", "Ile masz lat? — Mam 25."],
                        ["Are you cold?", "Zimno ci?"],
                        ["You're right.", "Masz rację."],
                    ],
                    "tip": "Zapamiętaj sześć słów: old, hungry, thirsty, cold, right, afraid — wszystkie idą z TO BE.",
                },
            ],
        },
    ],
    "practice": [
        {"type": "choice", "text": "I ___ a student.", "options": ["am", "is", "are"], "answer": 0,
         "pl": "Jestem studentem.",
         "why": "Przy I (ja) zawsze AM — to jedyna osoba, która dostaje tę formę.",
         "why_not": {"is": "IS jest dla he / she / it, nie dla I.", "are": "ARE jest dla you / we / they, nie dla I."}},
        {"type": "choice", "text": "She ___ my sister.", "options": ["am", "is", "are"], "answer": 1,
         "pl": "Ona jest moją siostrą.",
         "why": "She (ona) to trzecia osoba liczby pojedynczej → IS.",
         "why_not": {"am": "AM łączy się wyłącznie z I.", "are": "ARE jest dla liczby mnogiej i „you” — she to jedna osoba."}},
        {"type": "choice", "text": "They ___ at work.", "options": ["am", "is", "are"], "answer": 2,
         "pl": "Oni są w pracy.",
         "why": "They (oni) to liczba mnoga → ARE.",
         "why_not": {"am": "AM tylko z I.", "is": "IS jest dla jednej osoby lub rzeczy — they to wiele osób."}},
        {"type": "choice", "text": "You ___ late, Tom.", "options": ["is", "are"], "answer": 1,
         "pl": "Spóźniłeś się, Tom.",
         "why": "„You” zawsze bierze ARE — nawet gdy mówisz do jednej osoby.",
         "why_not": {"is": "„You is” nie istnieje. You (ty / wy) łączy się tylko z ARE."}},
        {"type": "gap", "text": "My brother ___ a driver.", "answer": "is", "accept": ["'s"], "why_not": {"am": "AM tylko z I — a tu podmiotem jest mój brat (on).", "are": "ARE jest dla you / we / they; brat to jedna osoba (he)."},
         "pl": "Mój brat jest kierowcą.", "hint": "my brother = on → która forma?",
         "why": "„My brother” to jedna osoba (= he) → IS. Skrót „'s” też jest poprawny."},
        {"type": "gap", "text": "I ___ tired today.", "answer": "am", "accept": ["'m"], "why_not": {"is": "IS jest dla he / she / it — nigdy dla I.", "are": "ARE jest dla you / we / they — nigdy dla I."},
         "pl": "Jestem dziś zmęczony.", "hint": "I → ?",
         "why": "Przy I zawsze AM (w mowie: I'm)."},
        {"type": "gap", "text": "The boxes ___ heavy.", "answer": "are", "accept": ["'re"], "why_not": {"is": "IS to liczba pojedyncza; boxes (pudełka) to liczba mnoga → they → ARE.", "am": "AM tylko z I."},
         "pl": "Pudełka są ciężkie.", "hint": "the boxes = one (liczba mnoga)",
         "why": "„The boxes” to liczba mnoga (= they) → ARE."},
        {"type": "choice", "text": "Które zdanie jest poprawne?", "options": ["I tired.", "I am tired.", "I have tired."], "answer": 1,
         "pl": "Jestem zmęczony.",
         "why": "Zdanie po angielsku musi mieć czasownik. „Tired” to przymiotnik, więc potrzebuje TO BE.",
         "why_not": {"I tired.": "Brak czasownika — po angielsku zdanie bez czasownika nie istnieje.",
                     "I have tired.": "„Have” znaczy „mieć”. Zmęczenie to cecha, a cechy opisuje TO BE."}},
        {"type": "choice", "text": "___ you ready?", "options": ["Are", "Do", "Is"], "answer": 0,
         "pl": "Jesteś gotowy?",
         "why": "„Ready” to przymiotnik → potrzebujemy TO BE, a przy you → ARE. Pytanie robimy przestawieniem, bez pomocnika.",
         "why_not": {"Do": "DO to pomocnik dla zwykłych czasowników (Do you work?). Tu nie ma zwykłego czasownika — jest TO BE, które pytanie robi samo.",
                     "Is": "IS nie łączy się z you."}},
        {"type": "choice", "text": "___ she like coffee?", "options": ["Is", "Does", "Are"], "answer": 1,
         "pl": "Czy ona lubi kawę?",
         "why": "„Like” to zwykły czasownik — sam nie zrobi pytania, potrzebuje pomocnika. Przy she → DOES.",
         "why_not": {"Is": "IS to forma TO BE. Tu nie ma „być” — jest „lubić”, więc TO BE nie pasuje.",
                     "Are": "ARE to forma TO BE — nie pasuje do zwykłego czasownika, a poza tym nie łączy się z she."}},
        {"type": "gap", "text": "She ___ not here today.", "answer": "is", "accept": ["'s"], "why_not": {"are": "ARE jest dla you / we / they; she → IS.", "do": "DO to pomocnik zwykłych czasowników; przy TO BE przeczenie robi się samym NOT."},
         "pl": "Nie ma jej dziś tutaj.", "hint": "przeczenie: forma TO BE + not",
         "why": "She → IS; przeczenie to po prostu „is not” (isn't)."},
        {"type": "choice", "text": "We ___ at home yesterday.", "options": ["are", "was", "were"], "answer": 2,
         "pl": "Wczoraj byliśmy w domu.",
         "why": "„Yesterday” = przeszłość, a we (my) to liczba mnoga → WERE.",
         "why_not": {"are": "ARE to teraźniejszość, a „yesterday” wskazuje na przeszłość.",
                     "was": "WAS jest dla I / he / she / it — we to liczba mnoga."}},
        {"type": "gap", "text": "He ___ tired after the shift.", "answer": "was", "why_not": {"were": "WERE jest dla you / we / they; he to jedna osoba → WAS.", "is": "„After the shift” mówi o przeszłości — potrzebna forma przeszła, nie IS."},
         "pl": "Był zmęczony po zmianie.", "hint": "przeszłość, jedna osoba",
         "why": "„After the shift” opisuje przeszłość; he → WAS."},
        {"type": "choice", "text": "Po polsku: „Mam 30 lat.” Po angielsku:", "options": ["I have 30 years.", "I am 30 years old.", "I am 30 years."], "answer": 1,
         "why": "Wiek po angielsku wyraża się przez TO BE + „years old”.",
         "why_not": {"I have 30 years.": "„Have” = mieć. Anglik nie „ma” lat — on „jest” ileś lat stary.",
                     "I am 30 years.": "Brakuje „old”. Można powiedzieć „I am 30” albo „I am 30 years old”, ale nie „30 years” samo."}},
        {"type": "listen", "en": "Are you the new driver?", "pl": "Jesteś nowym kierowcą?",
         "why": "Pytanie przez przestawienie: Are + you. Bez „do”."},
        {"type": "listen", "en": "I'm not hungry, I'm thirsty.", "pl": "Nie jestem głodny, chce mi się pić.",
         "why": "Głód i pragnienie po angielsku to cechy — opisujemy je przez TO BE."},
        {"type": "match", "pairs": [["I", "am"], ["she", "is"], ["they", "are"], ["you", "are"], ["it", "is"]]},
    ],
    "test": [
        {"type": "choice", "text": "My parents ___ teachers.", "options": ["am", "is", "are"], "answer": 2,
         "pl": "Moi rodzice są nauczycielami.",
         "why": "„My parents” to liczba mnoga (= they) → ARE.",
         "why_not": {"am": "AM tylko z I.", "is": "IS jest dla jednej osoby — rodzice to dwie osoby."}},
        {"type": "gap", "text": "It ___ cold today.", "answer": "is", "accept": ["'s"], "why_not": {"are": "IT to liczba pojedyncza → IS.", "am": "AM tylko z I."},
         "pl": "Dziś jest zimno.",
         "why": "It → IS. Pogoda po angielsku zawsze przez „it is”."},
        {"type": "choice", "text": "___ they at the meeting?", "options": ["Do", "Are", "Is"], "answer": 1,
         "pl": "Czy oni są na spotkaniu?",
         "why": "Zdanie mówi, GDZIE ktoś jest → TO BE. They → ARE, pytanie przez przestawienie.",
         "why_not": {"Do": "DO to pomocnik dla zwykłych czasowników. Tu nie ma zwykłego czasownika.",
                     "Is": "IS nie łączy się z they."}},
        {"type": "choice", "text": "___ you work on Saturdays?", "options": ["Are", "Do", "Is"], "answer": 1,
         "pl": "Pracujesz w soboty?",
         "why": "„Work” to zwykły czasownik — pytanie wymaga pomocnika DO.",
         "why_not": {"Are": "ARE to forma TO BE. „Are you work” łączy dwa czasowniki — błąd.",
                     "Is": "IS to TO BE i do tego nie łączy się z you."}},
        {"type": "gap", "text": "I ___ not at work yesterday.", "answer": "was", "why_not": {"were": "WERE jest dla you / we / they; I → WAS.", "am": "„Yesterday” to przeszłość — AM jest teraźniejsze."},
         "pl": "Wczoraj nie było mnie w pracy.",
         "why": "„Yesterday” → przeszłość; I → WAS (wasn't)."},
        {"type": "choice", "text": "Które zdanie jest poprawne?", "options": ["She is not here.", "She not here.", "She don't here."], "answer": 0,
         "pl": "Nie ma jej tu.",
         "why": "Przeczenie z TO BE: is + not. Bez pomocnika, bez pomijania czasownika.",
         "why_not": {"She not here.": "Brak czasownika — zdanie po angielsku musi mieć am / is / are.",
                     "She don't here.": "DON'T to pomocnik zwykłych czasowników, a tu nie ma żadnego czasownika oprócz „być”."}},
        {"type": "choice", "text": "Po polsku: „Masz rację.” Po angielsku:", "options": ["You have right.", "You are right.", "You have a right."], "answer": 1,
         "why": "„Right” (mieć rację) to cecha → TO BE.",
         "why_not": {"You have right.": "Dosłowna kalka z polskiego — po angielsku racji się nie „ma”.",
                     "You have a right.": "To znaczy „masz PRAWO (do czegoś)”, nie „masz rację”."}},
        {"type": "listen", "en": "We were late this morning.", "pl": "Spóźniliśmy się dziś rano.",
         "why": "„This morning” (już minęło) → przeszłość; we → WERE."},
    ],
}

if __name__ == "__main__":
    import json, os, sys
    path = os.path.join(os.path.dirname(__file__), "..", "data", "podstawy", "kursy.json")
    d = json.load(open(path, encoding="utf-8"))
    d["topics"] = [TO_BE if t["id"] == "to_be" else t for t in d["topics"]]
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("to_be zapisane:", len(TO_BE["pages"]), "stron,", len(TO_BE["practice"]), "ćwiczeń,", len(TO_BE["test"]), "pytań testu")
