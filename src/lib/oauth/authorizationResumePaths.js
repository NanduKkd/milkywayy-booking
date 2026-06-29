export const OAUTH_AUTHORIZE_RESUME_PATH = "/oauth/authorize/resume";
export const OAUTH_AUTHORIZE_ERROR_PATH = "/oauth/authorize/error";

export const OAUTH_AUTHORIZE_ERROR_CODES = Object.freeze({
  interactionExpired: "interaction_expired",
  invalidResume: "invalid_resume",
  loginCancelled: "login_cancelled",
});

const LOCAL_BASE_URL = "https://milkywayy.local";
const ALLOWED_ERROR_CODES = new Set(Object.values(OAUTH_AUTHORIZE_ERROR_CODES));

function parseLocalPath(rawPath, allowedPathname) {
  const normalizedPath = String(rawPath ?? "").trim();

  if (!normalizedPath || normalizedPath.startsWith("//")) {
    return null;
  }

  let parsedPath;

  try {
    parsedPath = new URL(normalizedPath, LOCAL_BASE_URL);
  } catch {
    return null;
  }

  if (parsedPath.origin !== LOCAL_BASE_URL) {
    return null;
  }

  if (parsedPath.pathname !== allowedPathname || parsedPath.hash) {
    return null;
  }

  return parsedPath;
}

function hasOnlySearchParam(searchParams, expectedKey) {
  const keys = [...searchParams.keys()];
  return keys.length === 1 && keys[0] === expectedKey;
}

export function buildAuthorizationResumePath(resumeToken) {
  const normalizedToken = String(resumeToken ?? "").trim();

  if (!normalizedToken) {
    throw new Error("Authorization resume token is required.");
  }

  return `${OAUTH_AUTHORIZE_RESUME_PATH}?resume=${encodeURIComponent(normalizedToken)}`;
}

export function normalizeAuthorizationResumePath(rawPath) {
  const parsedPath = parseLocalPath(rawPath, OAUTH_AUTHORIZE_RESUME_PATH);

  if (!parsedPath || !hasOnlySearchParam(parsedPath.searchParams, "resume")) {
    return null;
  }

  const [resumeToken] = parsedPath.searchParams.getAll("resume");

  if (!resumeToken?.trim()) {
    return null;
  }

  return buildAuthorizationResumePath(resumeToken);
}

export function buildAuthorizationErrorPath(
  errorCode = OAUTH_AUTHORIZE_ERROR_CODES.loginCancelled,
) {
  if (!ALLOWED_ERROR_CODES.has(errorCode)) {
    throw new Error(`Unsupported authorization error code: ${errorCode}.`);
  }

  return `${OAUTH_AUTHORIZE_ERROR_PATH}?error=${encodeURIComponent(errorCode)}`;
}

export function normalizeAuthorizationErrorPath(rawPath) {
  const parsedPath = parseLocalPath(rawPath, OAUTH_AUTHORIZE_ERROR_PATH);

  if (!parsedPath || !hasOnlySearchParam(parsedPath.searchParams, "error")) {
    return null;
  }

  const [errorCode] = parsedPath.searchParams.getAll("error");

  if (!ALLOWED_ERROR_CODES.has(errorCode)) {
    return null;
  }

  return buildAuthorizationErrorPath(errorCode);
}
