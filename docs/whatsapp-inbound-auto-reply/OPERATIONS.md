# WhatsApp inbound auto-reply operations

- Last updated: 2026-07-01
- Release status: `NOT_STARTED`

## Configuration

The implementation is expected to use these server-side values:

| Variable | Purpose | Required |
|---|---|---|
| `TWILIO_AUTH_TOKEN` | Validates that inbound requests were signed by Twilio. | Yes |
| `TWILIO_WHATSAPP_WEBHOOK_URL` | Exact externally visible callback URL used during signature validation. | Yes in production |

The existing outbound WhatsApp variables remain unchanged. Do not place real tokens, callback hostnames, or environment-specific commands in this tracked document. Record exact live values and operator-specific procedures in `docs/private/PRODUCTION-DEPLOYMENT.md`.

## Twilio configuration

- Configure the WhatsApp sender's inbound message webhook to use `POST`.
- Point it to the deployed `/api/webhooks/twilio/whatsapp` path.
- Ensure `TWILIO_WHATSAPP_WEBHOOK_URL` exactly matches the complete URL configured in Twilio, including scheme, host, path, port when non-default, and query string when present.
- In production, `TWILIO_WHATSAPP_WEBHOOK_URL` must use `https` and must not include embedded credentials or a URL fragment.
- Do not configure delivery-status callbacks to use the inbound message endpoint.

## Rollout

1. Deploy the code with the auth token and exact public webhook URL configured.
2. Confirm the endpoint rejects an unsigned test request.
3. Configure the Twilio inbound webhook.
4. Send one WhatsApp message from a non-business test number.
5. Confirm exactly one approved response arrives and includes the website's displayed phone number.
6. Send an existing outbound notification and confirm its behavior is unchanged.
7. Record validation evidence in `TASKS.md`.

## Monitoring

Monitor aggregate response status without logging customer content or full phone numbers:

- Count successful inbound webhook responses.
- Count invalid-signature rejections.
- Count malformed payloads.
- Alert on sustained server errors or sudden invalid-signature spikes.
- Review Twilio webhook delivery diagnostics when expected responses are missing.

## Failure triage

| Symptom | Likely cause | Check |
|---|---|---|
| All requests are rejected | Public callback URL mismatch or incorrect auth token | Compare the configured URL with Twilio's exact request URL and verify the secret source. |
| Valid messages receive no response | Webhook not attached to the WhatsApp sender or callback classified as non-message | Review Twilio delivery diagnostics and sanitized application status logs. |
| Multiple responses arrive | Multiple inbound messages, Twilio retries after a timeout, or duplicate webhook configuration | Review Twilio request identifiers and webhook delivery attempts without inspecting message content. |
| Outbound notifications fail | Separate outbound configuration issue | Verify existing sender configuration; the inbound route should not modify it. |

## Rollback

1. Remove or disable the inbound message webhook in Twilio to stop automatic replies immediately.
2. Leave outbound notification configuration unchanged.
3. Investigate using sanitized status logs and Twilio delivery diagnostics.
4. Re-enable only after signature validation and reply behavior pass manual verification.

Removing the Twilio webhook is the preferred operational rollback because it stops the behavior without requiring an application rollback.
