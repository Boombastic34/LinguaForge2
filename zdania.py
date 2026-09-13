# -*- coding: utf-8 -*-
"""Bank zdań dla ścieżek „Tworzenie zdań" i „Słuchanie zdań".

Podział na etapy wg trudności słownictwa oraz osobne etapy na czasowniki frazowe
(dwa wyrazy = inne znaczenie) i podstawowe czasy. Ten sam bank obsługuje obie
ścieżki: w „tworzeniu" uczeń pisze zdanie z polskiego, w „słuchaniu" zapisuje to,
co usłyszał.

Uruchom: python tools/zdania.py
"""

STAGES = [
    # ---------------------------------------------------------------- słownictwo 1
    {"id": "s1", "group": "slownictwo", "diff": 1, "level": "A1",
     "name": "Zdania proste 1 — jestem, mam, lubię", "emoji": "🌱",
     "short": "Najkrótsze zdania: kto to jest, co mam, co lubię.",
     "items": [
        ("I am a driver.", "Jestem kierowcą."),
        ("She is my sister.", "Ona jest moją siostrą."),
        ("We are at home.", "Jesteśmy w domu."),
        ("I have two children.", "Mam dwoje dzieci."),
        ("He has a new car.", "On ma nowy samochód."),
        ("I like coffee.", "Lubię kawę."),
        ("They live in Poland.", "Oni mieszkają w Polsce."),
        ("My name is Anna.", "Mam na imię Anna."),
        ("This is my house.", "To jest mój dom."),
        ("The dog is very big.", "Pies jest bardzo duży."),
        ("I work in a warehouse.", "Pracuję w magazynie."),
        ("You are my friend.", "Jesteś moim przyjacielem."),
     ]},
    {"id": "s2", "group": "slownictwo", "diff": 1, "level": "A1",
     "name": "Zdania proste 2 — pytania i przeczenia", "emoji": "🌱",
     "short": "To samo słownictwo, ale w pytaniu i przeczeniu.",
     "items": [
        ("I don't like tea.", "Nie lubię herbaty."),
        ("She isn't at work today.", "Nie ma jej dziś w pracy."),
        ("Do you have a car?", "Masz samochód?"),
        ("Does he live here?", "Czy on tu mieszka?"),
        ("Are you tired?", "Jesteś zmęczony?"),
        ("We don't work on Sunday.", "Nie pracujemy w niedzielę."),
        ("Is this your bag?", "Czy to twoja torba?"),
        ("They aren't ready.", "Oni nie są gotowi."),
        ("Where do you live?", "Gdzie mieszkasz?"),
        ("What is your name?", "Jak masz na imię?"),
        ("He doesn't speak Polish.", "On nie mówi po polsku."),
        ("Why are you late?", "Dlaczego się spóźniłeś?"),
     ]},
    # ---------------------------------------------------------------- słownictwo 2
    {"id": "s3", "group": "slownictwo", "diff": 2, "level": "A1",
     "name": "Codzienne sprawy 1 — dom i rodzina", "emoji": "🏠",
     "short": "Dłuższe zdania o domu, rodzinie i codziennym dniu.",
     "items": [
        ("My brother works in a big factory.", "Mój brat pracuje w dużej fabryce."),
        ("The children are in the garden.", "Dzieci są w ogrodzie."),
        ("I get up at six every morning.", "Wstaję o szóstej każdego ranka."),
        ("We have dinner at seven.", "Jemy obiad o siódmej."),
        ("My wife doesn't drink coffee.", "Moja żona nie pije kawy."),
        ("The washing machine is broken.", "Pralka jest zepsuta."),
        ("Can you close the window, please?", "Możesz zamknąć okno, proszę?"),
        ("There is a shop near my house.", "Niedaleko mojego domu jest sklep."),
        ("My parents live in a small village.", "Moi rodzice mieszkają w małej wiosce."),
        ("I go to work by bus.", "Jeżdżę do pracy autobusem."),
        ("The keys are in the drawer.", "Klucze są w szufladzie."),
        ("We need milk and bread.", "Potrzebujemy mleka i chleba."),
     ]},
    {"id": "s4", "group": "slownictwo", "diff": 2, "level": "A1",
     "name": "Codzienne sprawy 2 — praca i zakupy", "emoji": "🛒",
     "short": "Zdania z pracy, sklepu i drogi.",
     "items": [
        ("The shop opens at eight o'clock.", "Sklep otwiera się o ósmej."),
        ("How much does it cost?", "Ile to kosztuje?"),
        ("I need a bigger size, please.", "Poproszę większy rozmiar."),
        ("My shift starts at six in the morning.", "Moja zmiana zaczyna się o szóstej rano."),
        ("The break is thirty minutes long.", "Przerwa trwa trzydzieści minut."),
        ("Can I pay by card?", "Mogę zapłacić kartą?"),
        ("The bus is ten minutes late.", "Autobus jest dziesięć minut spóźniony."),
        ("I work five days a week.", "Pracuję pięć dni w tygodniu."),
        ("Where is the nearest bus stop?", "Gdzie jest najbliższy przystanek?"),
        ("This box is too heavy for me.", "To pudło jest dla mnie za ciężkie."),
        ("We finish early on Friday.", "W piątek kończymy wcześniej."),
        ("Excuse me, do you speak English?", "Przepraszam, mówi pan po angielsku?"),
     ]},
    # ---------------------------------------------------------------- słownictwo 3
    {"id": "s5", "group": "slownictwo", "diff": 3, "level": "A2",
     "name": "Trudniejsze słownictwo 1 — opisy i opinie", "emoji": "💬",
     "short": "Zdania z przymiotnikami, opiniami i porównaniami.",
     "items": [
        ("This film is more interesting than the book.", "Ten film jest ciekawszy niż książka."),
        ("I think the weather will be better tomorrow.", "Myślę, że jutro pogoda będzie lepsza."),
        ("She is the best worker in our team.", "Ona jest najlepszym pracownikiem w naszym zespole."),
        ("The food was delicious, but very expensive.", "Jedzenie było pyszne, ale bardzo drogie."),
        ("I am not sure about this decision.", "Nie jestem pewien co do tej decyzji."),
        ("It depends on the price.", "To zależy od ceny."),
        ("The instructions are difficult to understand.", "Instrukcje są trudne do zrozumienia."),
        ("In my opinion, this is a good idea.", "Moim zdaniem to dobry pomysł."),
        ("He is much taller than his brother.", "On jest dużo wyższy od swojego brata."),
        ("The traffic was terrible this morning.", "Ruch był dziś rano okropny."),
        ("I would like to change my appointment.", "Chciałbym zmienić termin spotkania."),
        ("Everything is ready for tomorrow.", "Wszystko jest gotowe na jutro."),
     ]},
    {"id": "s6", "group": "slownictwo", "diff": 4, "level": "A2",
     "name": "Trudniejsze słownictwo 2 — sprawy urzędowe", "emoji": "📋",
     "short": "Zdania, których potrzebujesz u lekarza, w urzędzie i w pracy.",
     "items": [
        ("I would like to make an appointment with the doctor.", "Chciałbym umówić się do lekarza."),
        ("Could you explain this to me again, please?", "Mógłby mi pan to jeszcze raz wyjaśnić?"),
        ("I need to fill in this form.", "Muszę wypełnić ten formularz."),
        ("My contract ends at the end of the month.", "Moja umowa kończy się z końcem miesiąca."),
        ("Do I have to bring my passport?", "Czy muszę przynieść paszport?"),
        ("I am afraid there is a problem with my payment.", "Obawiam się, że jest problem z moją wypłatą."),
        ("Could you write it down for me?", "Mógłby pan mi to zapisać?"),
        ("I have an accident insurance.", "Mam ubezpieczenie od wypadków."),
        ("The manager will call you back tomorrow.", "Kierownik oddzwoni do pana jutro."),
        ("I would rather work in the morning.", "Wolałbym pracować rano."),
        ("Please let me know as soon as possible.", "Proszę dać mi znać jak najszybciej."),
        ("We should discuss this with the team.", "Powinniśmy omówić to z zespołem."),
     ]},
    # ---------------------------------------------------------------- phrasal
    {"id": "p1", "group": "phrasal", "diff": 3, "level": "A2",
     "name": "Dwa wyrazy — inne znaczenie 1", "emoji": "🔗",
     "short": "Czasownik + małe słówko zmienia znaczenie: get up, look for, turn off.",
     "items": [
        ("I get up at five o'clock.", "Wstaję o piątej.", "get up = wstawać (nie: „dostać w górę”)"),
        ("Please turn off the light.", "Proszę zgaś światło.", "turn off = wyłączyć"),
        ("Turn on the machine, please.", "Włącz maszynę, proszę.", "turn on = włączyć"),
        ("I am looking for my keys.", "Szukam kluczy.", "look for = szukać (nie: „patrzeć dla”)"),
        ("Can you pick up the phone?", "Możesz odebrać telefon?", "pick up = podnieść / odebrać"),
        ("Put on your jacket, it is cold.", "Załóż kurtkę, jest zimno.", "put on = założyć (ubranie)"),
        ("Take off your shoes, please.", "Zdejmij buty, proszę.", "take off = zdjąć"),
        ("We are running out of boxes.", "Kończą nam się pudła.", "run out of = kończyć się (zapas)"),
        ("Sit down and wait here, please.", "Usiądź i poczekaj tutaj.", "sit down = usiąść"),
        ("The meeting was called off.", "Spotkanie zostało odwołane.", "call off = odwołać"),
        ("I will find out tomorrow.", "Dowiem się jutro.", "find out = dowiedzieć się"),
        ("Please fill in this form.", "Proszę wypełnić ten formularz.", "fill in = wypełnić (dokument)"),
     ]},
    {"id": "p2", "group": "phrasal", "diff": 4, "level": "A2",
     "name": "Dwa wyrazy — inne znaczenie 2", "emoji": "🔗",
     "short": "Kolejne pary, które trzeba znać w pracy i w rozmowie.",
     "items": [
        ("I have to give up smoking.", "Muszę rzucić palenie.", "give up = rzucić (nałóg), poddać się"),
        ("Look out! The floor is wet.", "Uważaj! Podłoga jest mokra.", "look out = uważać"),
        ("Can you look after my dog?", "Możesz zaopiekować się moim psem?", "look after = opiekować się"),
        ("The plane takes off at noon.", "Samolot startuje w południe.", "take off = startować (samolot)"),
        ("Please write down the number.", "Proszę zapisać numer.", "write down = zapisać"),
        ("I get on well with my colleagues.", "Dobrze dogaduję się z kolegami.", "get on with = dogadywać się"),
        ("We set off at six in the morning.", "Wyruszyliśmy o szóstej rano.", "set off = wyruszyć"),
        ("Hold on a moment, please.", "Proszę chwilę poczekać.", "hold on = poczekać (przy telefonie)"),
        ("The car broke down on the motorway.", "Samochód zepsuł się na autostradzie.", "break down = zepsuć się"),
        ("I have to check in at the hotel first.", "Najpierw muszę się zameldować w hotelu.", "check in = zameldować się"),
        ("Please put out your cigarette.", "Proszę zgasić papierosa.", "put out = zgasić"),
        ("She came up with a good idea.", "Ona wpadła na dobry pomysł.", "come up with = wpaść na (pomysł)"),
     ]},
    # ---------------------------------------------------------------- czasy
    {"id": "t1", "group": "czasy", "diff": 2, "level": "A1",
     "name": "Czas teraźniejszy — Present Simple", "emoji": "⏱",
     "short": "Co robisz zwykle, codziennie, zawsze.",
     "items": [
        ("I start work at seven.", "Zaczynam pracę o siódmej.", "Present Simple — rutyna, stały plan"),
        ("She works in a hospital.", "Ona pracuje w szpitalu.", "he / she / it → końcówka -s"),
        ("We always have lunch at twelve.", "Zawsze jemy lunch o dwunastej.", "always = zawsze → Present Simple"),
        ("He doesn't drink alcohol.", "On nie pije alkoholu.", "przeczenie: doesn't + forma podstawowa"),
        ("Do they work on Saturdays?", "Czy oni pracują w soboty?", "pytanie: do + osoba + czasownik"),
        ("The shop closes at eight.", "Sklep zamyka się o ósmej."),
        ("I never eat breakfast.", "Nigdy nie jem śniadania.", "never już zawiera przeczenie"),
        ("My son goes to school every day.", "Mój syn chodzi codziennie do szkoły."),
        ("How often do you visit them?", "Jak często ich odwiedzasz?"),
        ("Water boils at 100 degrees.", "Woda wrze w 100 stopniach.", "fakt, prawda ogólna"),
        ("She usually takes the bus.", "Ona zwykle jedzie autobusem."),
        ("We don't have time today.", "Nie mamy dziś czasu."),
     ]},
    {"id": "t2", "group": "czasy", "diff": 3, "level": "A1",
     "name": "Teraz właśnie — Present Continuous", "emoji": "⏱",
     "short": "Co dzieje się w tej chwili: am / is / are + -ing.",
     "items": [
        ("I am working now.", "Teraz pracuję.", "am + -ing = w tej chwili"),
        ("She is talking to the manager.", "Ona rozmawia z kierownikiem."),
        ("They are waiting outside.", "Oni czekają na zewnątrz."),
        ("What are you doing?", "Co robisz?", "pytanie: are + osoba + -ing"),
        ("It is raining again.", "Znowu pada."),
        ("I am not listening to music.", "Nie słucham muzyki."),
        ("We are having lunch right now.", "Właśnie jemy lunch."),
        ("The truck is coming at ten.", "Ciężarówka przyjeżdża o dziesiątej.", "plan na najbliższą przyszłość"),
        ("He is looking for a new job.", "On szuka nowej pracy."),
        ("Why are you laughing?", "Dlaczego się śmiejesz?"),
        ("The children are sleeping.", "Dzieci śpią."),
        ("I am learning English this year.", "Uczę się w tym roku angielskiego."),
     ]},
    {"id": "t3", "group": "czasy", "diff": 3, "level": "A2",
     "name": "Przeszłość — Past Simple", "emoji": "⏱",
     "short": "Co się wydarzyło i skończyło: wczoraj, w zeszłym tygodniu.",
     "items": [
        ("I worked late yesterday.", "Wczoraj pracowałem do późna.", "-ed = czasownik regularny"),
        ("We went to London last year.", "W zeszłym roku pojechaliśmy do Londynu.", "go → went (nieregularny)"),
        ("She was very tired.", "Ona była bardzo zmęczona.", "was = przeszła forma is"),
        ("They were at home all day.", "Byli w domu cały dzień.", "were dla you / we / they"),
        ("I didn't see him yesterday.", "Nie widziałem go wczoraj.", "przeczenie: didn't + forma podstawowa"),
        ("Did you call the office?", "Zadzwoniłeś do biura?", "pytanie: did + osoba + czasownik"),
        ("He bought a new phone last week.", "W zeszłym tygodniu kupił nowy telefon."),
        ("The train arrived on time.", "Pociąg przyjechał punktualnie."),
        ("I forgot my password.", "Zapomniałem hasła."),
        ("We didn't have any problems.", "Nie mieliśmy żadnych problemów."),
        ("What did you do at the weekend?", "Co robiłeś w weekend?"),
        ("She left the company in May.", "Odeszła z firmy w maju."),
     ]},
    {"id": "t4", "group": "czasy", "diff": 3, "level": "A2",
     "name": "Przyszłość — will i going to", "emoji": "⏱",
     "short": "Co się stanie: decyzja teraz (will) i plan (going to).",
     "items": [
        ("I will call you tomorrow.", "Zadzwonię do ciebie jutro.", "will = decyzja podjęta teraz"),
        ("We are going to buy a house.", "Zamierzamy kupić dom.", "going to = plan, zamiar"),
        ("It will be cold tonight.", "Dziś w nocy będzie zimno.", "przewidywanie"),
        ("She won't come to the party.", "Ona nie przyjdzie na imprezę.", "won't = will not"),
        ("Will you help me, please?", "Pomożesz mi, proszę?"),
        ("I am going to look for a new flat.", "Zamierzam poszukać nowego mieszkania."),
        ("They will finish the job on Friday.", "Skończą tę pracę w piątek."),
        ("I think it will rain.", "Myślę, że będzie padać."),
        ("We are going to start at eight.", "Zamierzamy zacząć o ósmej."),
        ("He will be back in an hour.", "Wróci za godzinę."),
        ("I won't forget about it.", "Nie zapomnę o tym."),
        ("What are you going to do next year?", "Co zamierzasz robić w przyszłym roku?"),
     ]},
]


def build():
    out = []
    for st in STAGES:
        items = []
        for k, row in enumerate(st["items"]):
            en, pl = row[0], row[1]
            note = row[2] if len(row) > 2 else ""
            items.append({"id": f"{st['id']}_{k + 1}", "en": en, "pl": pl, "note": note,
                          "words": len(en.split())})
        out.append({"id": st["id"], "group": st["group"], "diff": st["diff"], "level": st["level"],
                    "name": st["name"], "emoji": st["emoji"], "short": st["short"], "items": items})
    return {"name": "Bank zdań — tworzenie i słuchanie", "stages": out}


GROUP_NAMES = {"slownictwo": "Słownictwo (poziom trudności)",
               "phrasal": "Dwa wyrazy = inne znaczenie",
               "czasy": "Czasy podstawowe"}

if __name__ == "__main__":
    import json, os
    d = build()
    path = os.path.join(os.path.dirname(__file__), "..", "data", "zdania")
    os.makedirs(path, exist_ok=True)
    json.dump(d, open(os.path.join(path, "zdania.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    n = sum(len(s["items"]) for s in d["stages"])
    print(f"zdania zapisane: {len(d['stages'])} etapów, {n} zdań")
