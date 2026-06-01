import db from "../Database/db.js";
import ExchangeRate from "../Models/ExchangeRate.js";

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