# P0-3 — Ark credential verification (2026-08-27, Claude)

**Command (key redacted; values live in gitignored `.env`):**

```bash
curl -sS -X POST "$ARK_BASE_URL/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{"model": "'$ARK_MODEL'", "input": "Reply with exactly: WALNUT-OK", "max_output_tokens": 400}'
```

**Environment (non-secret parts):**
- `ARK_MODEL=[REDACTED_ENDPOINT_ID]` (endpoint for DeepSeek-V3.2, activated in BytePlus ModelArk, region ap-southeast-1 / Johor)
- `ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3` — **required override**: the starter-kit default points at the China (cn-beijing) Volcengine endpoint, which does not serve this key.

**Result: HTTP 200.** Response (verbatim, no secrets present):

```json
{"created_at":1787816638,"id":"resp_021787816637904a4c6d1552d81c7895c46a24cfcfdd8871f0ddf","max_output_tokens":400,"model":"deepseek-v3-2-251201","object":"response","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"WALNUT-OK"}],"status":"completed","id":"msg_02178781663833200000000000000000000ffffc0a8a7e3d7ee27"}],"service_tier":"default","status":"completed","usage":{"input_tokens":14,"output_tokens":6,"total_tokens":20,"input_tokens_details":{"cached_tokens":0},"output_tokens_details":{"reasoning_tokens":0}},"caching":{"type":"disabled"},"store":true,"expire_at":1788075837}
```

**Conclusions:**
- The key is a valid Ark model API key; the `ep-…` endpoint serves the **Responses API** (`wire_api = "responses"` in the starter kit's Codex config will work).
- Model behind the endpoint: `deepseek-v3-2-251201`.
- Free-tier quota at activation: 500,000 tokens (console screenshot, 2026-08-27 15:40 SGT) — budget demo runs accordingly.
- For `npm run poc` / `npm run dev`, the env vars must be exported (the shell does not auto-load `.env`): `set -a; . ./.env; set +a; npm run poc`.
