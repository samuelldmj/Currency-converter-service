# Docker Setup — Currency Converter Service

## Stack

| Layer            | Package                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| Web framework    | `express` ^5.2.1, `cors` ^2.8.6                                            |
| Database         | `better-sqlite3` ^12.9.0                                                   |
| Config           | `dotenv` ^17.4.2                                                           |
| TypeScript build | `typescript` ^6.0.3, `ts-node` ^10.9.2, `nodemon` ^3.1.14, `rimraf` ^6.1.3 |
| Type definitions | `@types/node`, `@types/express`, `@types/cors`, `@types/better-sqlite3`    |

## Docker Image

Uses `node:20-slim` (Debian-based). Unlike Alpine, it ships with `python3`, `make`, and `g++` pre-installed — required for `better-sqlite3` native compilation. No extra `apk` or `apt` install steps needed.

## Prerequisites

- Docker & Docker Compose installed
- `package.json` exists with all dependencies and scripts (run `npm init -y` + `npm install` per `TYPESCRIPT_SETUP.md`)
- `"type": "module"` set in `package.json` (required for `NodeNext` module resolution)
- `.env` file created (see below)

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
DB_PATH=./data/currency.db
FIXER_API_KEY=<your_fixer_key>
OPEN_EXCHANGE_APP_ID=<your_open_exchange_id>
CURRENCY_API_KEY=<your_currency_api_key>
```

Docker Compose auto-loads `.env` from the project root.

## Production

Build and start:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f app
```

When I update package.json:

```bash
docker-compose down && docker-compose up --build
```

Multi-stage build with explicit target:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Direct build:
This runs dev stage + builder stage (npm run build → tsc compile).

```bash
docker build --target builder .
```

Direct prod build:
Runs all 3 stages, producing the final production image.

```bash
docker build --target production .
```

Stop:

```bash
docker compose down
```

Service available at `http://localhost:3000`.

## Development (Hot Reload)

In `docker-compose.yml`, uncomment the three dev lines inside the `volumes` block and the `command` line:

```yaml
services:
  app:
    volumes:
      - sqlite_data:/app/data
      - ./src:/app/src # uncomment
      - ./tsconfig.json:/app/tsconfig.json # uncomment
    # command: npm run dev           # uncomment
```

Then run:

```bash
docker compose up --build
```

Changes to `./src` are picked up automatically via `nodemon` + `ts-node`.

## Flushing an Incomplete Build

If a build was cancelled or failed mid-way:

```bash
docker compose down
docker builder prune -f
docker compose up --build -d
```

## Shell Access

```bash
docker compose exec app sh
```

## Data Persistence

SQLite data is stored in the `sqlite_data` named volume at `/app/data/currency.db`.

To reset the database:

```bash
docker compose down -v
```

## Troubleshooting

| Problem                        | Fix                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `Missing script: "build"`      | Add `dev`, `build`, `start`, `clean` scripts to `package.json` (see `TYPESCRIPT_SETUP.md`) |
| `"type": "commonjs"` conflict  | Change to `"type": "module"` in `package.json` to match `NodeNext` in `tsconfig.json`      |
| `better-sqlite3` compile error | Already handled — `node:20-slim` includes required build tools                             |
| Port already in use            | Change `ports: - "3001:3000"` in `docker-compose.yml`                                      |
| Env vars not picked up         | Ensure `.env` is in the project root alongside `docker-compose.yml`                        |
| Slow build                     | Run `docker builder prune -f` to clear stale cache layers                                  |
