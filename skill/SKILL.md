# Tokens.xyz Asset Intelligence Skill

> Canonical token data, risk scoring, OHLCV charts, market discovery, and curated asset lists for Solana builders — powered by the [Tokens API v1](https://docs.tokens.xyz/v1/quickstart).

---

## ⚠️ API Key Required

This skill requires a **Tokens.xyz API key** loaded from your environment.

```bash
# In your .env file (never commit this):
TOKENS_XYZ_API_KEY=your_key_here
```

**How to get your key:**

1. Go to [tokens.xyz](https://tokens.xyz) and request API access
2. Once approved, find your key in the **API Manager** dashboard
3. Add it to your project's `.env` file (see `install.sh` for setup help)
4. Load it in your app: `process.env.TOKENS_XYZ_API_KEY` (Node) or `os.environ["TOKENS_XYZ_API_KEY"]` (Python)

> **Never** hardcode the key, ship it in frontend code, or commit it to a public repo. Always proxy through your server or an edge function.

---

## Routing Guide

Load only the sub-skill you need. Each file is self-contained and token-efficient.

| Task                                            | Load this file                             |
| ----------------------------------------------- | ------------------------------------------ |
| Search, resolve, or get full asset detail       | [`token-research.md`](./token-research.md) |
| Risk scores, honeypot checks, security flags    | [`risk-scoring.md`](./risk-scoring.md)     |
| Price charts, OHLCV candles, trending mints     | [`market-data.md`](./market-data.md)       |
| Curated lists: majors, LSTs, RWAs, stocks, ETFs | [`curated-lists.md`](./curated-lists.md)   |
| Batch snapshots, multi-mint market data         | [`batch-ops.md`](./batch-ops.md)           |
| Error handling, rate limits, debugging          | [`error-handling.md`](./error-handling.md) |

---

## Quick Decision Tree

```
User wants token info?
├── "What is this token / mint?"         → token-research.md  (resolve + detail)
├── "Is this token safe / a honeypot?"   → risk-scoring.md
├── "Show me price / chart / trending"   → market-data.md
├── "Give me all LSTs / RWAs / stocks"   → curated-lists.md
└── "Batch-check a list of mints"        → batch-ops.md
```

---

## Base Config (always set these)

```bash
TOKENS_API_BASE="https://api.tokens.xyz/v1"
TOKENS_XYZ_API_KEY="${TOKENS_XYZ_API_KEY}"   # from .env — never hardcode
```

Every request needs:

```
x-api-key: ${TOKENS_XYZ_API_KEY}
Content-Type: application/json   # POST requests only
```

---

## Scope Coverage

| Scope                 | What it unlocks             |
| --------------------- | --------------------------- |
| `assets:read`         | Everything — umbrella scope |
| `assets:profile:read` | Asset profiles only         |
| `assets:risk:read`    | Risk summaries and details  |
| `assets:ohlcv:read`   | Price candles               |
| `assets:markets:read` | Order book venues and pools |

Most keys come with `assets:read`. Load [`error-handling.md`](./error-handling.md) if you hit 403s.
