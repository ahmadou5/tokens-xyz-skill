# tokens-xyz-skill

Token intelligence skill for the Solana AI Kit, powered by the [Tokens.xyz API v1](https://docs.tokens.xyz/v1/quickstart).

## Skill Entry Point

When asked about Solana tokens, asset data, risk, market charts, curated lists, or token discovery:

→ Read `skill/SKILL.md` first to route to the right sub-skill.

## Quick Route

| Task                               | Sub-skill                 |
| ---------------------------------- | ------------------------- |
| Search / resolve / asset detail    | `skill/token-research.md` |
| Risk scores / honeypot detection   | `skill/risk-scoring.md`   |
| Price charts / OHLCV / trending    | `skill/market-data.md`    |
| Curated lists (LSTs, RWAs, stocks) | `skill/curated-lists.md`  |
| Batch mint operations              | `skill/batch-ops.md`      |
| Errors / rate limits               | `skill/error-handling.md` |

## API Key Requirement

This skill **requires** `TOKENS_XYZ_API_KEY` from the environment. If it's not set, always stop and guide the user to get one before proceeding. See `skill/SKILL.md` → Setup section.

## Rules

- Always read `rules/api-key-safety.md` before writing any code that touches the Tokens API
- Never hardcode, log, or expose the API key
- Always call the API server-side — never from frontend/browser code
