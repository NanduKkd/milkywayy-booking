# GPT Actions OAuth operations runbook

- Last updated: 2026-06-29
- Scope: `OPS-001` and `OPS-002` production OAuth preparation and topology controls

This runbook covers the repo-controlled part of production preparation. It does not store production secrets in the repository and it does not replace the manual GPT-editor and deployment-secret steps owned by the project operator.

## Required production secrets

Set these in the production secret mechanism before enabling the OAuth endpoints:

| Variable | Purpose |
|---|---|
| `OAUTH_BASE_URL` | Public HTTPS origin used for OAuth redirects and token URLs. Must match the production API domain. |
| `OAUTH_ALLOWED_SCOPES` | Current production scope list. First release: `customer:read`. |
| `OAUTH_CALLBACK_URIS` | Exact GPT callback allowlist from the GPT editor. Record both callback URLs exactly, comma-separated or newline-separated. |
| `OAUTH_INTERACTION_TTL_SECONDS` | Authorization interaction lifetime. Accepted value: `600`. |
| `OAUTH_CODE_TTL_SECONDS` | Authorization-code lifetime. Accepted value: `120`. |
| `OAUTH_ACCESS_TOKEN_TTL_SECONDS` | Access-token lifetime. Accepted value: `900`. |
| `OAUTH_REFRESH_TOKEN_TTL_SECONDS` | Refresh-token lifetime. Accepted value: `2592000`. |
| `OAUTH_TOKEN_HASH_PEPPER` | Server-only pepper for hashing authorization codes and OAuth tokens. |
| `OAUTH_CLIENT_SECRET_HASH_PEPPER` | Server-only pepper for hashing OAuth client secrets. |
| `CRON_SECRET` | Secret shared with internal maintenance workers, including OAuth cleanup. |

Generate the secret values with a cryptographically secure generator outside the repository. Example:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64url"))'
```

Do not set any OAuth secret through `NEXT_PUBLIC_*` variables.

## Capture the exact GPT callback URLs

Before provisioning the production client:

1. Open the target Custom GPT's OAuth configuration in the GPT editor.
2. Copy both displayed callback URLs exactly as shown.
3. Store them in the deployment secret mechanism as `OAUTH_CALLBACK_URIS`.
4. Use the same exact values when provisioning the OAuth client record.

The allowlist is exact-match only. Any path, query, case, encoding, subdomain, or trailing-slash difference must be rejected.

## Provision the production OAuth client

After the production secrets are present and the exact callback URLs are known, run:

```bash
npm run oauth:provision-client -- --name "Milkywayy GPT" \
  --redirect-uri "https://chatgpt.com/aip/oauth/callback/REPLACE_FROM_GPT_EDITOR" \
  --redirect-uri "https://chat.openai.com/aip/oauth/callback/REPLACE_FROM_GPT_EDITOR"
```

Expected result:

- the script prints a random client ID
- the script prints the plaintext client secret once
- only the hashed client secret is stored in PostgreSQL
- the client is created with `customer:read`, `client_secret_basic`, and `client_secret_post`

Immediately transfer the plaintext client secret through the approved secure channel and place it into the GPT editor. Do not commit it, paste it into repository docs, or save it in shell history notes.

## Rotate the production OAuth client secret

Use the repo-managed operator script:

```bash
npm run oauth:manage-client -- --action rotate-secret --client-id "<client-id>"
```

This invalidates the previous client secret for future token exchanges and prints the replacement secret once. After rotation:

1. Update the GPT editor with the new client secret.
2. Confirm the next token exchange succeeds.
3. Remove the superseded secret from any temporary secure-sharing channel.

## Emergency client disablement

To stop new authorization, code exchange, and refresh activity for the GPT client:

```bash
npm run oauth:manage-client -- --action disable --client-id "<client-id>"
```

To re-enable the client later:

```bash
npm run oauth:manage-client -- --action enable --client-id "<client-id>"
```

Important limitation:

- disabling the client blocks new authorization, exchange, and refresh requests immediately
- already-issued access tokens can remain usable until their 15-minute expiry unless the affected customer connection is explicitly revoked

Use disablement for incident containment, then follow the customer revocation and deployment rollback procedures tracked in `OPS-003` through `OPS-006`.

## TLS, proxy, and PM2 topology

Install the repo-managed Nginx template from `deploy/nginx/milkywayy-booking.conf` on the production host, then adapt only the certificate paths and any operator-owned server-name aliases if needed.

Required topology:

- Nginx terminates HTTPS on port 443 with `TLSv1.2` or `TLSv1.3`.
- Port 80 redirects to the equivalent HTTPS URL.
- Nginx reverse-proxies to the local PM2-managed Next.js process at `http://127.0.0.1:3000`.
- Nginx forwards `Host` and `X-Forwarded-Host` from the controlled proxy value and pins `X-Forwarded-Proto` to `https`.
- Proxy body and timeout limits remain bounded for GPT Actions: `client_max_body_size 256k`, `proxy_connect_timeout 5s`, `proxy_send_timeout 30s`, and `proxy_read_timeout 30s`.

The repo-managed PM2 process file now includes all production processes:

- `milkywayy-booking`
- `milkywayy-booking-auto-complete`
- `milkywayy-booking-oauth-cleanup`

Start or reload them with:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

The cleanup and booking workers target `http://127.0.0.1:3000` through `INTERNAL_APP_URL` and require `CRON_SECRET`.

## Rate-limit topology

OAuth and GPT resource throttling already uses PostgreSQL-backed rate limiting rather than per-process memory buckets. That means the current single-process PM2 deployment and any later increase in web-process count still share the same counters without weakening token, OTP, or resource API limits.

The deployment operator still needs to keep every public web process pointed at the same PostgreSQL database and avoid bypassing Nginx with a second public listener.

## Repo-controlled topology verification

Before or alongside production rollout, run:

```bash
npm run verify:oauth-topology
```

This checks the repo-managed PM2 topology, confirms the OAuth cleanup worker is registered, validates the committed Nginx TLS/proxy template, and ensures the runbook still documents the PostgreSQL-backed rate-limit topology.
