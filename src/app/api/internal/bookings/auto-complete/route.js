import { NextResponse } from "next/server";
import "@/lib/db/relations";
import { autoCompleteEligibleBookings } from "@/lib/services/bookingWorkflow";

const getRequestSecret = (request) => {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }
  return request.headers.get("x-cron-secret") || "";
};

export async function POST(request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (getRequestSecret(request) !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoCompleteEligibleBookings();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Automatic booking completion failed:", error);
    return NextResponse.json(
      { error: "Automatic booking completion failed" },
      { status: 500 },
    );
  }
}
