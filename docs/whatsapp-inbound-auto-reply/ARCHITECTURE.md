# WhatsApp inbound auto-reply architecture

- Last updated: 2026-06-30
- Status: `IN_REVIEW`

## Context

The application already sends WhatsApp messages through Twilio's REST API. Incoming replies currently have no application endpoint. Twilio must call a public endpoint, and the endpoint must return TwiML instructing Twilio whether to send a response.

## Target flow

```text
Customer WhatsApp
        |
        v
Twilio WhatsApp sender
        |
        | POST form payload + X-Twilio-Signature
        v
/api/webhooks/twilio/whatsapp
        |
        |-- reject missing/invalid configuration
        |-- verify signature against exact public callback URL
        |-- identify an inbound WhatsApp message
        |-- do not store or log message content
        v
TwiML <Response><Message>approved copy</Message></Response>
        |
        v
Twilio sends reply to customer
```

## Components

### Shared public contact configuration

A client-safe configuration module will expose the public contact details needed by both the landing page and the server-side webhook:

- E.164 phone number.
- Human-readable phone number.
- `tel:` link.
- WhatsApp link.

The number is public website content, not a secret. The contact form's operational WhatsApp destination may remain separately configurable because it serves a different purpose.

### Webhook route

The route will accept Twilio's form-encoded `POST` request. It will not call the existing outbound WhatsApp helper. Returning TwiML lets Twilio send the response as part of processing the inbound webhook and avoids a second REST request.

The route will distinguish inbound WhatsApp messages from unrelated callbacks by requiring the expected message identifier and WhatsApp-prefixed sender and recipient fields. Valid signed callbacks that are not inbound WhatsApp messages will receive empty TwiML.

### Signature validation

The route will validate `X-Twilio-Signature` using the existing server-only `TWILIO_AUTH_TOKEN`. Validation uses the exact externally configured callback URL plus the decoded request parameters. Comparison must be timing-safe.

Production must not reconstruct the public URL solely from proxy headers. The externally visible callback URL can differ from the internal request URL, causing either false rejection or unsafe trust in attacker-controlled forwarding headers.

## Data handling

- No new database tables or migrations are required.
- Inbound message bodies are used only to identify the request shape and are not persisted, forwarded, or included in logs.
- Full sender and recipient numbers are not logged.
- The Twilio auth token and request signature remain server-only.

## Failure behavior

| Condition | Behavior |
|---|---|
| Missing auth token or public webhook URL | Fail closed; return a service/configuration error without TwiML message instructions. |
| Missing or invalid Twilio signature | Reject the request without TwiML message instructions. |
| Malformed request body | Return a client error without a reply instruction. |
| Valid non-message callback | Return empty TwiML and do not contact the customer. |
| Valid inbound WhatsApp message | Return the approved TwiML response. |

## Integration boundaries

- Twilio owns inbound delivery, signature generation, webhook retries, and sending the TwiML response.
- The application owns request authentication, callback classification, reply copy, and public contact configuration.
- The existing outbound notification sender remains unchanged.

