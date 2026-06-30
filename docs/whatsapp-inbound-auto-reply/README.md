# WhatsApp inbound auto-reply delivery plan

- Last updated: 2026-06-30
- Planning status: `DONE`
- Implementation status: `NOT_STARTED`
- Target: Automatically direct inbound WhatsApp senders to the public contact phone number.

## Purpose

Milkywayy currently sends WhatsApp notifications through Twilio but does not handle replies. This feature adds a safe, consistent automatic response so customers know that inbound messages are not monitored and know which public phone number to use for support.

## Document index

- [TASKS.md](./TASKS.md): authoritative implementation tracker.
- [ARCHITECTURE.md](./ARCHITECTURE.md): target request flow and system boundaries.
- [DECISIONS.md](./DECISIONS.md): accepted decisions, proposals, and tradeoffs.
- [OPERATIONS.md](./OPERATIONS.md): configuration, rollout, monitoring, and rollback.
- [SECURITY-TEST-PLAN.md](./SECURITY-TEST-PLAN.md): security cases and release gates.

## Status model

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work is active and has an owner. |
| `BLOCKED` | Work cannot proceed; the blocker and required decision are documented. |
| `IN_REVIEW` | Work is complete and awaiting review or verification. |
| `DONE` | Acceptance criteria are satisfied and evidence is recorded. |
| `DEFERRED` | Work was explicitly removed from the current release. |

## Initial scope

- Add an inbound Twilio WhatsApp webhook endpoint.
- Verify that webhook requests were signed by Twilio before responding.
- Return an automatic TwiML response for valid inbound WhatsApp messages.
- Direct customers to the phone number displayed in the landing-page contact section.
- Define the public phone number once and reuse it in the landing page and auto-reply.
- Add automated tests for request validation, response behavior, and XML escaping.
- Document Twilio configuration, rollout, monitoring, and rollback.

## Approved customer message

> Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website.

This copy is approved for implementation. It deliberately avoids claiming that messages are invisible to everyone, because Twilio and authorized operational systems may process or retain them.

## Explicit non-goals

- A staffed two-way WhatsApp support inbox.
- Reading, storing, classifying, or forwarding inbound message content.
- Automated responses based on message content.
- Per-sender throttling or conversation-window persistence in the first release.
- Changes to existing outbound WhatsApp notification templates.
- A claim that inbound messages are inaccessible to Twilio, infrastructure providers, or authorized operators.

## Delivery estimate

| Milestone | Estimate |
|---|---:|
| M0 - Scope and decisions | 1-2 h |
| M1 - Shared contact configuration | 1 h |
| M2 - Signed webhook and auto-reply | 2-3 h |
| M3 - Verification and rollout | 1-2 h |

## Completion criteria

- The final customer-facing copy is approved.
- The landing page and auto-reply use the same public phone configuration.
- Invalid or unsigned requests cannot trigger a WhatsApp response.
- Valid inbound WhatsApp messages receive the approved response.
- Focused tests and lint checks pass.
- Production configuration and manual Twilio validation are recorded in `TASKS.md` without committing sensitive deployment details.
- Rollback instructions are usable and do not require a code revert as the first response.
