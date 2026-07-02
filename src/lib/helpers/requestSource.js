import { headers } from "next/headers";

export async function getRequestSource() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const connectingIp = headerStore.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() || realIp || connectingIp || "unknown"
  );
}
