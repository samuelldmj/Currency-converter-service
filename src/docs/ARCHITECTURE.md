# Project Architecture — Currency Converter Service

## Overview

This project follows a **Layered Architecture** pattern with OOP principles.
Each folder is a distinct layer with a single, clear responsibility.
Data flows in one direction only:

```
HTTP Request
     │
     ▼
  Routes          → defines URL paths, maps them to controller methods
     │
     ▼
  Controllers     → receives request, validates input, sends response
     │
     ▼
  Services        → business logic, orchestrates data fetching and caching
     │
     ▼
  Repositories    → data access only (DB reads/writes, cache get/set)
     │
     ▼
  Models          → TypeScript type definitions shared across all layers
     │
     ▼
  Database        → SQLite connection and table initialisation
```

No layer skips another. A Controller never talks to the Database directly.
A Repository never contains business logic. This separation makes each layer
independently testable and replaceable.

The rate lookup pipeline within the service layer follows this flow:

```
CurrencyService.convert()
       │
       ▼
  CacheRepository.get()
       │ miss
       ▼
  RateRepository.getLatest()
       │ miss
       ▼
  RateAggregatorService.getRate()
       │
       ├─ CurrencyApi (primary)
       ├─ Fixer (secondary)
       ├─ OpenExchange (backup)
       └─ Stale cache fallback
       │
       ▼
  Save to RateRepository + CacheRepository
       │
       ▼
  Return ConversionResult
```

---

## Root Files

### `package.json`

Defines the project — its name, version, scripts, and dependencies.
The scripts section is what you run to operate the project:

- `dev` — starts the server with hot reload via nodemon + ts-node (development)
- `build` — compiles TypeScript to JavaScript in `dist/`
- `start` — runs the compiled output (production)
- `clean` — deletes `dist/` and `node_modules/`

`"type": "module"` is set here, which tells Node to treat all `.js` files as
ES Modules — required because `tsconfig.json` uses `"module": "NodeNext"`.

### `tsconfig.json`

TypeScript compiler configuration. Key settings:

- `"module": "NodeNext"` — use Node's native ESM module system
- `"moduleResolution": "NodeNext"` — resolve imports the way Node 20 does
- `"strict": true` — enables all strict type checks
- `"outDir": "./dist"` — compiled JS goes here
- `"rootDir": "./src"` — TypeScript source lives here
- `"ts-node": { "esm": true }` — tells ts-node to use the ESM loader in dev mode

### `Dockerfile`

Defines how to build the Docker image in three stages:

- `dev` — installs all dependencies including devDependencies, used for hot reload
- `builder` — extends dev, runs `npm run build` to compile TypeScript
- `production` — lean image, installs only runtime deps, copies compiled `dist/`

Multi-stage builds keep the production image small — no TypeScript compiler,
no nodemon, no source files.

### `docker-compose.yml`

Orchestrates the dev container. Targets the `dev` stage of the Dockerfile.
Mounts `./src` and `./tsconfig.json` as volumes so file changes on your machine
are reflected inside the container instantly. Also mounts `.env.*` files into
the container at the dev stage.

### `docker-compose.prod.yml`

Production overrides. Targets the `production` stage, removes the src volume
mounts, and runs `npm start` instead of `npm run dev`.
Used with: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`

### `.gitignore`

Tells Git which files and folders to never commit:

- `node_modules/` — installed packages, always regenerated via `npm ci`
- `.env.*.local` — contains secrets (API keys), must never be in version control
- `.amazonq/` — local IDE rules

### `.env.development.local` / `.env.production`

Environment variable files. Never committed. Contain:

- `PORT` — which port the server listens on
- `SERVER_URL` — server URL displayed on startup
- `DB_PATH` — where the SQLite file lives
- `ALLOWED_ORIGINS` — comma-separated list of trusted frontend origins for CORS
- `FIXER_API_KEY`, `OPEN_EXCHANGE_APP_ID`, `CURRENCY_API_KEY` — external API credentials

---

## `src/` — All Application Source Code

### `src/index.ts` — Entry Point

The file Node runs first. Responsible for:

1. Loading environment variables (via Config/env.ts)
2. Initialising the database (creating tables if they don't exist)
3. Starting the HTTP server on the configured PORT
4. Handling server-level errors via `server.on("error")`

It does not contain any Express configuration — that lives in `app.ts`.
The split exists so `app.ts` can be imported in tests without starting a server.

### `src/app.ts` — Express Application Factory

Creates and configures the Express app instance. Responsible for:

- Attaching CORS middleware with an origin allowlist
- Attaching `express.json()` to parse request bodies
- Mounting the router at `/api/v1`
- Defining a root route `GET /` that returns `"Api is working!"`
- Attaching the global error handler (must be last)

Exports the configured `app` object. Has no knowledge of ports or databases.

### `src/Container.ts` — Dependency Injection Container

A singleton lazy-init container that manages instantiation of all services,
repositories, and controllers. Uses static getters so each dependency is created
only once and reused across all requests.

Dependency graph:

```
ExternalApiService        (no dependencies)
CacheRepository           (no dependencies)
RateRepository            (depends on db.ts singleton)
CurrencyService           (depends on RateRepository, CacheRepository, RateAggregatorService)
RateAggregatorService     (depends on ExternalApiService, CacheRepository)
CurrencyController        (depends on CurrencyService)
RateController            (depends on CurrencyService)
```

---

## `src/Config/`

The single place where environment variables are loaded and exported.
No other file calls `dotenv.config()` — it happens here once.

### `env.ts`

Calls `dotenv.config()` with the correct `.env` file path based on `NODE_ENV`.
Destructures and exports every env var the application needs:
`PORT`, `SERVER_URL`, `DB_PATH`, `ALLOWED_ORIGINS`, and the three API keys.

All other files import their env vars from here — never from `process.env` directly.
This gives one central place to see every configuration value the app depends on.

---

## `src/Database/`

Owns the SQLite connection and schema. Nothing outside this folder touches
the database driver directly.

### `db.ts`

- Guards against a missing `DB_PATH` before attempting to open the file
- Creates the `better-sqlite3` database instance (the connection)
- Enables foreign key enforcement via `PRAGMA foreign_keys = ON`
- Defines and exports `initializeDb()` which runs `CREATE TABLE IF NOT EXISTS`
  for the `exchange_rates` table
- Exports the `db` singleton — imported by Repositories to run queries

The `db` instance is a singleton — created once when the module is first imported,
reused everywhere. `better-sqlite3` is synchronous, so no connection pooling needed.

---

## `src/Models/`

Pure TypeScript type definitions. No logic, no imports from other layers.
These interfaces are the shared language of the entire application — every layer
uses them to describe the shape of data.

### `ExchangeRate.ts`

Mirrors the `exchange_rates` database table exactly.
Used by Repositories (DB rows), Services (rate data), and Controllers (responses).

```
id?        — auto-set by SQLite, optional on insert
base       — the currency being converted from (e.g. "USD")
target     — the currency being converted to (e.g. "EUR")
rate       — the exchange rate value (e.g. 0.925)
timestamp? — auto-set by SQLite, optional on insert
source?    — which external API provided this rate
```

### `ConversionResult.ts`

The shape of the response sent back to the client after a conversion request.
Contains everything the client needs: original amount, converted amount, rate used,
where the rate came from, and when it was fetched.

```
from            — source currency code
to              — target currency code
amount          — original amount
convertedAmount — amount after conversion
rate            — exchange rate used
source          — where the rate came from (cache, db, or API name)
timestamp       — ISO timestamp of the response
```

### `ApiResponse.ts`

A generic wrapper `ApiResponse<T>` for responses from external APIs.
The `T` type parameter makes it reusable. The `source` field is a union type
`"fixer" | "openexchange" | "currencyapi"` — TypeScript will error if you pass
any other string, preventing typos.

```
success — whether the call succeeded
data?   — the payload, typed as T
error? — error message on failure
source  — which API provider this response is from
```

---

## `src/Repositories/`

The only layer that reads from and writes to data stores (database and cache).
No business logic lives here — only data access operations.
Services call Repositories; Repositories never call Services.

### `RateRepository.ts`

All SQL operations for the `exchange_rates` table:

- `insert()` — saves a new rate fetched from an external API
- `getLatest()` — retrieves the most recent rate for a currency pair (used as DB fallback)
- `getLast24Hours()` — retrieves rate history for the last 24 hours (used by history endpoint)

Uses `better-sqlite3` prepared statements for all queries — prepared statements
are compiled once and reused, which is both faster and safe from SQL injection.

### `CacheRepository.ts`

An in-memory cache using a `Map`. Stores rates with a 5-minute TTL (time to live).

- `get()` — returns a cached rate if it exists and has not expired, otherwise returns
  `undefined` and removes the stale entry
- `set()` — stores a rate with an expiry timestamp of `Date.now() + 5 minutes`
- `invalidate()` — manually removes a specific entry from the cache

The cache key is `"BASE_TARGET"` (e.g. `"USD_EUR"`), built by `buildKey()`.
The TTL check happens lazily inside `get()` — no background timer needed.

---

## `src/Services/`

Business logic layer. Orchestrates Repositories and external API calls.
Three services work together:

### `ExternalApiService.ts`

Knows how to call each of the 3 external APIs and normalise their different
response shapes into `ApiResponse<ExchangeRate>`:

- `fetchFromCurrencyApi(base, target)` — calls CurrencyApi
- `fetchFromFixer(base, target)` — calls Fixer.io
- `fetchFromOpenExchange(base, target)` — calls OpenExchangeRates
- `fetchAllRates(base, target)` — calls all three in parallel via `Promise.allSettled`

Each method handles the provider-specific response structure and returns a
normalised `ApiResponse<ExchangeRate>`. Errors are thrown for the aggregator
to catch and handle.

### `RateAggregatorService.ts`

Orchestrates API calls with two strategies:

**Sequential Fallback (default, `getRate()`):**
Tries providers in order — CurrencyApi -> Fixer -> OpenExchange. Stops at the
first successful response. If all fail, falls back to stale cache data (ignoring TTL).

**Parallel Average (`parallelAverageStrategy()`):**
Calls all three providers concurrently. Averages successful responses into a single
rate with source labeled `"aggregated"`. Used for comparison and testing.

### `CurrencyService.ts`

The main orchestrator. Contains the three-tier lookup logic and is called by
both controllers:

- `convert(from, to, amount)` — full currency conversion:
  1. Check cache -> 2. Check database -> 3. Fetch via aggregator -> persist + cache
  4. Throws `AppError(503)` if all sources fail
  Returns `ConversionResult` with converted amount and rate source attribution.

- `getSupportedCurrencies()` — returns the list of supported currency codes.

- `getRateHistory(from, to)` — delegates to `RateRepository.getLast24Hours()` and
  maps results to a flat array of `{ from, to, rate, timestamp }`.

---

## `src/Controllers/`

Handles HTTP concerns only — reading from `req`, calling the appropriate Service
method, and writing to `res`. No business logic, no direct DB access.

### `CurrencyController.ts`

Handles currency conversion and currency list endpoints. Depends on `CurrencyService`.

- `convert(req, res, next)` — `GET /api/v1/convert?from=USD&to=EUR&amount=100`
  Reads `from`, `to`, `amount` from query string or request body.
  Validates all parameters exist and amount is a positive number.
  Calls `CurrencyService.convert()` and returns the result as JSON.

- `getSupportedCurrencies(req, res, next)` — `GET /api/v1/currencies`
  Returns the hardcoded list of supported currency codes.

### `RateController.ts`

Handles rate history endpoint. Depends on `CurrencyService`.

- `getRateHistory(req, res, next)` — `GET /api/v1/rates/history/:from/:to`
  Extracts `:from` and `:to` from URL params, validates them,
  calls `CurrencyService.getRateHistory()`, returns results as JSON.

---

## `src/Routes/`

Maps URL paths to Controller methods. Imported by `app.ts` and mounted at `/api/v1`.

Keeping routes separate from controllers means you can see all available
endpoints in one place without reading controller logic.

### `route.ts`

Current endpoints:

| Method | Path                         | Handler                                    |
| ------ | ---------------------------- | ------------------------------------------ |
| GET    | `/api/v1/convert`            | `CurrencyController.convert`               |
| GET    | `/api/v1/currencies`         | `CurrencyController.getSupportedCurrencies` |
| GET    | `/api/v1/rates/history/:from/:to` | `RateController.getRateHistory`       |

Root path:

| Method | Path | Handler        |
| ------ | ---- | -------------- |
| GET    | `/`  | Inline (health check: `"Api is working!"`) |

---

## `src/Middleware/`

Express middleware that runs across all routes.

### `errorHandler.ts`

Global error handler that catches any error thrown in controllers or services
and returns a consistent JSON error shape:

```json
{ "success": false, "error": "message here" }
```

Extracts `err.status` (from `AppError`) or defaults to 500. Logs the request
method, URL, status, message, and stack trace via the Winston logger.

Mounted last in `app.ts` so it catches errors from all routes.

---

## `src/Utils/`

Stateless helper utilities that don't belong to any specific layer.

### `logger.ts`

Winston logger configured with three transports:

| Transport | Level | Output             |
| --------- | ----- | ------------------ |
| Console   | All   | stdout             |
| File      | error | `logs/error.log`   |
| File      | All   | `logs/combined.log` |

Log format: timestamp, level, message, stack trace (if present).

### `AppError.ts`

Custom error class extending `Error` with an HTTP `status` code. Used throughout
the application to signal application-level errors with a response code.

```
message — human-readable error description
status  — HTTP status code (e.g. 400, 503)
name    — always "AppError" for identification
```

---

## `data/`

Where the SQLite database file lives at runtime (`currency.db`).
In Docker, this folder is mounted as a named volume (`sqlite_data`) so the
database persists across container restarts and rebuilds.
The folder is committed to Git (empty) but the `.db` file is not.
