# AGENTS.md

## Purpose

Repository-local guidance for coding agents working on Milkywayy Booking.

## Before starting work

1. Open [GitHub Project 1](https://github.com/users/NanduKkd/projects/1) and the assigned GitHub Issue.
2. Work only on an open issue whose Project `Status` is `In Progress` and whose branch is the branch recorded by the workflow controller.
3. Read the issue, its parent feature issue, linked decisions, and the relevant files under `docs/` before changing code.
4. Do not begin `Draft`, `Blocked`, or `Deferred` work. Only the publishing workflow may promote planned work to `Ready`.

## Sources of truth

- GitHub Issues describe proposed features, tasks, bugs, acceptance criteria, dependencies, proof requirements, and blockers.
- [GitHub Project 1](https://github.com/users/NanduKkd/projects/1) is authoritative for workflow state: `Draft`, `Ready`, `In Progress`, `In Review`, `Done`, `Blocked`, or `Deferred`.
- The repository is authoritative for implemented behavior. Durable architecture, decisions, operations, security, and quality knowledge belongs in reviewed Markdown under `docs/` and changes with the implementation PR.
- Pull requests connect an issue to its code, documentation, verification, and review evidence.
- Existing feature `TASKS.md` files are historical delivery ledgers. Do not dispatch work from them or update them as live trackers.
- Notion is a migration archive only and is not authoritative for new work.

## Issue delivery workflow

- One implementation worker runs globally at a time. Do not create worktrees or parallel implementation branches.
- Use a branch named `codex/issue-<number>-<short-slug>` based on the repository's default branch.
- Move an issue to `In Progress` before implementation. Keep the issue ID in commits and the pull request body.
- Prefer small, direct commits. Push the issue branch and open a draft pull request once there is a meaningful review surface.
- Update affected durable docs in the same pull request as the code. Promote stable feature details from the issue into repository docs; do not leave implemented truth only in an issue.
- Capture requested proof. Put durable text evidence in the pull request or issue and upload screenshots, recordings, or other artifacts when requested.
- When implementation and agent-verifiable acceptance checks are complete, mark the pull request ready for review and move the issue to `In Review`. Agents do not merge their own pull requests.
- `Done` means the change is merged and its required evidence is recorded.

## Blocking and recovery

- Never ask the project owner a task question directly from an unattended implementation run.
- If work cannot continue safely, stop, preserve the branch, move the issue to `Blocked`, and upsert one canonical issue comment beginning with `<!-- codex-workflow-blocker -->`.
- The blocker comment must state what is blocked, evidence gathered, what decision or access is required, and the safe next action.
- Do not create repeated no-work or repeated blocker comments. Update the canonical comment when the blocker changes.
- Use `Deferred` only for an explicit product decision to remove work from the active queue; an implementation worker may not defer work on its own.
- Recovery may resume only the issue and Codex session recorded by the controller. If repository or issue state makes continuation unsafe, block the issue instead of guessing.

## Documentation boundaries

- Keep this file and the root `README.md` concise standalone entry points.
- Follow `docs/FEATURE-DELIVERY-PLAYBOOK.md` for feature and task documentation.
- Keep executable contracts and their tests in code-owned locations such as `src/contracts/`, not documentation folders.
- Keep exact live hostnames, IPs, filesystem paths, secret locations, external identifiers, credentials, and one-off operator commands only in ignored local files under `docs/private/`.
- Never copy secrets into GitHub, tracked files, logs, proof, comments, or documentation.

## Engineering expectations

- Preserve user changes in a dirty working tree and avoid unrelated cleanup.
- Keep domain logic in server actions or services rather than client components.
- Add Sequelize migrations for persisted schema changes.
- Add or update tests beside the affected implementation.
- Run focused checks proportional to the change and record exact results.
- If repo-wide tests or lint already fail, record the exact baseline rather than implying that it is green.
