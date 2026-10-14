# vlr-compare

Compare professional esports players side by side. Pick a player on the left and a player on the right, and their stats appear next to each other in interactive charts.

Valorant first (data from [VLR.gg](https://www.vlr.gg)), other games later.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Recharts for visualizations
- Server-side scraper of VLR.gg player pages (cheerio), with caching

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.
