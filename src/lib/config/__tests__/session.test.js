describe("session config", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (typeof originalJwtSecret === "undefined") {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    jest.resetModules();
  });

  it("fails closed in production when JWT_SECRET is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require("../session");
      });
    }).toThrow(
      "JWT_SECRET must be set to at least 32 characters in production.",
    );
  });

  it("fails closed in production when JWT_SECRET is too short", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "too-short";

    expect(() => {
      jest.isolateModules(() => {
        require("../session");
      });
    }).toThrow(
      "JWT_SECRET must be set to at least 32 characters in production.",
    );
  });

  it("uses an explicit development secret outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;

    jest.isolateModules(() => {
      const { sessionConfig } = require("../session");

      expect(sessionConfig.environment).toBe("development");
      expect(sessionConfig.secret).toBe(
        "development-session-secret-not-for-production",
      );
      expect(sessionConfig.secureCookies).toBe(false);
    });
  });

  it("uses an explicit test secret in test", () => {
    process.env.NODE_ENV = "test";
    delete process.env.JWT_SECRET;

    jest.isolateModules(() => {
      const { sessionConfig } = require("../session");

      expect(sessionConfig.environment).toBe("test");
      expect(sessionConfig.secret).toBe(
        "test-session-secret-not-for-production",
      );
      expect(sessionConfig.secureCookies).toBe(false);
    });
  });
});
