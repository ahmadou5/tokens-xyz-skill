# Market Data

Price charts, OHLCV candles, order book venues, trending mints, and 30-day volume — all from the Tokens API.

## Setup Check

```bash
echo $TOKENS_XYZ_API_KEY   # must not be empty
```

Requires `assets:read` or `assets:ohlcv:read` / `assets:markets:read`.

---

## 1. Trending Mints

**Use for:** surfacing what's gaining volume and momentum on Solana right now. Great for discovery feeds, dashboards, and "hot tokens" widgets.

```bash
GET /v1/assets/trending

# Top 10 trending (excludes SOL and stablecoins automatically)
curl -sS "https://api.tokens.xyz/v1/assets/trending?limit=10" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Filter to a category
curl -sS "https://api.tokens.xyz/v1/assets/trending?limit=10&category=rwa" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Params:**
| Param | Default | Notes |
|-------|---------|-------|
| `limit` | 50 | max 50 |
| `offset` | 0 | pagination |
| `category` | — | `crypto`, `equity`, `etf`, `rwa` |

**Ranking:** uses direct USD-stable Solana trades and short-window momentum (`5m`, `15m`, `1h`) plus trade/wallet activity. Results are cached — ideal for polling every 60s.

```typescript
async function getTrending(limit = 20, category?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.set("category", category);

  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/trending?${params}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  return res.json();
}
```

---

## 2. Price Chart (Canonical-First)

**Use for:** charting an asset's price over time. Prefers canonical source (e.g. stock market data for RWAs/equities); falls back to on-chain candles.

```bash
GET /v1/assets/{assetId}/price-chart?interval={interval}&from={unix}&to={unix}

# SOL price chart — last 7 days, 1H candles (default)
curl -sS "https://api.tokens.xyz/v1/assets/solana/price-chart" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# 30-day daily candles
FROM=$(date -d "30 days ago" +%s)
curl -sS "https://api.tokens.xyz/v1/assets/solana/price-chart?interval=1D&from=${FROM}" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

---

## 3. OHLCV Candles (Mint-Scoped)

**Use for:** raw open/high/low/close/volume candles tied to a specific Solana mint variant.

```bash
GET /v1/assets/{assetId}/ohlcv?mint={solanaMint}&interval={interval}&from={unix}&to={unix}

# USDC OHLCV on its primary mint, 15-min candles
curl -sS "https://api.tokens.xyz/v1/assets/usd/ohlcv?interval=15m" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Interval options:**
| Interval | Value |
|----------|-------|
| 1 minute | `1m` |
| 5 minutes | `5m` |
| 15 minutes | `15m` |
| 1 hour | `1H` (default) |
| 4 hours | `4H` |
| 1 day | `1D` |
| 1 week | `1W` |

**TypeScript charting pattern:**

```typescript
interface Candle {
  t: number; // unix timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

async function getCandles(
  assetId: string,
  interval: string = "1H",
  daysBack: number = 7,
  mint?: string,
): Promise<Candle[]> {
  const from = Math.floor(Date.now() / 1000) - daysBack * 86400;
  const params = new URLSearchParams({ interval, from: String(from) });
  if (mint) params.set("mint", mint);

  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/${assetId}/ohlcv?${params}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  const data = await res.json();
  return data.candles ?? [];
}
```

---

## 4. Markets (Order Book Venues / Pools)

**Use for:** finding where an asset trades — DEX pools, order books, and their liquidity depths.

```bash
GET /v1/assets/{assetId}/markets?limit={n}&offset={n}

# Top markets for SOL
curl -sS "https://api.tokens.xyz/v1/assets/solana/markets?limit=10" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Markets for a specific mint variant
curl -sS "https://api.tokens.xyz/v1/assets/usd/markets?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&limit=5" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Params:**
| Param | Default | Max |
|-------|---------|-----|
| `limit` | 10 | 50 |
| `offset` | 0 | — |
| `mint` | — | optional variant filter |

Returns venues sorted by liquidity. Use this to route swaps to the deepest pool.

---

## 5. 30-Day Volume (No Extra Call Needed)

When you fetch asset detail (`/v1/assets/{assetId}`), the response includes:

```json
{
  "asset": {
    "stats": {
      "volume30dUSD": 1234567890.12
    }
  }
}
```

`volume30dUSD` is the rolling 30-day USD volume for the **canonical group** (all variants summed). You don't need to sum daily candles yourself.

---

## Complete Dashboard Pattern

Fetch everything needed for a token page in 2 calls:

```typescript
async function getTokenDashboard(mint: string) {
  // 1. Resolve mint → canonical assetId
  const resolveRes = await fetch(
    `https://api.tokens.xyz/v1/assets/resolve?mint=${mint}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  const { assetId } = await resolveRes.json();

  // 2. Get everything in one detail call
  const detailRes = await fetch(
    `https://api.tokens.xyz/v1/assets/${assetId}?include=profile,risk,ohlcv,markets`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  const data = await detailRes.json();

  return {
    asset: data.asset,
    volume30d: data.asset?.stats?.volume30dUSD,
    profile: data.includes?.profile?.ok ? data.includes.profile.data : null,
    risk: data.includes?.risk?.ok ? data.includes.risk.data : null,
    candles: data.includes?.ohlcv?.ok ? data.includes.ohlcv.data?.candles : [],
    markets: data.includes?.markets?.ok ? data.includes.markets.data : [],
  };
}
```
