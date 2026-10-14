# vlr-compare

Compare professional esports players side by side. Pick a player on the left and a player on the right, and their stats appear next to each other in interactive charts.

Valorant first (data from [VLR.gg](https://www.vlr.gg)), other games later.

> The UI currently runs on fictional sample data while the ingestion pipeline is built.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Recharts for visualizations
- PostgreSQL
- Docker / Docker Compose
- Planned: scheduled VLR.gg scraper (cheerio) writing to Postgres, deployed to AWS with Terraform

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To run against a local database, start just Postgres in Docker and copy the
example env file:

```bash
docker compose up -d db
cp .env.example .env
```

## Docker

The whole stack (web app + Postgres) runs with Docker Compose:

```bash
docker compose up --build
```

Then open http://localhost:3000. Useful commands:

| Command | What it does |
| --- | --- |
| `docker compose up -d --build` | Build and start everything in the background |
| `docker compose logs -f web` | Follow the web app's logs |
| `docker compose down` | Stop the stack (database data is kept) |
| `docker compose down -v` | Stop and delete the database volume |

The web image is a multi-stage build ([Dockerfile](Dockerfile)) using Next.js
[standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
so the runtime image contains only the compiled server and its traced
dependencies, and runs as a non-root user. To build and run it on its own:

```bash
docker build -t vlr-compare-web .
docker run --rm -p 3000:3000 vlr-compare-web
```

Local database credentials default to `vlr`/`vlr`; override them in `.env`
(see [.env.example](.env.example)).
