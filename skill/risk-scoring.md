# Risk Scoring

Token risk assessment, honeypot detection, trust tiers, and security flags — mint-scoped or asset-scoped.

## Setup Check

```bash
echo $TOKENS_XYZ_API_KEY   # must not be empty
```

Requires `assets:read` or `assets:risk:read` scope.

---

## 1. Quick Risk Score (Mint-Scoped)

**Use for:** fast safety check on any Solana mint — ideal for wallet UIs, swap confirmations, or pre-trade checks.

```bash
GET /v1/assets/risk-summary?mint={solanaMint}

# Check if a token is safe before swapping
curl -sS "https://api.tokens.xyz/v1/assets/risk-summary?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

**TypeScript pattern:**

```typescript
async function quickRiskCheck(mint: string) {
  const res = await fetch(
    `https://api.tokens.xyz/v1/assets/risk-summary?mint=${mint}`,
    { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
  );
  if (!res.ok) throw new Error(`Risk check failed: ${res.status}`);
  const data = await res.json();

  return {
    score: data.score, // 0–100, higher = riskier
    tier: data.trustTier, // "tier1" | "tier2" | "tier3"
    flags: data.flags ?? [], // array of risk flag strings
    isSafe: data.score < 30 && data.trustTier === "tier1",
  };
}
```

---

## 2. Asset-Scoped Risk Summary

**Use for:** risk overview for a canonical asset (e.g. "solana", "usd", or a singleton).

```bash
GET /v1/assets/{assetId}/risk-summary

# Risk summary for SOL
curl -sS "https://api.tokens.xyz/v1/assets/solana/risk-summary" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# Risk summary for a specific variant mint of that asset
curl -sS "https://api.tokens.xyz/v1/assets/usd/risk-summary?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

---

## 3. Full Risk Details

**Use for:** deep-dive security audit, formal analysis, or surfacing all individual risk signals.

```bash
GET /v1/assets/{assetId}/risk-details

curl -sS "https://api.tokens.xyz/v1/assets/solana/risk-details" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

Returns granular breakdown of every risk factor contributing to the score.

---

## 4. Risk as Part of Asset Detail

**Use for:** fetching risk alongside profile and price in one call (fewer round-trips).

```bash
curl -sS "https://api.tokens.xyz/v1/assets/solana?include=risk" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"
```

Always guard the include:

```typescript
const riskData = response.includes?.risk?.ok
  ? response.includes.risk.data
  : null; // risk not available for this asset
```

---

## Trust Tier Reference

| Tier    | Meaning                  | Typical action                  |
| ------- | ------------------------ | ------------------------------- |
| `tier1` | High trust, major asset  | Safe to display/trade           |
| `tier2` | Moderate trust           | Show with caution banner        |
| `tier3` | Low trust / experimental | Warn user, require confirmation |

---

## Batch Portfolio Risk Check

**Use for:** scanning all tokens in a wallet for risky mints before displaying or swapping.

```typescript
async function batchRiskCheck(mints: string[]) {
  const results = await Promise.allSettled(
    mints.map(async (mint) => {
      const res = await fetch(
        `https://api.tokens.xyz/v1/assets/risk-summary?mint=${mint}`,
        { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
      );
      const data = await res.json();
      return {
        mint,
        score: data.score,
        tier: data.trustTier,
        flags: data.flags ?? [],
      };
    }),
  );

  const checked = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  return {
    safe: checked.filter((t) => t.score < 30 && t.tier === "tier1"),
    caution: checked.filter((t) => t.score >= 30 && t.score < 70),
    risky: checked.filter((t) => t.score >= 70 || t.tier === "tier3"),
  };
}
```

> **Note:** For large wallets, use `batch-ops.md` market snapshots first to filter by liquidity, then run risk checks only on tokens with meaningful balances. Rate limits apply — see `error-handling.md`.

---

## Common Risk Flags

| Flag                      | What it means                                     |
| ------------------------- | ------------------------------------------------- |
| `mint_authority_active`   | Token supply can still be minted — inflation risk |
| `freeze_authority_active` | Issuer can freeze your tokens                     |
| `no_liquidity`            | No meaningful market depth                        |
| `low_holder_count`        | Very few wallets hold this token                  |
| `recent_creation`         | Token created very recently                       |
| `rugpull_pattern`         | On-chain behavior matches known rug patterns      |

Always display flags to users in any wallet or trading UI.
