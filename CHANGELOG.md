# LinguaForge — CHANGELOG

## v3.11.1 (2026-09-13) — poprawka „nullnull" na pulpicie

- **Na pulpicie (wersja 1) pod nagłówkiem „Lektor i cel nauki" wyświetlał się napis
  „nullnull".** Przyczyna: w kodzie często piszemy `warunek ? element : null`, a DOM-owe
  `append()` zamienia `null` na tekst „null" (nasza własna funkcja `el()` je pomijała,
  więc błąd pojawiał się tylko tam, gdzie elementy dokładane są bezpośrednio). W tym
  miejscu były dwa pola widoczne tylko dla nauczyciela — stąd dokładnie dwa „null".
- Poprawka globalna: `append()` i `prepend()` pomijają teraz `null` i `undefined` w całej
  aplikacji, więc ten sam błąd nie wypłynie w żadnym innym widoku. Sprawdzone: zero
  wystąpień słowa „null" na pulpicie, Ścieżce, Fiszkach, Podstawach, Zdaniach i Czasownikach.

## v3.11.0 (2026-09-09) — wersja 2: czytanie dobierane do słownika ucznia

Ostatni punkt z planu badawczego. **Wersja 1 bez zmian** (12 zestawów testów przechodzi).

## 📖 Czytanie — próg 98 % pokrycia
Teksty **nie są dobierane do etykiety poziomu**, tylko do słownika konkretnego ucznia.
Badania nad pokryciem leksykalnym (Hu i Nation): do swobodnego czytania bez słownika
potrzeba znajomości ok. 98 % słów; przy 95 % czytanie męczy, poniżej 90 % nie ma sensu.
Aplikacja zna fiszki ucznia, więc liczy pokrycie osobno dla każdego tekstu — i to jedyna
rzecz, w której bije papierowy podręcznik.

- **10 tekstów** (1189 słów, 30 pytań) o pracy, domu, lekarzu, podróży, nauce.
- Lista posortowana wg pokrycia, z paskiem i kolorem: zielony ≥98 % („czytaj śmiało"),
  żółty 95–98 % („da się, ale wolniej"), czerwony <95 % („na razie za trudny").
- Liczenie pokrycia uwzględnia **odmianę** (made/make, boxes/box, stopping/stop) i formy
  nieregularne, inaczej wynik zaniżałby się o kilkanaście procent.
- W tekście: lektor przy każdym zdaniu, **nieznane słowa podkreślone i klikalne** —
  dotknięcie pokazuje tłumaczenie i pozwala dodać słowo do „🔥 Do utrwalenia".
- Po tekście trzy pytania o zrozumienie (nie o szczegóły — o sens).
- Szacunek słownika z testu wstępnego trafia teraz do profilu i steruje doborem tekstów:
  początkujący widzi 56–59 % pokrycia (nic do czytania), uczeń po teście z wynikiem
  ~1500 słów — 93–97 % (dwa teksty gotowe).

## Nowe API i pliki
`GET /api/v2/reading`, `GET /api/v2/reading/{id}`, `POST /api/v2/reading/{id}` ·
`data/czytanie/teksty.json` · `tools/czytanie.py` · plik ucznia `reading_done.json`.

## v3.10.0 (2026-09-09) — wersja 2: płynność (4/3/2 i shadowing)

Piąty krok wdrażania dokumentu. **Wersja 1 bez zmian** (11 zestawów testów przechodzi,
zero błędów serwera). Nowy dział jest w wersji 2 pod adresem `#fluency` — wchodzi się
z ekranu „Dziś" (kafelek „🗣 Płynność 4/3/2") i z panelu skuteczności.

## Dlaczego to w ogóle jest osobny dział
Płynność to nie wiedza, tylko **automatyzacja** — a automatyzacji nie da się osiągnąć przez
zrozumienie, tylko przez powtórzenie pod presją czasu. Dotąd aplikacja ćwiczyła wyłącznie
wiedzę: nawet „mówienie" sprowadzało się do pisania. To pierwszy dział, w którym uczeń
naprawdę mówi.

## 🔁 4 / 3 / 2
Opowiadasz to samo trzy razy: najpierw w 4 minuty, potem w 3, na końcu w 2. **Ta sama treść,
coraz mniej czasu** — nie ma kiedy tłumaczyć w głowie, więc mózg zaczyna sięgać po gotowe
zwroty. Technika Maurice'a, opisana przez Nationa; jedno z najlepiej udokumentowanych
ćwiczeń płynności i praktycznie nieobecne w aplikacjach.

- 12 tematów dobranych do poziomu i celu ucznia (praca / wyjazd / ogólne).
- Przed rundą: przydatne początki zdań z lektorem i lista „powiedz o…".
- W rundzie: duży zegar, pasek czasu, podpowiedzi pod ręką, „Skończyłem wcześniej".
- **Licznik słów z mikrofonu** (Chrome/Edge/Android) — pokazuje tempo na żywo.
  Bez mikrofonu uczeń sam ocenia, ile zdążył powiedzieć (cztery opcje), a wynik jest
  oznaczany gwiazdką jako szacowany.
- Na koniec tabela trzech rund i **wzrost tempa w procentach**.
- Zero oceny poprawności i akcentu — w tym ćwiczeniu liczy się tylko tempo i kompletność.

## 🎧 Shadowing
Powtarzasz za nagraniem prawie równocześnie, nie czekając na koniec zdania — to trenuje
rytm i łączenia międzywyrazowe, czyli dokładnie to, przez co native brzmi „za szybko".
6 fragmentów po 5 zdań, regulowane tempo lektora, przycisk 🎤 „Powiedz to zdanie"
do sprawdzenia się, i uczciwe „Trudne — dalej" obok „Nadążam".

## 📈 Panel skuteczności: nowa miara
Doszła sekcja **„4. Tempo mowy"** — słowa na minutę z ćwiczeń 4/3/2, z pierwszym wynikiem,
rekordem i wykresem. To jedyna miara w całej aplikacji, która pokazuje płynność zamiast
wiedzy: wzrost tempa **przy tej samej treści** nie da się nabić powtarzaniem fiszek.

## Nowe API i pliki
`GET /api/v2/fluency`, `GET /api/v2/fluency/passage/{id}`, `POST /api/v2/fluency/save` ·
`data/plynnosc/plynnosc.json` (12 tematów + 6 fragmentów) · `tools/plynnosc.py` ·
nowy plik ucznia `fluency.json`.

## Pliki
main.py · data/plynnosc/plynnosc.json · tools/plynnosc.py · static/css/style.css ·
static/js/v2.js · static/js/app.js

## v3.9.0 (2026-09-09) — wersja 2: panel skuteczności „Czy to działa?"

Czwarty krok wdrażania dokumentu. **Wersja 1 bez zmian** (10 zestawów testów przechodzi,
zero błędów serwera). Nowy panel jest dostępny w wersji 2 pod przyciskiem
„📈 Czy to działa?" na ekranie „Dziś" (adres `#progress`).

## Dlaczego ten panel wygląda tak, a nie inaczej
Świadomie **nie ma tu czasu spędzonego w aplikacji ani liczby kliknięć**. Te rosną nawet
wtedy, gdy nauka stoi — mierzą zaangażowanie, nie skuteczność. Są za to cztery miary,
których nie da się nabić samym używaniem:

**1. Pamięć trwała (retencja)** — test kontrolny wyłącznie na słowach, których nie
widziałeś od **co najmniej 21 dni**. Wszystko świeżo powtórzone mierzy pamięć roboczą,
nie naukę. Test nie pokazuje poprawnych odpowiedzi (to pomiar, nie lekcja), a przy każdym
pytaniu widnieje „nie widziałeś tego od 31 dni". Wyniki lądują w historii z wykresem, więc
porównujesz się z samym sobą sprzed miesiąca.

**2. Wielkość słownika** — nie „ile fiszek zrobiłeś", tylko szacunek liczby znanych słów,
liczony przez te same progi częstotliwości co test wstępny (0–500, 500–1000, 1000–1500,
1500–2500, 2500–4000). Widać udział opanowanych słów w każdym progu osobno — czyli czy
uczysz się słów częstych (przydatnych), czy rzadkich (efektownych).

**3. Tempo odpowiedzi** — mediana z ostatnich 100 poprawnych odpowiedzi. Spadek czasu przy
tej samej skuteczności to automatyzacja, czyli realna płynność. Wiedza rośnie skokami,
płynność rośnie płynnie — dlatego to osobna miara.

**4. Transfer i porównanie wersji** — skuteczność w zadaniach trudniejszych niż rozpoznanie
(wpisywanie, zdanie z luką, dyktando). To najostrzejszy test, czy uczysz się języka, czy
aplikacji. Obok tabela **wersja 1 kontra wersja 2** na tych samych miarach: liczba
odpowiedzi, skuteczność, transfer, czas. Z uczciwym zastrzeżeniem: porównuj dopiero po
kilkuset odpowiedziach w obu wersjach, wcześniej to szum.

## Techniczne
- Miary zbierane przy każdej odpowiedzi, osobno dla wersji 1 i 2 (pole `metrics` w profilu,
  `v2_speed` — ostatnie 100 czasów).
- Nowe API: `GET /api/v2/progress`, `GET /api/v2/checkup`, `POST /api/v2/checkup`.
- Nowy plik ucznia: `checkups.json` (historia testów kontrolnych).
- Test kontrolny wymaga minimum 4 słów sprzed 21 dni; proponowany co 14 dni.
- Poprawka: `fsrs.is_mature()` wywoływane na właściwej strukturze karty.

## Pliki
main.py · static/css/style.css · static/js/v2.js · static/js/app.js

## v3.8.0 (2026-09-09) — wersja 2: rotacja formatu i adaptacyjna trudność

Trzeci krok wdrażania dokumentu projektowego. **Wersja 1 bez zmian** (9 zestawów testów
regresyjnych przechodzi, zero błędów serwera).

## 🔄 Rotacja formatu — to samo słowo, za każdym razem inaczej
Słowo znane w jednym formacie to wiedza krucha. Każde kolejne spotkanie z tym samym
słowem ma teraz inną postać, od rozpoznania po produkcję i słuch:

| Etap | Format | Jak wygląda |
|---|---|---|
| 0 | rozpoznanie | „Co znaczy *warehouse*?" — wybór z czterech |
| 1 | po angielsku | „Jak powiedzieć *magazyn*?" — wybór z czterech **angielskich** słów |
| 2 | wpisz z pamięci | produkcja z tłumaczenia |
| 3 | w zdaniu | luka w prawdziwym zdaniu przykładowym |
| 4 | ze słuchu | dyktando zdania z tym słowem |

Etap wynika z liczby spotkań ze słowem (licznik `v2_seen.json` + powtórki FSRS), więc
rotacja jest konsekwencją nauki, a nie losu. **Pomyłka cofa o krok** — format wraca do
łatwiejszego, zamiast dokładać trudności komuś, kto właśnie się pomylił.
Etykieta formatu jest widoczna przy zadaniu („Mieszanka · w zdaniu").
Słowa bez zdania przykładowego zatrzymują się na etapie 2.

## 🎚 Adaptacyjna trudność — celujemy w 80–85 % poprawnych
System pamięta **ostatnie 40 odpowiedzi** z sesji wersji 2 i steruje trzema pokrętłami:

| Skuteczność | Nowe słowa w sesji | Zadania produkcyjne | Błyskawica | Format |
|---|---|---|---|---|
| powyżej 88 % | 45 % | 70 % | 6 s | o stopień trudniejszy |
| 78–88 % (cel) | 30 % | 50 % | 8 s | normalny |
| poniżej 78 % | 15 % | 30 % | 10 s | o stopień łatwiejszy |

Poniżej ~70 % pojawia się frustracja, powyżej ~95 % nuda — to przełożenie teorii przepływu
na liczby. Zmiana jest **widoczna i wyjaśniona**: na ekranie „Dziś" i w podsumowaniu sesji
pojawia się „🎚 Ostatnio było ciężko — dziś więcej powtórek, mniej nowego" albo
„🎚 Idzie za łatwo — dokładamy trudniejszych zadań". Rozmiar części „Mieszanka" też się
zmienia (8 / 10 / 12 zadań).

## Nowe pliki ucznia
`v2_seen.json` (licznik spotkań ze słowem), pole `v2_recent` w profilu (ostatnie 40 odpowiedzi).

## Pliki
main.py · static/css/style.css · static/js/v2.js

## v3.7.0 (2026-09-09) — wersja 2: onboarding, który zabiera pracę

Drugi krok wdrażania dokumentu projektowego. **Wersja 1 nadal bez zmian** (7 zestawów
testów regresyjnych przechodzi). Wszystko poniżej dotyczy wyłącznie wersji 2.

## Onboarding — cztery ekrany zamiast testu na wejściu

**1. „Po co Ci angielski?" — PRZED testem.**
Sześć celów: praca · wyjazd · rozmowa z ludźmi · poprawić to, co umiem · egzamin · dla siebie.
Wybór ustawia dziedziny słownictwa i wariant przykładów w Podstawach (praca → magazyn).
Uzasadnienie: pytanie o cel buduje poczucie autonomii, pytanie o poziom buduje poczucie
oceniania — a autonomia to pierwsza noga motywacji wewnętrznej (teoria samostanowienia).

**2. „Ile czasu dziennie?"** — 5 / 15 / 30 minut, z podświetloną rekomendacją 15 i jednym
zdaniem prawdy o tym, dlaczego codziennie po trochu bije raz w tygodniu dużo. Ustawia
dzienny cel XP.

**3. Test adaptacyjny (7–10 min, cztery bloki).**
- **Słownictwo** — pytania w progach częstotliwości (0–500, 500–1000, 1000–1500, 1500–2500,
  2500–4000). Dwie pomyłki na progu = przestajemy się wspinać. Stąd szacunek wielkości słownika.
- **Gramatyka** — po dwa pytania z każdego z 12 tematów Podstaw, w kolejności programu.
  Temat zdany = obie odpowiedzi poprawne. Dwa niezdane tematy z rzędu = koniec bloku.
- **Słuchanie** — trzy zdania, pytanie o sens.
- **Pisanie** — dwa zdania do napisania po angielsku.
W teście **nie pokazujemy poprawnych odpowiedzi** (to jeszcze nie nauka) i wszędzie jest
„🤷 Nie wiem", bo zgadywanie zafałszowałoby mapę.

**4. Wynik jako MAPA, nie ocena.**
„Znasz około 1500 słów · poziom A2", lista „✔ To już umiesz — pomijamy", lista „◐ Do poprawy",
nazwana największa dziura, pierwszy krok i — najważniejsze —
**„⏱ Pominęliśmy 3 ogniwa. Zaoszczędziłeś około 18 dni nauki."**
Tematy zdane w teście są **realnie oznaczane jako pominięte na Ścieżce**, nie tylko opisane.

## Drobne
- Faza 0 (wymowa) ma teraz przycisk „Znam to — pomiń" przy każdym kontraście — ta sama zasada
  autonomii; pominięty kontrast wraca w powtórkach.
- Nowe API: `GET /api/v2/onboarding`, `POST .../goal`, `POST .../time`,
  `GET .../test`, `POST .../result`. Nowy plik ucznia: `onboarding.json`.
- Ekran „Dziś" kieruje na onboarding, dopóki nie jest ukończony.

## Pliki
main.py · static/css/style.css · static/js/v2.js

## v3.6.0 (2026-09-09) — WERSJA 2 do porównania (plan oparty na badaniach)

Aplikacja ma teraz **dwie wersje interfejsu do wyboru**. Przełącznik jest w ustawieniach
na pulpicie („↔ Wypróbuj wersję 2") i w stopce ekranu „Dziś" („↔ Wróć do wersji 1").
Ustawienie zapisuje się w profilu, więc trzyma się między urządzeniami.

**Wersja 1 — klasyczna. Nie zmieniła się ani o jotę.** Wszystkie moduły, ścieżki, fiszki
i sesje działają dokładnie jak w 3.5.0 (potwierdzone 7 zestawami testów regresyjnych).

## Wersja 2 — co jest inaczej i dlaczego

**Ekran główny odpowiada na jedno pytanie: „co teraz?"**
Zamiast siatki modułów — jedna duża karta „Dziś" z nazwanym krokiem, składem sesji
(„12 minut · słówka, dwa zdania ze słuchu, krótka rozmowa") i **jednym** przyciskiem.
Pod nią trzy małe, neutralne kafelki: powtórki · rdza · coś lekkiego (zmienia się codziennie).
Uzasadnienie: paradoks wyboru — każdy dodatkowy kafelek to koszt decyzji przed nauką.

**Nowa paleta.** Ciepła biel `#FAF8F5` zamiast czystej bieli (niższy kontrast = mniej męczy
oczy), tryb ciemny grafitowo-granatowy zamiast czerni, **jeden kolor akcentu (indygo)
użyty wyłącznie na przycisku „Zacznij"** i jedna animacja na całym ekranie — efekt izolacji
działa tylko wtedy, gdy wyróżniony element jest jeden.

**Faza 0: wymowa przed resztą.** Zanim ruszy materiał, 7 kontrastów, których polski nie ma
(`ship/sheep`, `bad/bed`, `think/sink`, `vest/west`, `full/fool`, końcówki -s/-ed, akcent
wyrazowy) — 42 pary słów. Każdy kontrast: wyjaśnienie, wskazówka artykulacyjna, test ze
słuchu. Dopóki uczeń nie **słyszy** różnicy, nie rozpozna jej w zdaniu.

**Sesja ma łuk zamiast płaskiej listy zadań:**
`Rozgrzewka` (3 rzeczy, które na pewno umie) → `Nowe` (blokowo, żeby złapać zasadę) →
`Mieszanka` (przeplatana, rdzeń nauki) → `Użycie` (całe zdanie, nastawione na znaczenie) →
`Błyskawica` (8 sekund na odpowiedź, materiał znany — ćwiczenie płynności) → `Zamknięcie`.
Między częściami krótka plansza z nazwą i wyjaśnieniem, po co ona jest.

**Przeplatanie zamiast bloków.** W części głównej ten sam format nie występuje dwa razy
pod rząd (zweryfikowane testem: 0 powtórzeń). Bjork i Rohrer: blokowe ćwiczenie daje lepsze
wyniki w trakcie nauki, gorsze po tygodniu.

**Słownictwo mieszane między tematami.** Wersja 1 bierze jeden temat (20 kolorów naraz) —
to najgorszy możliwy układ ze względu na interferencję semantyczną. Wersja 2 losuje z wielu
tematów naprzemiennie.

**Rdza zamiast listy zaległości.** Nie „47 powtórek do zrobienia", tylko nazwana rzecz:
„🔥 Czasowniki nieregularne — mocno zardzewiałe · 12 słów". Grupujemy przeterminowane karty
po temacie i pokazujemy jedną, najbardziej zardzewiałą.

**Dni tygodnia mają charakter.** Poniedziałek — nowy materiał, wtorek — słuchanie, środa —
mówienie, czwartek — mieszanka, piątek — czytanie i pisanie, weekend — powtórka skumulowana
i dzień lekki. Przewidywalna struktura przy zmiennej treści.

**Zamknięcie sesji z haczykiem.** „Dziś opanowałeś: …" (3 konkretne słowa) + zapowiedź jutra
+ komunikat o trudności, gdy wynik wypadł poza przedział 60–95 % (celujemy w 80–85 %).

## Nowe API i pliki
`GET /api/v2/today`, `GET /api/v2/session`, `POST /api/v2/complete`,
`GET /api/v2/pron/{id}`, `POST /api/v2/pron/done` · `data/wymowa/pary.json` ·
`tools/wymowa.py` · `static/js/v2.js` · sekcja `body.v2` w CSS ·
nowy plik ucznia `pron.json`

## Pliki
main.py · data/wymowa/pary.json · tools/wymowa.py · static/index.html · static/css/style.css ·
static/js/v2.js (nowy) · app.js · dashboard.js

## v3.5.0 (2026-09-09) — dwie nowe ścieżki: tworzenie i słuchanie zdań

## ✍️🎧 Ścieżki zdaniowe
Nowa zakładka **„Zdania"** z dwiema osobnymi ścieżkami opartymi na wspólnym banku
(`data/zdania/zdania.json` — **12 etapów, 144 zdania**, generator `tools/zdania.py`):

- **✍️ Tworzenie zdań** — widzisz zdanie po polsku, piszesz je po angielsku.
- **🎧 Słuchanie zdań** — słyszysz zdanie i je zapisujesz (tekst zna tylko serwer,
  przeglądarka dostaje samo nagranie; tempo lektora i „🔁 Powtórz" pod ręką).

Etapy w trzech grupach, z widoczną trudnością (●○○○ … ●●●●):
- **Słownictwo** — 6 etapów od „Jestem kierowcą" po sprawy urzędowe,
- **Dwa wyrazy = inne znaczenie** — 2 etapy czasowników frazowych (get up, look for,
  turn off, break down…), każdy z wyjaśnieniem, dlaczego dosłowne tłumaczenie nie działa,
- **Czasy podstawowe** — Present Simple, Present Continuous, Past Simple, will / going to;
  przy zdaniach krótkie „dlaczego ten czas".

Wspólne dla obu ścieżek:
- ocena słowo po słowie (czerwone zbędne, zielone brakujące),
- **przepisanie poprawnego zdania po błędzie** (nie liczy się do wyniku; przy pomyłce
  w przepisaniu też widać różnice), z opcją „Pomiń →",
- **oznaczanie nieznanych słów** — całe poprawne zdanie jest klikalne, dotknięte słowo
  trafia do „🔥 Do utrwalenia",
- 🎤 „Powiedz to zdanie" przy każdym wyniku,
- zaliczenie etapu od 70 %, wynik zapamiętywany osobno dla każdej ścieżki.

## 📝 Nowa talia: „Zdania do poprawy"
- Osobna od „Do utrwalenia": tam pojedyncze słowa, **tu całe zdania**.
- **Tworzenie zdań**: każde źle napisane zdanie trafia tam automatycznie.
- **Słuchanie**: nic nie trafia tam samo — jest przycisk „📝 Dodaj to zdanie do poprawy",
  a nieznane słowa dodajesz dotknięciem. Tak jak prosiłeś.
- Karta w fiszkach pokazuje polskie zdanie i prosi o całe zdanie po angielsku;
  zdanie wypada z talii po **2 poprawnych zapisach z rzędu**.
- API: `GET /api/sentences/paths|session|audio|tofix`, `POST /api/sentences/answer|complete|tofix/add|tofix/remove`.

## Nawigacja
- Dolny pasek: Start · Podstawy · Ścieżka · Fiszki · **Zdania** (Czasowniki i reszta pod „☰ Więcej").
- Kafelek „Zdania" na pulpicie.

## PDF
- `tools/zdania_pdf.py` generuje **LinguaForge_bank_zdan.pdf** — wszystkie 144 zdania
  w układzie dwukolumnowym (angielski + polski, przy frazowych wyjaśnienie), spis etapów
  z trudnością. Zakryj jedną kolumnę i tłumacz w obie strony. 8 stron A4.

## Pliki
main.py · data/zdania/zdania.json · tools/zdania.py · tools/zdania_pdf.py ·
static/index.html · static/css/style.css · static/js/sentences.js (nowy) · app.js ·
dashboard.js · flashcards.js

## v3.4.0 (2026-09-06) — tworzenie zdań w każdym dziale, zakładka „Czasowniki"

## 🧩 Tworzenie zdań — nowy typ zadania na Ścieżce
- Każde ogniwo słówek ma teraz zadania **„Ułóż zdanie po angielsku"**: dostajesz polskie
  zdanie i wymieszane klocki ze słowami, układasz kolejność (klik = do linii, klik = z powrotem,
  „↺ Od nowa" czyści). Przycisk „Sprawdź" odblokowuje się dopiero po użyciu wszystkich klocków.
- Po sprawdzeniu widać **słowo po słowie**, co stało w złym miejscu, i całe poprawne zdanie
  z lektorem — a błędne słowa trafiają do „🔥 Do utrwalenia" jak przy dyktandzie.
- Zdania budujemy z tych samych przykładów, co dyktanda i tłumaczenia, więc jedno ogniwo
  ćwiczy teraz cztery umiejętności: słówka → **szyk zdania** → słuchanie → pisanie.
  W sesji ~40 zadań wypada 5–9 zadań klockowych.
- **Powtórka skumulowana** też dostaje budowanie zdań (6 zadań ze słówek z zaliczonych tematów).
- Lektor nie czyta zdania przed ułożeniem (nie podpowiada odpowiedzi).

## ⚙️ Zakładka „Czasowniki" — spis wszystkich
- Nowa pozycja w dolnym pasku i na pulpicie. To **spis, nie kolejny trener**: miejsce, gdzie
  sprawdzasz czasownik, tak jak zagląda się do tabeli.
- Trzy listy: **⚙️ Z odmianą (100)** · **📖 Pozostałe (246)** · **🔗 Frazowe (144)** — łącznie 490.
- Szukanie po angielsku i po polsku, filtry: nieregularne · jeszcze nieuczone · w powtórkach.
  Przy każdym czasowniku widać stan powtórki („nowy", „w powtórkach", „✔ umiesz").
- Dotknięcie czasownika z odmianą rozwija **pełną tabelę**: pięć form (podstawowa, he/she/it,
  -ing, 2. forma, 3. forma) i osiem wierszy użycia z przykładami, tłumaczeniem i lektorem —
  ten sam układ co na odwrocie fiszki.
- Przy każdym: „🔥 Dodaj do utrwalenia" i przycisk „▶ Ćwicz te czasowniki w fiszkach".
- Nowy endpoint `GET /api/verbs/all`.

## Poprawki
- Czasowniki frazowe zachowują spację w kategorii „Do utrwalenia" („pick up", nie „pickup").
- Zadanie klockowe dostaje polskie zdanie jako wskazówkę (wcześniej pole `pl` nie było
  przekazywane do przeglądarki).

## Pliki
main.py · static/index.html · static/css/style.css · static/js/app.js · verbs.js (napisany
od nowa) · path.js · dashboard.js

## v3.3.0 (2026-09-06) — zdania przykładowe dla całego A1, czasowniki w fiszkach

## Zdania przykładowe — cały poziom A1
- **553 nowe zdania** z tłumaczeniami dla ośmiu tematów: przymiotniki, liczebniki, kalendarz,
  jedzenie, dom, ubrania, zwierzęta, zwroty (wcześniej: rodzina i kolory). Łącznie **745 słówek
  ma teraz zdanie**.
- Dzięki temu **każde ogniwo słówek na A1 miesza etapy**: słówka + 🎧 dyktando zdania +
  ✍️ „napisz całe zdanie po angielsku" + 🎤 wymowa. Wcześniej działało to tylko na dwóch
  pierwszych ogniwach.
- Zdania trafiają też do ekranu „📖 Najpierw poznaj słówka", do fiszek i do kart
  „🔥 Do utrwalenia" (jako kontekst z luką).
- Wszystkie zdania są proste i zbudowane z gramatyki z Podstaw (TO BE, Present Simple,
  a/an), więc nie wyprzedzają materiału. Narzędzie: `tools/przyklady_a1.py`.

## Czasowniki — koniec osobnej zakładki
- Zakładka **„⚙️ Czasowniki z czasami" usunięta** (nawigacja, pulpit, `index.html`).
  Odmiana jest teraz **kategorią fiszek „⚙️ Odmiana czasowników"** — 100 czasowników
  wchodzi w ten sam system powtórek co reszta słownictwa (FSRS, seria, XP).
- **Nowa karta czasownika zamiast czterech kratek do wypełnienia**: pytanie o jedną losową
  formę (2. forma, 3. forma, he/she/it, -ing), a po odpowiedzi **czytelna tabela całej odmiany**:
  pięć form w kafelkach (wyróżniona ta, o którą pytaliśmy) i osiem wierszy użycia —
  Present Simple, 3. osoba, Continuous, Past Simple, will, have + 3. forma, przeczenie, pytanie —
  każdy z przykładem po angielsku, tłumaczeniem i lektorem.
- Styl tabeli: spokojny, „papierowy" układ — cienkie linie zamiast ramek, jeden akcent
  na wyróżnionej formie, kolumna „czas" po lewej, zdanie po prawej, polskie pod spodem.
  Na telefonie układ zwija się do jednej kolumny.
- Formy `-ing` i 3. osoby liczone automatycznie z regułami pisowni (stop → stopping,
  open → opening, study → studying, begin → beginning, travel → travelling, lie → lying).
- Grupa „⚙️ Czasowniki" w wyborze fiszek łączy odmianę i czasowniki-słówka.
- Stare API `/api/verbs/*` zostaje (używają go programy i przegląd treści), więc postęp
  z dawnej zakładki nie znika.

## Pliki
main.py · data/slownictwo/*.json (10 plików ze zdaniami) · tools/przyklady_a1.py ·
static/index.html · static/css/style.css · static/js/app.js · dashboard.js · flashcards.js
(`static/js/verbs.js` nie jest już ładowany — można skasować)

## v3.2.0 (2026-09-06) — pojedyncze słówka do utrwalenia, etapy razem, DO/DOES i A/AN od nowa

## Do utrwalenia — poprawki
- **Pytanie o SAMO słowo, nie o całe zdanie.** Fiszka z kategorii 🔥 pokazuje zdanie z luką
  („Our _____ is very friendly.” + polskie zdanie) i prosi o brakujące słowo. Uznawana jest
  forma z fiszki i forma ze zdania (stranger / strangers).
- **Dodaje się automatycznie** przy każdej błędnej odpowiedzi i przy „Nie wiem": w fiszkach
  (od razu, nie po 2 potknięciach), na Ścieżce (słówka do napisania i „co znaczy X"), w Podstawach
  (słowa treści ze zdania, którego nie znałeś). Toast informuje, co trafiło do kategorii.
- **Znaczenie przez dotknięcie**: gdy słowa nie ma w bazie, po odpowiedzi polskie zdanie jest
  klikalne — wskazujesz słowo, które jest tłumaczeniem, i fiszka je zapamiętuje.
- Zaimki, przedimki, formy „być", skróty (I'm, don't…), liczebniki do 10 — nigdy nie trafiają
  do kategorii.

## Ścieżka — etapy razem
- **„📖 Najpierw poznaj słówka"** na ekranie startowym ogniwa słówek: lista z lektorem, zdaniem
  przykładowym i tłumaczeniem (można ukryć), „Przeczytaj wszystkie", potem „Teraz ćwicz".
  Nagrania przygotowywane w tle.
- **Sesja słówek miesza etapy**: do zadań słówkowych dochodzą **zdania z tymi słówkami** —
  🎧 dyktando (słuchanie + pisanie) i ✍️ „Napisz po angielsku" całe zdanie (czytanie + pisanie).
  Przy każdym wyniku 🎤 „Powiedz to zdanie" (wymowa, opcjonalnie) i klikalne słowa.
- **84 zdania przykładowe** (rodzina i ludzie, kolory) z tłumaczeniami — `tools/przyklady_a1.py`.
  Kolejne tematy (przymiotniki, liczebniki, kalendarz, jedzenie…) dopisujemy tym samym narzędziem.
- Nowy endpoint `GET /api/path/words/{lid}`.

## Podstawy — dwa kolejne rozdziały w stylu TO BE
- **DO i DOES** (5 stron, 20 ćwiczeń, 10 pytań testu): po co jest DO, DO/DOES, zasada jednego -s,
  don't/doesn't, krótkie odpowiedzi, dlaczego TO BE i can nie potrzebują DO, pytania z where/what.
- **A czy AN** (4 strony, 19 ćwiczeń, 9 pytań): jeden z wielu, dźwięk a litera (an hour /
  a university / an SMS), liczba mnoga i niepoliczalne, A/AN vs THE, zawody, twice a week.
- Oba z tabelami-ściągami, przykładami ogólnymi i z pracy, „dlaczego nie inaczej", nowymi typami
  zadań (ze słuchu ABCD, klocki, znajdź błąd, uzupełnij tekst). Generatory: `tools/do_does_topic.py`,
  `tools/a_an_topic.py`.
- Odpowiedź „—" (brak przedimka) poprawnie wstawiana w pełnym zdaniu i czytana przez lektora.

## Pliki
main.py · data/podstawy/kursy.json · data/slownictwo/rodzina_ludzie.json · data/slownictwo/kolory.json ·
tools/*.py · static/css/style.css · static/js/app.js · basics.js · path.js · flashcards.js

## v3.1.0 (2026-09-06) — Do utrwalenia, nowe typy zadań, mówienie, pomijanie ogniw

## Błędy naprawione (Podstawy / TO BE)
- **Tabele były ucinane** — komórki miały `white-space:nowrap`. Teraz zawijają się,
  mają mniejszą czcionkę w wąskiej kolumnie, a sekcja z tabelą w układzie dwukolumnowym
  rozciąga się na całą szerokość. Na telefonie tabela ma dodatkowy margines.
- **„Połącz w pary" odrzucało poprawne pary** (she–is z „drugim" is). Sprawdzana jest
  treść pary, nie numer.
- **Luka „She ___ not here"**: wynik pokazuje pełne zdanie i skrót: „Poprawnie: is
  (= She isn't here today.)". Przy każdej luce wyświetla się całe zdanie z odpowiedzią.
- **Lektor czyta całe zdanie**, nie samą lukę/zaimek.
- „Praca w magazynie" — teraz widać, co to zmienia: na ekranie tematu jest przełącznik
  **🌍 przykłady ogólne / 🏭 przykłady z pracy**, a nagłówek przykładów w teorii mówi,
  który wariant oglądasz. „Picker" zastąpione przez „warehouse worker".

## Nowe typy zadań (w TO BE: 24 ćwiczenia, 11 pytań testu)
- 🎧 **Wybór ze słuchu** — lektor czyta zdanie, wybierasz znaczenie albo usłyszane zdanie.
- 🧩 **Ułóż zdanie z klocków** — kolejność słów.
- 🔍 **Znajdź błąd** — kliknij niepoprawne słowo w zdaniu.
- 📝 **Uzupełnij tekst** — dłuższy tekst z lukami: część wybierasz z listy, część wpisujesz;
  po sprawdzeniu każda luka podświetla się na zielono/czerwono.
  Format w JSON: `[[is|am|are]]` (pierwsza opcja poprawna) i `[[=am]]` (wpisz).

## Pisanie zdań: słowo po słowie
- Przy każdym zdaniu do zapisania (słuchanie w Podstawach, dyktanda i tłumaczenia na
  Ścieżce, moduł Słuchanie, przepisywanie po błędzie) wynik pokazuje **na czerwono słowa
  zbędne/błędne, na zielono brakujące** (`wordDiff`, dopasowanie LCS).

## 🔥 „Do utrwalenia" — nowa kategoria fiszek
- Trafiają tu: (1) słowa treści, które błędnie zapisałeś w zdaniu (poprawna forma, nie
  literówka), (2) fiszki mylone kolejny raz (2+ potknięcia), (3) słowa, które sam
  oznaczysz — **w każdym wyniku zadania zdanie jest klikalne: dotknij słowa, którego nie
  znasz**. Zaimki, przedimki, formy „być" itp. są pomijane (to gramatyka, nie słówka).
- Słowo wypada z kategorii po **3 poprawnych zapisach netto** (błędne odejmują) — licznik
  widać w podpowiedzi fiszki. Znaczenie brane z bazy słówek; gdy słowa nie ma w bazie,
  fiszka pokazuje polskie zdanie, z którego pochodzi.
- API: `GET /api/hardwords`, `POST /api/hardwords/add|remove|report`.
- Fiszki: **„☑ Wybierz kilka kategorii"** — łączenie dowolnych tematów w jednej sesji.

## Ścieżka
- **⏭ Pomiń** przy każdym ogniwie (poza egzaminem poziomu) i **„Umiem to — pomiń"** na
  ekranie tematu Podstaw: ogniwo liczy się bez wyniku, odblokowuje następne, można cofnąć (↩).
  `POST /api/path/skip` obsługuje też `{type, level}` — pominięcie wszystkich ogniw danego typu.
- **Powtórka skumulowana** jest teraz solidna: do słówek i gramatyki dochodzą pytania
  z zaliczonych tematów Podstaw oraz dyktanda; sugerowana długość min. 24 zadania
  (pula np. 84 po pierwszym poziomie). W egzaminie — wszystkie tematy Podstaw.

## Krok naprzód: 🎤 mówienie
- W każdym wyniku ze zdaniem jest przycisk **„🎤 Powiedz to zdanie"** — przeglądarka
  rozpoznaje mowę (Web Speech API: Chrome, Edge, Android), a aplikacja porównuje słowo po
  słowie i mówi, co poszło nie tak. To pierwszy element filaru „mówienie". Nie ocenia
  akcentu — ocenia, czy wypowiedziałeś właściwe zdanie. W Safari/Firefox przycisk się nie
  pokazuje.

## Pliki
main.py · data/podstawy/kursy.json · tools/to_be_topic.py · static/css/style.css ·
static/js/app.js · ui.js · basics.js · path.js · flashcards.js · listening.js

## v3.0.0 (2026-09-04) — Ścieżka jako główna droga, Podstawy: TO BE od nowa, porządki

## Błędy naprawione
- **Ogniwo „Teoria: zaimki" — błąd serwera.** Ogniwo typu `wiedza` ciągnęło artykuł z Bazy
  wiedzy przepisany na inny format quizu (`fields` zamiast `model`) → `KeyError`. Ogniwa typu
  `wiedza` i `lekcja` zniknęły ze Ścieżki; teorię dają teraz ogniwa typu **`podstawy`**
  (temat z Podstaw: teoria + ćwiczenia + test). Zdany test tematu (≥ 70 %) zalicza ogniwo.
- **Enter zjadał wynik zadania** (Podstawy: słuchanie, luka; runda utrwalenia w fiszkach;
  czasowniki). Handler pola wywoływał ocenę, ocena zakładała nowy handler „Enter = Dalej",
  a to samo naciśnięcie bąbelkowało do dokumentu i klikało „Dalej". Wynik znikał po ułamku
  sekundy. Handler zakładany jest teraz w następnej klatce (`setTimeout(…, 0)`).
- **Skróty `'m` / `'s` / `'re` / `isn't`** uznawane w lukach na równi z pełną formą
  (`BT_CONTRACT` + pole `accept` w zadaniu) — teoria je poleca, więc nie mogły być błędem.
- **Podpowiedzi**: w teście nie ma ich wcale (ani ściągi); w ćwiczeniach podpowiedź mówi
  o regule („my brother = on → która forma?"), nie wymienia form do wyboru.
- „Kontynuuj" na pulpicie prowadzi ZAWSZE do następnego ogniwa Ścieżki; powtórki fiszek
  są drugim, mniejszym kafelkiem (`/api/continue` → `second`).
- `window.matchMedia` zabezpieczone (starsze przeglądarki).

## Podstawy — TO BE napisane od nowa (wzorzec dla pozostałych tematów)
- Polskie znaki w całej treści; 6 stron zamiast 2: czym jest TO BE i dlaczego nie wolno go
  pominąć → trzy formy (z tabelą) → skróty → przeczenie i pytanie **+ osobna sekcja „A co z
  DO i DOES — dlaczego tu ich NIE ma"** → was/were → pułapki (wiek, głód, zimno, racja).
- **Ściąga**: cała odmiana (am/is/are, skróty, przeczenia, pytania, was/were) w jednej tabeli
  na ekranie tematu oraz pod przyciskiem **📋 Ściąga** w pasku każdego zadania (boczny
  panel — nie trzeba się cofać). W teście ściąga wyłączona.
- **„Dlaczego nie inaczej"**: każde zadanie ma `why_not` — po błędzie wyjaśnia wybraną
  złą opcję, po „🤷 Nie wiem" — wszystkie pozostałe. Przycisk „Nie wiem" jest też w teście.
- 17 ćwiczeń, 8 pytań testu, zadania ze słuchu i dopasowania.
- Przykłady w dwóch wariantach: ogólne i „praca w magazynie" (`examples_work`) — wybierane
  wg celu ucznia („Uczę się do:" na pulpicie). Gramatyka jest jedna, różnią się przykłady.
- **Dwie kolumny** w teorii (reguła + tabela | przykłady z lektorem), przełącznik
  ▤/▥ w pasku narzędzi, zapamiętywany; na telefonie automatycznie jedna kolumna.
- Nowy wygląd ekranu tematu (kafle Teoria / Ćwiczenia / Test, tabela, mniej emoji).
- Pozostałe 11 tematów działa w starym formacie (bez polskich znaków) — do przepisania
  wg tego wzorca po Twojej akceptacji.

## Usunięte / ukryte
- Moduły **Baza wiedzy, Mój trening, Lekcje** usunięte z nawigacji, pulpitu, listy modułów
  admina i `index.html` (pliki JS zostają w repo, nieładowane; można skasować:
  `static/js/knowledge.js`, `lessons.js`, `training.js`).
- Pulpit ucznia: bez pola hasła administratora, kopii postępów, eksportu CSV/JSON, prognozy
  i „dostępu z telefonu". Logowanie admina: adres `#admin`. Ustawienia ucznia to tylko
  „Uczę się do:" (cel) i tempo lektora; pełne ustawienia widzi admin/nauczyciel.

## Pliki
main.py · data/sciezka.json · data/podstawy/kursy.json · tools/to_be_topic.py ·
static/index.html · static/css/style.css · static/js/app.js · ui.js · basics.js · path.js ·
dashboard.js · flashcards.js · verbs.js

## v2.9.0 (2026-09-04) — Podstawy, szybki lektor, poprawianie błędów na Ścieżce

## Błędy naprawione
- **Zakładka „Podstawy" pokazywała pustą stronę / wracała na pulpit.** Trasa `#basics` była
  w dolnym pasku, ale brakowało jej w tabeli tras `ROUTES_STUDENT` (app.js) — router nie
  znajdował widoku i przekierowywał na pulpit. Dodana jedna linia.
- **Lektor opóźniał się o kilka sekund.** Dwie przyczyny:
  - serwer: `/api/tts` był `async def` i wywoływał blokujące edge-tts — synteza blokowała
    całą pętlę zdarzeń, więc KAŻDE inne żądanie czekało. Teraz generowanie idzie do wątku
    roboczego (`run_in_threadpool`);
  - przeglądarka: nagranie było pobierane dopiero przy `speak()`, plus sztuczne
    `setTimeout(300–400 ms)`. Funkcja `prefetchTts` istniała, ale nie była nigdzie używana.
- **Zadania „Napisz po angielsku" wymagały przepisania dopisków w nawiasach** — 65 słówek
  ma formę `orange (colour)`, `shelf / rack`, `to run`; serwer porównywał dosłownie.
  Nowa funkcja `_en_variants()` uznaje `orange`, `shelf`, `rack`, `run`.
- Baza wiedzy: przycisk „← Teoria" w ćwiczeniach wywoływał nieistniejącą funkcję
  `viewArticle` (błąd „viewArticle is not defined"). Poprawione na `viewKbArticle`.
- `document.onkeydown` z zadania nie było czyszczone przy wyjściu z trybu skupienia —
  Enter mógł „kliknąć Dalej" w innym widoku. `exitFocus()` zawsze je zeruje.
- „Odsłuchaj stronę/lekcję/tekst" wysyłało cały tekst, a serwer ucina do 400 znaków —
  słychać było tylko początek. Długi tekst jest dzielony na zdania (~300 znaków)
  i czytany po kolei; dodany przycisk ⏹ Stop.
- Zdublowana linia w `ttsInfo()`; hardkodowane tempa (0.88/0.9/0.92/0.95) w 7 modułach
  zastąpione wspólnym ustawieniem.

## Lektor
- **Tempo w każdym zadaniu**: pasek trybu skupienia ma przycisk tempa (🐢 wolno · ▶ normalnie ·
  🐇 szybko · ⚡ bardzo szybko = 0.7 / 1.0 / 1.2 / 1.4) i przełącznik 🔊/🔇. Jedno ustawienie
  dla całej aplikacji, zapisywane w przeglądarce i w profilu; dostępne też na pulpicie.
- **Zadania ze słuchu** (dyktanda, fiszki ze słuchu, ogniwo „słuchanie", test poziomujący,
  programy) pokazują tylko tempo — bez wyciszania (bez dźwięku nie da się ich rozwiązać).
  Wszędzie dodany przycisk 🔁 Powtórz i rząd tempa pod odtwarzaczem.
- Domyślne tempo podniesione z 0.92 do 1.0 (naturalna mowa).
- Zmiana tempa działa przez `playbackRate` przeglądarki: jedno nagranie służy wszystkim
  prędkościom, zmiana jest natychmiastowa (także w trakcie odtwarzania) i cache trafia
  niemal zawsze. Serwer generuje zawsze w tempie 1.0 (parametr `rate` zostaje dla zgodności).
- **Nagrania z wyprzedzeniem**: przy starcie sesji fiszek / ogniwa Ścieżki serwer w tle
  przygotowuje nagrania wszystkich odpowiedzi (`_tts_prewarm`, osobny wątek), a przeglądarka
  pobiera 3 kolejne karty/zadania (`prefetchTts`). Automatyczne odtworzenie startuje od razu.
- Nowy endpoint `POST /api/tts/prewarm` (lista tekstów do przygotowania).
- Rozmowy: kwestia rozmówcy czytana przez `speakAuto` (można wyciszyć); 🔊 przy kwestii gra zawsze.

## Ścieżka
- **Na ekranie startowym ogniwa wybierasz, czy po błędzie / „nie wiem" przepisać poprawne
  słówko** (ustawienie `path_retype`, domyślnie włączone). Poprawka nie liczy się do wyniku
  (serwer zapisuje tylko pierwszą odpowiedź), ale utrwala słówko. W zadaniu „co znaczy X"
  przepisujesz X po angielsku, nie polskie znaczenie. Przycisk 🔊 przy słowie do przepisania.
- Ten sam przełącznik (`retypeToggle`) w Fiszkach, z opisem.
- Dyktanda na Ścieżce: 🔁 Powtórz + tempo, natychmiastowy start.

## Pliki
main.py · static/js/app.js · ui.js · path.js · flashcards.js · basics.js · knowledge.js ·
listening.js · placement.js · programs.js · dialogs.js · reading.js · dashboard.js ·
static/css/style.css

## v1.0.3 (2026-08-07) — pełna instrukcja od zera, punkt po punkcie

## Dodane
Nowy plik **`android/INSTRUKCJA_OD_ZERA.md`** — całkowicie nowa instrukcja, pisana
z założeniem zerowej wiedzy wstępnej. Każdy krok wskazuje: **na jakim urządzeniu**
(komputer / telefon), **w jakim programie**, **w którym miejscu ekranu**
i **co dokładnie zrobić**.

Struktura:
- **Część A** — instalacja Android Studio i brakujących składników (NDK, CMake) od zera.
- **Część B** — rozpakowanie paczki, uruchomienie skryptu kopiującego kod, otwarcie
  projektu, synchronizacja z obsługą ostrzeżeń (JDK/JAVA_HOME, Microsoft Defender).
- **Część C** — budowanie APK przez okno poleceń (podwójny Shift), z aktualną nazwą
  „Generate APKs".
- **Część D** — instalacja na telefonie: kablem z Debugowaniem USB (od włączenia Opcji
  programisty) oraz bez kabla przez przesłanie pliku.
- **Część E** — pierwsze uruchomienie, przeniesienie postępów, ustawienie baterii.
- **Rozwiązywanie problemów** — wszystkie napotkane dotąd błędy z krokami naprawczymi.

## v1.0.2 (2026-08-07) — naprawa instalacji Pythona w aplikacji Androida

## Błąd
Budowanie APK przerywało się komunikatem
`Process 'command ...python.exe' finished with non-zero exit value 1`.

**Przyczyna:** zestaw bibliotek zawierał **pydantic 2**, którego rdzeń jest napisany
w Ruście i kompilowany — dla Androida taka wersja nie istnieje, więc instalacja
kończyła się błędem, zanim powstał plik aplikacji.

## Poprawka
Podmieniony zestaw na w pełni pythonowy (pliki `py3-none-any`):
`fastapi 0.99.1 · pydantic 1.10.13 · starlette 0.27.0 · uvicorn 0.22.0`
oraz jawnie przypięte zależności (anyio, sniffio, h11, click, idna, typing-extensions).

**Cała aplikacja została uruchomiona i przetestowana na tym zestawie** — logowanie,
pominięcie testu, fiszki, ogniwa Ścieżki, ocenianie odpowiedzi, eksport CSV i pliki
statyczne działają bez różnicy. Aplikacja nie korzysta z żadnej funkcji wymagającej
pydantic 2.

Ten sam zestaw trafił do `telefon/requirements_telefon.txt` i do skryptu instalacyjnego
dla Termuksa — tam też eliminuje kompilowanie bibliotek na telefonie.

## Dodane
- `android/NAPRAWA_BLEDU_PYTHON.md` — opis błędu, kroki naprawcze (m.in. skasowanie
  `android/app/build/python`), wyjaśnienie, które pakiety Chaquopy potrafi instalować,
  oraz sposób odczytania prawdziwej przyczyny z dziennika budowania.
- W tabeli problemów dopisane: nowa nazwa polecenia **Generate APKs** (dawniej „Build APK(s)").

## v1.0.1 (2026-08-07) — naprawa budowania projektu Androida

## Błąd
Przy pierwszej synchronizacji projektu Android Studio zgłaszało:
`Unable to load class 'org.gradle.util.VersionNumber'`.

**Przyczyna:** w projekcie brakowało pliku przypinającego wersję Gradle
(`gradle/wrapper/gradle-wrapper.properties`), więc Android Studio używało najnowszej
dostępnej wersji (Gradle 9), w której usunięto klasę `VersionNumber` wymaganą przez
wtyczkę osadzającą Pythona. Budowanie przerywało się przed kompilacją.

## Poprawka
- Dodany plik `gradle/wrapper/gradle-wrapper.properties` — **Gradle przypięty do 8.7**.
- Wtyczka Androida cofnięta z 8.5.2 na **8.4.0** (wersja sprawdzona z Chaquopy 15.0.1).
- `gradle.properties` uzupełnione o ustawienia stabilniejszego budowania.
- Nowy plik **`android/NAPRAWA_BLEDOW_GRADLE.md`**: instrukcja czyszczenia pamięci
  podręcznej Gradle, ustawienia Gradle JDK na 17, tabela zgodnych wersji i lista kroków,
  gdy synchronizacja nadal nie przechodzi.
- W instrukcji budowania dopisane ostrzeżenie, by odrzucać propozycje aktualizacji wtyczek.

## Zgodny zestaw wersji
Gradle 8.7 · Android Gradle Plugin 8.4.0 · Kotlin 1.9.24 · Chaquopy 15.0.1 · JDK 17 · SDK 34

## v1.0.0 (2026-08-07) — wygląd i zachowanie prawdziwej aplikacji

## Nawigacja jak w aplikacji do nauki
- **Dolny pasek zakładek** z ikonami i podpisami: **Start · Ścieżka · Fiszki · Rozmowy · Więcej**.
  Aktywna zakładka podświetla się, powiększa i dostaje pomarańczową kreskę.
- **„Więcej" otwiera arkusz wysuwany z dołu** (jak w natywnych aplikacjach) z siatką
  wszystkich pozostałych modułów, przełącznikiem motywu i wylogowaniem.
- Koniec listy odnośników w bocznym menu — nic już nie przypomina strony internetowej.

## Zachowanie natywne
- **Brak zaznaczania tekstu**, podświetleń dotknięcia i menu kontekstowych (poza polami,
  w których faktycznie pisze się tekst).
- **Wibracja przy odpowiedzi** — inna przy poprawnej, inna przy błędnej, krótka przy dotknięciu
  zakładki. Można ją wyłączyć w ustawieniach.
- **Przyciski z wciśnięciem**: masywne, z cieniem u dołu, wciskają się przy dotknięciu.
  Tak samo kafle odpowiedzi.
- **Płynne przejścia między ekranami** zamiast przeładowania strony.
- W aplikacji na Androida: brak paska przewijania i „gumowego" odbicia strony,
  pomarańczowy ekran startowy z nazwą aplikacji.

## Lektor w fiszkach
- **Po odsłonięciu odpowiedzi aplikacja czyta angielskie słowo na głos** — automatycznie,
  bez dotykania czegokolwiek. To samo w module czasowników.
- **Głośnik można wyciszyć** trzema sposobami: przyciskiem 🔊/🔇 na karcie odpowiedzi,
  przyciskiem w pasku zadania (widocznym w każdym ćwiczeniu) oraz w Ustawieniach
  („🔊 Czytaj odpowiedzi na głos").
- Ustawienie zapamiętuje się w profilu i na urządzeniu.
- Dotknięcie przykładowego zdania odczytuje je osobno.

## Ustawienia
W pulpicie doszły dwa przełączniki: **czytanie odpowiedzi na głos** i **wibracje**.

## v0.9.2 (2026-08-07) — projekt prawdziwej aplikacji na Androida

## Co powstało
Folder **`android/`** to kompletny projekt Android Studio, z którego powstaje **zwykła
aplikacja (APK/AAB)**: ikona w menu telefonu, własne okno, **serwer wewnątrz aplikacji**.
Nie potrzeba już Pydroida ani Termuksa.

- `MainActivity.kt` — pełnoekranowe okno z interfejsem, obsługa przycisku Wstecz,
  ekran startowy czekający na serwer, linki zewnętrzne otwierane w przeglądarce.
- `ServerService.kt` — **usługa pierwszoplanowa** ze stałym powiadomieniem i blokadą
  uśpienia procesora; `START_STICKY` sprawia, że system wznawia ją, gdyby ją ubił.
  To rozwiązuje problem wyłączania się aplikacji po wyjściu z niej — systemowo,
  a nie obejściem.
- `start_server.py` — uruchamia `main.py` w Pythonie osadzonym w aplikacji (Chaquopy 15,
  Python 3.11, FastAPI + uvicorn), przygotowuje katalog zapisu.
- `przygotuj_zrodla.bat` / `.sh` — kopiuje aktualny kod i materiały do projektu.
- `BUDOWANIE_APLIKACJI.md` — instrukcja budowania APK krok po kroku **oraz pełna
  droga do Sklepu Play**: konto dewelopera, podpisany AAB, wymagane materiały,
  polityka prywatności, test zamknięty z 12 testerami, uzasadnienie usługi
  pierwszoplanowej, typowe błędy budowania.

## Zmiany w samej aplikacji
- Obsługa zmiennej **`LF_HOME`** — na Androidzie katalog programu jest tylko do odczytu,
  więc konta i materiały trafiają do prywatnego katalogu aplikacji (sprawdzone).
- Wykrywanie trybu aplikacji androidowej (`LF_ANDROID`) — bez prób otwierania przeglądarki.
- Plik sesji przeniesiony do katalogu kont, żeby działał także przy `LF_HOME`.

## Ograniczenie
Pliku APK **nie da się zbudować w tym środowisku ani na telefonie** — potrzebne jest
Android Studio na komputerze (pierwsze budowanie pobiera kilka GB i trwa 20–40 minut,
kolejne 1–2 minuty). Projekt jest przygotowany tak, aby wystarczyło: uruchomić skrypt
kopiujący, otworzyć folder `android` i wybrać Build → Build APK(s).

## v0.9.1 (2026-08-07) — aplikacja nie ginie po wyjściu z niej

Android sam zamyka programy w tle — to system zatrzymuje serwer, nie aplikacja.
Zrobiłem dwie rzeczy: **utrudniłem systemowi jej zamknięcie** oraz **sprawiłem,
że nawet zamknięcie nic nie kosztuje**.

## Utrzymanie serwera przy życiu (Termux)
- `telefon/start.sh` włącza teraz **blokadę uśpienia procesora** (`termux-wake-lock`)
  i tworzy **stałe powiadomienie „LinguaForge działa"**. Dzięki temu Android traktuje
  Termuksa jak aplikację pierwszoplanową i jej nie zamyka.
- `telefon/start_w_tle.sh` — serwer działa nawet po zamknięciu okna Termuksa;
  `telefon/stop.sh` go zatrzymuje.
- Nowy przewodnik **`telefon/ABY_SIE_NIE_WYLACZALO.md`**: ustawienia baterii dla Samsunga,
  Xiaomi, Huawei, OnePlusa, autostart po restarcie telefonu (Termux:Boot) oraz co zrobić
  w Pydroidzie.

## Bezobsługowe wznawianie (działa zawsze, także w Pydroidzie)
- Gdy system uśpi serwer, na dole pojawia się pasek **„⏸ Aplikacja uśpiona przez system"**,
  a aplikacja **sama próbuje wznowić połączenie** (co 2–10 s, w rosnących odstępach).
- Po powrocie serwera strona **odświeża się automatycznie i wraca do tego samego miejsca**
  z komunikatem „Wznowiono — możesz uczyć się dalej".
- **Nie trzeba się logować ponownie** (sesje na dysku, ważne 90 dni).
- **Odpowiedzi udzielone przed uśpieniem są zachowane** — sprawdzone: po zabiciu serwera
  w połowie ogniwa sesja została wznowiona i dokończona bez utraty punktów.
- Podczas nauki aplikacja odpytuje serwer co 25 sekund (tylko przy aktywnym ekranie),
  co samo w sobie ogranicza usypianie.

## Podsumowanie dla użytkownika
| Chcę… | Zrób |
|---|---|
| Ma działać zawsze | Termux + Termux:API + `bash telefon/start.sh` |
| Ma startować po włączeniu telefonu | Termux:Boot (opis w przewodniku) |
| Nie chcę nic konfigurować | Nic — aplikacja wznowi się sama po powrocie |
| Zostaję przy Pydroidzie | Bateria: **Bez ograniczeń** i nie zamykaj go z listy aplikacji |

## v0.9.0 (2026-08-07) — tryb skupienia i czysty widok mobilny

## Tryb skupienia — jedno zadanie na ekranie
Podczas nauki znika wszystko poza samym ćwiczeniem: **menu, nagłówki modułów i boczne
elementy nie są już widoczne**. Zostaje wąski pasek u góry:

`←  |  🃏 Fiszki · seria 🔥3  |  7/15` + cienki pasek postępu

- Strzałka **←** kończy zadanie i wraca tam, skąd przyszedłeś (do listy fiszek, Ścieżki,
  rozmów…), więc nie trzeba szukać menu.
- Podpis pod tytułem pokazuje kontekst: liczbę poprawnych odpowiedzi, serię, nazwę tematu.
- Licznik po prawej i pasek u dołu paska mówią, ile zostało.

Tryb działa we **wszystkich zadaniach**: fiszki, ogniwa Ścieżki, trening własny, czasowniki,
gramatyka, lekcje, rozmowy, pytania do tekstów, prace pisemne i test poziomujący.
Po ukończeniu zadania interfejs wraca do normalnego widoku z podsumowaniem.

## Koniec nakładających się elementów
- Na telefonie **wszystkie układy dwu- i trzykolumnowe zwijają się do jednej kolumny**
  (pulpit, ustawienia, kreator programów, oceny prac pisemnych, ekran startowy).
- **Odpowiedzi ustawione jedna pod drugą** — koniec ściśniętych dwóch kolumn.
- Karty przycinają zawartość (`overflow:hidden`), długie słowa i adresy się łamią,
  a szerokie tabele przewijają się poziomo zamiast rozpychać stronę.
- Ozdobne koło w nagłówku modułu nie przechwytuje już dotknięć.
- Nagłówki modułów mniejsze na telefonie, mniej marnowanego miejsca.
- Poprawione: paski postępu, wiersze etapów, wykres tygodnia, kafelki, tabele nauczyciela.

## Spokojniejsza dynamika
- Delikatniejsze animacje najechania (mniej „skakania" interfejsu).
- Wygaszanie animacji dla osób, które w systemie wybrały ograniczenie ruchu.
- Każde wejście w widok przewija ekran na górę — koniec otwierania zadania „w połowie".

## v0.8.0 (2026-08-07) — aplikacja dostosowana do telefonu

## Naprawiony błąd: „po wyjściu ze strony nic nie da się kliknąć"
Dwie przyczyny, obie usunięte:

1. **Serwer był usypiany przez Androida.** Gdy przełączyłeś się na inną aplikację, system
   wstrzymywał Pydroid/Termux. Zapytania z przeglądarki wisiały w nieskończoność, więc
   przyciski przestawały reagować — bez żadnego komunikatu.
   → Każde zapytanie ma teraz **limit 12 sekund**, a po utracie łączności na dole ekranu
   pojawia się **czerwony pasek**: „Utracono połączenie — wróć do Pydroid 3 i naciśnij ▶"
   z przyciskiem **🔄 Spróbuj ponownie**. Po powrocie do aplikacji połączenie jest
   automatycznie sprawdzane (zdarzenia `visibilitychange`, `focus`, `pageshow`).

2. **Restart serwera wylogowywał użytkownika.** Tokeny sesji żyły tylko w pamięci procesu.
   → Sesje są teraz **zapisywane na dysku** (ważne 90 dni) — sprawdzone: po pełnym
   restarcie serwera to samo konto działa dalej bez logowania.

Dodatkowo aplikacja prosi o **blokadę wygaszania ekranu** (Wake Lock) w trakcie nauki,
co ogranicza usypianie przez system.

## Instalacja jako aplikacja (brakujące „Dodaj do ekranu głównego")
Chrome pokazuje tę opcję dopiero, gdy strona spełnia wymagania instalowalnej aplikacji.
Brakowało dwóch rzeczy — teraz są:
- **Ikony PNG 192 i 512 px** (plus ikona dla iPhone'a) zamiast samego SVG,
- **service worker** (`/sw.js`) — cache'uje wyłącznie powłokę interfejsu, dane z API
  zawsze pobiera z serwera.
- Manifest uzupełniony o `id`, `scope`, opis i ikonę maskowalną.
- W pulpicie pojawia się przycisk **„⬇ Zainstaluj jako aplikację"**, gdy przeglądarka
  zaoferuje instalację.

## Interfejs pod telefon
- **Menu przeniesione na dół ekranu** (pasek z ikonami, przewijany poziomo) — w zasięgu kciuka.
- Powiększone elementy dotykowe: przyciski min. 46 px, odpowiedzi 58 px, pola tekstowe 16 px
  (dzięki temu iPhone nie przybliża widoku przy pisaniu).
- Większe karty fiszek, wygodniejsze ogniwa Ścieżki, czytelniejsze tabele.
- Marginesy bezpieczne dla telefonów z wcięciem ekranu.

## Uwaga
Jeśli mimo wszystko Chrome nie pokazuje opcji instalacji, użyj przycisku w pulpicie albo
menu ⋮ → „Zainstaluj aplikację". Opcja pojawia się tylko pod adresem `127.0.0.1`
(tryb samodzielny na telefonie); w trybie Wi-Fi z komputerem przeglądarki jej nie oferują.

## v0.7.2 (2026-08-07) — poprawka uruchamiania na telefonie (Pydroid)

## Naprawiony błąd
`ModuleNotFoundError: No module named 'core'` przy uruchomieniu w Pydroid 3.

**Przyczyna:** Pydroid nie uruchamia pliku bezpośrednio, tylko przez własny skrypt
pośredniczący (`iiec_run.py`), który wczytuje kod poleceniem `exec`. W takiej sytuacji
Python nie zna położenia pliku aplikacji — katalog roboczy wskazuje na folder Pydroida,
więc import `from core import ...` nie miał gdzie szukać.

**Poprawka:** aplikacja sama odnajduje swój katalog, sprawdzając po kolei: położenie pliku,
argument uruchomienia, katalog roboczy, ścieżki Pythona, a na końcu typowe lokalizacje na
Androidzie (`Documents`, `Download`, katalog domowy). Znaleziony folder trafia do ścieżki
importów i staje się katalogiem roboczym. Sprawdzone dla uruchomienia z innego katalogu
oraz dla wywołania w stylu Pydroida (bez informacji o pliku).

## Przy okazji
- **Czytelny komunikat przy braku bibliotek**: zamiast surowego błędu aplikacja wypisuje,
  co doinstalować i gdzie (Pydroid: ☰ → Pip → `fastapi`, `uvicorn`).
- **Zapis kont w miejscu z prawem zapisu**: gdyby katalog aplikacji był tylko do odczytu
  (zdarza się na Androidzie), dane kont trafiają automatycznie do folderu domowego,
  a program wypisuje, gdzie je zapisał — zamiast przerywać działanie błędem uprawnień.

## v0.7.1 (2026-08-07)

- Dodana szczegółowa instrukcja `telefon/PYDROID_KROK_PO_KROKU.md`: instalacja aplikacji
  na telefonie przez Pydroid 3, krok po kroku, z ustawieniami baterii i lektora,
  przenoszeniem postępów oraz tabelą rozwiązywania problemów.

## v0.7.0 (2026-08-07) — aplikacja samodzielnie na telefonie

## Tryb telefonu (bez komputera)
- Aplikacja **wykrywa, że działa na Androidzie** (Termux / Pydroid) i uruchamia się w trybie
  lokalnym: nie próbuje otwierać przeglądarki komputerowej, wypisuje adres `http://127.0.0.1:8177`
  i przypomina, by nie zamykać okna.
- Nowy folder **`telefon/`**:
  - `CZYTAJ_TO_NAJPIERW.md` — dwie ścieżki instalacji: **Pydroid 3** (najprostsza, gotowe
    biblioteki ze Sklepu Play) oraz **Termux** (pełna kontrola, skrót na ekranie głównym),
  - `instaluj.sh` — jednorazowa instalacja w Termuksie (z awaryjną instalacją lżejszych
    wersji bibliotek, gdyby standardowa się nie powiodła),
  - `start.sh` — codzienne uruchamianie, z blokadą wygaszania ekranu.
- Materiały (`data/`) kopiują się razem z aplikacją — po instalacji **internet nie jest potrzebny**.

## Kopia postępów (przenoszenie między urządzeniami)
- **Ustawienia → Kopia postępów**: `⬇ Pobierz kopię` zapisuje jeden plik JSON ze wszystkim —
  profil, poziom, XP, fiszki i terminy powtórek, czasowniki, ukończone ogniwa Ścieżki,
  rozmowy, przeczytane teksty, prace pisemne, błędy oraz historia z ostatnich 60 dni.
- `⬆ Wgraj kopię` odtwarza to na drugim urządzeniu (konto o tej samej nazwie).
  **Hasło pozostaje to z urządzenia, na którym wgrywasz** — kopia go nie nadpisuje.
- Sprawdzone: po zresetowaniu konta i wgraniu kopii wracają poziom, fiszki, ukończone
  ogniwa i zaliczone rozmowy.

## Uwaga
Instrukcji dla Termuksa i Pydroida nie mogłem przetestować na fizycznym telefonie —
skrypty zawierają warianty awaryjne, a w razie problemu z instalacją bibliotek zawsze
pozostaje sprawdzony tryb Wi-Fi z v0.6.1.

## v0.6.1 (2026-08-07) — dostęp z telefonu

## Dodane
- **Tryb sieciowy** — nowy plik **`start_telefon.bat`** uruchamia aplikację tak, aby była
  widoczna w domowej sieci Wi-Fi. W oknie startowym wypisywany jest gotowy adres do wpisania
  w telefonie (np. `http://192.168.1.15:8177`) wraz z instrukcją o zaporze Windows.
  Zwykły `start.bat` działa jak dotąd — tylko na komputerze.
- **Kafelek „📱 Ucz się na telefonie"** na pulpicie: pokazuje aktualny adres do wpisania
  albo podpowiada uruchomienie `start_telefon.bat`.
- **Instalacja jak aplikacji**: dodany manifest, ikona i znaczniki dla Androida oraz iPhone'a —
  po wybraniu „Dodaj do ekranu głównego" LinguaForge otwiera się pełnoekranowo, z własną ikoną,
  bez paska przeglądarki.
- Marginesy bezpieczne dla telefonów z wcięciem ekranu (notch).
- Nowy przewodnik `docs/JAK_URUCHOMIC_NA_TELEFONIE.md` z tabelą rozwiązywania problemów.

## Uwagi
- Telefon łączy się z komputerem — komputer musi być włączony z działającym
  `start_telefon.bat`. Konto, postępy i powtórki są wspólne.
- Aplikacja jest widoczna tylko w Twojej sieci lokalnej, nie w internecie.

## v0.6.0 (2026-08-07) — wielka rozbudowa słownictwa

## Treść: 777 → 1725 fiszek (+948)
- **Phrasal verbs: 36 → 144** — pełny zestaw czasowników złożonych z przykładami z pracy
  i życia codziennego (get in/out/off/over/through, take over/on/back, put off/up with,
  look into/over/up to, carry out, keep up with, catch up, hand over, work out, figure out,
  end up, sign up, cut down on, run into, settle down, pay off, hang on/up, calm down…).
- **Czasowniki-słówka: 220 → 346** (+126: confirm, deliver, handle, maintain, operate,
  provide, reduce, remind, require, unload, verify…).
- **Rozbudowane kategorie**: zwierzęta 28→68, jedzenie 38→86, dom 32→72, transport 24→56,
  ciało i zdrowie 28→69, rodzina 24→52, ubrania 20→51, miasto 26→61, natura 20→56,
  uczucia 24→59, kalendarz 29→58, kolory 15→32, magazyn →77, ogólne →93, przedmioty →102.
- **4 nowe kategorie**: 💼 Praca i biuro (48), 💻 Technologia i internet (38),
  🎭 Przymiotniki (50), 🗣 Zwroty codzienne (40 — „Could you repeat that?",
  „How do you say… in English?", „I'm not sure").
- Razem **23 kategorie tematyczne**.

## Tryb „Wszystko" z losowaniem
- W **Mapie wiedzy** na pulpicie doszedł duży kafel **🎲 WSZYSTKO** — uruchamia fiszki
  z całej bazy (1648 pozycji), wybierane **losowo**, bez podziału na kategorie.
- Ten sam tryb jest w module Fiszki jako „🎲 Wszystko losowo".
- Przed startem, jak wszędzie, **wybierasz liczbę kart**: 5 / 10 / 15 / 20 / 30,
  własna liczba albo WSZYSTKIE. Każde wejście losuje inny zestaw.
- W trybie kategorii kolejność również jest losowa, ale system nadal podsuwa najpierw
  słówka z kategorii, w których masz braki.

## Ścieżka
- **89 → 96 ogniw**: dołożone ogniwa dla przymiotników, zwrotów codziennych, pracy i biura,
  technologii oraz **trzy dodatkowe fale phrasal verbs** (A2, B1, B2), żeby wracały
  w rosnącej trudności zamiast pojawić się raz.

## v0.5.2 (2026-08-07) — poprawka: biała strona po wejściu w ogniwo Ścieżki

## Naprawiony błąd
Kliknięcie **„Kontynuuj"** lub baneru **„TU JESTEŚ"** na Ścieżce pokazywało pustą, białą stronę.

**Przyczyna:** przy nowym ekranie wyboru liczby zadań (v0.5.1) serwer celowo nie odsyła jeszcze
listy zadań — dopiero po wybraniu długości sesji. Nagłówek widoku próbował jednak odczytać
liczbę zadań z nieistniejącej listy, skrypt przerywał się w połowie i strona zostawała pusta.
Fiszki działały, bo ich ekran wyboru jest budowany inaczej.

**Poprawka:** kolejność w widoku sesji została przebudowana — najpierw obsługiwane są
przekierowania (lekcja, rozmowa, czytanie, pisanie), potem ekran wyboru liczby zadań,
a dopiero na końcu lista zadań. Odczyty odporne na brak pola. Sprawdzone dla **wszystkich
12 typów ogniw**: słówka, teoria, gramatyka, lekcja, rozmowa, powtórka, sprawdzian,
słuchanie, czytanie, pisanie, tłumaczenia, egzamin.

## Zabezpieczenie na przyszłość
- Dodany **globalny wyłapywacz błędów**: gdyby jakikolwiek widok się wysypał, zamiast białej
  strony pojawi się komunikat z opisem przyczyny oraz przyciski „Odśwież" i „Pulpit".
  Dzięki temu następne zgłoszenie będzie zawierało konkretny powód błędu.
- Nieudane pobranie sesji z serwera pokazuje czytelny komunikat zamiast pustego ekranu.

## v0.5.1 (2026-08-07) — poprawki błędów + wybór długości sesji

## Naprawione błędy
- **PDF nie chciał się pobrać** (ZIP działał). Przyczyna: katalog PDF wymaga biblioteki
  `reportlab`, której nie było w `requirements.txt` — na Twoim komputerze nie zainstalowała się
  przy starcie. Biblioteka jest już na liście (instaluje się sama przy `start.bat`), a dodatkowo
  **dodano zabezpieczenie**: gdyby generowanie PDF się nie powiodło, aplikacja odda ten sam
  katalog w postaci pliku HTML, który otwiera się w przeglądarce i zapisuje jako PDF przez Ctrl+P.
- **Wynik 10/10 pokazywany jako 0%**. Przyczyna: od wersji 0.4 sesja jest trzymana na dysku,
  ale odpowiedzi dopisywane były tylko w pamięci i nigdy nie wracały do pliku — lista wyników
  zawsze zostawała pusta. Teraz każda odpowiedź jest zapisywana natychmiast.
- **Dodatkowe zabezpieczenie punktacji**: każde zadanie liczy się dokładnie raz (podwójne
  kliknięcie lub powrót do pytania nie zaniża wyniku), a procent liczony jest od liczby zadań
  w sesji, nie od liczby wysłanych odpowiedzi.

## Wybór długości sesji (we wszystkich modułach)
Przed startem widzisz **pulę dostępnych pytań** i decydujesz, ile chcesz zrobić:
gotowe przyciski (5 / 10 / 15 / 20 / 30), pole na własną liczbę oraz opcję **WSZYSTKIE**,
która przeprowadza przez pełną, przygotowaną serię.

Działa w: **ogniwach Ścieżki** (słówka, gramatyka, teoria, słuchanie, tłumaczenia, powtórki,
sprawdziany), **fiszkach** (z informacją, ile kart czeka na powtórkę), **czasownikach**,
**ćwiczeniach gramatycznych**, **treningu mieszanym** i **pytaniach do tekstów**.

Dzięki temu ogniwo ze słówkami nie kończy się na losowych 10 pozycjach z 24 — możesz przejść
całą pulę i mieć pewność, że dział jest naprawdę opanowany. Po sesji dostępny jest przycisk
„Inna liczba zadań".

## Znane ograniczenia
- Opcja WSZYSTKIE przy dużych kategoriach (np. wszystkie fiszki) tworzy bardzo długą sesję —
  liczba pozycji jest pokazana przy przycisku.
- Wynik ogniwa dotyczy tej konkretnej sesji; przejście 5 z 24 zadań na 100% zalicza ogniwo,
  więc dla pełnej weryfikacji warto wybrać WSZYSTKIE.

## v0.5.0 (2026-08-07) — Panel administratora, katalog PDF, import treści

## Administrator
- Na pulpicie jest pole **🛡 Administrator** — hasło: `administrator`. Po zalogowaniu
  w menu pojawia się zakładka **Administrator** (dla innych kont niewidoczna, a dostęp do
  wszystkich funkcji administracyjnych jest blokowany po stronie serwera).
- **Dodawanie treści przez formularze**: fiszki, tematy gramatyczne z ćwiczeniami,
  zdania do tłumaczenia, dyktanda, teksty do czytania z pytaniami, zadania pisemne,
  **rozmowy (scenki dialogowe z rozgałęzieniami)** i artykuły teorii.
  Przy każdym polu tekstowym jest przycisk odsłuchu — **lektor generuje się automatycznie
  z tekstu, nagrań nie trzeba dostarczać**.

## Modułowe pliki treści
- Każdy rodzaj materiału ma **własny, podpisany plik**: `slownictwo/dodane_fiszki.json`,
  `gramatyka/dodane_gramatyka.json`, `tlumaczenia/dodane_zdania.json`,
  `sluchanie/dodane_dyktanda.json`, `rozmowy/dodane_rozmowy.json`,
  `czytanie/dodane_teksty.json`, `pisanie/dodane_zadania.json`, `wiedza/dodane_artykuly.json`.
- **Przegląd plików** w panelu: wszystkie 42 pliki pogrupowane po folderach, z etykietą,
  opisem i liczbą pozycji. Klik otwiera **edytor zawartości** z walidacją JSON
  i automatyczną kopią zapasową w `data/_kopie`.

## Eksport i import (obieg materiałów)
- **📄 Katalog PDF** — 58 stron czytelnego dokumentu: wszystkie słówka, czasowniki,
  ćwiczenia gramatyczne z odpowiedziami, zdania, dyktanda, teksty, zadania pisemne,
  pełne scenki rozmów, artykuły teorii, struktura kursu — **każda pozycja z numerem**,
  tabele z kolorowymi nagłówkami, spis zawartości w liczbach oraz rozdział
  „Jak dodać nowe treści" z wzorami.
- **🗂 Paczka do edycji (ZIP)** — wszystkie pliki danych + `_szablon_nowe_tresci.json`
  z gotowymi wzorami + instrukcja `JAK_DODAWAC_TRESCI.md`.
- **⬆️ Import** — wgranie odesłanego pliku JSON (szablon) albo ZIP-a. Aplikacja dopisuje
  pozycje do właściwych modułów, nadaje numery i pokazuje raport („dodano 12 fiszek").
  Błędny plik jest odrzucany z opisem problemu — dane nie zostają uszkodzone.

## Obieg pracy
1. Panel → **Pobierz paczkę do edycji** (i opcjonalnie PDF do wglądu).
2. Wysyłasz oba pliki osobie przygotowującej materiały.
3. Ona wypełnia szablon (albo edytuje pliki) i odsyła.
4. Panel → **Import** → materiały są w aplikacji, widoczne dla wszystkich kont.

## Znane ograniczenia
- Hasło administratora jest stałe (`administrator`) i zapisane w `main.py` — aplikacja
  działa lokalnie, ale przy udostępnianiu jej w sieci warto je zmienić.
- Import ZIP nadpisuje pliki o tych samych nazwach (kopie trafiają do `data/_kopie`).
- Edytor plików to edycja tekstu JSON — chroni przed błędem składni, ale nie sprawdza
  znaczenia pól; przy nietypowych zmianach warto sprawdzić moduł w aplikacji.

## v0.4.0 (2026-08-07) — Czytanie, Pisanie, phrasal verbs, tryb ciemny

## Naprawione błędy zgłoszone przez użytkownika
- **Polskie znaki i literówki w fiszkach**: „niemowle" zamiast „niemowlę" jest teraz zaliczane.
  Porównanie ignoruje ogonki (ą→a, ę→e, ł→l…) i wybacza 1–2 literówki w dłuższych słowach.
  Ta sama zasada działa w czasownikach i wszędzie, gdzie wpisuje się odpowiedź.
- **Sprzeczna ocena w Rozmowach**: „Boxes pun on flor" pokazywało jednocześnie „dobrze"
  i „niezaliczone", a w podsumowaniu liczyło się jako poprawne. Wprowadzony **wspólny,
  trójstanowy werdykt** dla całej aplikacji: **dobrze (≥70%) · prawie (40–69%) · źle**.
  Stan „prawie" ma własny żółty kolor i nie liczy się jako sukces w podsumowaniach.
- **Brzydkie odpowiedzi**: pytania wyboru przebudowane na karty z literami A/B/C/D
  w kółkach, animacją zaznaczenia, podniesieniem przy najechaniu i **obsługą klawiszy 1–4**.
  Spójne we wszystkich modułach.

## Nowe moduły
- **📖 Czytanie z klikalnymi słowami** — 3 teksty (A1/A2/B1). Klikasz nieznane słowo →
  dymek z tłumaczeniem, wymową, formą czasownika i przyciskiem **„➕ Dodaj do fiszek"**.
  Do tego przełącznik tłumaczenia całego tekstu, odczyt na głos i pytania ze zrozumienia
  z tłumaczeniem każdej odpowiedzi.
- **✍️ Pisanie** — 5 zadań (przedstaw się, opisz dzień, wiadomość o spóźnieniu, e-mail
  o urlop, zgłoszenie problemu). Ocena w **trzech osiach**: kompletność (czy zawarłeś
  wymagane elementy), długość, poprawność językowa. Widzisz listę „masz / brakuje",
  konkretne uwagi językowe i wzorcową wypowiedź. Nauczyciel ma zakładkę **Wypracowania**
  z pełnymi tekstami ucznia.
- **🔗 Phrasal verbs** (36) i **🪤 False friends** (26) — nowe zestawy fiszek z ostrzeżeniami
  („actually ≠ aktualnie") plus dwa artykuły w Bazie wiedzy z quizami.

## Rozbudowa
- **Ścieżka: 68 → 89 ogniw**, doszedł **poziom B2**; ogniwa czytania, pisania i rozmów
  zaliczają się automatycznie po ukończeniu modułu.
- **3 nowe rozmowy**: telefon do agencji (wypłata), rozmowa o pracę, sklep i urząd — razem 8.
- **777 fiszek** w 19 kategoriach.
- **Trwałość sesji**: bieżąca sesja ćwiczeń zapisywana na dysk — restart aplikacji już nie
  kasuje rozpoczętego ogniwa.
- **🌓 Tryb ciemny** (przełącznik w lewym pasku, zapamiętywany w profilu) oraz
  **dopracowany widok mobilny** (menu poziome, większe pola, animacje przejść).

## Znane ograniczenia
- Słownik czytania obejmuje bazę fiszek, czasowniki i 48-hasłowy słowniczek — bardzo rzadkie
  słowa mogą nie mieć tłumaczenia (aplikacja informuje o tym wprost).
- Ocena pisania sprawdza obecność wymaganych elementów i typowe błędy, nie pełną gramatykę.

## v0.3.2 (2026-08-07) — poprawka: zmiany nie docierały do przeglądarki

## Przyczyna problemu
Przycisk „Pomiń test poziomujący" istniał już w v0.3.1, ale **przeglądarka trzymała
w pamięci podręcznej stare pliki JS/CSS** spod tych samych adresów (`/js/dashboard.js`).
Po podmianie plików aplikacja nadal uruchamiała poprzednią wersję interfejsu — i tak
byłoby po każdej kolejnej aktualizacji.

## Naprawione
- **Wymuszone odświeżanie plików**: serwer dokleja numer wersji do adresów skryptów
  i stylów (`/js/dashboard.js?v=0.3.2`) oraz wysyła nagłówki `no-store` dla wszystkich
  plików aplikacji. Po aktualizacji wystarczy uruchomić `start.bat` — zmiany są widoczne
  od razu, bez czyszczenia cache.
- **Wskaźnik wersji** w lewym pasku pobierany z serwera. Jeśli kiedykolwiek nie zgadza się
  z wersją załadowanych plików, pokaże żółte „odśwież (Ctrl+F5)".

## Zmienione
- **Nowy ekran startowy** dla świeżego konta: dwie równorzędne, duże karty obok siebie —
  „🎯 Zrób test poziomujący" i „⏭ Pomiń test i zacznij od razu" (z wyborem poziomu).
  Wcześniej opcja pominięcia była małym przyciskiem pod poziomą kreską.
- **Pominięcie także w trakcie testu** — pasek nad pytaniami pozwala przerwać test
  i ustawić poziom ręcznie w dowolnym momencie.
- Po pominięciu aplikacja przechodzi **prosto na Ścieżkę nauki**, a nie na pulpit.

## Uwaga na przyszłość
Jeśli po aktualizacji coś wygląda „po staremu", sprawdź numer wersji w lewym dolnym rogu —
powinien zgadzać się z numerem paczki. Awaryjnie: Ctrl+F5.

## v0.3.1 (2026-08-07) — Ścieżka w rozdziałach, własny trening, fiszki 2.0

## Naprawione
- **Ścieżka była zasłonięta** ekranem testu poziomującego — teraz test można pominąć
  i wejść na Ścieżkę od razu; dodatkowo Ścieżka ma baner „TU JESTEŚ" wskazujący ogniwo.
- **Błąd oceny tłumaczeń**: „She is my work's friend" dostawało zaliczenie przy wzorcu
  „She is my colleague". Grader liczy teraz przede wszystkim **słowa treściowe**
  (pomija a, the, is, my…), a brak kluczowego słownictwa **blokuje zaliczenie** (max 0,55).
- **Za ubogie wyjaśnienia**: każde ćwiczenie gramatyczne pokazuje teraz **regułę tematu**
  („📏 Reguła — Przyszłość: will + bezokolicznik…"), a najtrudniejsze pytania testu
  dostały rozbudowane wyjaśnienia z porównaniem błędnej i poprawnej konstrukcji.

## Dodane
- **⏭ Pomiń test poziomujący** — wskazujesz poziom sam, aplikacja weryfikuje go później
  przez egzaminy na Ścieżce. Wygodne przy sprawdzaniu kolejnych wersji.
- **🤷 Nie wiem** — wszędzie obok „Sprawdź" (test, Ścieżka, gramatyka, fiszki, trening).
  Liczy się jako błąd, ale bez XP i bez udawania, że to zgadywanie.
- **🛠 Mój trening** — własny program nauki: wybierasz rodzaje ćwiczeń (rozpoznawanie
  słówek, pisanie słówek, gramatyka, tłumaczenia, dyktando, słuchanie PL→EN, czasowniki,
  teoria opisowa), zakres kategorii/tematów/poziomów i długość (4–40 zadań).
- **Samouczek: policzalne i niepoliczalne** — artykuł w Bazie wiedzy (much/many, some/any,
  pułapki: information, advice, money) + **12 nowych ćwiczeń** + 2 ogniwa na Ścieżce.
- **Poziom B1 na Ścieżce** (16 ogniw) — razem **68 ogniw** w trzech poziomach.
- **Ścieżka w rozdziałach**: ogniwa pogrupowane w nazwane rozdziały (np. „Rozdział 3 ·
  Mój dzień") z licznikiem postępu i zwijaniem; ukończone rozdziały zwijają się same.
- **Rozmowy wplecione w Ścieżkę** — 5 scenek jako ogniwa; ukończenie scenki (≥60%)
  automatycznie zalicza ogniwo.
- **Fiszki 2.0 (styl Quizlet)**: duża karta z animacją wejścia i obrotu przy odsłonięciu
  odpowiedzi, pasek postępu, licznik serii 🔥, skróty klawiszowe (⏎ sprawdź, Esc — nie wiem,
  spacja/⏎ dalej), podsumowanie sesji z najdłuższą serią, wejście z podpowiedzią
  „Twoje braki — zacznij tutaj" i szybkim wyborem kategorii.

## Znane ograniczenia
- Trening własny i sesje Ścieżki żyją w pamięci serwera (restart = trzeba zacząć ogniwo od nowa).
- Poziom B1 korzysta z istniejących zasobów gramatyki; B2/C1 na Ścieżce jeszcze nie ma.

## v0.3.0 (2026-08-07) — Ścieżka nauki, silnik luk, Rozmowy

Największa aktualizacja od premiery. Aplikacja przestaje być zbiorem ćwiczeń,
a staje się kursem, który prowadzi ucznia za rękę i sam wie, czego uczyć dalej.

## Nowa struktura danych (foldery + numery)
- `data/` podzielone na foldery: `slownictwo/`, `gramatyka/`, `lekcje/`, `sluchanie/`,
  `tlumaczenia/`, `testy/`, `wiedza/`, `rozmowy/`.
- **Każda pozycja ma numer `nr`** — w aplikacji widoczny jako `[30]` przy pytaniu/fiszce,
  więc znalezienie i edycja w pliku zajmuje sekundy.
- Każdy plik słownictwa ma `theme` (kategorię) — to fundament silnika luk.

## Silnik luk — aplikacja wie, czego nie umiesz
- Każda odpowiedź (fiszki, ścieżka, czasowniki) aktualizuje wynik **kategorii tematycznej**.
- **Mapa wiedzy** na pulpicie: kolorowa heatmapa 17 kategorii (czerwone = braki),
  klikalna — klik uruchamia fiszki z tej kategorii.
- Wykryte braki dostają **priorytet w doborze nowych fiszek** i w przycisku „Kontynuuj".

## Ścieżka nauki (nauka „po sznurku")
- 45 ogniw w dwóch poziomach (A1: 25, A2: 20): słówka → teoria → ćwiczenia → lekcja →
  słuchanie/tłumaczenia → **powtórka skumulowana** → **sprawdzian etapu** → **egzamin poziomu**.
- Ogniwo odblokowuje następne (próg 60%, sprawdziany i egzaminy 70% + ocena szkolna).
- Egzamin poziomu odblokowuje kolejny poziom; poziom bada aplikacja, nie użytkownik.
- **Przycisk „Kontynuuj naukę"** na pulpicie: zaległe powtórki → łatanie luk → następne ogniwo.

## Rozmowy (symulacje dialogów)
- 5 scenek z rozgałęzieniami: pierwszy dzień w pracy, zgłoszenie uszkodzonej palety,
  prośba o urlop, small talk w kantynie, wizyta u lekarza.
- Rozmówca mówi głosem (EN) i ma podpis PL; odpowiadasz wyborem (z tłumaczeniami)
  albo **piszesz sam** (ocenia grader).
- Po scence **raport**: co zabrzmiało naturalnie, co poprawić i dlaczego.

## Treść ×3
- Czasowniki z odmianą: 70 → **100**; czasowniki jako słówka: **220**.
- Rzeczowniki i tematy: **13 nowych zestawów** (zwierzęta, jedzenie, dom, transport,
  ciało, rodzina, ubrania, miasto, natura, uczucia, liczebniki, kalendarz, kolory).
- **Razem ~715 fiszek** w 17 kategoriach.

## Pozostałe
- **Napraw błędy** — sesja złożona z pijawek i najczęstszych błędów gramatycznych.
- **Raport tygodniowy** na pulpicie: XP, odpowiedzi, trafność, dni aktywne,
  porównanie z poprzednim tygodniem, najsłabsze kategorie.
- **Edytor treści dla nauczyciela** — dodawanie słówek (z kategorią!), zdań i dyktand
  globalnie, z zapisem do plików `data/` i automatycznym numerem.
- Ostrzeżenie przed zamknięciem karty w trakcie sprawdzianu.

## Znane ograniczenia
- Sesja ścieżki żyje w pamięci serwera — restart aplikacji w trakcie ogniwa wymaga
  rozpoczęcia go od nowa (postęp ukończonych ogniw jest zapisany na dysku).
- Poziomy B1+ na ścieżce jeszcze nie istnieją (A1 i A2 gotowe).
- Rozmowy mają stałe scenariusze (bez generowania AI) — kolejne scenki dochodzą jako dane.

## v0.2.2 (2026-08-06) — tłumaczenia odpowiedzi, kategorie słówek, Baza wiedzy

## Dodane
- **Folder `zapis_rozmow/`** — PDF per aktualizacja: sens wypowiedzi użytkownika → wykonane
  działania → potencjalne błędy i propozycje rozwiązań (kolorowe bloki, polska czcionka).
  Generator w `tools/make_convlog.py`.
- **Tłumaczenia WSZYSTKICH opcji odpowiedzi** w teście: słownictwo (24 pyt. × 4 opcje)
  i czytanie (18 pyt. × 4 opcje). Feedback pokazuje pełną listę: ✔ poprawna, ✘ Twoja błędna,
  reszta z myślnikiem — każda z polskim znaczeniem.
- **Kategorie fiszek**: przed sesją wybór — Wszystko / **Czasowniki-słówka** (bezokoliczniki:
  pay = płacić) / **Rzeczowniki** (nowy zestaw 64) / Tematyczne. Zakładka odmiany przemianowana
  na „⚙️ Czasowniki z czasami".
- **Baza czasowników 40 → 70** (z pełną odmianą przez czasy PL).
- **📖 Baza wiedzy** — 8 artykułów teoretycznych (Present Simple/Continuous, Past
  Simple/Continuous, Present Perfect, will/going to, zaimki, przedimki): co to → kiedy →
  formuła (+/−/?) → sygnały → przykłady EN+PL z głosem → typowe błędy Polaków.
- **Sprawdzian z rozumienia** przy każdym artykule: 2–4 pytania OPISOWE po polsku
  (razem 21), oceniane po sensie (rdzenie słów kluczowych), z % trafienia, wskazaniem
  brakujących wątków i wzorcową odpowiedzią. Wyniki w arkuszu nauczyciela.

## Znane ograniczenia
- Ocena opisowa łapie sens po pojęciach — nietypowe sformułowania mogą być zaniżone
  (jest wzorcowa odpowiedź do samooceny).
- Listy rzeczowników/czasowników będą wielokrotnie większe w v0.3 (foldery, numery,
  zestawy tematyczne: liczebniki, miesiące, dni, kolory…).

## v0.2.1 (2026-08-06) — poprawki po testach użytkownika

## Naprawione problemy
- **Podwójny pulpit**: widok renderował się dwa razy po rejestracji (dwa wywołania routera
  dla tego samego adresu). Dodany strażnik — ten sam widok nie renderuje się drugi raz.
- **Za krótkie pola tekstowe**: pola „wpisz zdanie…" mają teraz pełną szerokość karty
  (max 680px) i większą czcionkę — widać całe zdanie.

## Zmienione / dodane
- **Skróty uznawane w ocenie**: `u→you, r→are, im→I'm, dont→don't, gonna→going to` itd.
  oraz rozwijanie kontrakcji (`I'm = I am`, `can't = cannot`) — „can u help me with this box"
  liczy się jak zdanie w pełni poprawne.
- **Częściowa punktacja tłumaczeń**: wynik = sens 45% + czas gramatyczny 30% +
  **% poprawnych słów względem wzorca z uwzględnieniem kolejności 25%** (pokazywany w feedbacku).
- **Wyjaśnienie konstrukcji przy błędnym czasie**: np. „użyłeś Present Simple, a wymagany
  Past Simple — »wczoraj« = zamknięta przeszłość (buy→bought)".
- **Feedback ma zawsze obie rubryki**: „Całe zdanie EN" (🔊) i „Po polsku" (🔊) — także
  w gramatyce i lekcjach zdanie pokazywane w całości z wstawioną poprawną odpowiedzią.
- **Czytanie**: 2 nowe ŁATWE teksty (A1, A2); test losuje 1 łatwy + 1 trudniejszy;
  każdy tekst ma przycisk „🇵🇱 pokaż tłumaczenie tekstu".
- **Czasowniki**: pod odpowiedzią opis, czym jest każda forma (be = forma podstawowa /
  Present; was = 2. forma / Past Simple; been = 3. forma / Past Participle do Perfect);
  **formy są klikalne** — pokazują 5–6 przykładów użycia EN+PL z przyciskiem
  „🔁 podaj kolejny przykład".
- **Fiszki**: domyślnie **wpisywanie ręczne w obu kierunkach** (widzisz „praca" → piszesz
  work; widzisz „work" → piszesz praca), auto-ocena FSRS z czasu odpowiedzi, przycisk
  „Nie wiem — pokaż", błędne karty wracają w tej samej sesji.
- **Trening mieszany gramatyki**: przy poprawnej odpowiedzi przyciski
  „Wiedziałem / Zgadywałem" — zgadnięcie cofa część przyrostu opanowania tematu.
- **Głębsze wyjaśnienia** w lekcjach (np. „am — bo podmiot to I; are — bo we").
- Nowy folder `docs/historia_zmian/` (ten plik).

## Znane problemy / do zrobienia (plan v0.3 — przebudowa)
- Struktura danych do podziału na foldery per typ i poziom z numerami pozycji [n].
- Kurs etapowy (jak Duolingo): rozdziały zaliczane po kolei od A1, testy skumulowane.
- Zestawy tematyczne słówek: liczebniki, miesiące, dni tygodnia, kolory, rodzina…
- Edytor treści dla nauczyciela zapisujący globalnie do plików danych.
- Tryb „wszystkie słówka" bez podziału na poziomy; moduł swobodnego czytania.

## v0.2.0 (2026-08-06) — feedback, lekcje, czasowniki, arkusze

### Silnik / architektura
- **Placement 2.0** (`core/placement.py` przepisany): 7 sekcji, ~49 pytań losowanych z banku 128 pozycji — każdy test jest inny, można powtarzać jako pomiar postępu. Nowy przepływ `answer → feedback → confirm` (wynik zapisuje się dopiero po kliknięciu „Dalej"/„Wiedziałem"/„Zgadywałem").
- **Waga zgadywania:** poprawna odpowiedź oznaczona „Zgadywałem" liczy się do poziomu z wagą 0.35 zamiast 1.0 — wynik testu nie jest zawyżany przez fart; liczba zgadnięć trafia do raportu i do nauczyciela.
- **Scalanie plików danych:** loader łączy wszystkie `grammar*.json`, `translations*.json`, `listening*.json` — treści dokłada się nowymi plikami bez ruszania kodu.
- **Bogatsze logi zdarzeń:** każde zdarzenie odpowiedzi zapisuje pełną treść pytania, odpowiedź ucznia i poprawną — na tym stoją arkusze nauczyciela i czytelniejsze eksporty CSV.
- **Nowe pliki danych:** `verbs.json` (40 czasowników z formami PL w 3 czasach), `lessons.json` (podręcznik: dział A1, 4 rozdziały + sprawdzian), `grammar2.json` (+3 tematy: zaimki, przedimki, Past Continuous).
- **TTS dwujęzyczne:** synteza mowy po polsku (pl-PL) obok angielskiej — używana w słuchaniu PL→EN i w tłumaczeniach feedbacku.

### Dodane funkcje
- **Feedback, który stoi:** po KAŻDEJ odpowiedzi (test, gramatyka, lekcje, tłumaczenia, słuchanie, programy) panel z Twoją odpowiedzią, poprawną, tłumaczeniem całego zdania na polski (tekst + głos w obu językach) i wyjaśnieniem — znika dopiero po kliknięciu „Dalej". Przy poprawnych odpowiedziach w teście: przyciski **Wiedziałem / Zgadywałem**.
- **Test 2.0:** nowa sekcja **czysto słownikowa produktywna** (wpisz słowo po angielsku; naprzemiennie rzeczowniki i czasowniki — 20 pozycji w banku), czytanie z **parafrazowanymi odpowiedziami** (nie da się dopasować po identycznych słowach; 4 teksty × 3 pytania), **słuchanie dwukierunkowe**: dyktando EN + „słyszysz po polsku → piszesz po angielsku" (6 zadań). Bank: 38 gramatyka, 24+20 słownictwo, 8 tłumaczeń, 8+6 słuchanie. Naprawiony bug podwójnego wejścia w test po rejestracji.
- **Tor czasowników:** fiszki koniugacyjne — losowy czas (pracowałem / pracuję / będę pracował) i losowy kierunek (PL→EN / EN→PL), z FSRS (powtórki wracają wg krzywej zapominania), formami nieregularnymi (work → worked → worked) i przykładem. 40 czasowników × 3 czasy × 2 kierunki = 240 wariantów kart.
- **Lekcje jak podręcznik:** dział „Fundamenty A1" — 4 rozdziały (to be i zaimki; Present Simple; przedimki; do/does/don't). Rozdział = wprowadzenie „czego się nauczysz" → strony teorii z dialogami → ćwiczenia → praca domowa (tłumaczenia) → quiz zaliczeniowy (próg 60%). Kolejny rozdział odblokowuje się po zaliczeniu poprzedniego. Na końcu **sprawdzian (12 pytań, wszystkie naraz) z oceną szkolną 1–6** i pełnym arkuszem wyników.
- **Trening mieszany gramatyki:** zaznaczasz dowolne tematy (albo wszystkie) — ćwiczenia losują się wymieszane z całej puli (interleaving).
- **Nauka etapami:** pulpit pokazuje etap 1–5 dla każdej dziedziny (Fundament słów → Rozbudowa → Utrwalanie → Zdania → Produkcja) liczony z realnie poznanych/utrwalonych fiszek; tłumaczenia dziedzinowe odblokowują się po poznaniu 25% słówek dziedziny (z komunikatem czemu zablokowane).
- **Liczniki treści wszędzie:** pasek każdego modułu i kafelki pulpitu pokazują, ile jest pytań/fiszek/ćwiczeń w bazie (endpoint `/api/content/stats`) — pełna kontrola nad tym, ile treści dodano.
- **Losowa kolejność:** fiszki, czasowniki i ćwiczenia tasowane w każdej sesji.
- **Resetuj postępy:** w ustawieniach pulpitu (strefa niebezpieczna, potwierdzenie słowem RESET) — zeruje całe konto poza loginem i hasłem.
- **Nauczyciel — Prace ucznia:** lista dni pracy → **arkusz jak sprawdzian**: każda odpowiedź z pełną treścią pytania, odpowiedzią ucznia, poprawną, czasem odpowiedzi i znacznikiem „zgadywał"; filtr „tylko błędy"; sprawdziany rozbite na pojedyncze pytania. Profil ucznia pokazuje też oceny ze sprawdzianów i postęp lekcji.
- **Kreator programów 2.0 — dwupanelowy warsztat:** lewy panel to **bank 165 gotowych zadań z całej bazy** (słówka, gramatyka, tłumaczenia, dyktanda) z wyszukiwarką i filtrami typu/poziomu; prawy to budowany program ze zmianą kolejności i usuwaniem. Własne zadania przez porządne formularze (opcje jako osobne pola „+ opcja", poprawną zaznaczasz kropką), nowy typ **dyktando z własnym zdaniem** (z odsłuchem przy tworzeniu), **podgląd oczami ucznia** i **termin wykonania** (po terminie — oznaczenie ⏰).
- **Żywszy interfejs:** każdy moduł ma własny pasek hero z gradientem i animowaną ikoną, kafelki modułów na pulpicie w kolorach, animacje wejścia (stagger), puls przy dobrej odpowiedzi / potrząśnięcie przy złej, licznik serii (🔥 x3/x5/x10 z konfetti), wykres 14 dni, kropki etapów.

### Jak to działa (dla ucznia)
1. Rejestracja → test poziomujący (ok. 20 min, z uczciwym „wiedziałem/zgadywałem") → poziom CEFR per umiejętność.
2. Pulpit: etapy nauki mówią, na czym się skupić; kafelki pokazują co czeka (powtórki fiszek/czasowników) i ile treści jest w bazie.
3. Lekcje prowadzą jak podręcznik z nauczycielem; quizy odblokowują kolejne rozdziały; sprawdzian daje ocenę szkolną.
4. Wszystkie odpowiedzi wracają z tłumaczeniem i wyjaśnieniem — czytasz w swoim tempie.

### Do naprawy / znane ograniczenia
- Frontend sprawdzianu wymaga odpowiedzi „na raz" — brak zapisywania wersji roboczej (zamknięcie karty = utrata odpowiedzi).
- Etap 5 („Swobodna produkcja") nie ma jeszcze dedykowanych zadań — dialogi symulowane planowane na v0.3.
- Głos pl-PL zależy od głosów zainstalowanych w Windows (Ustawienia → Czas i język → Mowa); bez polskiego głosu zdania PL czyta lektor angielski.
- Bank lekcji to na razie 1 dział (A1) — kolejne działy (A2: Past Simple, przyimki, liczebniki) w v0.3.
- Kreator: brak edycji zadania po dodaniu (tylko usuń i dodaj ponownie).

### Plan na v0.3
Symulacje dialogowe „Dzień w magazynie", boss fighty po rozdziałach, czytanie z klikalnymi słowami, phrasal verbs i false friends, raport tygodniowy, edycja zadań w kreatorze, kolejne działy lekcji.

## v0.1.0 (2026-08-06) — pierwsza wersja

### Silnik / architektura
- **Backend:** Python 3 + FastAPI, lokalny serwer na porcie 8177, uruchamiany przez `start.bat` (sam otwiera przeglądarkę).
- **Frontend:** czysty HTML/JS/CSS (SPA), motyw „kuźnia języka" — każdy moduł ma własny kolor akcentu.
- **Dane:** modularne pliki JSON w `data/` — nowe paczki słówek/dziedzin/tematów dodaje się przez dorzucenie pliku, bez zmian w kodzie (np. `vocab_wojsko.json` z `"domain": "military"`).
- **Konta:** folder `accounts/<login>/` — profil, fiszki, błędy, programy, log sesji (JSONL, dzień = plik).

### Dodane funkcje
- **Konta i logowanie** (hasła hashowane SHA-256+sól). Konto nauczyciela tworzone automatycznie: `nauczyciel` / `nauczyciel`.
- **Adaptacyjny test poziomujący** (5 modułów): gramatyka (drabinkowa — trudność idzie w górę/dół za odpowiedziami), słownictwo w pasmach frekwencyjnych (szacuje zasób słów), czytanie (3 teksty A2–B2), tłumaczenia (ocena 3-osiowa), dyktanda (TTS). Wynik: osobny poziom CEFR dla każdej umiejętności + poziom ogólny.
- **Wektor umiejętności** zamiast jednego poziomu: słownictwo / gramatyka (plus każdy temat gramatyczny osobno) / czytanie / słuchanie / pisanie, aktualizowany metodą Elo z uwzględnieniem czasu odpowiedzi.
- **Fiszki z FSRS-4.5** (nowoczesny algorytm powtórek): oceny Nie wiem/Trudne/Dobrze/Łatwe, statusy „opanowane" (stabilność ≥21 dni) i „pijawka" (≥4 wpadki), obrazek+przykład+TTS (dual coding), tryb wpisywania odpowiedzi dla wyższych poziomów, karty „Nie wiem" wracają w tej samej sesji.
- **Nowe słówka wprowadzane wg list frekwencyjnych** (rank), z dziedzin wybranych przez ucznia (ogólna / magazynowa — 82 słówka na start).
- **Gramatyka:** 6 tematów (Present Simple/Continuous, Past Simple, Present Perfect, will/going to, stopniowanie) — teoria po polsku z typowymi błędami Polaków + ćwiczenia: luki, wybór, układanie zdań. Osobny licznik opanowania każdego tematu.
- **Tłumaczenia PL→EN** z oceną trzyosiową: sens (słowa kluczowe, synonimy OK, tolerancja literówek), czas gramatyczny (twardy wymóg, wykrywa też JAKI błędny czas wstawiłeś), kompletność. Punktacja częściowa + wzorcowe zdanie z TTS.
- **Dyktanda** (słuchanie): 3 prędkości odtwarzania, porównanie słowo-po-słowie z podświetleniem różnic.
- **Gra: pary na czas** — korzysta ze słówek, których uczeń faktycznie się uczy.
- **Taksonomia błędów:** każdy błąd klasyfikowany (czas / słowo kluczowe / pisownia / temat gramatyczny / dyktando) i zbierany w mapę błędów widoczną dla nauczyciela.
- **Pulpit:** pierścień dziennego celu XP, seria dni, wykres 14 dni, profil umiejętności, fokus dnia (co system teraz wzmacnia i dlaczego), słowo dnia z TTS, prognoza „ile tygodni do poziomu X" liczona z realnego tempa ostatnich 14 dni (z oceną wiarygodności prognozy).
- **Własne fiszki** ucznia — wchodzą do FSRS jak zwykłe.
- **Panel nauczyciela:** lista uczniów → pełny podgląd: profil umiejętności, tematy gramatyczne, mapa błędów z przykładami, pijawki, ostatnie 120 odpowiedzi (co / kiedy / jaka odpowiedź / wynik), przypisane programy.
- **Kreator programów nauki** (nauczyciel): dowolna liczba zadań 4 typów — słówko (od razu ląduje w fiszkach ucznia), test wyboru, luka/wpisywanie, tłumaczenie z wymogiem czasu. Uczeń widzi programy w osobnej zakładce.
- **Eksport sesji** (uczeń i nauczyciel): pełen log odpowiedzi do JSON lub CSV (otwiera się w Excelu).

### Metody naukowe w tej wersji
FSRS-4.5 (spaced repetition), testing effect (nauka przez wydobywanie), interleaving (mieszanie typów zadań w kompozytorze sesji), dual coding (słowo+obraz+dźwięk), generation effect (najpierw próbujesz, potem widzisz odpowiedź), listy frekwencyjne, knowledge tracing per-umiejętność (Elo z czasem reakcji).

### Znane ograniczenia / do naprawy
- TTS zależy od głosów zainstalowanych w przeglądarce (Edge ma najlepsze polskie/angielskie głosy).
- Ocena tłumaczeń jest regułowa (słowa kluczowe + wzorce czasów) — planowane podpięcie AI.
- Baza treści to pakiet startowy; kolejne wersje = kolejne paczki JSON.

### Plan na v0.2
- Czytanie z klikalnymi słowami (klik → tłumaczenie → auto-fiszka).
- Symulacja „Dzień w magazynie" (rozgałęziony dialog).
- Boss fight przed awansem poziomu + checkpointy przekrojowe.
- Tor false friends PL-EN i phrasal verbs.
- Raport tygodniowy, kalibracja pewności odpowiedzi.
- Więcej słówek (A2-B2 ogólne), więcej tematów gramatyki (Past Continuous, Past Perfect, tryby warunkowe, strona bierna).
