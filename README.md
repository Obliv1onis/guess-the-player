# Touchline

Full-screen football guessing game with two independent fixed pools of **1,000 players each**. English and simplified Chinese interfaces and name searches are supported, including common aliases such as 罗哥, C罗, CR7, 大罗 and 小罗.

## Modes

- **Active players:** 1,000 players from major European leagues and other prominent leagues. Includes Raheem Sterling, Kyle Walker and Olivier Giroud. Club shirt numbers and ages use the fixed October 2026 roster snapshot. Free agents use their most recent club and shirt number, labelled **Last club** in the results; Sterling uses his Feyenoord period.
- **Legends:** 1,000 retired players. The search list shows the player’s nationality flag, name and position, with no club name or club badge. Each player has a fixed reference club, shirt number, reference year and age in that year. Legends’ search results and clues include Chinese names and nationalities.

Search for a player, choose a suggestion and submit. There is no guess limit. Green indicates an exact match. Club is yellow for a different club in the same reference league; position is yellow for the same broad area; age is yellow within two years inclusive. Nationality and shirt number require exact matches.

**In Legends mode, the club displayed in the guessed row is green whenever the mystery player played for that club at any point in their senior career, including loans.** It does not have to match the mystery player’s selected reference club. For example, Sol Campbell accepts Tottenham, Arsenal, Portsmouth, Notts County and Newcastle. Club aliases are normalized; separate clubs with ambiguous names retain separate identities.

**Reveal** ends the round and displays the answer, then changes to **New game**. Revealing never counts as a win. Each mode separately saves its round and stats in localStorage. Language changes preserve progress. Existing legend IDs remain stable as the pool expands.

## Difficulty

Both Active and Legends have Easy, Medium and Hard tiers, defaulting to Easy. The difficulty sets the pool from which mystery players are chosen; search suggestions always cover all 1,000 players in the selected mode. The tiers are nested, curated for recognition rather than alphabetic order; `data/popularity-order.json` records the complete editorial order and `data/popularity-curation.json` explains the selection. Each mode and difficulty saves its own round and stats. Old 1000-player progress and stats are retained in Hard.

Added Pulisic, Benzema, Di María, Verratti, Salah, Lewandowski, Griezmann, Alisson and Lautaro to Easy in place of nine fringe/reserve players. Pulisic uses AC Milan number 11; free agents use their last club with the existing Last club label. Verified roster sources include [AC Milan](https://www.acmilan.com/en/teams/men-first-team), [Rosario Central](https://rosariocentral.com/jugadores/angel-di-maria/), [QSL](https://www.qsl.qa/en/al-duhail), [Orlando City](https://www.orlandocitysc.com/players/antoine-griezmann/), [Chicago Fire](https://www.chicagofirefc.com/players/robert-lewandowski/) and [Inter](https://www.inter.it/en/teams/first-team/player/lautaro-martinez).

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

`npm run data:build` deterministically rebuilds both committed bilingual JSON files from the committed data. It needs no network or credentials. The game uses the committed JSON at runtime. Optional photo/flag/club CDN assets load lazily; photos retry a second source and then a local silhouette. Existing local badges and portraits remain under `public/media/`.

## Data and credits

- `data/active-source.json`: fixed ESPN roster records, supplemented with verified last-club data for free agents. [ESPN soccer](https://www.espn.com/soccer/); [Feyenoord’s Sterling signing announcement](https://www.feyenoord.com/en/news/feyenoord-sign-4-time-premier-league-winner-raheem-sterling-mbe-120226).
- `data/historic-legends.txt`, `data/extra-legends-source.json`: curated classic and recent retired players plus historical roster records. Supplemental historical records use the actual **2014 reference snapshot**, rather than claiming a current age or peak season. [FIFA/SoFIFA historical data mirror](https://github.com/kushal-gopal/EA-Sports-Fifa/blob/main/players_15.csv). The curated classic/recent source tables retain the selected reference periods.
- `data/player-wiki-metadata.json`, `data/legend-wiki-titles.json`: source article titles, senior club histories, translations and photo links from [Wikipedia’s API](https://en.wikipedia.org/w/api.php). `data/career-overrides.json` supplies curated histories for the few special cases. Wikipedia text is available under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/); simplified Chinese conversion uses [OpenCC](https://github.com/nk2028/opencc-js).
- Club and photo source URLs are retained in the media dictionaries. Wikimedia images retain their individual licenses as listed on their source file pages. Transfermarkt portraits retain their credited owners’ rights. Fan Zhiyi, Li Tie, Li Weifeng, Li Jinyu, Zhao Junzhe, Hao Haidong and Yang Chen have local portraits.

Tests cover exact pool sizes, unique IDs and names, bilingual completeness, required star searches, historical club green/yellow/red behavior, flags, media handling, club-free Legends search results, reveal/new game, mode progress, separate stats and restoring revealed rounds.
