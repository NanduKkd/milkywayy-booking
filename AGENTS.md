# AGENTS.md

## Purpose

This file gives repo-local guidance to Codex and other coding agents working in this workspace.

## Documentation workflow

- For multi-file or release-relevant work, follow [docs/FEATURE-DELIVERY-PLAYBOOK.md](/Users/nandakrishnan/code/milkywayy-booking/docs/FEATURE-DELIVERY-PLAYBOOK.md).
- For feature-sized work, create or update a dedicated `docs/<feature-slug>/` folder instead of scattering planning notes across unrelated files.
- Treat each feature `README.md` as the delivery contract and `TASKS.md` as the authoritative progress tracker.
- Update task status and implementation evidence in the same change as the code.

## Deployment and secrets

- Do not commit exact live deployment details, hostnames, IPs, filesystem paths, secret locations, or one-off operator commands into tracked docs.
- Keep exact deployment specifics only in the local ignored file `docs/private/PRODUCTION-DEPLOYMENT.md`.
- Tracked docs may reference `docs/private/PRODUCTION-DEPLOYMENT.md` when operators need exact live details.
- Never commit secrets or copy them into repo documentation.

## Current repo notes

- The GPT Actions OAuth feature is documented under `docs/gpt-actions-oauth/`.
- The root `README.md` is still mostly boilerplate and should not be treated as the authoritative project status document.
- Current repo health is summarized in `docs/PROJECT-STATUS.md`.

## Working expectations

- Prefer small, direct changes over broad cleanup unless cleanup is part of the task.
- Do not silently rewrite unrelated docs while working on a feature.
- If tests or lint are already failing, record that clearly instead of implying a green baseline.
