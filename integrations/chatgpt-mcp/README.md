# UNPRO ChatGPT MCP gateway

Standalone Node 22+ HTTP MCP gateway. No Lovable credits or npm dependencies. **Not deployed.** Routes are intentionally fail-closed until existing UNPRO backend adapters are implemented.

## Run
```bash
export UNPRO_MCP_TOKEN='replace-with-long-random-token'
export UNPRO_INTERNAL_API_URL='https://your-existing-backend.example'
export UNPRO_INTERNAL_API_TOKEN='backend-secret'
node integrations/chatgpt-mcp/server.mjs
```

MCP endpoint: `POST /mcp`. Health: `GET /health`.
Requires a bearer token on all MCP requests; use HTTPS behind a trusted proxy. The five internal backend endpoints must be implemented at `/internal/chatgpt/<tool-name>` and must enforce permissions, verified data and booking atomicity. This gateway does not directly access Supabase or calendars.

## Security and readiness
- Do not expose service-role keys in client code or MCP responses.
- Current static bearer authentication is **development-only**. Production ChatGPT app integration requires platform-compatible OAuth and user-level authorization.
- No user data should be returned before identity, consent and contractor visibility checks are implemented.
- Availability must be fetched live; booking must recheck the slot and be idempotent.
- Rate limiting, audit logging, monitoring, CORS/origin controls and deployment are outstanding.
- Set `UNPRO_MCP_TOKEN=test-secret NODE_ENV=test` when running tests.
- Do not submit to the ChatGPT app directory until end-to-end booking is verified and security reviewed.
