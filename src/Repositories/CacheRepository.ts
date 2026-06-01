import ExchangeRate from "../Models/ExchangeRate.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  rate: ExchangeRate;
  expiresAt: number;
}

class CacheRepository {
    private store: Map<string, CacheEntry> = new Map();
    private currenciesList: string[] | undefined;

    private buildKey(base: string, target: string): string {
      return `${base}_${target}`;
    }

    get(base: string, target: string): ExchangeRate|undefined{
        const key = this.buildKey(base, target);
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return entry.rate;
    }


set(rate: ExchangeRate): void{
        const key = this.buildKey(rate.base, rate.target);
        this.store.set(key, { rate, expiresAt: Date.now() + CACHE_TTL_MS })
    }

    invalidate(base: string, target: string): void{
        let key = this.buildKey(base, target);
        this.store.delete(key);
    }

    setCurrencies(currencies: string[]): void {
        this.store.set('currencies', { 
            rate: { base: '', target: '', rate: 0 }, 
            expiresAt: Date.now() + CACHE_TTL_MS 
        });
        this.currenciesList = currencies;
    }

    getCurrencies(): string[] | undefined {
        const entry = this.store.get('currencies');
        if (!entry || Date.now() > entry.expiresAt) {
            this.store.delete('currencies');
            this.currenciesList = undefined;
            return undefined;
        }
        return this.currenciesList;
    }

}

export default CacheRepository;