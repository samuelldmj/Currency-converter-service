# Multi-stage Dockerfile for Currency Converter Service
# Runtime deps: express, cors, better-sqlite3, dotenv
# Dev deps:     typescript, ts-node, nodemon, rimraf, @types/*
#
# Uses node:20-slim (Debian-based) — has python3/make/g++ pre-installed,
# avoiding the slow apk build-tools install required by better-sqlite3.

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY data ./data

EXPOSE 3000

CMD ["npm", "start"]
