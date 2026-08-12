import "server-only";

import { NextResponse } from "next/server";
import { getAuthorizationErrorStatus } from "@/lib/helpers/authorization";

export function authorizationErrorResponse(error) {
  const status = getAuthorizationErrorStatus(error);

  if (!status) {
    return null;
  }

  return NextResponse.json({ error: error.message }, { status });
}
