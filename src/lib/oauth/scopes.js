const OAUTH_SCOPE_DETAILS = Object.freeze({
  "customer:read": Object.freeze({
    title: "Read your Milkywayy customer data",
    description:
      "View your account, bookings, invoices, and delivery-file metadata.",
  }),
});

export function getOAuthScopeDetails(scope) {
  return (
    OAUTH_SCOPE_DETAILS[String(scope ?? "").trim()] || {
      title: String(scope ?? "").trim(),
      description: String(scope ?? "").trim(),
    }
  );
}
