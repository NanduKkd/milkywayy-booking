import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const REPO_ROOT = process.cwd();
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findApp(apps, name) {
  return apps.find((app) => app.name === name);
}

function expectPattern(contents, pattern, message) {
  pattern.lastIndex = 0;
  assert(pattern.test(contents), message);
}

async function loadFile(relativePath) {
  return fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function verifyPm2Topology() {
  const ecosystemPath = path.join(REPO_ROOT, "ecosystem.config.cjs");
  const ecosystem = require(ecosystemPath);
  const source = await fs.readFile(ecosystemPath, "utf8");
  const apps = Array.isArray(ecosystem.apps) ? ecosystem.apps : [];

  assert(
    apps.length >= 3,
    "PM2 config must define the web app and both workers.",
  );

  const webApp = findApp(apps, "milkywayy-booking");
  assert(webApp, 'PM2 config must include the "milkywayy-booking" app.');
  assert(webApp.script === "npm", "Web app must launch through npm.");
  assert(webApp.args === "start", 'Web app must use "npm start".');
  assert(
    webApp.env?.NODE_ENV === "production",
    "Web app must force NODE_ENV=production.",
  );

  const workerExpectations = [
    {
      name: "milkywayy-booking-auto-complete",
      script: "scripts/booking-auto-complete-worker.mjs",
    },
    {
      name: "milkywayy-booking-oauth-cleanup",
      script: "scripts/oauth-cleanup-worker.mjs",
    },
  ];

  for (const expectedWorker of workerExpectations) {
    const worker = findApp(apps, expectedWorker.name);
    assert(worker, `PM2 config must include ${expectedWorker.name}.`);
    assert(
      worker.script === expectedWorker.script,
      `${expectedWorker.name} must run ${expectedWorker.script}.`,
    );
    assert(
      worker.interpreter === "node",
      `${expectedWorker.name} must run with the node interpreter.`,
    );
    assert(
      worker.autorestart === true,
      `${expectedWorker.name} must autorestart.`,
    );
    assert(
      worker.env?.NODE_ENV === "production",
      `${expectedWorker.name} must force NODE_ENV=production.`,
    );
    assert(
      worker.env?.INTERNAL_APP_URL === "http://127.0.0.1:3000",
      `${expectedWorker.name} must target the local Next.js instance.`,
    );
  }

  const cronSecretPattern =
    /CRON_SECRET:\s*process\.env\.CRON_SECRET\s*\|\|\s*fileEnv\.CRON_SECRET/gu;
  const cronSecretMatches = source.match(cronSecretPattern) || [];
  assert(
    cronSecretMatches.length >= 2,
    "Worker PM2 entries must source CRON_SECRET from PM2 env or .env.",
  );
}

async function verifyNginxTopology() {
  const nginxConfig = await loadFile("deploy/nginx/milkywayy-booking.conf");

  expectPattern(
    nginxConfig,
    /listen 443 ssl http2;/u,
    "Nginx config must listen on 443 with TLS and HTTP/2.",
  );
  expectPattern(
    nginxConfig,
    /listen \[::\]:443 ssl http2;/u,
    "Nginx config must listen on IPv6 443 with TLS and HTTP/2.",
  );
  expectPattern(
    nginxConfig,
    /ssl_protocols TLSv1\.2 TLSv1\.3;/u,
    "Nginx config must restrict TLS to 1.2+.",
  );
  expectPattern(
    nginxConfig,
    /return 301 https:\/\/\$host\$request_uri;/u,
    "HTTP traffic must redirect to HTTPS.",
  );
  expectPattern(
    nginxConfig,
    /server 127\.0\.0\.1:3000;/u,
    "Nginx upstream must target the local Next.js process.",
  );
  expectPattern(
    nginxConfig,
    /proxy_set_header Host \$host;/u,
    "Nginx must forward the canonical Host header.",
  );
  expectPattern(
    nginxConfig,
    /proxy_set_header X-Forwarded-Host \$host;/u,
    "Nginx must forward a controlled X-Forwarded-Host header.",
  );
  expectPattern(
    nginxConfig,
    /proxy_set_header X-Forwarded-Proto https;/u,
    "Nginx must pin X-Forwarded-Proto to https.",
  );
  expectPattern(
    nginxConfig,
    /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/u,
    "Nginx must preserve the forwarded client IP chain.",
  );
  expectPattern(
    nginxConfig,
    /client_max_body_size 256k;/u,
    "Nginx must bound request bodies for OAuth and GPT routes.",
  );
  expectPattern(
    nginxConfig,
    /proxy_connect_timeout 5s;/u,
    "Nginx must bound proxy connect timeout.",
  );
  expectPattern(
    nginxConfig,
    /proxy_send_timeout 30s;/u,
    "Nginx must bound proxy send timeout below platform limits.",
  );
  expectPattern(
    nginxConfig,
    /proxy_read_timeout 30s;/u,
    "Nginx must bound proxy read timeout below platform limits.",
  );
}

async function verifyOperationsRunbook() {
  const operationsDoc = await loadFile("docs/gpt-actions-oauth/OPERATIONS.md");

  expectPattern(
    operationsDoc,
    /npm run verify:oauth-topology/u,
    "Operations runbook must document the topology verification command.",
  );
  expectPattern(
    operationsDoc,
    /PostgreSQL-backed rate limiting/u,
    "Operations runbook must document the shared PostgreSQL rate-limit topology.",
  );
}

async function main() {
  await verifyPm2Topology();
  await verifyNginxTopology();
  await verifyOperationsRunbook();

  console.log("[oauth-topology] review passed");
  console.log(
    "[oauth-topology] verified PM2 app topology, OAuth cleanup worker registration, Nginx TLS/proxy settings, and shared rate-limit runbook guidance",
  );
}

await main();
