# WhatsApp inbound auto-reply security and test plan

- Last updated: 2026-06-30
- Verification status: `NOT_STARTED`

## Security objectives

- Only Twilio can cause the endpoint to return a WhatsApp reply instruction.
- Credentials and request signatures remain server-only.
- Inbound customer content is not retained or logged.
- The response cannot produce malformed or attacker-controlled XML.
- Configuration failures stop replies rather than bypassing validation.

## Threats and controls

| Threat | Required control |
|---|---|
| Forged public webhook request | Validate `X-Twilio-Signature` using the Twilio auth token. |
| Signature bypass through forwarded host headers | Validate against an explicitly configured exact public callback URL in production. |
| Timing-based signature comparison | Use constant-time comparison for equal-length signature values. |
| XML injection from configurable copy | Escape XML-special characters before constructing TwiML. |
| Customer data leakage through logs | Never log message bodies, signatures, credentials, or full phone numbers. |
| Accidental response to a status callback | Require inbound WhatsApp message fields before adding a TwiML message. |
| Unsafe missing configuration | Return an error without TwiML message instructions. |

## Automated test cases

### Signature validation

- Accept a correctly signed form payload for the configured callback URL.
- Reject a missing signature.
- Reject an altered signature.
- Reject a signature when a form value changes after signing.
- Reject a signature generated for a different URL.
- Fail closed when the auth token is missing.
- Fail closed in production when the exact webhook URL is missing.

### Webhook behavior

- Return the approved response for a valid inbound WhatsApp message.
- Include the public landing-page phone number in the response.
- Return XML with the correct content type.
- Return empty TwiML for a valid non-message callback.
- Return no message instruction for unsigned or malformed requests.
- Escape `&`, `<`, `>`, quotes, and apostrophes in generated XML.
- Do not invoke the existing outbound Twilio REST sender.

### Regression coverage

- Existing outbound WhatsApp notification tests continue to pass.
- The landing-page contact section continues to display and link the same phone number.
- The public contact form retains its configured destination behavior.

## Manual release checks

1. Confirm the Twilio webhook method and callback URL match the application configuration exactly.
2. Send one inbound WhatsApp message and verify exactly one approved response.
3. Confirm the response phone number matches the landing page.
4. Send multiple messages and confirm the documented first-release behavior of one response per message.
5. Submit an unsigned request and verify it cannot trigger a response.
6. Confirm sanitized logs contain no message body, signature, token, or full phone number.
7. Send one existing outbound notification and verify no regression.

## Release gates

- `COPY-001` is approved.
- `CONFIG-001`, `WEBHOOK-001`, `WEBHOOK-002`, and `TEST-001` are `DONE` with evidence.
- Focused Jest tests pass.
- Biome checks pass for changed code.
- Manual Twilio validation is recorded under `VERIFY-001`.
- Rollback access and procedure are confirmed.

## Residual risks

- Twilio may retry a webhook after a timeout, which can produce a duplicate response. The endpoint should respond quickly, but durable retry deduplication is outside the first-release scope.
- Replying to every inbound message can create repetitive responses for customers who send several short messages. Sender-level throttling is deferred.
- Twilio and infrastructure providers process webhook metadata even though the application does not persist inbound content.

