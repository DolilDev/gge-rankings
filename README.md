# 🏰 GGE Rankings

Strona rankingów dla **Goodgame Empire (GGE)** i **Empire Four Kingdoms (E4K)**.

🌐 **[Otwórz ranking](https://dolildev.github.io/gge-rankings/)**

---

## ✨ Co nowego

- **📲 Instalacja (PWA)** — zainstaluj stronę jako aplikację („Dodaj do ekranu głównego"). Działa offline (cache statyków) i ładuje się szybciej.
- **🇵🇱 / 🇬🇧 Język PL/EN** — przycisk `PL/EN` w nagłówku przełącza cały interfejs oraz teksty gry. Wybór jest zapamiętywany.
- **Δ Zmiana wyniku** — obok wskaźnika zmiany pozycji (▲/▼) widać o ile zmienił się wynik od ostatniego snapshotu (pełna wartość w dymku).
- **Rozmiar strony** — przełącznik **10 / 25 / 50** wierszy + pole „skocz do strony".
- **Tryb kompaktowy** — gęstsze wiersze, więcej danych na ekranie (przycisk `≣` lub `Shift + C`).
- **Sticky nagłówek tabeli** — nagłówek kolumn przykleja się przy przewijaniu (desktop).
- **🔔 Powiadomienia przeglądarki** — prawdziwe alerty (nie tylko toasty), gdy obserwowany wejdzie/wypadnie z TOP 10/3 — także przy karcie w tle.
- **📝 Notatki przy ulubionych** — krótki opis (np. „wróg / sojusznik / cel") na karcie obserwowanego; widoczny też jako 📝 w tabeli i w szczegółach.
- **🛡 Klikalny tag sojuszu** — klik w tag w rankingu listuje graczy danego sojuszu i pokazuje agregaty (liczba graczy, suma i średni wynik).
- **📷 Eksport karty gracza (PNG)** — ładny obrazek do wrzucenia na Discorda (przycisk w szczegółach gracza).

---

## 🚀 Jak zacząć

### 1. Wybierz grę i serwer

Na górze strony wybierz serwer z listy — serwery są pogrupowane (GGE na górze, E4K na dole), z flagami i kodami.

### 2. Wybierz rodzaj rankingu

Z listy **Ranking** wybierz interesujący Cię event, np.:
- **Honor** — ranking honorowy graczy
- **Siła (Might)** — ranking siły
- **Liga** — ranking ligowy
- i wiele innych eventów sezonowych

### 3. Przełącz między graczami a sojuszami

Użyj przełącznika **👤 Gracze / 🛡 Sojusze**, aby zobaczyć rankingi indywidualne lub sojusznicze.

### 4. Filtruj według poziomu

Dla niektórych rankingów (np. Honor, Siła) pojawia się pasek kategorii — możesz filtrować graczy według przedziału poziomów:

> `Lv 1-19` · `Lv 20-29` · `Lv 30-39` · ... · `✦ Legendy`

---

## 🔍 Wyszukiwanie gracza

W polu wyszukiwania możesz wpisać:
- **Numer ranku** (np. `1`, `42`) — przeskoczysz do danej pozycji
- **Nick gracza** (np. `Rycerz123`) — wyszuka gracza po nazwie

Zatwierdź klawiszem **Enter** lub przyciskiem **↵**.

---

## 📋 Tabela rankingowa

Kliknij dowolny wiersz, aby rozwinąć szczegóły gracza. Każdy wiersz zawiera:

| Element | Opis |
|---|---|
| ☑ Checkbox | Dodaj do porównania (max 4) |
| 🥇/🥈/🥉/# | Pozycja w rankingu + wskaźnik zmiany |
| ▲5 / ▼3 | Zmiana pozycji od ostatniego sprawdzenia |
| Δ+1.2k | **Zmiana wyniku** od ostatniego snapshotu (dymek = pełna wartość) |
| ☆/⭐ | Dodaj/usuń z obserwowanych |
| Nick | Klik → rozwiń szczegóły (📝 = masz notatkę o tym graczu) |
| Sojusz | **Klikalny** tag — klik filtruje ranking do tego sojuszu |
| Wynik | Z paskiem postępu (% top 1) |

### Sortowanie

Kliknij **nagłówek kolumny** (`#`, `Gracz`, `Sojusz`, `Wynik`), aby sortować:
- 1. klik — sortowanie rosnące ▲
- 2. klik — malejące ▼
- 3. klik — domyślne

### Szczegóły gracza

Po rozwinięciu wiersza zobaczysz:
- 🏅 Honor, ⚔️ Moc, 🏛 Chwała, 📊 Poziom (legendarny/zwykły)
- Punkty ataku, obrony, rabunku
- 📈 **Wykres historii pozycji** (sparkline) — jeśli mamy dane z poprzednich odświeżeń
- Klikalne statystyki → przekierowanie do odpowiedniego rankingu
- 📷 **Karta PNG** — pobierz ładny obrazek z danymi gracza (do wrzucenia na Discorda)
- 📝 Twoja notatka o graczu (jeśli jest obserwowany i ma notatkę)

Ikony przy nicku gracza:
- 🚫 **Ban** — gracz zbanowany
- 🛡 **Ochrona** — gracz pod ochroną
- ★ **Ulubiony** — gracz jest na liście obserwowanych

---

## ⭐ Obserwowanie graczy i sojuszów

### Dodaj do obserwowanych
- Klik **☆** przy nicku w tabeli — od razu doda
- Lub **+ Śledź** w prawym górnym rogu — modal z wyborem serwera

### Przeglądaj obserwowanych
Zakładka **⭐ Ulubieni** — karty z aktualnymi pozycjami w dostępnych eventach + **wykres historii pozycji**. Na każdej karcie możesz dopisać **📝 notatkę** (np. „wróg / sojusznik / cel") — zapisuje się lokalnie i pokazuje w tabeli oraz w szczegółach gracza.

### Powiadomienia
Komunikat (toast) przy zmianie:
- 🚀 Obserwowany gracz wszedł do TOP 10
- 📉 Obserwowany gracz wypadł z TOP 10
- 🏅 Obserwowany gracz wszedł do TOP 3

Dodatkowo przycisk **🔔 Powiadomienia** (zakładka Ulubieni) włącza **prawdziwe powiadomienia przeglądarki** — docierają nawet przy karcie w tle. Najlepiej z włączonym auto-odświeżaniem na obserwowanym rankingu (strona musi działać — brak push z serwera).

### Usuń z obserwowanych
- × na karcie / ponownie ☆ w tabeli / 🗑 Wyczyść wszystkich

---

## 📊 Porównywanie graczy / sojuszów

1. Zaznacz checkbox przy 2-4 wierszach
2. Pojawi się pasek u dołu z wybranymi
3. Kliknij **Porównaj →** — otworzy się modal z statystykami side-by-side
4. **Najlepsze wartości** (najwyższa moc, najniższa pozycja) — podświetlone na zielono
5. **Najgorsze** — na czerwono

---

## ⚙️ Filtry

Kliknij **⚙ Filtry** (lub `F`), aby pokazać pasek filtrów:
- **Z sojuszem / Bez sojuszu / Wszyscy**
- **Nazwa sojuszu** — szukaj po nazwie/tagu
- **Min. wynik** — pokaż tylko z wynikiem ≥ X

Po włączeniu filtra pobieramy do **2000** najlepszych graczy i filtrujemy wśród nich (nie tylko bieżącą stronę). Wyczyść przyciskiem **× Wyczyść**.

💡 Klik w **tag sojuszu** w tabeli automatycznie ustawia filtr na ten sojusz i pokazuje baner z agregatami: liczba graczy w rankingu, suma i średni wynik.

---

## ⬇ Eksport danych

Kliknij **⬇ Eksport** (lub `E`):
- **📄 CSV** — pobierz aktualną stronę jako Excel/Google Sheets
- **{} JSON** — surowe dane do dalszej obróbki
- **🔗 Kopiuj link** — link z aktualnym stanem (serwer + ranking + strona + filtry) do udostępnienia

---

## ⏱ Auto-odświeżanie

Kliknij **⏱ Auto** w toolbar, wybierz interwał (30s / 1 min / 5 min / 10 min). Licznik widoczny w pasku statusu.

---

## 🌙 Motyw, język i widok

W prawym górnym rogu:
- **🌙 / ☀️** — ciemny / jasny motyw (`Shift + D`)
- **PL / EN** — język interfejsu (PL/EN)
- **≣** — tryb kompaktowy / gęstszy (`Shift + C`)

Wszystkie preferencje są zapisywane lokalnie.

---

## ⌨️ Skróty klawiszowe

| Klawisz | Akcja |
|---|---|
| `/` | Focus na pole wyszukiwania |
| `Enter` | Zatwierdź wyszukiwanie |
| `Esc` | Zamknij modal / dropdown / rozwinięty wiersz |
| `R` | Odśwież ranking |
| `F` | Pokaż/ukryj filtry |
| `E` | Menu eksportu |
| `Shift + D` | Przełącz motyw |
| `Shift + C` | Tryb kompaktowy (gęstszy) |
| `←` `→` | Poprzednia / następna strona |

---

## 🔗 Deep linking

Stan strony zapisywany w URL hash (`#s=PL1&e=honorPoints&p=3`). Możesz:
- Skopiować link do konkretnego rankingu i wysłać znajomemu
- Dodać zakładkę do ulubionego rankingu
- Wrócić do tego samego widoku po odświeżeniu

---

## ↺ Odświeżanie danych

Dane są pobierane na żywo z API. Status połączenia widoczny w pasku:

- 🟢 **Dane LIVE** — załadowano poprawnie (z timem)
- 🟡 **Pobieranie...** — trwa ładowanie
- 🔴 **Błąd API** — problem z połączeniem

Przy błędzie następuje automatyczny retry z exponential backoff (do 2 prób).

---

## 📱 Urządzenia mobilne i instalacja (PWA)

Strona działa na telefonach i tabletach. Toolbar i tabela przewijalne poziomo. ARIA labels dla czytników ekranu.

Możesz ją **zainstalować jako aplikację**: w przeglądarce wybierz „Dodaj do ekranu głównego" / „Zainstaluj". Po instalacji działa w trybie pełnoekranowym, statyczne pliki są cache'owane (szybszy start, podstawowy tryb offline).

---

## 💾 Co jest zapisane lokalnie

W `localStorage`:
- Ostatnio wybrany serwer
- Lista obserwowanych graczy i sojuszów (wraz z notatkami)
- Historia pozycji (do 14 dni, ~12 snapshotów na ranking)
- Preferencje: motyw, język, auto-odświeżanie, rozmiar strony, tryb kompaktowy, powiadomienia
