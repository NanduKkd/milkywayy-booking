# AGENTS.md

## Purpose

Repository-local guidance for coding agents working on Milkywayy Booking.

## Project context

- Read the relevant maintained documentation under `docs/` before changing a
  feature or operational boundary.
- [`docs/PENDING-TASKS.md`](docs/PENDING-TASKS.md) records unfinished work and
  blockers.
- The repository is authoritative for implemented behavior. Durable
  architecture, decisions, operations, security, and quality knowledge belongs
  in maintained Markdown under `docs/` and changes with the implementation.
- Existing feature `TASKS.md` files, GitHub Issues, projects, pull requests, and
  the former Notion workspace are historical or optional supporting context.

## Change boundaries

- Confirm the requested outcome, relevant scope, exclusions, and acceptance
  criteria before making material changes. Ask when ambiguity would materially
  change the result.
- Preserve user changes in a dirty working tree and avoid unrelated cleanup.
- Do not open a pull request, push, deploy, or mutate production or another
  external system unless the user explicitly authorizes it.
- Keep exact live hostnames, IPs, filesystem paths, secret locations, external
  identifiers, credentials, and one-off operator commands only in ignored local
  files under `docs/private/`.
- Never copy secrets into tracked files, logs, proof, or external systems.

## Engineering expectations

- Keep domain logic in server actions or services rather than client components.
- Add Sequelize migrations for persisted schema changes.
- Add or update tests beside the affected implementation.
- Keep executable contracts and their tests in code-owned locations such as
  `src/contracts/`, not documentation folders.
- Update durable documentation when behavior, interfaces, architecture,
  operations, security boundaries, or accepted decisions materially change.

## Verification

- Follow [`docs/CHANGE-VERIFICATION.md`](docs/CHANGE-VERIFICATION.md).
- Run focused checks that cover the changed behavior and broader checks when the
  possible impact justifies them.
- Record the exact commands and results. If a repository-wide check already
  fails, record the exact baseline rather than implying that it is green.
- Security-sensitive, migration, authorization, concurrency, destructive-data,
  and production-facing changes should receive fresh independent review or
  verification of the exact change before release.
- Prefer repository-provided automated checks. When required behavior cannot be
  verified automatically, describe the precise manual evidence still needed.
