# GGE Rankings — instrukcje dla Claude

## Cel projektu

GGE Rankings to statyczna aplikacja webowa/PWA pokazująca na żywo rankingi gier Goodgame Empire (GGE) i Empire Four Kingdoms (E4K). Aplikacja działa na GitHub Pages pod ścieżką `/gge-rankings/`:

`https://dolildev.github.io/gge-rankings/`

Nie ma backendu ani procesu bundlowania. Dane rankingowe są pobierane w przeglądarce z zewnętrznych API, a ustawienia użytkownika są przechowywane lokalnie.

## Najważniejsze zasady pracy

- Zachowuj istniejącą architekturę vanilla JS i klasycznych `<script>`; nie wprowadzaj Reacta, TypeScriptu, bundlera ani modułów ES bez wyraźnej prośby.
- Pliki JavaScript współdzielą globalny scope. Kolejność ładowania jest kontraktem i nie wolno jej zmieniać bez sprawdzenia zależności:
  `config.js → i18n.js → state.js → api.js → crest.js → render.js → features.js → main.js`.
- Przed zmianą sprawdź istniejący kod oraz testy. Nie nadpisuj niezwiązanych zmian użytkownika.
- Interfejs jest dwujęzyczny: polski jest językiem źródłowym, angielski znajduje się w `i18n.js`. Nowe teksty UI dodawaj przez mechanizm `L(...)`/`data-t`, a nie jako nieprzetłumaczony tekst w jednym języku.
- Używaj `esc(...)` przy wstawianiu danych z API do HTML. Dane zewnętrzne traktuj jako niezaufane.
- Po każdej zmianie uruchom co najmniej `npm test`; przy zmianach JS także `npm run check`.

## Struktura plików

- `index.html` — szkielet UI, elementy modalów i toolbaru, linki do assetów oraz skrypty.
- `style.css` — cały wygląd, responsywność, tryb jasny/ciemny i compact mode.
- `config.js` — adresy API, lista serwerów, katalogi/stałe rankingów i limity.
- `i18n.js` — tłumaczenia PL/EN i ładowanie tekstów gry.
- `state.js` — obiekt globalnego stanu `S`, localStorage, hash URL, motyw i funkcje pomocnicze.
- `api.js` — pobieranie danych, retry/cache, parsowanie rankingów, katalogi eventów i integracja z gge-tracker.
- `crest.js` — renderowanie herbów graczy z assetów w `crest/`.
- `render.js` — generowanie tabel, szczegółów graczy/sojuszy, dropdownów i komunikatów.
- `features.js` — filtrowanie, sortowanie, watchlista, historia, porównywanie, eksport i powiadomienia.
- `main.js` — event wiring, skróty klawiaturowe, paginacja i `init()`; ładowany jako ostatni.
- `sw.js` — service worker i cache offline. `VERSION` musi być zwiększony po zmianie assetów aplikacji.
- `gge_events.json`, `e4k_events.json` — lokalne snapshoty katalogu rankingów, używane gdy zdalny katalog jest niedostępny (GitHub raw potrafi zwrócić 429).
- `crest/` — assety i metadane herbów; nie usuwaj ich przy porządkowaniu.
- `test/app.test.js` — testy Node dla funkcji stanu, API, eksportu i service workera.

## Przepływ działania

1. `main.js:init()` odczytuje stan z localStorage i hash URL, ładuje tłumaczenia/eventy oraz inicjalizuje UI.
2. Użytkownik wybiera serwer, typ rankingu, kategorię i tryb graczy/sojuszy.
3. `api.js` pobiera ranking z `GGE_API`, korzystając z cache i retry. GGE API zwraca zwykle 10 pozycji na żądanie; większe pule są składane klient-side.
4. Dla filtrowania oraz syntetycznego rankingu Glory pobierane jest do `FILTER_POOL_MAX` pozycji, z ograniczoną współbieżnością.
5. `render.js` buduje tabelę z aktualnego `S.rows`/poola, a `features.js` nakłada sortowanie i filtry.
6. Historia pozycji, ulubione, notatki i preferencje są lokalne; nie są wysyłane do serwera.

## Integracje zewnętrzne

- `https://empire-api.fly.dev` — główne rankingi GGE/E4K.
- `https://api.gge-tracker.com/api/v1` — opcjonalne listy członków sojuszy; serwer jest przekazywany w nagłówku `gge-server`. Nie każdy serwer jest obsługiwany.
- GitHub raw (+ mirror jsDelivr) — katalog rankingów/eventów. Kolejność źródeł: raw → jsDelivr → kopia w localStorage → snapshot w repo.
- API tłumaczeń Goodgame — teksty gry.

Nie zakładaj, że którekolwiek API jest dostępne w testach lub lokalnym środowisku. Funkcje API powinny obsługiwać timeout, retry, pustą odpowiedź i błąd bez wywracania całego UI.

## Dane lokalne i URL

Zmiany kluczy localStorage wymagają migracji albo zachowania kompatybilności. Istotne dane obejmują serwer, rozmiar strony, auto-refresh, motyw, język, tryb compact, watchlistę, notatki, historię i powiadomienia. Hash URL służy do deep-linkingu (serwer, event, strona i filtry), więc nowe parametry należy walidować i ograniczać.

## Cache i wdrażanie

Po zmianie `index.html`, JS, CSS, manifestu lub assetów:

1. Zwiększ wersję query `?v=...` w `index.html`.
2. Zwiększ `VERSION` w `sw.js`.
3. Upewnij się, że zmieniony asset jest na liście `PRECACHE`, jeśli ma być częścią app shell.

Nie cache'uj odpowiedzi rankingów jako stałych danych aplikacji; dane rankingowe muszą pozostać świeże.

## Weryfikacja

Podstawowe polecenia:

```text
npm test
npm run check
```

`npm run check` wykonuje kontrolę składni wszystkich skryptów i testy. Przy zmianach UI warto dodatkowo sprawdzić działanie w przeglądarce na desktopie i wąskim ekranie, a przy zmianach service workera wyczyścić/odświeżyć cache.

## Styl zmian

Preferuj małe, lokalne poprawki. Zachowuj istniejące nazwy funkcji i strukturę stanu, chyba że refaktoryzacja jest konieczna. Każdą zmianę zachowania opisz w komentarzu lub README, jeśli wpływa na użytkownika. Nie commituj plików tymczasowych z `.tmp_shot/` ani sekretów.
