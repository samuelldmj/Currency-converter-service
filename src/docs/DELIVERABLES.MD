```markdown
# Currency Converter Service

## Project Overview

A currency conversion service that fetches real-time exchange rates from multiple external APIs. Users can convert between currencies and get current exchange rates.
The system demonstrates how to handle multiple data sources and provide reliable service even when some APIs are down.

**Learning objectives:** Multiple API integration, data aggregation, basic caching, error handling

## System Design

Clients → Currency Service → External APIs
↓
Rate Aggregator
↓
Memory Cache
↓
Database

Inside the **Currency Service**:

- Rate Aggregator
- Memory Cache
- Database (for storing recent rates)

**External APIs:**

- Fixer.io
- Open Exchange
- CurrencyAPI

### How Conversions Work

1. **Client Request**
2. **Check Cache** (5 minute TTL)
   - **HIT**: Return cached rate
   - **MISS**: Continue to fetch
3. **Fetch from External APIs**
   - Try **Primary API** (Fixer.io)
   - If fails, try **Secondary API**
   - Calculate **average** if multiple succeed
   - Update Cache
   - Return Rate

### Multi-Provider Strategy

- **Primary API**
- **Secondary API**
- **Backup API**

**Logic:**

- Take Average → Return Rate (if both work)
- **Simple Fallback:**
  - If primary fails, use secondary
  - If all fail, return cached data with warning
  - Log failures for monitoring

## Core Requirements

**Currency Operations:**

- Convert amount between any two currencies
- Get current exchange rate for currency pair
- List all supported currencies
- Simple rate history (last 24 hours)

### Data Handling:

- Fetch rates from 2-3 external APIs
- Use average when multiple APIs return data
- Cache rates for 5 minutes to reduce API calls
- Store recent rates in database
```
