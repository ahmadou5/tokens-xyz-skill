# tokens-xyz-skill

> Token intelligence for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit) — powered by the [Tokens.xyz API v1](https://docs.tokens.xyz/v1/quickstart).

Gives any Claude Code agent canonical token data, risk scores, OHLCV charts, trending mints, and curated asset lists (LSTs, RWAs, tokenized stocks, ETFs) — all resolved through a single, well-maintained API.

---

## The Problem This Solves

Every Solana app needs to answer the same questions:

- **What is this mint?** → resolve to a canonical identity, not just a raw address
- **Is this token safe?** → risk score, honeypot flags, trust tier, mint/freeze authority checks
- **What's it worth?** → price, 24h volume, 30d volume, order book depth
- **What's trending?** → real momentum signals, not just volume rank
- **Give me all the LSTs / RWAs / tokenized stocks** → curated, maintained lists with liquidity tiers

No existing skill in the Solana AI Kit solves this. Helius covers infrastructure. Jupiter covers routing. Neither gives you canonical asset intelligence with risk scoring, curated categories, and canonical price data for real-world assets.

---

## What's Included

```
tokens-xyz-skill/
├── CLAUDE.md                         # Root config — tells Claude to load skill/SKILL.md
├── README.md                         # This file
├── LICENSE                           # MIT
├── package.json
│
├── skill/
│   ├── SKILL.md                     # Entry point — routing table + setup guide
│   ├── token-research.md            # Search, resolve, asset detail, variants
│   ├── risk-scoring.md              # Risk summary, risk details, batch risk check
│   ├── market-data.md               # OHLCV, price chart, trending, markets
│   ├── curated-lists.md             # Majors, LSTs, RWAs, stocks, ETFs, metals
│   ├── batch-ops.md                 # Batch market snapshots, variant markets
│   └── error-handling.md            # Status codes, retry patterns, request IDs
│
├── commands/
│   ├── token-check.md               # /token-check <mint-or-ticker>
│   └── portfolio-risk-scan.md       # /portfolio-risk-scan <walletAddress>
│
├── agents/
│   └── token-intelligence.md        # Specialized agent for token Q&A
│
└── rules/
    └── api-key-safety.md            # Never hardcode, always env, gitignore rules
```

---

## Prerequisite: Tokens.xyz API Key

**You need an API key before anything works.**

1. Go to [tokens.xyz](https://tokens.xyz) and request API access
2. Once approved, copy your key from the **API Manager** dashboard
3. Add it to your project's `.env` file:

```bash
# .env  ← never commit this file
TOKENS_XYZ_API_KEY=your_key_here
```

4. Load it in your app:

```typescript
// Node.js (with dotenv)
import "dotenv/config";
const key = process.env.TOKENS_XYZ_API_KEY;
```

```python
# Python (with python-dotenv)
from dotenv import load_dotenv
import os
load_dotenv()
key = os.environ["TOKENS_XYZ_API_KEY"]
```

> **Never** hardcode the key, include it in frontend bundles, or commit it to git. Always call the Tokens API from the server and proxy responses to the browser.

---

## Installation

### Option 1 — npx (recommended)

Run the interactive installer without adding a dependency to your project:

```bash
npx tokens-xyz-skill
```

The installer will:

- Ask whether to install globally (`~/.claude/skills/`) or into the current project (`./.claude/skills/`)
- Register the skill in your `CLAUDE.md` automatically
- Create a `.env` stub with `TOKENS_XYZ_API_KEY=your_key_here`
- Add `.env` entries to `.gitignore` to protect your key

### Option 2 — Install globally via npm

```bash
npm install -g tokens-xyz-skill
tokens-xyz-skill
```

Run `tokens-xyz-skill` once after installing to trigger the setup wizard.

### Option 3 — Into the Solana AI Kit (git submodule)

```bash
cd your-solana-ai-kit
git submodule add https://github.com/YOUR_GITHUB/tokens-xyz-skill .claude/skills/tokens-xyz
```

Then reference it in your root `CLAUDE.md`:

```markdown
## Skills

- `.claude/skills/tokens-xyz/skill/SKILL.md` — Tokens.xyz asset intelligence
```

### Non-interactive (CI/scripts)

```bash
npx tokens-xyz-skill --yes
```

---

## Manual CLAUDE.md registration

If you skipped the installer or are managing `CLAUDE.md` yourself, add this entry:

```markdown
## Skills

- `~/.claude/skills/tokens-xyz-skill/skill/SKILL.md` — Tokens.xyz asset intelligence
```

Adjust the path to match where the skill was installed.

---

## Usage Examples

Once installed, Claude Code understands these requests:

```
"What is this mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?"
→ Resolves → USDC → canonical assetId "usd" → full profile + risk

"Is this token safe to list in our DEX UI?"
→ Risk score, trust tier, freeze/mint authority flags

"Show me all tokenized stocks on Solana"
→ Curated list=stocks, sorted by redeemability

"What's trending right now?"
→ Top 20 trending mints by momentum

"Scan this wallet for risky tokens"
→ Batch snapshot → risk-tier all tokens → flag honeypots
```

**Slash commands:**

```
/token-check solana
/token-check EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
/portfolio-risk-scan 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

## Skill Design: Progressive Loading

The skill is structured so Claude **only loads what it needs**. The entry point (`skill/SKILL.md`) contains a routing table — Claude reads one sub-skill file per task, not all of them. This keeps token usage low and context focused.

---

## Cross-Skill Integrations

| Pair with                | Why                                                        |
| ------------------------ | ---------------------------------------------------------- |
| `position-manager-skill` | Canonical price-chart data for CLMM position tracking      |
| `solana-auditor-skill`   | Risk flags to feed into security reports                   |
| `helius-labs/core-ai`    | Token account fetching + Tokens.xyz for asset intelligence |
| `jup-ag/agent-skills`    | Route swaps to the deepest market from Tokens.xyz          |

---

## API Reference

Full docs: [docs.tokens.xyz/v1/quickstart](https://docs.tokens.xyz/v1/quickstart)

Base URL: `https://api.tokens.xyz/v1`  
Auth: `x-api-key: ${TOKENS_XYZ_API_KEY}`

Core endpoints used by this skill:

| Endpoint                         | Purpose                           |
| -------------------------------- | --------------------------------- |
| `GET /assets/search`             | Token search / autocomplete       |
| `GET /assets/resolve`            | Mint or alias → canonical assetId |
| `GET /assets/{id}`               | Full asset detail with includes   |
| `GET /assets/{id}/variants`      | All token variants                |
| `GET /assets/{id}/risk-summary`  | Risk score + flags                |
| `GET /assets/{id}/risk-details`  | Full risk breakdown               |
| `GET /assets/{id}/ohlcv`         | Price candles                     |
| `GET /assets/{id}/price-chart`   | Canonical price chart             |
| `GET /assets/{id}/markets`       | Order book venues / pools         |
| `GET /assets/trending`           | Trending mints by momentum        |
| `GET /assets/curated`            | Curated lists by category         |
| `POST /assets/market-snapshots`  | Batch prices for up to 250 mints  |
| `GET /assets/variant-markets`    | Batch markets for up to 50 mints  |
| `GET /assets/risk-summary?mint=` | Quick mint-scoped risk check      |

---

## License

MIT — see [LICENSE](./LICENSE)
