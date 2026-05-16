
import db from "../Database/db.js";
import { ExchangeRate } from "../Models/ExchangeRate.js";


class RateRepository {
    insert(rate: ExchangeRate): void {
        const stmt = db.prepare(`INSERT INTO exchange_rates (base, target, rate, source) VALUES (?, ?, ?, ?)`);
        stmt.run(rate.base, rate.target, rate.rate, rate.source);
    }

    getLatest(base: string, target: string): ExchangeRate|undefined {
        const stmt = db.prepare(`
            SELECT * FROM exchange_rates 
            WHERE base = ? AND target = ? 
            ORDER BY timestamp DESC 
            LIMIT 1`);
        return stmt.get(base, target) as ExchangeRate | undefined;
    }

    getLast24Hours(base: string, target: string): ExchangeRate[] {
        const stmt = db.prepare(`
            SELECT * FROM exchange_rates
            WHERE base = ? AND target = ?
            AND timestamp >= datetime('now', '-24 hours')
            ORDER BY timestamp DESC`);
        return stmt.all(base, target) as ExchangeRate[];
    }
}


export default RateRepository;






















//PSUEDOCODE:
// IMPORT db from Database/db.ts
// IMPORT ExchangeRate from Models/ExchangeRate.ts

// DEFINE class RateRepository:

//   METHOD insert(rate: ExchangeRate): void
//     PREPARE insert statement:
//       INSERT INTO exchange_rates (base, target, rate, source) VALUES (?, ?, ?, ?)
//     RUN with rate.base, rate.target, rate.rate, rate.source

//   METHOD getLatest(base: string, target: string): ExchangeRate | undefined
//     PREPARE select statement:
//       SELECT * FROM exchange_rates
//       WHERE base = ? AND target = ?
//       ORDER BY timestamp DESC
//       LIMIT 1
//     RETURN first result or undefined

//   METHOD getLast24Hours(base: string, target: string): ExchangeRate[]
//     PREPARE select statement:
//       SELECT * FROM exchange_rates
//       WHERE base = ? AND target = ?
//       AND timestamp >= datetime('now', '-24 hours')
//       ORDER BY timestamp DESC
//     RETURN all results

// EXPORT RateRepository
