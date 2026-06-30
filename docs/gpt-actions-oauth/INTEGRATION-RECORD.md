# GPT Actions OAuth integration record

- Last updated: 2026-06-30
- Record status: `ACCEPTED`
- Scope: `OAUTH-003`, `OPS-001`, and `OPS-004`

This record captures the production Custom GPT OAuth integration values that are safe to store in project-controlled documentation. Do not store the OAuth client secret in this repository.

## Target GPT

| Field | Value |
|---|---|
| Active GPT ID | `g-ee5af7c314d509d62dd77a325d900dc61acc399a` |
| Legacy GPT ID retained in callback allowlist | `g-6a42b42ce4788191b214fe0cee1aed9a` |
| Distribution target | Public/shared GPT targeted for publication |
| Owner | `Project owner` |
| Workspace | Project-owner-managed ChatGPT workspace for the Milkywayy production GPT |
| Current owner obligations | Privacy policy, `milkywayy.com` domain verification, support contact, and GPT publication/review completion before release |

## Exact callback URLs

- `https://chat.openai.com/aip/g-ee5af7c314d509d62dd77a325d900dc61acc399a/oauth/callback`
- `https://chatgpt.com/aip/g-ee5af7c314d509d62dd77a325d900dc61acc399a/oauth/callback`
- `https://chat.openai.com/aip/g-6a42b42ce4788191b214fe0cee1aed9a/oauth/callback`
- `https://chatgpt.com/aip/g-6a42b42ce4788191b214fe0cee1aed9a/oauth/callback`

The first two callback URLs above are the active production GPT callback pair. The legacy pair remains registered temporarily for compatibility while the older GPT is decommissioned. Every callback URL above must be stored verbatim in `OAUTH_CALLBACK_URIS` and registered exactly on the Milkywayy OAuth client. Any GPT ID change, duplicated GPT, domain change, path change, query change, case change, encoding change, or trailing-slash difference requires an explicit client configuration update.

## Milkywayy OAuth and action settings

| Field | Value |
|---|---|
| API domain | `https://milkywayy.com` |
| Authorization URL | `https://milkywayy.com/oauth/authorize` |
| Token URL | `https://milkywayy.com/oauth/token` |
| Requested scope | `customer:read` |
| Consent text | `View your account, bookings, invoices, and delivery-file metadata.` |

## Secure-handling notes

- Provision or update the OAuth client using every active exact callback URL above.
- Transfer the generated client secret to the GPT editor through the approved secure channel only once.
- Never commit the client secret, paste it into repository docs, or save it in shell notes/history.
