# Currency Converter Service

A Node.js/TypeScript REST API for currency conversion with multi-provider exchange rate aggregation, in-memory caching, and persistent SQLite storage.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the Application](#running-the-application)
  - [Development](#development)
  - [Production](#production)
- [API Reference](#api-reference)
  - [Convert Currency](#1-convert-currency)
  - [List Supported Currencies](#2-list-supported-currencies)
  - [Rate History](#3-rate-history)
- [Architecture](#architecture)
  - [Request Flow](#request-flow)
  - [Rate Lookup Strategy](#rate-lookup-strategy)
  - [Multi-Provider API Aggregation](#multi-provider-api-aggregation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Docker Compose Files](#docker-compose-files)
- [Docker Setup](#docker-setup)
  - [Dockerfile Stages](#dockerfile-stages)
  - [Dev Stage Targets](#dev-stage-targets)
- [Error Handling](#error-handning)
- [Logging](#logging)
- [Database](#database)

## Overview

This service provides currency conversion using a two-step rate lookup strategy: it first tries an in-memory TTL cache and SQLite for the latest stored rates, then falls back to multi-provider exchange rates (CurrencyApi → Fixer → OpenExchange) with a stale-cache fallback. Retrieved rates are cached and persisted to SQLite for historical queries.

## Features

- Currency conversion between supported currency pairs
- Multi-provider rate aggregation with automatic fallback
- **Dynamic currency list fetched from external APIs** (cached for 5 minutes)
- In-memory caching with configurable TTL (5 minutes)
- Persistent SQLite storage for rate history (24-hour lookback)
- Dependency injection container for loose coupling
- Structured error handling with custom error types
- Winston-based logging to console and file transports
- Multi-stage Docker build for optimized production images
- CORS support with configurable allowed origins

## Tech Stack

| Component        | Technology                  |
| ---------------- | --------------------------- |
| Runtime          | Node.js v20                 |
| Language         | TypeScript (ESM)            |
| Framework        | Express.js v5               |
| Database         | SQLite (better-sqlite3 v12) |
| Logging          | Winston v3                  |
| Containerization | Docker, Docker Compose      |
| Package Manager  | npm                         |

## Prerequisites

- Node.js v20 or later
- Docker and Docker Compose
- API keys for one or more providers (CurrencyApi, Fixer, OpenExchange)

## Project Structure

```
currency-converter-service/
|-- src/
|   |-- Config/
|   |   |-- env.ts                    # Environment variable loader (dotenv)
|   |-- Controllers/
|   |   |-- CurrencyController.ts     # Conversion and currency list endpoints
|   |   |-- RateController.ts         # Rate history endpoint
|   |-- Database/
|   |   |-- db.ts                     # SQLite initialization and schema
|   |-- Middleware/
|   |   |-- errorHandler.ts           # Global error handling middleware
|   |-- Models/
|   |   |-- ApiResponse.ts            # Generic API response interface
|   |   |-- ConversionResult.ts       # Conversion result interface
|   |   |-- ExchangeRate.ts           # Exchange rate interface
|   |-- Repositories/
|   |   |-- CacheRepository.ts        # In-memory cache with TTL
|   |   |-- RateRepository.ts         # SQLite persistence layer
|   |-- Routes/
|   |   |-- route.ts                  # Express route definitions
|   |-- Services/
|   |   |-- CurrencyService.ts        # Core business logic
|   |   |-- ExternalApiService.ts     # External API provider calls
|   |   |-- RateAggregatorService.ts  # Multi-provider aggregation strategies
|   |-- Utils/
|   |   |-- AppError.ts              # Custom error class
|   |   |-- logger.ts                # Winston logger configuration
|   |-- app.ts                        # Express application setup
|   |-- Container.ts                  # Dependency injection container
|   |-- index.ts                      # Server entry point
|-- data/                             # SQLite database directory
|-- docker-compose.yml                # Development configuration
|-- docker-compose.prod.yml           # Production overrides
|-- Dockerfile                        # Multi-stage Docker build
|-- tsconfig.json                     # TypeScript configuration
|-- package.json                      # Dependencies and scripts
|-- README.md                         # Project documentation
```

## Installation

```bash
git clone https://github.com/samuelldmj/Currency-converter-service.git
cd currency-converter-service
npm install
```

## Running the Application

### Development

Using Docker (recommended):

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

(Development server can also be run locally without Docker via `npm run dev`, if desired.)

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

This uses the production Dockerfile target which runs the compiled TypeScript output.

## API Reference

All endpoints are prefixed with `/api/v1`.

### 1. Convert Currency

Converts an amount from one currency to another.

```
GET /api/v1/convert?from=USD&to=EUR&amount=100
```

**Parameters:**

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| from      | string | Yes      | Source currency code (e.g., USD)     |
| to        | string | Yes      | Target currency code (e.g., EUR)     |
| amount    | number | Yes      | Amount to convert (must be positive) |

Parameters can be passed as query string or request body.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "EUR",
    "amount": 100,
    "convertedAmount": 92.5,
    "rate": 0.925,
    "source": "cache",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

To get the current exchange rate for a currency pair without conversion, pass `amount=1`:

```
GET /api/v1/convert?from=USD&to=EUR&amount=1
```

The `rate` field in the response contains the current exchange rate.

**Error Response (400/503):**

```json
{
  "success": false,
  "error": "Missing required parameters: from, to, amount"
}
```

### 2. List Supported Currencies

Returns the list of supported currency codes fetched from external APIs (CurrencyApi, Fixer, OpenExchange). Results are cached for 5 minutes.

```
GET /api/v1/currencies
```

**Success Response (200):**

```json
{
  "success": true,
  "data": ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", ...]
}
```

### 3. Rate History

Returns exchange rate history for a currency pair over the last 24 hours.

```
GET /api/v1/rates/history/USD/EUR
```

**Parameters:**

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| from      | string | Yes      | Source currency code |
| to        | string | Yes      | Target currency code |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "from": "USD",
      "to": "EUR",
      "rate": 0.925,
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

## Architecture

### Request Flow

```
Client Request
      |
      v
Express App (app.ts)
      |
      v
Router (route.ts)
      |
      v
|-> Controller (CurrencyController / RateController)
|       |
|       v
|-> CurrencyService 
|       |-- convert -> RateAggregatorService -> ExternalApiService
|       |-- getSupportedCurrencies -> ExternalApiService.fetchAllCurrencies()
|       |-- getRateHistory -> RateRepository (SQLite)
|       |
|       v
|-> CacheRepository (in-memory, 5 min TTL) / RateRepository (SQLite)
```

### Rate Lookup Strategy

The service uses a three-tier lookup strategy for optimal performance and reliability:

1. **In-Memory Cache** -- Fastest. Rates are stored in a `Map` with a 5-minute TTL. Expired entries are evicted on access.

2. **SQLite Database** -- Fast and persisted. If the cache misses, the most recent rate for the pair is fetched from the database. A DB hit also refreshes the cache.

3. **External API (via Aggregator)** -- Slowest. Called when both cache and DB fail. The fetched rate is persisted to both the database and cache.

### Multi-Provider API Aggregation

`ExternalApiService` provides methods to:
- Fetch exchange rates from CurrencyApi, Fixer, and OpenExchange (with fallback)
- Fetch supported currencies from all three providers in parallel

The `RateAggregatorService` implements two strategies for rate lookup:

**Sequential Fallback (default):**

Tries providers in order of reliability. Stops at the first successful response.

```
CurrencyApi -> Fixer -> OpenExchange -> Stale Cache Fallback
```

If all API providers fail, the most recent cached data is returned regardless of TTL, logging a warning.

**Parallel Average (alternative):**

Calls all three providers concurrently via `Promise.allSettled`. Successful responses are averaged into a single rate with source labeled as `aggregated`. Used for comparison and testing.

## Configuration

### Environment Variables

| Variable             | Description                                    | Set By                     |
| -------------------- | ---------------------------------------------- | -------------------------- |
| NODE_ENV             | Environment mode (`development`, `production`) | docker-compose.yml         |
| PORT                 | Server port (default: 3000)                    | docker-compose.yml         |
| SERVER_URL           | Server URL                                     | docker-compose.yml         |
| DB_PATH              | SQLite database file path                      | docker-compose.yml         |
| FIXER_API_KEY        | API key for Fixer.io                           | docker-compose.yml or .env |
| OPEN_EXCHANGE_APP_ID | App ID for OpenExchangeRates                   | docker-compose.yml or .env |
| CURRENCY_API_KEY     | API key for CurrencyApi                        | docker-compose.yml or .env |
| ALLOWED_ORIGINS      | Comma-separated CORS origins                   | docker-compose.yml or .env |

### Docker Compose Files

| File                      | Purpose                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `docker-compose.yml`      | Development configuration with nodemon, volume mounts, and dev-stage build target             |
| `docker-compose.prod.yml` | Production overrides: production build target, removes source volume mounts, runs `npm start` |

## Docker Setup

### Dockerfile Stages

The Dockerfile uses a multi-stage build with three targets:

| Stage        | Base         | Purpose                                                   | Triggered By                                  |
| ------------ | ------------ | --------------------------------------------------------- | --------------------------------------------- |
| `dev`        | node:20-slim | Installs all dependencies, runs via `nodemon` + `ts-node` | `docker-compose.yml` default                  |
| `builder`    | dev          | Compiles TypeScript to JavaScript (`dist/`)               | `docker build --target builder` or production |
| `production` | node:20-slim | Installs prod dependencies only, copies compiled `dist/`  | `docker-compose.prod.yml`                     |

### Dev Stage Targets

The development stage is optimized for fast iteration:

- Full `npm ci` (dev + prod dependencies)
- Source mounted as a live volume (no rebuild needed on file changes)
- `nodemon` watches for file changes and restarts automatically
- `ts-node` handles TypeScript transpilation at runtime (no build step)

### Rebuilding After Dependency Changes

When `package.json` is modified, rebuild without cache to ensure dependencies are re-installed:

```bash
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

## Error Handling

The service uses a custom `AppError` class that extends `Error` with an HTTP status code. All controller methods delegate errors to the global error handler middleware, which:

1. Logs the request method, URL, status, message, and stack trace via Winston
2. Returns a JSON response with `{ success: false, error: "message" }`

Common status codes:

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 400  | Missing or invalid parameters      |
| 503  | All exchange rate providers failed |
| 500  | Unexpected server error            |

## Logging

Winston is configured with three transports:

| Transport | Level | Output              |
| --------- | ----- | ------------------- |
| Console   | All   | stdout              |
| File      | error | `logs/error.log`    |
| File      | All   | `logs/combined.log` |

Log format includes timestamp, level, message, and stack trace.

## Database

SQLite (`better-sqlite3`) stores exchange rates with the following schema:

```sql
CREATE TABLE IF NOT EXISTS exchange_rates (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  base      TEXT NOT NULL,
  target    TEXT NOT NULL,
  rate      REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  source    TEXT
);
```

The database file is stored at the path specified by `DB_PATH` (default: `data/currency.db` inside the container). A Docker named volume (`sqlite_data`) ensures data persists across container restarts.
