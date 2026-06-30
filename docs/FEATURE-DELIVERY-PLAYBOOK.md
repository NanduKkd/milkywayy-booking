# Feature Delivery Playbook

- Last updated: 2026-06-30
- Applies to: new product, platform, API, dashboard, and operational features
- Reference example: [`docs/gpt-actions-oauth/`](/Users/nandakrishnan/code/milkywayy-booking/docs/gpt-actions-oauth/README.md)

## Purpose

This playbook defines how Milkywayy should plan, track, implement, and close new features.

It intentionally follows the same working style used for the GPT Actions OAuth feature:

- a dedicated `docs/<feature-slug>/` folder
- a README that acts as the delivery contract
- a task tracker that is the single source of truth for progress
- supporting docs for architecture, decisions, operations, and verification
- task updates made in the same change as implementation work

Use this playbook for any feature that spans multiple files, multiple milestones, production risk, or cross-functional decisions. Small one-file fixes do not need the full process.

## Standard feature documentation set

Create a new folder at `docs/<feature-slug>/`.

Recommended files:

- `README.md`: feature purpose, scope, status model, delivery estimate, milestones, and completion criteria.
- `TASKS.md`: authoritative implementation tracker with milestones, dependencies, acceptance criteria, and evidence.
- `ARCHITECTURE.md`: target design, flows, data model, boundaries, and integration points.
- `DECISIONS.md`: accepted decisions, open questions, non-goals, and important tradeoffs.
- `OPERATIONS.md`: rollout, configuration, migrations, monitoring, rollback, and support procedures.
- `SECURITY-TEST-PLAN.md`: security cases, release gates, automated checks, and manual validation.

Add these only when needed:

- `INTEGRATION-RECORD.md`: external system IDs, callback URLs, partner configuration, or environment-specific integration details.
- `SECURITY-VERIFICATION-REPORT.md`: generated or maintained verification evidence for release review.
- feature-specific artifacts such as OpenAPI files, diagrams, sample payloads, or test fixtures.

If documents disagree:

- `DECISIONS.md` controls architectural and product decisions.
- `TASKS.md` controls implementation status.
- `OPERATIONS.md` controls release and recovery procedure.

Sensitive deployment details such as hostnames, IPs, filesystem paths, secret locations, or exact operator commands should not live in tracked docs. Keep those in a local-only ignored file such as `docs/private/PRODUCTION-DEPLOYMENT.md`, and reference that path from tracked docs when operators need the exact live details.

## Delivery flow

### 1. Create the feature folder and contract

Start by creating `docs/<feature-slug>/README.md` and `docs/<feature-slug>/TASKS.md`.

Before implementation starts, the README should define:

- the problem being solved
- explicit in-scope deliverables
- explicit non-goals
- status values and update rules
- rough milestone estimates
- what "done" means for the feature

The first version does not need perfect detail, but it must make scope boundaries clear enough that implementation does not drift.

### 2. Break work into milestones and task IDs

Track work in milestones, then break milestones into stable task IDs such as:

- `AUTH-001`
- `API-003`
- `OPS-002`
- `UI-004`

Task IDs must stay stable once referenced in commits, reviews, or release notes.

Each task should include:

- status
- owner
- estimate
- dependencies
- acceptance criteria
- evidence once implemented

Do not hide newly discovered work inside an existing task. Add a new task ID instead.

### 3. Capture design before code spreads

Write `ARCHITECTURE.md` once the feature affects data flow, APIs, persistence, background jobs, permissions, or operational behavior.

Write `DECISIONS.md` as soon as there are meaningful choices to lock down:

- scope cuts
- protocol choices
- storage approaches
- rollout strategy
- security constraints
- compatibility rules

Implementation should follow accepted decisions. If the implementation changes direction, update the decision record first.

### 4. Implement against tracked tasks

Every meaningful code change should map to one or more task IDs.

In the same change that adds the implementation:

- update the relevant task status
- add evidence for tests or checks that passed
- update milestone counts if they changed
- update the README date if the feature status materially changed

This keeps the docs current and prevents the tracker from becoming fiction.

### 5. Verify like release work, not just coding work

For features with user data, auth, payments, external integrations, or operational risk, add `SECURITY-TEST-PLAN.md`.

That plan should define:

- automated test cases
- manual validation steps
- failure cases
- release gates
- what remains blocked if a gate is not complete

When practical, record final verification in a dedicated report or in task evidence entries.

### 6. Close the feature deliberately

A feature is complete only when:

- all release-blocking tasks are `DONE`
- acceptance criteria are satisfied
- required automated checks pass
- required manual checks are recorded
- rollout and rollback steps are documented
- residual risks or deferred scope are explicitly documented

Do not treat "code merged" as equal to "feature complete".

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

1. Update `TASKS.md` in the same change as the implementation.
2. Mark a task `DONE` only after acceptance criteria and relevant tests pass.
3. Add newly discovered scope as a new task ID.
4. Record architecture or security changes in `DECISIONS.md` before implementing them.
5. Update the `Last updated` date in the feature docs when status materially changes.

## Recommended operating rules

- Keep one authoritative tracker: `TASKS.md`.
- Use milestone-level summaries at the top so progress is visible quickly.
- Write evidence as concrete commands, tests, review notes, or production checks.
- Keep acceptance criteria behavioral, not vague.
- Separate first-release scope from later ideas.
- Record blockers explicitly instead of leaving stale `IN_PROGRESS` tasks.
- Keep docs in the repo so code review and delivery history stay tied together.

## Suggested folder template

```text
docs/
  <feature-slug>/
    README.md
    TASKS.md
    ARCHITECTURE.md
    DECISIONS.md
    OPERATIONS.md
    SECURITY-TEST-PLAN.md
```

Extend only when the feature truly needs more artifacts.

## README template

```md
# <Feature name> delivery plan

- Last updated: YYYY-MM-DD
- Planning status: `NOT_STARTED`
- Implementation status: `NOT_STARTED`
- Target: <one-line release target>

## Purpose

<What the feature does and why it exists.>

## Document index

- [TASKS.md](./TASKS.md): authoritative implementation tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): target design and boundaries.
- [DECISIONS.md](./DECISIONS.md): accepted decisions and open questions.
- [OPERATIONS.md](./OPERATIONS.md): rollout, config, monitoring, and rollback.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): release gates and verification.

## Status model

<Reuse the standard status table from this playbook.>

## Initial scope

- <Deliverable 1>
- <Deliverable 2>

## Explicit non-goals

- <Non-goal 1>
- <Non-goal 2>

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Scope and decisions | <time> |
| M1 - Foundation | <time> |
| M2 - Core implementation | <time> |
| M3 - Verification and rollout | <time> |

## Milestone completion definition

- <Condition 1>
- <Condition 2>
```

## TASKS template

```md
# <Feature name> task tracker

- Last updated: YYYY-MM-DD
- Overall implementation status: `NOT_STARTED`
- Current milestone: `Not started`

This is the authoritative progress tracker. Status values and update rules are defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scope and decisions | `NOT_STARTED` | 0 | 0 | <time> |
| M1 - Foundation | `NOT_STARTED` | 0 | 0 | <time> |
| M2 - Core implementation | `NOT_STARTED` | 0 | 0 | <time> |
| M3 - Verification and rollout | `NOT_STARTED` | 0 | 0 | <time> |

## M0 - Scope and decisions

### FEAT-001 - Define first-release scope

- Status: `NOT_STARTED`
- Owner: `<owner>`
- Estimate: <time>
- Depends on: None
- Evidence:
  - None yet.

Acceptance criteria:

- First-release scope is explicitly listed in `README.md`.
- Non-goals are explicitly listed in `README.md`.
- Open questions are captured in `DECISIONS.md`.

### FEAT-002 - Lock architecture and rollout constraints

- Status: `NOT_STARTED`
- Owner: `<owner>`
- Estimate: <time>
- Depends on: FEAT-001
- Evidence:
  - None yet.

Acceptance criteria:

- Architecture boundaries are documented.
- External dependencies and rollout constraints are documented.
- Security or operational risks are mapped to follow-up tasks.
```

## DECISIONS template

```md
# <Feature name> decisions

- Last updated: YYYY-MM-DD

## Status legend

| Status | Meaning |
|---|---|
| `PROPOSED` | Recommended but awaiting approval or validation. |
| `ACCEPTED` | Governs implementation. |
| `REJECTED` | Considered and explicitly not chosen. |
| `SUPERSEDED` | Replaced by a later decision. |

### DEC-001 - <Decision title>

- Status: `PROPOSED`
- Date: YYYY-MM-DD
- Owners: <owner>
- Context: <why this decision matters>
- Decision: <what is being chosen>
- Consequence: <what this means for implementation and operations>
```

## What to copy from the OAuth example

For larger features, reuse these patterns from the OAuth documentation set:

- The README is the feature contract, not just a summary.
- `TASKS.md` contains milestone summaries plus task-level evidence.
- Each task has explicit acceptance criteria.
- Decisions are documented as durable records with consequences.
- Verification is treated as first-class delivery work.
- Operational readiness is documented before release, not after incident response.

## When not to use the full process

You can skip the full document set when the work is:

- a one-file bug fix
- a dependency bump with no behavior change
- a copy update
- a narrowly scoped refactor with no product or operational impact

In those cases, a short issue, PR description, or lightweight note is enough.
