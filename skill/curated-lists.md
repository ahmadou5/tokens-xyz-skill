# Curated Asset Lists

Canonical, maintained lists of Solana assets by category — majors, LSTs, RWAs, tokenized stocks, ETFs, metals, stablecoins, and more.

## Setup Check

```bash
echo $TOKENS_XYZ_API_KEY   # must not be empty
```

---

## Available Lists

| List key     | Contents                                    |
| ------------ | ------------------------------------------- |
| `all`        | Everything (includes dynamic LST set)       |
| `majors`     | High-cap, high-liquidity assets             |
| `lsts`       | Liquid staking tokens (dynamic, capped set) |
| `currencies` | Stablecoins and fiat-pegged assets          |
| `rwas`       | Real-world assets on Solana                 |
| `etfs`       | Tokenized ETFs                              |
| `metals`     | Tokenized precious metals                   |
| `stocks`     | Tokenized equities (xStocks, etc.)          |

---

## Basic Fetch

```bash
GET /v1/assets/curated?list={listKey}

# All liquid staking tokens
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=lsts" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# All RWAs
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=rwas" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Tokenized stocks
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=stocks" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

---

## Group Modes

**`groupBy=asset` (default):** returns one entry per canonical asset (e.g. one entry for "usd" grouping all USDC mints).

**`groupBy=mint`:** returns one row per individual Solana token address. Use for swap routing or displaying individual mints.

```bash
# Mint-level rows for execution routing
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=majors&groupBy=mint" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Include all LST mints (including low-liquidity ones)
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=lsts&groupBy=mint&variantsMode=all" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

> For `groupBy=mint` with LSTs, low-liquidity rows are filtered by default. Pass `variantsMode=all` to get every active LST mint.

---

## Pagination

Pagination is **opt-in**. Pass `limit` or `offset` to activate it, then follow `pagination.nextOffset`.

```bash
# Page 1
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=all&limit=50&offset=0" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Page 2
curl -sS "https://api.tokens.xyz/v1/assets/curated?list=all&limit=50&offset=50" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

Default (no pagination): returns up to 250 assets.

---

## TypeScript Patterns

### Fetch a full curated list

```typescript
async function getCuratedList(
  list:
    | "all"
    | "majors"
    | "lsts"
    | "currencies"
    | "rwas"
    | "etfs"
    | "metals"
    | "stocks",
  groupBy: "asset" | "mint" = "asset",
) {
  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/curated?list=${list}&groupBy=${groupBy}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  if (!res.ok) throw new Error(`Curated fetch failed: ${res.status}`);
  return res.json();
}
```

### Paginate through a large list

```typescript
async function getAllCurated(list: string) {
  const PAGE_SIZE = 250;
  const results: any[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `https://api.tokens.xyz/v1/assets/curated?list=${list}&limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
    );
    const data = await res.json();
    results.push(...(data.assets ?? data.mints ?? []));

    const nextOffset = data.pagination?.nextOffset;
    if (!nextOffset || nextOffset <= offset) break;
    offset = nextOffset;
  }

  return results;
}
```

---

## LST-Specific Notes

- `list=lsts` uses the **same dynamic, capped set** as the variants API — it's not a static mint list
- `list=all` includes the dynamic LST membership
- For yield/APY data on LSTs, pair with the asset detail endpoint: `/v1/assets/{assetId}?include=profile`

---

## xStock / Tokenized Equity Notes

When working with `list=stocks`:

- Each stock entry has a `stockVariantTier`: `share_redeemable`, `cash_redeemable`, or `not_redeemable`
- This is **informational metadata for routing/display** — not legal, tax, or investment advice
- Use `primaryVariantStrategy=stock_redeemability` to surface the most redeemable variant first
- For canonical price data (real stock market candles), fetch `/v1/assets/{assetId}/price-chart` — it prefers the canonical stock source automatically

```typescript
// Get stocks sorted by redeemability
const res = await fetch(
  "https://api.tokens.xyz/v1/assets/curated?list=stocks&primaryVariantStrategy=stock_redeemability",
  { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
);
```
