# 🏰 GGE Rankings

A live rankings site for **Goodgame Empire (GGE)** and **Empire Four Kingdoms (E4K)**.

🌐 **[Open the rankings](https://dolildev.github.io/gge-rankings/)**

---

## 🚀 Getting started

### 1. Pick a game and server

At the top of the page, choose a server from the list — servers are grouped (GGE first, E4K below), shown with flags and codes. The dropdown has a **search box**, so you can type part of a server's name or code to find it quickly.

### 2. Pick a ranking type

From the **Ranking** dropdown, choose the leaderboard you want, e.g.:
- **Honor** — player honor ranking
- **Might** — player might ranking
- **Glory**, **Attack points**, **Defense points**, **Loot points** — GGE publishes no server-side board for these,
  so they are assembled client-side: each pools the server's top ~2000 players and re-sorts them by that stat
  (a banner notes this). They exist so every number in the player detail panel has a ranking to open. GGE only.
- **League** — league ranking
- **Achievement points**, plus many seasonal events

### 3. Switch between players and alliances

Use the **Players / Alliances** toggle to switch between individual and alliance leaderboards.

### 4. Filter by level

Some rankings (e.g. Honor, Might) show a category bar so you can filter players by level range:

> `Lv 1-19` · `Lv 20-29` · `Lv 30-39` · ... · `✦ Legends`

---

## 🔍 Searching for a player

In the search box you can enter:
- **A rank number** (e.g. `1`, `42`) — jumps to that position
- **A player name** (e.g. `Knight123`) — searches by name

Confirm with **Enter** or the **↵** button.

---

## 📋 The ranking table

Click any row to expand its details. Each row contains:

| Element | Meaning |
|---|---|
| Checkbox | Add to comparison (max 4) |
| # | Rank position + change indicator (the top 3 get a medal-coloured ring) |
| ▲5 / ▼3 | Position change since the last check |
| Δ+1.2k | **Score change** since the last snapshot (tooltip = full value) |
| Star | Add/remove from watchlist (filled = watched) |
| Name | Click → expand details (a note icon means you have a note on this player) |
| Alliance | The player's **full alliance name** — a clickable tag that filters the ranking to that alliance |
| Score | The row's headline number, right-aligned on a shared decimal grid |

In **alliance** mode the "Alliance" column becomes **Members** (member count), and long alliance names wrap so the full name is always visible.

### Sorting

Click a **column header** (`#`, `Player`, `Alliance`, `Score`) to sort:
- 1st click — ascending ▲
- 2nd click — descending ▼
- 3rd click — back to default

### Player details

Expanding a player row shows:
- Honor, Might, Glory, Level (legendary/regular)
- Attack, defense and loot points
- A **stat-history chart** (sparkline) — when data from previous refreshes is available. It defaults to **Might**,
  and **hovering any stat tile switches the chart to that stat** (the tile is highlighted while it's charted);
  moving the pointer off the tile grid restores the default. Every snapshot stores all stats, so honor, glory,
  attack/defense/loot, titles, score and position each have their own line. The line always rises when things
  improve — including position, where a smaller number is better. Stats with fewer than two data points show
  "not enough history" instead. History collected before this existed still charts position and score.
- Clickable stats → **every** stat tile opens the ranking that ranks it: Honor, Might, Glory, Legendary level,
  Attack / Defense / Loot points, and — for Rank and the two Title tiles — the Plunder (nobility) board that
  awards them. The Level tile lands on the matching level bracket of the Honor ranking, and the Ranking score
  tile opens the current ranking at its top. A tile stays plain when its ranking doesn't exist for that
  game/server, so it never becomes a dead link.
- **Copy card** — copies a nicely formatted PNG card with the player's stats to the clipboard (great for pasting into Discord). If the browser doesn't support image clipboard access, the card is downloaded instead.
- Your note about the player (if watched and a note exists)

Watched players are marked by the filled star in their row and a faint row tint.

### Alliance details

Expanding an alliance row shows:
- Aggregate stats: might, glory points, whether the alliance is open, member count, average might, and total attack / defense / loot points.
  These are clickable too — the alliance-wide numbers open the alliance boards, and the attack / defense / loot sums open the matching player ranking
- The alliance **description** (when set), in its own full-width block
- A member list (name · level · might) — click a member to look them up
- A **Show members** button that loads the full member list with stats (where the server is supported). Each member shows current **Might**, **Loot**, **Glory** and **Honor**, plus a dimmer **All-time** line with their peak (record) values for the same stats. The **alliance leader** is highlighted with a crown badge and an accent rail, members under **protection** (peace mode) show a shield badge with the expiry date, and every member carries their **in-alliance rank** badge. The list has **clickable sortable headers** — sort by **Might**, **Loot**, **Glory**, **Honor**, **Level**, **Rank** or **Protection** (click a header again to flip the direction). Click a member to search for them.

You can also **watch an alliance** straight from its detail panel (Watch / Watching).

---

## ⭐ Watching players and alliances

### Add to your watchlist
- Click the **star** next to a name in the table — adds instantly
- Or **Track** in the top-right corner — a modal with server selection
- For alliances, use the Watch button inside the alliance detail panel

### Browse your watchlist
The **Favorites** tab shows cards with current positions across available events, plus a **position-history chart**. On each card you can add a **note** (e.g. "enemy / ally / target") — it's stored locally and also appears in the table and in player details.

### Notifications
A toast pops up when:
- 🚀 A watched player enters the TOP 10
- 📉 A watched player drops out of the TOP 10
- 🏅 A watched player enters the TOP 3

The **🔔 Notifications** button (Favorites tab) additionally enables **real browser notifications** — they arrive even when the tab is in the background. Best used with auto-refresh enabled on the watched ranking (the page must be running — there are no server-side pushes).

### Remove from your watchlist
- × on the card / click ☆ again in the table / 🗑 Clear all

---

## 📊 Comparing players / alliances

1. Tick the checkbox on 2–4 rows
2. A bar appears at the bottom with your selection
3. Click **Compare →** — a modal opens with side-by-side stats
4. **Best values** (highest might, best position) are highlighted green
5. **Worst values** are highlighted red

---

## ⚙️ Filters

Click **⚙ Filters** (or `F`) to show the filter bar:
- **With alliance / Without alliance / All**
- **Alliance name** — search by name/tag
- **Min. score** — show only entries with a score ≥ X

When a filter is active, up to **2000** top players are fetched and filtered across all of them (not just the current page). Clear with **× Clear**.

💡 Clicking an **alliance tag** in the table automatically sets the filter to that alliance and shows a banner with aggregates: number of players in the ranking, total and average score.

---

## ⬇ Exporting data

Click **⬇ Export** (or `E`):
- **📄 CSV** — download the current page for Excel/Google Sheets
- **{} JSON** — raw data for further processing
- **🔗 Copy link** — a shareable link with the current state (server + ranking + page + filters)

---

## ⏱ Auto-refresh

Click **⏱ Auto** in the toolbar and pick an interval (30s / 1 min / 5 min / 10 min). A countdown is shown in the status bar.

---

## 🌙 Theme, language and view

In the top-right corner:
- **🌙 / ☀️** — dark / light theme (`Shift + D`)
- **PL / EN** — interface language, also switches in-game text labels (`PL`/`EN`)
- **≣** — compact / denser mode (`Shift + C`)

All preferences are saved locally.

---

## ⌨️ Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus the search box |
| `Enter` | Confirm search |
| `Esc` | Close modal / dropdown / expanded row |
| `R` | Refresh ranking |
| `F` | Show/hide filters |
| `E` | Export menu |
| `Shift + D` | Toggle theme |
| `Shift + C` | Compact (denser) mode |
| `←` `→` | Previous / next page |

---

## 📄 Page size & pagination

Use the **10 / 25 / 50** rows selector, plus the pagination bar with a "jump to page" field. Each page is assembled from the live API and always fills to the chosen size when enough entries exist (the last page shows however many actually remain).

---

## 🔗 Deep linking

The page state is stored in the URL hash (`#s=PL1&e=honorPoints&p=3`). You can:
- Copy a link to a specific ranking and send it to a friend
- Bookmark a favorite ranking
- Return to the same view after a refresh

---

## ↺ Data refresh

Data is fetched live from the API. Connection status is shown in the status bar:

- 🟢 **LIVE data** — loaded successfully (with a timestamp)
- 🟡 **Loading...** — fetch in progress
- 🔴 **API error** — connection problem

On error, an automatic retry with exponential backoff kicks in (up to 2 attempts).

---

## 📱 Mobile & installation (PWA)

The site works on phones and tablets — the toolbar and table scroll horizontally, and ARIA labels are provided for screen readers.

You can **install it as an app**: in your browser choose "Add to Home Screen" / "Install". Once installed it runs full-screen, and static files are cached for a faster start and basic offline support.

---

## 💾 What's stored locally

In `localStorage`:
- The last selected server
- Your watchlist of players and alliances (including notes)
- Position history (up to 14 days, ~12 snapshots per ranking)
- Preferences: theme, language, auto-refresh, page size, compact mode, notifications
