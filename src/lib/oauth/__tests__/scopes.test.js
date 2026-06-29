import { getOAuthScopeDetails } from "../scopes";

describe("oauth scope metadata", () => {
  it("returns the approved metadata for known scopes", () => {
    expect(getOAuthScopeDetails("customer:read")).toEqual({
      description:
        "View your account, bookings, invoices, and delivery-file metadata.",
      title: "Read your Milkywayy customer data",
    });
  });

  it("falls back to echoing unknown scopes safely", () => {
    expect(getOAuthScopeDetails("custom:scope")).toEqual({
      description: "custom:scope",
      title: "custom:scope",
    });
    expect(getOAuthScopeDetails("   ")).toEqual({
      description: "",
      title: "",
    });
  });
});
