import { NextResponse } from "next/server";
import { cleanupOAuthArtifacts } from "@/lib/oauth/cleanup";

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
    const result = await cleanupOAuthArtifacts();
    return NextResponse.json(result);
  } catch (error) {
    console.error("OAuth cleanup failed:", error);
    return NextResponse.json(
      { error: "OAuth cleanup failed" },
      { status: 500 },
    );
  }
}
