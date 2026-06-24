# Batch Operations

Efficiently fetch market snapshots and variant data for multiple mints in a single request — no N+1 calls.

## Setup Check

```bash
echo $TOKENS_XYZ_API_KEY   # must not be empty
```

---

## 1. Batch Market Snapshots (POST)

**Use for:** price, volume, and market data for up to 250 mints at once. The backbone of portfolio dashboards and wallet UIs.

```bash
POST /v1/assets/market-snapshots
Content-Type: application/json

curl -sS -X POST "https://api.tokens.xyz/v1/assets/market-snapshots" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mints": [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "So11111111111111111111111111111111111111112",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    ]
  }'
```

- Accepts `mints` or `addresses` (both work, deduped automatically)
- Max **250 mints** per request
- Returns current price, 24h volume, market cap, and liquidity tier per mint

**TypeScript pattern:**

```typescript
async function batchMarketSnapshots(mints: string[]) {
  if (mints.length > 250) throw new Error("Max 250 mints per batch");

  const res = await fetch("https://api.tokens.xyz/v1/assets/market-snapshots", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TOKENS_XYZ_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mints }),
  });
  if (!res.ok) throw new Error(`Batch snapshot failed: ${res.status}`);
  return res.json();
}
```

**Chunking for >250 mints:**

```typescript
async function batchSnapshotsLarge(mints: string[]) {
  const CHUNK_SIZE = 250;
  const chunks: string[][] = [];

  for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
    chunks.push(mints.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map(batchMarketSnapshots));
  // Flatten results — structure depends on API response shape
  return results.flatMap((r) => r.snapshots ?? r.data ?? []);
}
```

---

## 2. Batch Variant Market Snapshots (GET)

**Use for:** market data for up to 50 mints — lighter than the POST endpoint, good for focused component-level fetches.

```bash
GET /v1/assets/variant-markets?mints={comma,separated}

curl -sS "https://api.tokens.xyz/v1/assets/variant-markets?mints=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,So11111111111111111111111111111111111111112" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

- Accepts `mints` or `addresses`
- Max **50 mints** per request

```typescript
async function variantMarkets(mints: string[]) {
  if (mints.length > 50)
    throw new Error("Max 50 mints for variant-markets GET");

  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/variant-markets?mints=${mints.join(",")}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  return res.json();
}
```

---

## Choosing the Right Batch Endpoint

| Scenario                                 | Endpoint                            | Max mints    |
| ---------------------------------------- | ----------------------------------- | ------------ |
| Full wallet portfolio (prices + volumes) | `POST /market-snapshots`            | 250          |
| Token selector / quick component         | `GET /variant-markets`              | 50           |
| Per-asset detail with includes           | `GET /assets/{assetId}?include=...` | 1 (but rich) |

---

## Recommended Wallet UI Pattern

```typescript
// 1. Get wallet token accounts (e.g. via Helius or @solana/web3.js)
const walletMints: string[] = await getWalletTokenMints(walletAddress);

// 2. Batch snapshot for prices (one call for up to 250 mints)
const snapshots = await batchMarketSnapshots(walletMints);

// 3. Risk-check only the tokens with meaningful USD value
const valuableMints = snapshots
  .filter((s: any) => (s.priceUSD ?? 0) * (s.balance ?? 0) > 1)
  .map((s: any) => s.mint);

// 4. Batch risk check valuable tokens only
const { safe, caution, risky } = await batchRiskCheck(valuableMints);
// (see risk-scoring.md for batchRiskCheck implementation)

// 5. Surface risky tokens with warnings in UI
```

This pattern minimises API calls: one snapshot call covers the whole wallet, then risk checks only run on tokens worth checking.

---

## Health Check (No Auth)

Use this to confirm the API is reachable before your first real call:

```bash
curl -sS "https://api.tokens.xyz/v1/health"
# Expected: { "status": "ok" }
```
