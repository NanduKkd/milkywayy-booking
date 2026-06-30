# WhatsApp inbound auto-reply decision log

- Last updated: 2026-06-30

## Status values

| Status | Meaning |
|---|---|
| `PROPOSED` | Recommended but awaiting owner approval or implementation validation. |
| `ACCEPTED` | Governs implementation. |
| `REJECTED` | Considered and not selected. |
| `SUPERSEDED` | Replaced by a later decision. |

## Decisions

### DEC-001 - Describe the inbox as unmonitored

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Use: "Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website."
- Reason: This communicates the operational limitation and gives a clear support path without making an absolute privacy claim.
- Consequence: Implementation should use this exact customer-facing copy unless a later decision supersedes it.

### DEC-002 - Do not claim messages are invisible to everyone

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: The response must not say that a message is "not visible to anyone else" or make an equivalent absolute claim.
- Reason: Twilio, infrastructure providers, and authorized operational systems may process or retain webhook data. The application cannot guarantee universal invisibility.
- Consequence: Customer copy describes whether the inbox is monitored, not an unverifiable confidentiality property.

### DEC-003 - Return TwiML from the webhook

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Respond to valid inbound messages with TwiML instead of making a separate outbound Twilio REST API request.
- Reason: TwiML is the direct Twilio webhook response mechanism and avoids duplicate sender configuration and an additional network call.
- Consequence: Twilio's inbound webhook processing controls delivery of the automatic response.

### DEC-004 - Require Twilio request signatures

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Reject requests that do not have a valid `X-Twilio-Signature` calculated with the existing Twilio auth token and exact public callback URL.
- Reason: The endpoint is public. Without request validation, an unrelated caller could trigger business-branded WhatsApp responses.
- Consequence: Production requires an explicit public webhook URL configuration, and configuration errors fail closed.

### DEC-005 - Reuse one public contact source

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Define the public contact number once and consume it from both the landing page and the auto-reply.
- Reason: Duplicated contact details can drift and cause the automated response to contradict the website.
- Consequence: The shared values must be safe for client-side use and must not contain secrets.

### DEC-006 - Reply to every valid inbound message in the first release

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Return the auto-reply for each valid inbound WhatsApp message without sender-level throttling.
- Reason: This matches the requested behavior and avoids adding durable conversation state to a small first release.
- Consequence: Customers who send several messages will receive several responses. Throttling requires a separate product rule and persistent state and is deferred as `FOLLOWUP-001`.

### DEC-007 - Do not retain inbound content

- Status: `ACCEPTED`
- Date: 2026-06-30
- Decision: Do not persist, forward, classify, or log inbound message content.
- Reason: The feature only needs to communicate that the inbox is unmonitored and provide a contact route.
- Consequence: The application cannot provide conversation history, analytics based on message content, or content-dependent responses.
