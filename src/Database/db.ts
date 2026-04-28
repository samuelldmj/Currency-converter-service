// IMPORT Database from "better-sqlite3"
import Database from "better-sqlite3";

// IMPORT DB_PATH from Config/env.ts
import { DB_PATH } from "../Config/env.js";
// CREATE db instance using DB_PATH
const db = new Database(DB_PATH);
//   IF DB_PATH is undefined, throw error "DB_PATH is not set"
if (!DB_PATH) {
    throw new Error("DB_PATH is not set");
}
db.pragma("foreign_keys = ON");
export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      base      TEXT NOT NULL,
      target    TEXT NOT NULL,
      rate      REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      source    TEXT
    );
  `);
}

export default db;
