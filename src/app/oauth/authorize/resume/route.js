import { NextResponse } from "next/server";
import { oauthConfig } from "@/lib/config/oauth";
import {
  buildAuthorizationErrorPath,
  OAUTH_AUTHORIZE_ERROR_CODES,
  verifyAuthorizationResumeToken,
} from "@/lib/oauth/authorizationResume";
import { buildAuthorizationRequestPath } from "@/lib/oauth/interaction";

function buildLocalUrl(pathname) {
  return new URL(pathname, oauthConfig.baseUrl);
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const resumeToken = requestUrl.searchParams.get("resume");

  if (!resumeToken?.trim()) {
    return NextResponse.redirect(
      buildLocalUrl(
        buildAuthorizationErrorPath(OAUTH_AUTHORIZE_ERROR_CODES.invalidResume),
      ),
    );
  }

  try {
    const interaction = await verifyAuthorizationResumeToken(resumeToken);

    return NextResponse.redirect(
      buildLocalUrl(buildAuthorizationRequestPath(interaction)),
    );
  } catch (error) {
    const errorCode =
      error?.code === "ERR_JWT_EXPIRED"
        ? OAUTH_AUTHORIZE_ERROR_CODES.interactionExpired
        : OAUTH_AUTHORIZE_ERROR_CODES.invalidResume;

    return NextResponse.redirect(
      buildLocalUrl(buildAuthorizationErrorPath(errorCode)),
    );
  }
}
