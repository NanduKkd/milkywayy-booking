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
      },
    },
  ],
};
