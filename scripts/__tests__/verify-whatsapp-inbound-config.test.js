import { spawnSync } from "node:child_process";

const scriptPath = "scripts/verify-whatsapp-inbound-config.mjs";

function runVerifier(envOverrides = {}) {
  return spawnSync("node", [scriptPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

describe("verify-whatsapp-inbound-config", () => {
  it("passes with a sanitized production-ready configuration", () => {
    const result = runVerifier({
      NODE_ENV: "production",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_WHATSAPP_WEBHOOK_URL:
        "https://example.com/api/webhooks/twilio/whatsapp",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Configuration check passed.");
    expect(result.stdout).toContain("Environment: production.");
    expect(result.stderr).toBe("");
  });

  it("fails when the auth token is missing", () => {
    const result = runVerifier({
      NODE_ENV: "production",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_WHATSAPP_WEBHOOK_URL:
        "https://example.com/api/webhooks/twilio/whatsapp",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TWILIO_AUTH_TOKEN is missing.");
  });

  it("fails when the webhook url is missing", () => {
    const result = runVerifier({
      NODE_ENV: "production",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_WHATSAPP_WEBHOOK_URL: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TWILIO_WHATSAPP_WEBHOOK_URL is missing.");
  });

  it("fails when the webhook url does not target the inbound route path", () => {
    const result = runVerifier({
      NODE_ENV: "production",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_WHATSAPP_WEBHOOK_URL:
        "https://example.com/api/webhooks/twilio/sms",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "TWILIO_WHATSAPP_WEBHOOK_URL must target /api/webhooks/twilio/whatsapp.",
    );
  });

  it("fails when production uses a non-https webhook url", () => {
    const result = runVerifier({
      NODE_ENV: "production",
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_WHATSAPP_WEBHOOK_URL:
        "http://example.com/api/webhooks/twilio/whatsapp",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Production webhook URLs must use https.");
  });
});
