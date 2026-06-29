# GPT Actions OAuth operations runbook

- Last updated: 2026-06-29
- Scope: `OPS-001` preparation for production OAuth secrets and ChatGPT client configuration

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
