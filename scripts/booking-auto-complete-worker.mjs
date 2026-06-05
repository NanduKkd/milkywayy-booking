const baseUrl = String(
  process.env.INTERNAL_APP_URL || "http://127.0.0.1:3000",
).replace(/\/+$/, "");
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  throw new Error("CRON_SECRET is required for booking auto-completion");
}

const runAutoCompletion = async () => {
  const response = await fetch(
    `${baseUrl}/api/internal/bookings/auto-complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.error || `Auto-completion failed (${response.status})`,
    );
  }
  console.log(
    `[booking-auto-complete] completed ${body.completedCount || 0} booking(s)`,
  );
};

const getMillisecondsUntilDubaiMidnight = (now = new Date()) => {
  const dubaiNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const nextMidnightUtc = Date.UTC(
    dubaiNow.getUTCFullYear(),
    dubaiNow.getUTCMonth(),
    dubaiNow.getUTCDate() + 1,
    -4,
  );
  return Math.max(1000, nextMidnightUtc - now.getTime());
};

const scheduleNextRun = () => {
  const delay = getMillisecondsUntilDubaiMidnight();
  console.log(
    `[booking-auto-complete] next run in ${Math.round(delay / 60000)} minute(s)`,
  );
  setTimeout(async () => {
    try {
      await runAutoCompletion();
    } catch (error) {
      console.error("[booking-auto-complete]", error);
    } finally {
      scheduleNextRun();
    }
  }, delay);
};

const runStartupCatchUp = async (attempt = 1) => {
  try {
    await runAutoCompletion();
  } catch (error) {
    console.error("[booking-auto-complete] startup catch-up failed", error);
    if (attempt < 10) {
      setTimeout(() => runStartupCatchUp(attempt + 1), 60_000);
    }
  }
};

await runStartupCatchUp();
scheduleNextRun();
