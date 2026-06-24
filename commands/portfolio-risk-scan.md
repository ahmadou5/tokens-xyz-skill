# /portfolio-risk-scan

Scan all tokens in a wallet for risk flags, honeypots, and low-trust mints.

## Usage

```
/portfolio-risk-scan <walletAddress>
```

## Example

```
/portfolio-risk-scan 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

## What it does

1. Accepts a Solana wallet address
2. Instructs the developer to fetch token accounts (via Helius or `@solana/web3.js` — not in scope for this skill)
3. Takes the list of mints and batch-snapshots them via `POST /v1/assets/market-snapshots`
4. Runs risk checks on tokens with meaningful USD value
5. Returns a risk-tiered summary: safe / caution / risky

## Steps for Claude to execute

```typescript
// Prerequisite: mints[] must be provided by the calling code
// (fetch from Helius getAssetsByOwner or @solana/web3.js getParsedTokenAccountsByOwner)

// Step 1 — batch snapshot for prices
const snapshotRes = await fetch(
  "https://api.tokens.xyz/v1/assets/market-snapshots",
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.TOKENS_XYZ_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mints }),
  },
);
const snapshots = await snapshotRes.json();

// Step 2 — filter to tokens worth checking (>$1 estimated value)
const valuableMints = snapshots
  .filter((s: any) => (s.priceUSD ?? 0) > 0.0001)
  .map((s: any) => s.mint);

// Step 3 — risk check valuable tokens
const riskResults = await Promise.allSettled(
  valuableMints.map((mint: string) =>
    fetch(`https://api.tokens.xyz/v1/assets/risk-summary?mint=${mint}`, {
      headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! },
    }).then((r) => r.json()),
  ),
);
```

## Output Format

```
🔐 Portfolio Risk Scan: {walletAddress}
Scanned {n} tokens

✅ Safe ({count}):
  - {name} ({mint}) — score {n}/100

⚠️  Caution ({count}):
  - {name} — score {n}/100, flags: {flags}

🚨 Risky ({count}):
  - {name} — score {n}/100, flags: {flags}
  ACTION: Consider removing from portfolio

Skipped {n} tokens with no price data.
```

## Error handling

- If `TOKENS_XYZ_API_KEY` is missing: stop immediately and direct user to `skill/SKILL.md`
- If wallet has >250 mints: chunk into batches of 250 (see `batch-ops.md`)
- If rate limited on risk checks: back off with exponential retry (see `error-handling.md`)
