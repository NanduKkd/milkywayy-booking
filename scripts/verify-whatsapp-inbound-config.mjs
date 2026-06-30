const PRODUCTION_NODE_ENV = "production";
const EXPECTED_WEBHOOK_PATH = "/api/webhooks/twilio/whatsapp";

function normalizeNodeEnv(nodeEnv) {
  if (nodeEnv === PRODUCTION_NODE_ENV) {
    return PRODUCTION_NODE_ENV;
  }

  if (nodeEnv === "test") {
    return "test";
  }

  return "development";
}

function getConfigurationIssues({
  authToken = process.env.TWILIO_AUTH_TOKEN,
  configuredUrl = process.env.TWILIO_WHATSAPP_WEBHOOK_URL,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  const issues = [];
  const environment = normalizeNodeEnv(nodeEnv);

  if (!String(authToken ?? "").trim()) {
    issues.push("TWILIO_AUTH_TOKEN is missing.");
  }

  const normalizedConfiguredUrl = String(configuredUrl ?? "").trim();

  if (!normalizedConfiguredUrl) {
    issues.push("TWILIO_WHATSAPP_WEBHOOK_URL is missing.");

    return {
      environment,
      issues,
    };
  }

  let parsedConfiguredUrl;

  try {
    parsedConfiguredUrl = new URL(normalizedConfiguredUrl);
  } catch {
    issues.push("TWILIO_WHATSAPP_WEBHOOK_URL must be a valid absolute URL.");

    return {
      environment,
      issues,
    };
  }

  if (
    parsedConfiguredUrl.protocol !== "http:" &&
    parsedConfiguredUrl.protocol !== "https:"
  ) {
    issues.push("TWILIO_WHATSAPP_WEBHOOK_URL must use http or https.");
  }

  if (
    environment === PRODUCTION_NODE_ENV &&
    parsedConfiguredUrl.protocol !== "https:"
  ) {
    issues.push("Production webhook URLs must use https.");
  }

  if (parsedConfiguredUrl.username || parsedConfiguredUrl.password) {
    issues.push(
      "TWILIO_WHATSAPP_WEBHOOK_URL must not include embedded credentials.",
    );
  }

  if (parsedConfiguredUrl.hash) {
    issues.push("TWILIO_WHATSAPP_WEBHOOK_URL must not include a URL fragment.");
  }

  if (parsedConfiguredUrl.pathname !== EXPECTED_WEBHOOK_PATH) {
    issues.push(
      `TWILIO_WHATSAPP_WEBHOOK_URL must target ${EXPECTED_WEBHOOK_PATH}.`,
    );
  }

  return {
    environment,
    issues,
  };
}

function main() {
  const { environment, issues } = getConfigurationIssues();

  if (issues.length > 0) {
    console.error("[whatsapp-inbound-config] Configuration check failed.");

    for (const issue of issues) {
      console.error(`[whatsapp-inbound-config] - ${issue}`);
    }

    console.error(
      "[whatsapp-inbound-config] Fix the environment values before attaching the live Twilio inbound webhook.",
    );
    process.exit(1);
  }

  console.log("[whatsapp-inbound-config] Configuration check passed.");
  console.log(`[whatsapp-inbound-config] Environment: ${environment}.`);
  console.log(
    "[whatsapp-inbound-config] TWILIO_AUTH_TOKEN is present and the webhook URL matches the expected inbound route shape.",
  );
  console.log(
    "[whatsapp-inbound-config] Remaining manual work: attach the webhook in Twilio and run the live inbound-message verification.",
  );
}

main();
