export const DASHBOARD_ROOT_PATH = "/dashboard";
export const DASHBOARD_DEFAULT_PATH = "/dashboard/bookings";

const DASHBOARD_BASE_URL = "https://milkywayy.local";

export function isDashboardPath(pathname = "") {
  return (
    pathname === DASHBOARD_ROOT_PATH ||
    pathname.startsWith(`${DASHBOARD_ROOT_PATH}/`)
  );
}

export function isDashboardRootPath(pathname = "") {
  return (
    pathname === DASHBOARD_ROOT_PATH || pathname === `${DASHBOARD_ROOT_PATH}/`
  );
}

export function normalizeDashboardNext(rawNext) {
  if (typeof rawNext !== "string") {
    return DASHBOARD_DEFAULT_PATH;
  }

  const trimmedNext = rawNext.trim();

  if (!trimmedNext || trimmedNext.startsWith("//")) {
    return DASHBOARD_DEFAULT_PATH;
  }

  let parsedNext;

  try {
    parsedNext = new URL(trimmedNext, DASHBOARD_BASE_URL);
  } catch {
    return DASHBOARD_DEFAULT_PATH;
  }

  if (parsedNext.origin !== DASHBOARD_BASE_URL) {
    return DASHBOARD_DEFAULT_PATH;
  }

  if (!isDashboardPath(parsedNext.pathname)) {
    return DASHBOARD_DEFAULT_PATH;
  }

  const normalizedPathname = isDashboardRootPath(parsedNext.pathname)
    ? DASHBOARD_DEFAULT_PATH
    : parsedNext.pathname;

  return `${normalizedPathname}${parsedNext.search}`;
}

export function buildDashboardAccessHref(nextPath) {
  const params = new URLSearchParams({
    next: normalizeDashboardNext(nextPath),
  });

  return `${DASHBOARD_ROOT_PATH}?${params.toString()}`;
}

export function getDashboardReturnPath(pathname = "", search = "") {
  return normalizeDashboardNext(`${pathname}${search}`);
}
