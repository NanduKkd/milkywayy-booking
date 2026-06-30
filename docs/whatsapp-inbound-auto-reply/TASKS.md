# WhatsApp inbound auto-reply task tracker

- Last updated: 2026-07-01
- Overall implementation status: `BLOCKED`
- Current milestone: `M3 - Verification and rollout`

This is the authoritative progress tracker. Status values and update rules are defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scope and decisions | `DONE` | 3 | 3 | 1-2 h |
| M1 - Shared contact configuration | `DONE` | 1 | 1 | 1 h |
| M2 - Signed webhook and auto-reply | `DONE` | 2 | 2 | 2-3 h |
| M3 - Verification and rollout | `BLOCKED` | 2 | 4 | 1-2 h |

## M0 - Scope and decisions

### PLAN-001 - Define the feature contract

- Status: `DONE`
- Owner: `Codex`
- Estimate: 30 min
- Depends on: None
- Evidence:
  - Scope, non-goals, estimates, and completion criteria are documented in `README.md`.
  - Request flow and boundaries are documented in `ARCHITECTURE.md`.

Acceptance criteria:

- The first-release behavior and exclusions are explicit.
- Completion requires implementation, verification, and operational readiness rather than code alone.

### PLAN-002 - Record security and operational decisions

- Status: `DONE`
- Owner: `Codex`
- Estimate: 30 min
- Depends on: PLAN-001
- Evidence:
  - Initial decisions and tradeoffs are recorded in `DECISIONS.md`.
  - Release, rollback, and security gates are documented in `OPERATIONS.md` and `SECURITY-TEST-PLAN.md`.

Acceptance criteria:

- The design rejects unsigned webhook requests.
- Tracked documentation does not contain live hostnames, credentials, or one-off production commands.

### COPY-001 - Approve customer-facing response

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 15 min
- Depends on: PLAN-001
- Evidence:
  - Approved wording is documented in `README.md` and `DECISIONS.md`.
  - Project owner approval was received on 2026-06-30 in the delivery thread.

Acceptance criteria:

- The message clearly states that the inbox is not monitored.
- The message includes the landing-page phone number.
- The message does not make an absolute or unverifiable privacy claim.

## M1 - Shared contact configuration

### CONFIG-001 - Centralize the public contact number

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1 h
- Depends on: COPY-001
- Evidence:
  - Shared public contact configuration was added in `src/lib/config/publicContact.js`.
  - The approved inbound auto-reply copy now reads the shared display number via `src/lib/notifications/whatsappInboundAutoReply.js`.
  - Landing-page and related public WhatsApp/contact links now consume the shared configuration in `src/components/landing/ContactSection.js`, `src/components/landing/FinalCTASection.js`, and `src/app/portfolio/page.js`.
  - The contact-form fallback destination now reuses the shared configuration in `src/app/api/contact/route.js` while preserving the `CONTACT_WHATSAPP_TO` override.
  - Verified with `npm test -- --runInBand src/lib/config/__tests__/publicContact.test.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js`.
  - Verified with `npx biome check src/lib/config/publicContact.js src/lib/notifications/whatsappInboundAutoReply.js src/lib/config/__tests__/publicContact.test.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/components/landing/ContactSection.js src/components/landing/FinalCTASection.js src/app/portfolio/page.js src/app/api/contact/route.js`.

Acceptance criteria:

- One shared module defines the public E.164 number, display number, telephone link, and WhatsApp link.
- The landing-page contact section consumes the shared configuration without changing its visible number.
- The auto-reply body consumes the same display number.
- Existing contact-form routing can retain an environment-specific destination when operationally required.

## M2 - Signed webhook and auto-reply

### WEBHOOK-001 - Add Twilio signature verification

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: PLAN-002
- Evidence:
  - Added signed inbound webhook route scaffolding at `src/app/api/webhooks/twilio/whatsapp/route.js`.
  - Added local Twilio signature verification and callback URL resolution helpers at `src/lib/notifications/whatsappInboundWebhook.js`.
  - Verified valid and invalid signature behavior, production fail-closed URL requirements, decoded form parsing, and callback classification with `npm test -- --runInBand src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.
  - Verified formatting and lint expectations with `npx biome check src/lib/notifications/whatsappInboundWebhook.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/app/api/webhooks/twilio/whatsapp/route.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.

Acceptance criteria:

- The endpoint validates `X-Twilio-Signature` with the existing Twilio auth token.
- Production validation uses an explicitly configured public webhook URL.
- Missing configuration fails closed.
- Invalid requests do not return a message instruction.
- Logs do not contain message bodies, credentials, signatures, or full phone numbers.

### WEBHOOK-002 - Return the inbound WhatsApp auto-reply

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1 h
- Depends on: CONFIG-001, WEBHOOK-001
- Evidence:
  - Valid inbound WhatsApp callbacks now return the approved TwiML message from `src/app/api/webhooks/twilio/whatsapp/route.js`.
  - XML-safe TwiML generation now lives in `src/lib/notifications/whatsappInboundAutoReply.js`.
  - Verified inbound reply behavior and XML escaping with `npm test -- --runInBand src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.
  - Verified formatting and lint expectations with `npx biome check src/lib/notifications/whatsappInboundAutoReply.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/route.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.

Acceptance criteria:

- A valid inbound WhatsApp message receives TwiML containing the approved copy.
- Non-message callbacks do not trigger the customer response.
- XML-special characters are escaped safely.
- The endpoint does not persist or forward inbound message content.

## M3 - Verification and rollout

### TEST-001 - Add focused automated coverage

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1 h
- Depends on: CONFIG-001, WEBHOOK-001, WEBHOOK-002
- Evidence:
  - Expanded route-level webhook coverage in `src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js` to cover tampered signatures, missing `TWILIO_AUTH_TOKEN`, and empty form payload rejection.
  - Verified helper and route coverage for valid signatures, invalid signatures, missing configuration, non-message payloads, approved reply content, and XML escaping with `npm test -- --runInBand src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.
  - Verified formatting and lint expectations with `npx biome check src/lib/notifications/whatsappInboundWebhook.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/whatsappInboundAutoReply.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/route.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.

Acceptance criteria:

- Tests cover valid signatures, invalid signatures, missing configuration, non-message payloads, approved reply content, and XML escaping.
- Focused Jest and Biome checks pass and their commands are recorded as evidence.

### TEST-002 - Add public contact regression coverage

- Status: `DONE`
- Owner: `Codex`
- Estimate: 30 min
- Depends on: CONFIG-001
- Evidence:
  - Added landing-page contact section coverage in `src/components/landing/__tests__/ContactSection.test.js` to verify the public phone and WhatsApp links still consume `PUBLIC_CONTACT`.
  - Expanded `src/app/portfolio/__tests__/page.test.js` so the portfolio CTA still points at the shared public WhatsApp link.
  - Added contact-route coverage in `src/app/api/contact/__tests__/route.test.js` to verify the handler falls back to the shared public E.164 number while preserving the `CONTACT_WHATSAPP_TO` override.
  - Verified with `npm test -- --runInBand src/lib/config/__tests__/publicContact.test.js src/components/landing/__tests__/ContactSection.test.js src/app/portfolio/__tests__/page.test.js src/app/api/contact/__tests__/route.test.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.
  - Verified with `npx biome check src/lib/config/publicContact.js src/components/landing/ContactSection.js src/components/landing/__tests__/ContactSection.test.js src/app/portfolio/page.js src/app/portfolio/__tests__/page.test.js src/app/api/contact/route.js src/app/api/contact/__tests__/route.test.js src/lib/notifications/whatsappInboundWebhook.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/whatsappInboundAutoReply.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/route.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.

Acceptance criteria:

- Automated tests verify the landing-page phone and WhatsApp links still use the shared public contact configuration.
- Automated tests verify the portfolio CTA still links to the shared public WhatsApp destination.
- Automated tests verify the contact-route fallback still uses the shared public E.164 number unless `CONTACT_WHATSAPP_TO` overrides it.

### OPS-001 - Configure the Twilio inbound webhook

- Status: `BLOCKED`
- Owner: `Project owner`
- Estimate: 30 min
- Depends on: TEST-001
- Evidence:
  - Re-ran the focused feature checks on 2026-07-01 with `npm test -- --runInBand src/lib/config/__tests__/publicContact.test.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js` and `npx biome check src/lib/config/publicContact.js src/lib/config/__tests__/publicContact.test.js src/lib/notifications/whatsappInboundWebhook.js src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/lib/notifications/whatsappInboundAutoReply.js src/lib/notifications/__tests__/whatsappInboundAutoReply.test.js src/app/api/webhooks/twilio/whatsapp/route.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js src/components/landing/ContactSection.js src/components/landing/FinalCTASection.js src/app/portfolio/page.js src/app/api/contact/route.js`.
  - Added shared environment documentation for `TWILIO_WHATSAPP_WEBHOOK_URL` in `docs/DEVELOPMENT.md` so the required production callback variable is tracked outside the feature folder without committing the live value.
  - Added stricter configured callback URL validation in `src/lib/notifications/whatsappInboundWebhook.js` so production fails closed unless `TWILIO_WHATSAPP_WEBHOOK_URL` is a valid HTTPS URL without embedded credentials or fragments.
  - Verified configured callback URL validation behavior with `npm test -- --runInBand src/lib/notifications/__tests__/whatsappInboundWebhook.test.js src/app/api/webhooks/twilio/whatsapp/__tests__/route.test.js`.
  - Production Twilio sender configuration and the exact callback URL entry in `docs/private/PRODUCTION-DEPLOYMENT.md` are still pending manual completion.
  - Blocked pending manual access to the live Twilio sender configuration and the local-only production deployment runbook.

Acceptance criteria:

- The Twilio WhatsApp sender is configured to send inbound message webhooks to the production endpoint using `POST`.
- The application has the exact public callback URL available for signature verification.
- Exact live values remain in `docs/private/PRODUCTION-DEPLOYMENT.md`, not tracked documentation.

### VERIFY-001 - Complete release verification

- Status: `BLOCKED`
- Owner: `Project owner`
- Estimate: 30 min
- Depends on: OPS-001
- Evidence:
  - Confirmed on 2026-07-01 that no further repository-only implementation tasks remain for this feature; the remaining work is live Twilio configuration and manual end-to-end validation.
  - Blocked pending OPS-001 completion because real inbound-message verification requires the live Twilio webhook to be attached and a production-reachable callback URL to be configured.

Acceptance criteria:

- A real inbound WhatsApp message receives exactly one approved response.
- An invalid-signature request receives no message response.
- Existing outbound WhatsApp notifications still send normally.
- Monitoring and rollback checks in `OPERATIONS.md` are completed.

## Deferred work

### FOLLOWUP-001 - Add reply throttling or conversation state

- Status: `DEFERRED`
- Owner: `Unassigned`
- Estimate: 2-4 h
- Depends on: VERIFY-001
- Evidence:
  - Deferred from the first release in `DECISIONS.md`.

Acceptance criteria:

- A future decision defines the response window, durable storage, cleanup, and retry semantics before implementation.
