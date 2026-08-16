# Change Verification Guide

- Last updated: 2026-08-16
- Applies to: application, API, database, operational, security, and
  documentation changes

This guide describes how to verify changes and retain useful evidence.

## Verification principles

- Verify the observable behavior affected by the change.
- Prefer focused tests close to the implementation, followed by broader checks
  when shared code or cross-feature behavior may be affected.
- Tie evidence to the exact code or patch being reviewed. Rerun checks when a
  later edit, rebase, dependency change, or conflict resolution could invalidate
  the result.
- Keep evidence reproducible and free of secrets, personal data, live customer
  payloads, and private deployment details.
- Do not claim a repository-wide green baseline when only focused checks ran or
  when unrelated baseline failures remain.

## Selecting checks

Use the smallest set of checks that provides credible coverage, expanding it
when the possible impact is wider:

| Change area | Expected verification |
|---|---|
| Documentation or configuration text | Link/path checks, formatting, and diff review |
| Localized UI behavior | Focused component tests, accessibility states, and relevant responsive or visual evidence |
| Server action, service, or API | Focused unit/integration tests, authorization and failure-path coverage |
| Shared helpers or cross-feature behavior | Focused tests plus the affected broader suites |
| Database model or migration | Migration tests, compatibility review, rollback/restore considerations, and database-backed checks where safe |
| Authentication, authorization, secrets, privacy, concurrency, or destructive data paths | Negative/abuse cases and fresh independent verification before release |
| Production configuration or rollout | Safe preflight, monitoring and rollback evidence, and explicit production authorization |

Run repository commands documented in [`DEVELOPMENT.md`](./DEVELOPMENT.md) and
feature-specific security or operations documents. Database tests must use
explicit test configuration and must never target production credentials.

## Evidence

Useful evidence includes:

- exact commands and pass/fail counts;
- focused static-analysis output;
- migration or protocol fixture results;
- screenshots or recordings for behavior that requires visual judgment;
- sanitized monitoring, rollback, or operational confirmation;
- a diff review confirming that unrelated changes and secrets are absent.

Evidence may be reused only while the relevant code, configuration,
dependencies, and environment remain unchanged.

## Visual and manual verification

Use repository-provided browser automation when it covers the required behavior.
Do not install a large browser stack solely for a low-impact change. If a live
service, device, account, or human judgment is necessary, complete all unaffected
automated checks and state the exact manual evidence still required.

## Documentation and private information

Update maintained feature documentation when a verified change alters stable
behavior, interfaces, architecture, operations, security boundaries, or accepted
decisions. Verification reports may retain reproducible, non-secret evidence.

Exact production hostnames, IPs, filesystem paths, secret locations, external
identifiers, credentials, and one-off operator commands belong only in ignored
local files under `docs/private/`.
