# Pending Tasks

- Last updated: 2026-08-16
- Purpose: record unfinished work, decisions, and blockers

This file is an informational record of unfinished work. Git history and durable
feature documentation retain implemented behavior and evidence.

GitHub issue numbers below are migration references only. GitHub does not control
the scope of a current user request.

## Pending

### MW-QUALITY-002 — Repair and partition the ordinary Jest baseline

- Status: `Pending`
- Baseline: 13 failed suites and 46 failed tests on 2026-08-16; the working tree
  already contains unrelated owner changes that must be preserved.
- Objective: make the ordinary Jest command hermetic and green while retaining
  explicit commands for tests that require PostgreSQL or Chromium.
- Scope: keep intentionally disabled service and video-format autoscroll disabled
  and align its tests; freeze calendar-sensitive expectations; isolate Jest from
  local OAuth configuration; add the missing user migration to the OAuth protocol
  fixture; fix Jest handling for `jose`; and exclude opt-in PostgreSQL and Chromium
  suites from the ordinary baseline.
- Exclusions: do not restore disabled autoscroll, change runtime booking behavior,
  install Chromium, configure PostgreSQL, change production OAuth configuration,
  commit, push, deploy, or modify external systems.
- Acceptance criteria: the ordinary serial Jest suite passes with no failed tests;
  the booking test proves the two retained autoscroll transitions still occur and
  the deliberately disabled transitions do not; external-prerequisite suites remain
  reachable through their focused commands; and changed files pass focused Biome
  checks.
- Required evidence: focused Jest results for each repaired cluster, Jest suite
  discovery proving prerequisite suites are partitioned, a full serial Jest result,
  focused Biome output, diff review, and fresh independent verification of the
  exact change before release.
- Current evidence: the ordinary serial Jest run passed 1,323 tests across 215
  suites; the OAuth PostgreSQL protocol fixture passed 7 tests; the repaired
  non-database clusters passed focused tests; and the promotions, invoices,
  property-sharing, and PDF commands each discovered their intended prerequisite
  suites. Focused Biome and final whitespace/diff checks passed.

## Blocked

### MW-WA-001 — Configure and verify live WhatsApp inbound auto-reply

- Status: `Blocked`
- Historical references: GitHub #17, #18, and #19
- Objective: configure the production Twilio sender webhook and verify that one
  real inbound message receives exactly one approved automatic response.
- Blocker: requires owner-authorized access to the live Twilio sender and the
  ignored private deployment runbook.
- Required access: the project owner supplies access and explicitly
  authorizes the live configuration and verification actions.
- Required evidence: secret-safe configuration preflight, unsigned-request
  rejection, real inbound response, unchanged outbound notification behavior,
  monitoring confirmation, and rollback confirmation.

## Deferred

### MW-WA-002 — Reply throttling or conversation state

- Status: `Deferred`
- Historical reference: GitHub #20
- Reconsider when response-window policy, persistence, privacy, retention,
  concurrency, abuse controls, and Twilio conversation constraints are decided.

### MW-GPT-001 — Remove dashboard `fileId` deep-link coupling

- Status: `Deferred`
- Historical reference: GitHub #94
- Reconsider if GPT file responses should stop linking to a specific dashboard
  file and instead use the generic authenticated `/dashboard/files` destination.

### MW-ADMIN-001 — Explicit admin roles, permissions, and Settings

- Status: `Deferred`
- Historical reference: GitHub #21
- Reconsider after selecting an invitation email provider, confirming the legacy
  role migration, and auditing all privileged operations.

### MW-ADMIN-002 — Customer-only admin management

- Status: `Deferred`
- Historical reference: GitHub #22
- Depends on the explicit staff access-control model and an accepted finance
  definition for net spend.

### MW-ANALYTICS-001 — Customer acquisition and funnel analytics

- Status: `Deferred`
- Historical reference: GitHub #23
- Reconsider after analytics, consent, attribution, privacy, and provider-access
  decisions are accepted.
