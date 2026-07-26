const fs = require("node:fs");
const path = require("node:path");
const SwaggerParser = require("@apidevtools/swagger-parser");

const OPENAPI_PATH = path.join(
  process.cwd(),
  "src/contracts/gpt-actions/openapi.json",
);

function loadOpenApiDocument() {
  return JSON.parse(fs.readFileSync(OPENAPI_PATH, "utf8"));
}

describe("GPT Action OpenAPI schema", () => {
  it("passes OpenAPI validation", async () => {
    const document = loadOpenApiDocument();

    await expect(SwaggerParser.validate(document)).resolves.toMatchObject({
      openapi: "3.1.0",
    });
  });

  it("exposes only the approved read-only GPT resource operations", () => {
    const document = loadOpenApiDocument();
    const expectedPaths = [
      "/api/gpt/v1/bookings",
      "/api/gpt/v1/bookings/{bookingCode}",
      "/api/gpt/v1/files",
      "/api/gpt/v1/invoices",
      "/api/gpt/v1/me",
    ];
    const expectedOperationIds = [
      "getConnectedAccount",
      "getCustomerBookingByCode",
      "listCustomerBookings",
      "listCustomerDeliveryFiles",
      "listCustomerInvoices",
    ];
    const operationIds = [];

    expect(document.servers).toEqual([
      {
        description: "Production HTTPS API",
        url: "https://milkywayy.com",
      },
    ]);
    expect(Object.keys(document.paths).sort()).toEqual(expectedPaths);

    for (const [pathName, pathItem] of Object.entries(document.paths)) {
      const methods = Object.keys(pathItem);
      expect(methods).toEqual(["get"]);

      const operation = pathItem.get;
      operationIds.push(operation.operationId);
      expect(operation.security).toEqual([
        {
          OAuthAuthorizationCode: ["customer:read"],
        },
      ]);
      expect(operation.summary.length).toBeLessThanOrEqual(120);
      expect(operation.description.length).toBeLessThanOrEqual(200);
      expect(pathName.startsWith("/api/gpt/v1/")).toBe(true);

      for (const parameter of operation.parameters ?? []) {
        expect(parameter).not.toHaveProperty("$ref");
        expect(typeof parameter.name).toBe("string");
        expect(parameter.name.length).toBeGreaterThan(0);
        expect(["path", "query"]).toContain(parameter.in);
      }
    }

    expect(operationIds.sort()).toEqual(expectedOperationIds);
    expect(new Set(operationIds).size).toBe(expectedOperationIds.length);
    expect(JSON.stringify(document.paths)).not.toContain(
      "#/components/parameters/",
    );

    const flow =
      document.components.securitySchemes.OAuthAuthorizationCode.flows
        .authorizationCode;

    expect(flow).toEqual({
      authorizationUrl: "https://milkywayy.com/oauth/authorize",
      scopes: {
        "customer:read":
          "View your account, bookings, invoices, and delivery-file metadata.",
      },
      tokenUrl: "https://milkywayy.com/oauth/token",
    });
  });

  it("documents structured JSON DTOs instead of conversational responses", () => {
    const document = loadOpenApiDocument();
    const schemas = document.components.schemas;

    expect(
      document.paths["/api/gpt/v1/me"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({
      $ref: "#/components/schemas/ConnectedAccountResponse",
    });

    expect(
      document.paths["/api/gpt/v1/bookings"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({
      $ref: "#/components/schemas/BookingListResponse",
    });

    expect(
      document.paths["/api/gpt/v1/invoices"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({
      $ref: "#/components/schemas/InvoiceListResponse",
    });

    expect(
      document.paths["/api/gpt/v1/files"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({
      $ref: "#/components/schemas/FileListResponse",
    });

    expect(schemas.Booking.properties).not.toHaveProperty("message");
    expect(schemas.Invoice.properties).not.toHaveProperty("message");
    expect(schemas.DeliveryFile.properties).not.toHaveProperty("message");
    expect(schemas.Invoice.properties.websiteUrl.pattern).toBe(
      "^/dashboard/invoices\\?invoiceNumber=[A-Za-z0-9\\-_.~%]+$",
    );
    expect(schemas.DeliveryFile.properties.websiteUrl.pattern).toBe(
      "^/dashboard/files$",
    );
  });
});
