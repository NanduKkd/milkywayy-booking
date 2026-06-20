const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

let fileEnv = {};
try {
  fileEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, ".env")));
} catch {
  // PM2 can still use a CRON_SECRET supplied by its parent environment.
}

module.exports = {
  apps: [
    {
      name: "milkywayy-booking",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "milkywayy-booking-auto-complete",
      script: "scripts/booking-auto-complete-worker.mjs",
      cwd: __dirname,
      interpreter: "node",
      autorestart: true,
      env: {
        NODE_ENV: "production",
        INTERNAL_APP_URL: "http://127.0.0.1:3000",
        CRON_SECRET: process.env.CRON_SECRET || fileEnv.CRON_SECRET,
      },
    },
  ],
};
