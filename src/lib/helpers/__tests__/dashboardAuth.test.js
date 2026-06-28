import {
  buildDashboardAccessHref,
  DASHBOARD_DEFAULT_PATH,
  getDashboardReturnPath,
  isDashboardPath,
  isDashboardRootPath,
  normalizeDashboardNext,
} from "../dashboardAuth";

describe("dashboardAuth helpers", () => {
  it("recognizes dashboard routes by path segment", () => {
    expect(isDashboardPath("/dashboard")).toBe(true);
    expect(isDashboardPath("/dashboard/files")).toBe(true);
    expect(isDashboardPath("/dashboarding")).toBe(false);
  });

  it("recognizes only the dashboard index as the root path", () => {
    expect(isDashboardRootPath("/dashboard")).toBe(true);
    expect(isDashboardRootPath("/dashboard/")).toBe(true);
    expect(isDashboardRootPath("/dashboard/files")).toBe(false);
  });

  it("preserves valid nested dashboard destinations", () => {
    expect(normalizeDashboardNext("/dashboard/files?filter=ready")).toBe(
      "/dashboard/files?filter=ready",
    );
  });

  it("falls back to the default dashboard destination for invalid next values", () => {
    expect(normalizeDashboardNext()).toBe(DASHBOARD_DEFAULT_PATH);
    expect(normalizeDashboardNext("/")).toBe(DASHBOARD_DEFAULT_PATH);
    expect(normalizeDashboardNext("https://example.com/dashboard/files")).toBe(
      DASHBOARD_DEFAULT_PATH,
    );
    expect(normalizeDashboardNext("//example.com/dashboard/files")).toBe(
      DASHBOARD_DEFAULT_PATH,
    );
    expect(normalizeDashboardNext("/dashboard")).toBe(DASHBOARD_DEFAULT_PATH);
  });

  it("builds the dashboard access URL with an encoded next parameter", () => {
    expect(buildDashboardAccessHref("/dashboard/invoices?status=open")).toBe(
      "/dashboard?next=%2Fdashboard%2Finvoices%3Fstatus%3Dopen",
    );
  });

  it("normalizes the current dashboard URL into a safe return path", () => {
    expect(getDashboardReturnPath("/dashboard/files", "?filter=ready")).toBe(
      "/dashboard/files?filter=ready",
    );
  });
});
