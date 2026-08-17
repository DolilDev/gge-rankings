# icons/

`rankings.webp` — sprite z ikonami rankingów, wypalony jednorazowo z oficjalnego klienta GGE
(tak samo jak pakiet w `crest/`). Siatka 8 komórek w rzędzie, komórka 40×40 px, przezroczyste tło.
Kolejność komórek = `RANK_ICON_IDS` w `config.js`; mapowanie „klucz rankingu → ikona” to
`RANK_ICONS` / `RANK_ICONS_AL` tamże. Liczba kolumn jest powtórzona w `.rico` w `style.css`.

## Skąd pochodzą

Assety klienta są publiczne, bez logowania. Baza: `https://empire-html5.goodgamestudios.com/default/assets/`.
Każdy pakiet to `<ścieżka>.png` (atlas) + `.json` (ramki createjs) + `.js` (biblioteka: symbol → `BMP_x`).
Zwersjonowane ścieżki siedzą w `dll/ggs.dll.<hash>.js` klienta (hash z `default/index.html`),
w `ItemVersions.prototype.fill` i `InterfaceVersions.prototype.fill`.

Użyte pakiety:

| pakiet | symbole |
| --- | --- |
| `itemassets/EventIcons/EventIcons--<ts>` | `eventIcon_<N>`, `eventIcon_<N>_alliance` |
| `interface/CastleInterfaceElements--<ts>` | `Icon_Glory`, `Icon_Fame`, `Icon_XP_Legend`, `Icon_Gacha`, `icon_Achievement…`, `Icon_islandAlliancePoints` |
| `interface/CastleInterfaceElements_Icons--<ts>` | `Icon_Honor`, `Icon_MightPointsCombined`, `Icon_LootPower`, `Icon_attackBonus`, `Icon_Harbor`, `Icon_Alliance` |

`<N>` w `eventIcon_<N>` to typ eventu z klienta (`EVENTTYPE_*` w `ggs.dll`), czyli ta sama liczba,
którą niosą klucze `event_title_<N>`. Boardy bez własnej ikony (gachy, nowsze eventy) dostają
`RANK_ICON_FALLBACK`.

## Jak odświeżyć

Ręcznie, przy okazji nowych rankingów — nie ma tu procesu budowania:

1. Pobierz `default/index.html`, z niego hash `ggs.dll`, z niego aktualne ścieżki pakietów.
2. Pobierz `.png` + `.json` + `.js` pakietu.
3. Z `.js` odczytaj `<Cls>.__fname="<symbol>"` i `new <var>` z jego konstruktora, rozwiąż
   `var …,<var>=<BmpCls>` → `BMP_x`, a `BMP_x` w `.json` (`animations` → `frames`) → prostokąt.
4. Wytnij prostokąty i złóż siatkę (wystarczy `ffmpeg`: `crop` + `scale` + `pad` + `overlay`),
   zapisz jako WebP.
5. Zaktualizuj `RANK_ICON_IDS`/`RANK_ICONS` w `config.js` i podbij `VERSION` w `sw.js`
   oraz `?v=` w `index.html`.

Grafiki należą do Goodgame Studios i są tu użyte wyłącznie do opisania rankingów tej samej gry.
