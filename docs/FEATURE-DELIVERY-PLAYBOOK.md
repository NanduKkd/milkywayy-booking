# Feature Delivery Playbook

- Last updated: 2026-07-13
- Applies to: product, platform, API, dashboard, operational, and documentation work
- Workflow board: [GitHub Project 1](https://github.com/users/NanduKkd/projects/1)

## Authority model

The workflow separates planned intent from implemented truth:

| Concern | Authority |
|---|---|
| Feature idea, scope, non-goals, open decisions | Parent GitHub Issue |
| Bounded implementation contract and acceptance criteria | Task or bug GitHub Issue |
| Live workflow state and priority | GitHub Project 1 |
| Code, architecture, operations, security, and durable feature behavior | Reviewed repository files |
| Change set, verification, proof, and review | Pull request linked to the issue |

An issue may completely document a proposed feature without touching the
repository. Repository documentation changes only when knowledge becomes
durable—for example, when an implementation is accepted or an existing system
fact is corrected.

Legacy `docs/<feature>/TASKS.md` files preserve historical task IDs and evidence.
They are not live queues and must not be used by dispatch or recovery.

## Project status model

Use the Project `Status` field, not labels, for lifecycle state:

| Status | Meaning |
|---|---|
| `Draft` | Planning is incomplete or contains unresolved product questions. |
| `Ready` | The task is bounded, dependency-safe, testable, and approved for dispatch. |
| `In Progress` | The single implementation worker owns the task. |
| `In Review` | Implementation is pushed and awaits human review, requested proof, or merge. |
| `Done` | The change is merged and required evidence is recorded. |
| `Blocked` | Work cannot proceed without a named decision, dependency, or access grant. |
| `Deferred` | The owner explicitly removed the item from the active queue. |

Labels classify work—such as `type:feature`, `type:task`, `type:bug`,
`agent-ready`, `proof:manual`, or `blocker:access`—but never duplicate status.

## Planning a feature

Create a parent feature issue and keep it in `Draft` while planning. The issue
should describe:

- the problem and intended outcome;
- current and desired user journeys;
- scope and explicit non-goals;
- behavioral acceptance criteria;
- architecture, data, operations, security, and migration effects;
- decisions already made and unresolved questions;
- expected proof, including screenshots or recordings when useful;
- durable documentation expected to change when implemented.

Planning agents may update this issue and create draft child tasks. They must
not mark work `Ready`; publishing is the explicit handoff from planning to
implementation.

## Publishing implementation issues

Break approved scope into the smallest independently verifiable tasks that can
be implemented serially. Each issue needs:

- one clear outcome;
- in-scope and out-of-scope boundaries;
- behavioral acceptance criteria;
- dependencies and a link to its parent feature;
- verification commands or observable checks;
- required proof and documentation impact;
- enough context for an unattended worker to proceed without asking questions.

Only add `agent-ready` and move a task to `Ready` after dependencies and open
questions are resolved. Newly discovered work becomes a separate issue; do not
hide it inside an unrelated task.

## Implementing an issue

The controller allows one global implementation worker. It claims the next
eligible `Ready` issue, moves it to `In Progress`, creates
`codex/issue-<number>-<short-slug>` from the default branch, and launches or
resumes the recorded Codex session on that branch. Worktrees and parallel
implementation workers are not used.

The worker must:

1. Read the issue, parent feature, linked decisions, relevant docs, and `AGENTS.md`.
2. Implement only the issue scope and preserve unrelated user work.
3. Add focused tests and run checks proportional to risk.
4. Promote stable implementation details into the affected repository docs.
5. Capture requested proof without exposing secrets or private deployment data.
6. Commit with the issue reference, push the branch, and open or update a linked draft pull request.
7. Mark the pull request ready and move the issue to `In Review` only when agent-verifiable acceptance criteria pass.

The implementation worker never merges its own pull request and never moves an
issue directly to `Done`.

## Blocking and recovery

An unattended worker must not ask the owner questions directly. If a decision,
dependency, or access grant is required, it moves the issue to `Blocked` and
upserts one comment beginning with:

```html
<!-- codex-workflow-blocker -->
```

That comment records the blocker, evidence gathered, required input, and safe
next action. It is edited as the blocker changes so repeated runs do not pile
up comments. A no-work dispatch pass writes no issue comments.

Recovery checks the controller's stored issue, PID, and Codex session first. A
live PID is left alone. An interrupted `In Progress` worker is resumed on the
recorded branch and session when safe. If the issue is already `In Review`, the
state is cleared so a later pass can claim the next task. Ambiguous or unsafe
state is blocked rather than guessed through.

## Durable documentation

Use the existing feature folders under `docs/` for stable knowledge:

- `README.md`: shipped behavior, scope boundaries, and feature entry point;
- `ARCHITECTURE.md`: data flow, persistence, APIs, boundaries, and integrations;
- `DECISIONS.md`: accepted durable decisions and tradeoffs;
- `OPERATIONS.md`: safe rollout, monitoring, rollback, and support guidance;
- `SECURITY-TEST-PLAN.md`: security cases, release gates, and verification;
- verification reports: reproducible non-secret evidence.

Executable contracts and their tests belong under `src/contracts/`. Exact live
deployment details belong only in ignored `docs/private/` files.

When an issue and repository documentation disagree about shipped behavior,
verify the implementation, correct the durable docs in the pull request, and
record the correction in the issue or PR. Do not leave the accepted design only
in a completed issue.

## Completion rules

`In Review` requires:

- implementation and required docs committed and pushed;
- a linked pull request with exact test results;
- all agent-verifiable acceptance criteria satisfied;
- requested automated proof attached or linked;
- remaining human-only review called out explicitly.

`Done` requires merge plus the required review/evidence record. Code being
written locally is not completion, and code being merged is not sufficient if
required rollout or human proof is still missing.
