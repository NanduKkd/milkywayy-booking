const baseUrl = String(
  process.env.INTERNAL_APP_URL || "http://127.0.0.1:3000",
).replace(/\/+$/, "");
const cronSecret = process.env.CRON_SECRET;
const cleanupIntervalMs = 60 * 60 * 1000;

if (!cronSecret) {
  throw new Error("CRON_SECRET is required for OAuth cleanup");
}

const runCleanup = async () => {
  const response = await fetch(`${baseUrl}/api/internal/oauth/cleanup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `OAuth cleanup failed (${response.status})`);
  }

  console.log(
    `[oauth-cleanup] deleted ${body.totalDeleted || 0} artifact(s); batch limit hit: ${body.hitBatchLimit ? "yes" : "no"}`,
  );
};

const scheduleNextRun = () => {
  console.log(
    `[oauth-cleanup] next run in ${Math.round(cleanupIntervalMs / 60000)} minute(s)`,
  );
  setTimeout(async () => {
    try {
      await runCleanup();
    } catch (error) {
      console.error("[oauth-cleanup]", error);
    } finally {
      scheduleNextRun();
    }
  }, cleanupIntervalMs);
};

const runStartupCatchUp = async (attempt = 1) => {
  try {
    await runCleanup();
  } catch (error) {
    console.error("[oauth-cleanup] startup catch-up failed", error);
    if (attempt < 10) {
      setTimeout(() => runStartupCatchUp(attempt + 1), 60_000);
    }
  }
};

await runStartupCatchUp();
scheduleNextRun();
