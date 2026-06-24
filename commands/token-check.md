# /token-check

Deep-dive any Solana token by mint address, ticker, or name.

## Usage

```
/token-check <mint-or-ticker>
```

## Examples

```
/token-check EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
/token-check solana
/token-check btc
/token-check tesla
```

## What it does

1. **Resolves** the input to a canonical `assetId` (or singleton `solana-<mint>`)
2. **Fetches** full asset detail with `profile`, `risk`, `ohlcv`, and `markets` includes
3. **Displays** a summary covering:
   - Asset name, category, canonical ID
   - Current price and 30-day volume
   - Risk score, trust tier, and any active flags
   - Top 3 markets by liquidity
   - 7-day price trend (from candles)

## Steps for Claude to execute

```typescript
// Step 1 — resolve input
const resolveRes = await fetch(
  `https://api.tokens.xyz/v1/assets/resolve?ref=${encodeURIComponent(input)}`,
  { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
);
// If ref fails, try mint= instead
const { assetId } = await resolveRes.json();

// Step 2 — full detail
const detailRes = await fetch(
  `https://api.tokens.xyz/v1/assets/${assetId}?include=profile,risk,ohlcv,markets`,
  { headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! } },
);
const data = await detailRes.json();

// Step 3 — surface to user
// Always check include .ok before reading .data
// Flag risk score >= 50 with a warning
// Show top 3 markets from includes.markets.data
```

## Output Format

Present results as:

```
🔍 Token Check: {name} ({assetId})
Category: {category}

💰 Price: ${price} | 30d Volume: ${volume30dUSD}

🛡️ Risk: {score}/100 ({tier})
Flags: {flags or "none"}

📊 Top Markets:
  1. {venue} — ${liquidity} liquidity
  2. ...

📈 7d Trend: {high} high / {low} low (from OHLCV candles)
```

## Error handling

- If `TOKENS_XYZ_API_KEY` is not set: stop and tell the user to add it to their `.env` file — see `skill/SKILL.md` for setup steps
- If resolve returns 404: tell the user the token wasn't found and suggest trying the full mint address
- If an include block has `ok: false`: skip that section gracefully, don't error
