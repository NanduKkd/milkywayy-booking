# GPT Actions OAuth decision log

Last updated: 2026-06-29

## Status values

| Status | Meaning |
|---|---|
| `PROPOSED` | Recommended but awaiting owner approval or implementation validation. |
| `ACCEPTED` | Governs implementation. |
| `REJECTED` | Considered and not selected. |
| `SUPERSEDED` | Replaced by a later decision. |

## Accepted decisions

### DEC-001 - Implement OAuth 2.0 rather than OpenID Connect

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Implement the OAuth authorization-code flow needed by GPT Actions. Do not implement OIDC discovery, ID tokens, UserInfo, or JWKS in the first release.
- Reason: ChatGPT needs an access token to call Milkywayy APIs on a customer's behalf. The documented GPT Actions setup asks for OAuth client credentials, authorization/token URLs, and scopes.
- Consequence: The implementation remains smaller than a general identity provider and cannot initially serve relying-party login use cases.

### DEC-002 - Treat ChatGPT as one pre-registered confidential client

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Provision one client ID/secret pair and register the target GPT's callback URLs exactly.
- Reason: Dynamic registration and multi-client management are unnecessary for the stated use case.
- Consequence: Additional GPTs or third parties require new clients and follow-up work.

### DEC-003 - Do not require PKCE for the ChatGPT client

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Do not require PKCE when the client is the Custom GPT. Keep optional PKCE fields in the internal design for future client types.
- Reason: The currently documented GPT Actions token exchange includes client credentials and an authorization code but does not document `code_challenge` or `code_verifier` support.
- Consequence: Security relies on exact redirect matching, required `state`, short one-time codes, confidential-client authentication, TLS, and code binding.

### DEC-004 - Use opaque, server-side tokens

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Issue random opaque access and refresh tokens and persist only lookup hashes.
- Reason: Resource APIs are in the same application and need immediate revocation. JWT distribution and key management would add complexity without a current consumer.
- Consequence: Every action API request performs a token-store lookup, which must be indexed and monitored.

### DEC-005 - Keep the first release read-only

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Expose customer account confirmation, bookings, invoice metadata, and delivery-file metadata only. Defer all mutations, payments, and binary delivery.
- Reason: This provides useful GPT functionality while limiting authorization, confirmation, idempotency, and financial risk.
- Consequence: Booking changes continue through the website until a separate consequential-action phase is approved.

### DEC-006 - Reuse Milkywayy customer authentication

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Reuse the existing customer OTP identity and website session during the OAuth authorization interaction.
- Reason: Customers should not receive a separate OAuth-only account or credential.
- Consequence: OTP expiration, attempt limits, throttling, session-secret configuration, and safe interaction resume become release prerequisites.

### DEC-007 - Separate website sessions from OAuth grants

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Website session JWTs and OAuth access tokens are distinct artifacts and are never accepted interchangeably.
- Reason: They have different audiences, lifecycles, storage, and revocation requirements.
- Consequence: Resource APIs require explicit Bearer-token middleware; existing web pages continue using session cookies.

### DEC-008 - Use exact callback matching

- Status: `ACCEPTED`
- Date: 2026-06-29
- Decision: Register and compare the specific `chatgpt.com` and `chat.openai.com` callback URLs for the target GPT with exact matching. Do not use wildcard redirects.
- Reason: Exact matching prevents authorization-code redirection to attacker-controlled endpoints.
- Consequence: A new GPT ID or callback form requires a controlled client configuration update.

### DEC-009 - Initial action endpoint set

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: OAUTH-002
- Decision: Expose the following customer-owned, read-only endpoints:
  - `GET /api/gpt/v1/me`
  - `GET /api/gpt/v1/bookings`
  - `GET /api/gpt/v1/bookings/{bookingCode}`
  - `GET /api/gpt/v1/invoices`
  - `GET /api/gpt/v1/files`
- Decision: The files endpoint returns metadata and an authenticated website URL of the form `/dashboard/files?fileId={fileId}`. It does not return binary content, S3 keys, direct storage URLs, or unrestricted signed URLs. The dashboard uses `fileId` to scroll to and visually identify the selected file.
- Reason: Customers want ChatGPT to identify delivered files and direct them to the existing authenticated file workflow without transferring files through GPT Actions.
- Consequence: Delivery-file metadata and dashboard deep-link behavior are part of the first-release implementation and test scope.

### DEC-010 - Initial scopes and consent text

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: OAUTH-002
- Decision: Use one initial scope: `customer:read`.
- Consent text: "View your account, bookings, invoices, and delivery-file metadata."
- Reason: The first release has one first-party GPT client and grants its approved read surface as one capability.
- Consequence: A customer cannot grant this client access to only a subset of the first-release read endpoints. Future capabilities, especially mutations, require new scopes and fresh consent.

### DEC-011 - Token lifetimes

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: AUTH-001, DB-001
- Decision:
  - Authorization interaction: 10 minutes.
  - Authorization code: 2 minutes.
  - Access token: 15 minutes.
  - Rotating refresh token: 30 days.
- Reason: Short-lived codes and access tokens limit replay exposure while a rotating refresh token avoids frequent customer reconnects.
- Consequence: Tune only from observed refresh and reconnect behavior; do not lengthen access-token lifetime as the first response to reliability issues.

### DEC-012 - Repeat-consent behavior

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: FLOW-002, FLOW-007
- Decision: Show full consent on the first grant and whenever requested scopes increase. For unchanged scopes, allow a concise reconnect screen that always identifies the client and customer account being connected.
- Reason: This preserves informed consent for new access without adding a redundant full prompt to an unchanged reconnect.
- Consequence: Consent and reconnect paths need distinct UI and test coverage.

### DEC-013 - Rate-limit storage

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: AUTH-004, API-006, OPS-002
- Decision: Store rate-limit counters and expiry windows in PostgreSQL. Redis is not currently available, and in-memory limits are not authoritative.
- Reason: PostgreSQL is already available and keeps OTP, authorization, token, refresh, and resource-API limits consistent across PM2 restarts and any future increase in web-process count.
- Consequence: Counter updates must be atomic, indexed, bounded, and cleaned up. Database load and limiter failure behavior must be monitored.

### DEC-014 - Client authentication methods

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: DB-003, FLOW-004, OPS-004
- Decision: Explicitly support and test both `client_secret_post` and `client_secret_basic` for the registered ChatGPT client. Reject missing, duplicated, conflicting, or malformed credentials.
- Reason: Supporting both documented confidential-client transports avoids coupling the server to one GPT editor exchange mode while keeping the accepted methods narrow.
- Consequence: Provisioning records both permitted methods, and integration tests must verify both plus ambiguous-credential rejection.

### DEC-015 - Disabled-user and disabled-client behavior

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: API-001, FLOW-004
- Decision:
  - Disabling a customer or OAuth client immediately blocks new authorization, code exchange, and refresh operations.
  - An already-issued access token may continue to authorize requests until its normal expiry, for at most 15 minutes. Explicit connection revocation still invalidates active tokens immediately.
  - A deleted or otherwise unresolvable customer fails resource authorization even if the token has not expired.
  - A customer role change never upgrades OAuth privileges.
- Reason: The 15-minute access-token lifetime bounds the disablement window without requiring a client/user enabled-state lookup beyond the normal token and principal resolution path on every request.
- Consequence: Client or customer disablement is not an immediate emergency revocation control; operators must explicitly revoke tokens when immediate cutoff is required.

### DEC-016 - Audit-event retention

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: FLOW-008, OPS-006
- Decision: Persist OAuth audit events in a dedicated database table for 30 days and also emit structured application logs.
- Reason: Production log retention is not guaranteed, so logs alone cannot provide the required audit window.
- Consequence: Implement bounded retention cleanup, table access controls, safe event fields, and monitoring for failed event persistence. Neither store may contain raw secrets, codes, tokens, OTPs, cookies, or authorization headers.

### DEC-017 - GPT distribution and publication requirements

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: OAUTH-003, OPS-004
- Decision: Target a publicly shared/published GPT. The project owner owns privacy-policy content, domain verification, the support contact, and the publication/review process.
- Reason: The intended integration is available beyond a private or workspace-only audience.
- Consequence: Current GPT editor publication requirements must be verified and completed before release. Public exposure also makes abuse controls, support readiness, and production monitoring release blockers.

### DEC-018 - First-release OAuth threat model and residual risks

- Status: `ACCEPTED`
- Date: 2026-06-29
- Owner: Project owner
- Needed by: OAUTH-004
- Decision: The first-release threat model is accepted with the following required controls and verification mappings:

| Threat | Required controls | Task and test mapping |
|---|---|---|
| Redirect manipulation | Exact redirect-URI registration and validation, safe local failures, forwarded-host hardening | OAUTH-003, FLOW-001, OPS-002, AUT-03, AUT-04, AUT-05 |
| CSRF or lost `state` during authorization | Required `state`, short-lived interaction state, CSRF-protected approval/denial, safe resume after login | AUTH-005, FLOW-001, FLOW-002, AUT-02, AUT-08, AUT-09, AUT-10, AUT-11, AUT-12 |
| Authorization-code interception or replay | Short-lived one-time codes, binding to client and redirect URI, atomic consumption | FLOW-003, FLOW-005, COD-02, COD-03, COD-04, COD-05, COD-06 |
| Client impersonation | Hashed client secret storage, explicit auth-method allowlist, invalid-client throttling, no secret-oracle responses | DB-003, FLOW-004, COD-07, COD-10, COD-11 |
| Access-token theft or bearer-token misuse | Opaque hashed tokens, strict Bearer parsing, scope checks, revocation, leak review | DB-004, API-001, FLOW-007, TEST-006, API-01, API-02, API-03, LOG-02 |
| Refresh-token replay | Rotating refresh tokens, family tracking, deterministic concurrent handling, reuse-triggered family revocation and alerting | FLOW-006, FLOW-008, REF-01, REF-02, REF-03, REF-04, REF-05, LOG-05 |
| Cross-user data access | Per-request customer ownership filters, indistinguishable `404` behavior, dashboard file-link ownership checks | API-001, API-004, API-005, API-008, TEST-003, API-04, API-05, API-09, API-11, API-12 |
| Logging or audit leakage | Structured safe audit events, secret scrubbing, bounded metadata only, fixture review | FLOW-008, TEST-006, LOG-01, LOG-02, LOG-04, LOG-05, LOG-06 |
| OTP abuse and account enumeration | OTP expiry, resend throttling, attempt caps, per-phone and per-source rate limits, non-enumerating responses | AUTH-004, TEST-004, RES-01 |
| Denial of service | PostgreSQL-backed rate limits, bounded cleanup, bounded response size/time, safe failure under dependency issues | AUTH-004, DB-005, API-006, TEST-004, RES-01, RES-02, RES-03, RES-04, RES-05, RES-06 |

- Accepted residual risks and limitations:
  - PKCE is not required for the first-party ChatGPT confidential client in the first release. The compensating controls are exact redirect matching, required `state`, confidential-client authentication, TLS, and short-lived single-use authorization codes.
  - Disabling a customer or OAuth client blocks new authorization, exchange, and refresh operations immediately, but an already-issued access token may remain usable until its 15-minute expiry unless the connection is explicitly revoked.
  - GPT Actions return metadata and authenticated website links only; binary file delivery remains on the existing website to avoid expanding token misuse and data-exfiltration risk in the first release.
- Consequence: Every mapped control is release-blocking unless the task tracker or security plan explicitly records a defer or exception decision.

## Decision change template

Copy this section for a new decision:

```markdown
### DEC-NNN - Title

- Status: `PROPOSED`
- Owner: `TBD`
- Needed by: TASK-ID
- Context: Why the decision is required.
- Options: Viable alternatives.
- Decision: Selected option after approval.
- Consequence: Engineering and operational impact.
```

## References

- [OpenAI: GPT Action authentication](https://developers.openai.com/api/docs/actions/authentication)
- [OpenAI: Production notes on GPT Actions](https://developers.openai.com/api/docs/actions/production)
- [OpenAI: Data retrieval with GPT Actions](https://developers.openai.com/api/docs/actions/data-retrieval)
