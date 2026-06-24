# Error Handling & Debugging

Rate limits, error codes, request IDs, and retry patterns for the Tokens API.

---

## Standard Error Envelope

All non-2xx responses return JSON in this shape:

```json
{
  "error": {
    "_tag": "BadRequestError",
    "message": "Human-readable message",
    "details": "Additional context"
  }
}
```

---

## Status Codes

| Code  | Tag                 | Common cause                                     | Fix                                             |
| ----- | ------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `400` | `BadRequestError`   | Invalid params, bad mint format, unknown include | Check query params; validate mint is base58     |
| `401` | `UnauthorizedError` | Missing or invalid `x-api-key`                   | Confirm `TOKENS_XYZ_API_KEY` is set and correct |
| `403` | `ForbiddenError`    | Insufficient scope                               | Check your key's scopes in API Manager          |
| `404` | `NotFoundError`     | Asset or route doesn't exist                     | Verify assetId; try `/resolve` first            |
| `429` | `RateLimitedError`  | Rate or quota limit hit                          | Back off and retry (see below)                  |

---

## Checking Your API Key

```bash
# Quick auth test — should return asset data, not 401
curl -sS "https://api.tokens.xyz/v1/assets/solana" \
  -H "x-api-key: ${TOKENS_XYZ_API_KEY}"

# If you get 401, your key is wrong or missing:
echo $TOKENS_XYZ_API_KEY   # check it's set
```

**Getting your key:**

1. Visit [tokens.xyz](https://tokens.xyz) → API Manager
2. If your key is a "legacy hash-only key" it may not be revealable — regenerate once to get a revealable key
3. After regenerating, the old key is immediately deactivated
4. Add the new key to your `.env`: `TOKENS_XYZ_API_KEY=your_key_here`

---

## Rate Limits

- Limits are enforced **per API key**
- Monthly quotas also apply
- Some endpoints serve cached data; if data is stale, a background refresh may be triggered — retry after a short wait

**Exponential backoff pattern:**

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`Rate limited. Retrying in ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    return res;
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

// Usage
const res = await fetchWithRetry("https://api.tokens.xyz/v1/assets/solana", {
  headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! },
});
```

---

## Request IDs

Every response includes an `x-request-id` header. When contacting support, include:

- The request URL (with params, but **redact your API key**)
- The response body
- The `x-request-id` value
- The timestamp (UTC)

```typescript
const res = await fetch("https://api.tokens.xyz/v1/assets/solana", {
  headers: { "x-api-key": process.env.TOKENS_XYZ_API_KEY! },
});
const requestId = res.headers.get("x-request-id");
if (!res.ok) {
  const err = await res.json();
  console.error("API error", { requestId, status: res.status, err });
}
```

---

## Include Block Failures

When using `?include=...` on asset detail, each block can fail independently:

```json
{
  "includes": {
    "risk":  { "ok": true, "data": { ... } },
    "ohlcv": { "ok": false, "reason": "no_data", "message": "No candles for this mint" }
  }
}
```

Always check `ok` before accessing `data`:

```typescript
function safeInclude<T>(
  include: { ok: boolean; data?: T } | undefined,
): T | null {
  return include?.ok ? (include.data ?? null) : null;
}

const risk = safeInclude(data.includes?.risk);
const candles = safeInclude(data.includes?.ohlcv)?.candles ?? [];
```

---

## Common Mistakes

| Mistake                            | Symptom                                      | Fix                                           |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Using raw mint as grouping key     | Duplicate assets in UI                       | Always resolve mint → `assetId` first         |
| Passing wrong `mint` for an asset  | `400 BadRequestError`                        | mint must be a variant of that assetId        |
| Not checking `ok` on includes      | `TypeError: Cannot read 'data' of undefined` | Always guard with `include?.ok`               |
| Hardcoding API key in frontend     | Key exposed in browser network tab           | Move to server/edge function, proxy responses |
| >250 mints in batch POST           | `400`                                        | Chunk into ≤250 per call                      |
| >50 mints in `variant-markets` GET | `400`                                        | Use POST endpoint instead                     |
