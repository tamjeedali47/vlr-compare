# vlr-compare

Compare professional esports players side by side. Pick a player on the left and a player on the right, and their stats appear next to each other in interactive charts.

Valorant first (data from [VLR.gg](https://www.vlr.gg)), other games later.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Recharts for visualizations
- Scraper for VLR.gg pages (cheerio), with results stored as JSON in `data/`

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data

Stats come from [VLR.gg](https://www.vlr.gg). All credit for the underlying data goes to them; this project only scrapes it politely (one request every ~1.5 s) and caches the results.

The scraper covers players on the 2026 VCT partnered-team rosters (Americas, EMEA, Pacific, China) and every match they have played since 2026-01-01:

```bash
npm run scrape                        # all teams; reuses cached rosters and matches
npm run scrape -- --refresh-rosters   # also re-detect teams and re-fetch rosters
npm run scrape -- --team nrg          # one team only (VLR.gg team slug)
```

Output in `data/`:

- `teams.json`: detected teams and rosters (fix misses in `scripts/config/teams.override.json`)
- `matches/{matchId}.json`: parsed match pages, fetched once and reused
- `players/index.json`: search index
- `players/{playerId}.json`: profile, 2026 matches, and 30/60/90-day and season stat windows
- `last-run.json`: summary of the latest run, including failures

A GitHub Action (`.github/workflows/scrape.yml`) runs the scraper nightly and commits changed data.
