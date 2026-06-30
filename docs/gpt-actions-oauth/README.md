# GPT Actions OAuth delivery plan

- Last updated: 2026-06-30
- Planning status: `COMPLETE`
- Implementation status: `DONE`
- Target: production OAuth 2.0 authorization-code integration for one ChatGPT Custom GPT

## Purpose

This documentation set tracks the work required for ChatGPT Custom GPT Actions to call Milkywayy APIs as the currently signed-in Milkywayy customer.

ChatGPT will act as a confidential OAuth client. A customer will authenticate through the existing Milkywayy login flow, approve access, and ChatGPT will receive an OAuth access token. ChatGPT will then send that token in the `Authorization: Bearer <token>` header when it calls the action API.

This is OAuth 2.0 API authorization. It is not an OpenID Connect implementation: the first release does not need ID tokens, UserInfo, discovery metadata, or JWKS.

## Document index

- [TASKS.md](./TASKS.md): authoritative implementation tracker, dependencies, estimates, and acceptance criteria.
- [ARCHITECTURE.md](./ARCHITECTURE.md): target flow, endpoints, persistence, scopes, and code boundaries.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): security requirements, automated tests, manual verification, and release gates.
- [DECISIONS.md](./DECISIONS.md): accepted decisions and questions that must be resolved during implementation.
- [INTEGRATION-RECORD.md](./INTEGRATION-RECORD.md): the production Custom GPT record, including the active GPT ID, any temporarily retained compatibility callbacks, and the agreed Milkywayy OAuth endpoints.
- [OPERATIONS.md](./OPERATIONS.md): production secret preparation, client provisioning, rotation, and emergency disablement steps.
- [gpt-action-openapi.json](./gpt-action-openapi.json): validated GPT Action OpenAPI artifact for the approved read-only resource API.

If documents disagree, `DECISIONS.md` controls architectural choices and `TASKS.md` controls progress status.

## Status model

Use exactly one of these values for implementation tasks:

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed; document the blocker and required decision. |
| `IN_REVIEW` | Implementation is complete and awaiting review or verification. |
| `DONE` | Acceptance criteria are satisfied and evidence is linked. |
| `DEFERRED` | Explicitly removed from the current release. |

Update rules:

1. Update the task status, owner, and evidence in `TASKS.md` in the same change as the implementation.
2. Mark a task `DONE` only after its acceptance criteria and relevant tests pass.
3. Add newly discovered scope as a new task ID; do not silently expand an existing task.
4. Record architecture or security changes in `DECISIONS.md` before implementing them.
5. Update the date and milestone summary whenever task status changes.

## Initial scope

The first production release includes:

- One pre-registered ChatGPT Custom GPT OAuth client.
- Existing customer OTP login reused during authorization.
- OAuth authorization-code grant with confidential-client authentication.
- Required and round-tripped `state` parameter.
- Short-lived, single-use authorization codes.
- Opaque access tokens and rotating refresh tokens stored only as hashes.
- Explicit customer consent and a dashboard disconnection control.
- Read-only, customer-scoped REST endpoints protected by the combined `customer:read` scope.
- Delivery-file metadata with authenticated `/dashboard/files?fileId=...` links that scroll to the selected file; no binary or direct storage delivery through GPT Actions.
- An OpenAPI action schema and Custom GPT configuration instructions.
- PostgreSQL-backed rate limiting, 30-day database audit retention, structured security events, automated tests, and production monitoring.
- Public GPT distribution, with the project owner responsible for privacy policy, domain verification, support contact, and publication review.

## Explicit non-goals for the first release

- OpenID Connect, ID tokens, UserInfo, discovery, or JWKS.
- Dynamic OAuth client registration or a developer portal.
- Login for administrators, staff, or service accounts.
- Booking creation, cancellation, payment, wallet mutation, or other write actions.
- Returning images, videos, PDFs, or other binary payloads through GPT Actions.
- General-purpose third-party OAuth support beyond the registered ChatGPT client.
- A repository-wide lint or test cleanup unrelated to OAuth.

## Delivery estimate

Expected effort for one experienced engineer:

| Milestone | Estimate |
|---|---:|
| Requirements and security baseline | 1.5-2 days |
| Persistence and OAuth service | 3-4 days |
| Login, authorization, and consent | 1.5-2.5 days |
| Resource API and OpenAPI action schema | 2.5-4 days |
| Testing, operations, and ChatGPT UAT | 2-3.5 days |
| **Total** | **11-16 engineer-days** |

Allow 2-3 calendar weeks for implementation, review, deployment, and ChatGPT integration testing. This estimate assumes the initial API remains read-only and one OAuth client is supported.

## Milestone completion definition

The release is complete only when:

- Every release-blocking task in `TASKS.md` is `DONE`.
- Every release gate in `SECURITY-TEST-PLAN.md` passes.
- A customer can connect from ChatGPT, list only their own records, refresh an expired access token, and disconnect access.
- Expired, replayed, revoked, wrong-client, wrong-redirect, and insufficient-scope requests fail safely.
- No authorization code, access token, refresh token, OTP, client secret, or session JWT appears in application logs.
- Production rollback and token-revocation procedures have been tested.

## Current repository considerations

- Customer login is implemented in `src/lib/actions/auth.js` and currently writes a JWT cookie through `src/lib/helpers/auth.js`.
- The OAuth flow should reuse authentication logic, but protocol logic must not be placed inside the existing UI server actions.
- Existing business functions are mostly Next.js server actions. GPT Actions require explicitly designed REST endpoints with per-user ownership checks.
- Current unrelated worktree changes touch the dashboard and proxy. They should be settled before OAuth implementation begins because the authorization login/resume flow will touch the same areas.
- The existing repository-wide lint and test failures are baseline issues. They should be tracked separately, while all new or changed OAuth files must pass their relevant checks.
- Production runs the Next.js process under PM2 behind a controlled reverse-proxy chain. Exact live deployment details are maintained in the local-only operator runbook at `docs/private/PRODUCTION-DEPLOYMENT.md`.

## OpenAI platform constraints used by this plan

The plan is based on the current official documentation:

- [GPT Action authentication](https://developers.openai.com/api/docs/actions/authentication)
- [Production notes on GPT Actions](https://developers.openai.com/api/docs/actions/production)
- [Data retrieval with GPT Actions](https://developers.openai.com/api/docs/actions/data-retrieval)

Notable constraints are recorded as implementation requirements:

- ChatGPT is configured with a client ID, client secret, authorization URL, token URL, and scopes.
- ChatGPT uses an authorization code and sends the resulting token in the API authorization header.
- Both documented ChatGPT callback URL forms must be registered exactly for this GPT.
- OAuth and primary API endpoints must use the same domain for this custom provider.
- Production endpoints require TLS 1.2 or later on port 443.
- Calls have a 45-second timeout and request/response payloads must stay below 100,000 characters.
- Action requests and responses are text-only, custom headers are unavailable, and the API should use `429` for rate limiting.
