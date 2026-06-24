# Tokens.xyz API Key Rules

These rules apply whenever working with the Tokens.xyz API in any context.

## NEVER

- Hardcode `TOKENS_XYZ_API_KEY` in source files
- Log or print the API key value
- Include the key in frontend/client-side bundles
- Commit `.env` files containing the key to version control
- Expose the key in API responses proxied to the browser

## ALWAYS

- Read the key from `process.env.TOKENS_XYZ_API_KEY` (Node.js) or `os.environ["TOKENS_XYZ_API_KEY"]` (Python)
- Call the Tokens API from the server or an edge function, then proxy responses to the frontend
- Add `.env` to `.gitignore` before writing the key to it
- Check the key is set before making any API call — fail fast with a clear message if it's missing

## When the key is missing

Tell the user:

1. Go to [tokens.xyz](https://tokens.xyz) → API Manager to get a key
2. Create a `.env` file in the project root (if it doesn't exist)
3. Add: `TOKENS_XYZ_API_KEY=your_key_here`
4. Load it in the app (`dotenv` for Node, `python-dotenv` for Python)
5. Never commit the `.env` file

## .gitignore check

Always verify `.gitignore` includes:

```
.env
.env.local
.env.*.local
```

If any of these are missing, add them before proceeding.
