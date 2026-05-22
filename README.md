# 🏰 GGE Rankings

Strona rankingów dla **Goodgame Empire (GGE)** i **Empire Four Kingdoms (E4K)**.  
Działa jako statyczna strona — **bez backendu**, bezpośrednio z przeglądarki.

## 🌐 Demo

Po wdrożeniu dostępna pod: `https://TWOJ_LOGIN.github.io/gge-rankings/`

## 🚀 Deploy na GitHub Pages

### Metoda 1 — przez przeglądarkę (najprościej)

1. Wejdź na [github.com](https://github.com) → **New repository**
2. Nazwa: `gge-rankings`, Public ✓ → **Create repository**
3. Kliknij **Add file → Upload files**
4. Wgraj `index.html`, `README.md`, `.nojekyll`
5. Wejdź w **Settings → Pages**
6. Source: **Deploy from a branch** → Branch: **main** / **root**
7. Kliknij **Save** — strona pojawi się po ~2 min

### Metoda 2 — przez Git (terminal)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TWOJ_LOGIN/gge-rankings.git
git push -u origin main
```

Następnie włącz GitHub Pages w Settings → Pages.

## ✅ Funkcje

| Funkcja | Opis |
|---------|------|
| 🏆 Rankingi LIVE | Dane z empire-api.fly.dev |
| ⚔️ Wszystkie eventy | Honor, Siła, Turnieje, Liga... |
| 🗂 Kategorie poziomów | Lv 1-19, Lv 20-29, ✦ Legendy |
| 📄 Paginacja | 10 graczy na stronie |
| 🔍 Wyszukiwanie | Po ranku (liczba) lub nicku (tekst) |
| ⭐ Obserwowanie | Śledzenie graczy z podglądem rankingów |
| 🔗 Klikalne statystyki | Honor/Siła/Poziom → otwiera ranking |
| 🛡 Tryb ochrony | Wskaźnik przy graczu |
| 🚫 Ban | Wskaźnik przy zbanowanym graczu |
| 🌍 Wszystkie serwery | GGE + E4K z flagami |
| 📱 Responsive | Działa na telefonie i tablecie |

## 📁 Pliki

```
index.html    ← cały projekt (jeden plik, ~44KB)
README.md     ← ta dokumentacja
.nojekyll     ← wyłącza Jekyll na GitHub Pages (wymagane)
```

## 🔌 Używane API

- `empire-api.fly.dev` — rankingi GGE/E4K
- `raw.githubusercontent.com/danadum/ggs-assets` — eventy
- `translations-api-test.public.ggs-ep.com` — tłumaczenia (opcjonalne)
- `media.goodgamestudios.com` — lista serwerów (opcjonalne, jest fallback)

Wszystkie API mają CORS włączony — działają bezpośrednio z przeglądarki.

## 🛠 Lokalne uruchomienie

Ponieważ to statyczna strona, możesz ją otworzyć lokalnie na dwa sposoby:

```bash
# Python (wbudowany serwer)
python -m http.server 8080
# → otwórz http://localhost:8080

# Node.js (npx serve)
npx serve .
```

> ⚠️ Nie otwieraj `index.html` bezpośrednio przez `file://` — 
> przeglądarki blokują wtedy część requestów CORS.
