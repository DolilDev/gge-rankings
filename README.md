# 🏰 GGE Rankings

Strona rankingów dla **Goodgame Empire (GGE)** i **Empire Four Kingdoms (E4K)**.

🌐 **[Otwórz ranking](https://dolildev.github.io/gge-rankings/)**

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
| ▲5 / ▼3 / = | Zmiana pozycji od ostatniego sprawdzenia |
| ☆/⭐ | Dodaj/usuń z obserwowanych |
| Nick | Klik → rozwiń szczegóły |
| Sojusz | Tag sojuszu |
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
Zakładka **⭐ Ulubieni** — karty z aktualnymi pozycjami w dostępnych eventach + **wykres historii pozycji**.

### Powiadomienia
Toast przy zmianie:
- 🚀 Obserwowany gracz wszedł do TOP 10
- 📉 Obserwowany gracz wypadł z TOP 10
- 🏅 Obserwowany gracz wszedł do TOP 3

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

Filtry działają na aktualnej stronie. Wyczyść przyciskiem **× Wyczyść**.

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

## 🌙 Motyw

Przycisk **🌙/☀️** w prawym górnym rogu przełącza między ciemnym a jasnym motywem. Preferencja zapisywana.

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

## 📱 Urządzenia mobilne

Strona działa na telefonach i tabletach. Toolbar i tabela przewijalne poziomo. ARIA labels dla czytników ekranu.

---

## 💾 Co jest zapisane lokalnie

W `localStorage`:
- Ostatnio wybrany serwer
- Lista obserwowanych graczy i sojuszów
- Historia pozycji (do 14 dni, ~12 snapshotów na ranking)
- Preferencja motywu i auto-odświeżania
