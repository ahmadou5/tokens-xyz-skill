# Token Research

Search, resolve, and pull complete asset profiles using the Tokens API.

## Setup Check

```bash
# Confirm key is loaded before any call
echo $TOKENS_XYZ_API_KEY   # should print your key (not empty)
```

If empty → see `SKILL.md` for how to get and load your key.

---

## 1. Search Assets

**Use for:** autocomplete, broad discovery, finding a token by name or ticker.

```bash
GET /v1/assets/search?q={query}&limit={n}

# Examples
curl -sS "https://api.tokens.xyz/v1/assets/search?q=bitcoin&limit=5" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

curl -sS "https://api.tokens.xyz/v1/assets/search?q=usdc&category=crypto&limit=10" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Key query params:**
| Param | Default | Notes |
|-------|---------|-------|
| `q` | required | search text |
| `limit` | 20 | max 50 |
| `category` | — | `crypto`, `equity`, `etf`, `rwa`, `metal` |
| `variants=all` | — | include every known variant mint per asset |
| `primaryVariantStrategy` | `liquidity` | `liquidity` \| `execution_quality` \| `stock_redeemability` |

**TypeScript pattern:**

```typescript
async function searchAssets(query: string, category?: string) {
  const params = new URLSearchParams({ q: query, limit: "10" });
  if (category) params.set("category", category);

  const res = await fetch(`https://api.tokens.xyz/v1/assets/search?${params}`, {
    headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}
```

---

## 2. Resolve a Mint or Identifier

**Use for:** turning a raw Solana mint address or ticker alias into a canonical `assetId`.

```bash
GET /v1/assets/resolve?mint={solanaMint}
GET /v1/assets/resolve?ref={alias}

# Resolve USDC mint → canonical assetId "usd"
curl -sS "https://api.tokens.xyz/v1/assets/resolve?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Resolve ticker alias
curl -sS "https://api.tokens.xyz/v1/assets/resolve?ref=btc" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Important:** If a mint doesn't map to a known canonical asset, the API returns a **singleton** `assetId` in the format `solana-<mint>`. This is safe to use as a stable identifier — never use the raw mint as your grouping key.

```typescript
async function resolveMint(mint: string): Promise<string> {
  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/resolve?mint=${mint}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  const data = await res.json();
  // Use data.assetId as your stable grouping key
  return data.assetId; // e.g. "usd", "btc", or "solana-<mint>"
}
```

---

## 3. Asset Detail (Full Profile)

**Use for:** everything about an asset — identity, variants, price, risk, candles, markets.

```bash
GET /v1/assets/{assetId}?include={blocks}

# Full detail on SOL
curl -sS "https://api.tokens.xyz/v1/assets/solana?include=profile,risk,ohlcv,markets" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Detail on a singleton (unknown mint)
MINT="So11111111111111111111111111111111111111112"
curl -sS "https://api.tokens.xyz/v1/assets/solana-${MINT}?include=profile,risk" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**`include` blocks:**
| Block | What you get |
|-------|-------------|
| `profile` | Description, links, social, category |
| `risk` | Risk score, flags, trust tier |
| `ohlcv` | Recent candles (default 7d, 1H interval) |
| `markets` | Top venues/pools with liquidity |

**Each include block returns:**

```json
{
  "asset": { "assetId": "solana", "name": "Solana", "variants": [...] },
  "includes": {
    "profile": { "ok": true, "data": { ... } },
    "risk":    { "ok": true, "data": { ... } },
    "ohlcv":   { "ok": false, "reason": "no_data", "message": "..." }
  }
}
```

Always check `ok` before accessing `data` — includes are best-effort.

```typescript
async function getAssetDetail(
  assetId: string,
  includes: string[] = ["profile", "risk"],
) {
  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/${assetId}?include=${includes.join(",")}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  const data = await res.json();

  // Safe include access
  const risk = data.includes?.risk?.ok ? data.includes.risk.data : null;
  const profile = data.includes?.profile?.ok
    ? data.includes.profile.data
    : null;

  return { asset: data.asset, risk, profile };
}
```

---

## 4. Asset Variants

**Use for:** listing all Solana token variants of a canonical asset (e.g. all USDC mints, all SOL wrappers).

```bash
GET /v1/assets/{assetId}/variants

# All USDC variants sorted by liquidity
curl -sS "https://api.tokens.xyz/v1/assets/usd/variants" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Only tier1 native variants
curl -sS "https://api.tokens.xyz/v1/assets/solana/variants?kind=native&liquidityTier=tier1" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**Filter params:**
| Param | Values |
|-------|--------|
| `kind` | `native`, `wrapped`, `bridged`, `etf`, `yield`, `leveraged`, `basket`, `lst`, `stablecoin`, `tokenized_equity` |
| `liquidityTier` | `tier1`, `tier2`, `tier3` |
| `stockVariantTier` | `share_redeemable`, `cash_redeemable`, `not_redeemable` |
| `sortBy` | `liquidity` (default), `execution_quality`, `stock_redeemability` |

---

## Common Workflow: Wallet Balance Resolution

When resolving a wallet's token holdings to canonical assets:

```typescript
async function resolveWalletHoldings(mints: string[]) {
  // Resolve each mint to its canonical assetId
  const resolved = await Promise.all(
    mints.map(async (mint) => {
      const res = await fetch(
        `https://api.tokens.xyz/v1/assets/resolve?mint=${mint}`,
        { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
      );
      const data = await res.json();
      return { mint, assetId: data.assetId }; // group key
    }),
  );

  // Group by assetId (e.g. multiple USDC mints → one "usd" group)
  return resolved.reduce(
    (acc, { mint, assetId }) => {
      if (!acc[assetId]) acc[assetId] = [];
      acc[assetId].push(mint);
      return acc;
    },
    {} as Record<string, string[]>,
  );
}
```
