const mockCookies = jest.fn();
const mockSign = jest.fn();
const mockJwtVerify = jest.fn();
const mockSetExpirationTime = jest.fn(() => ({ sign: mockSign }));
const mockSetProtectedHeader = jest.fn(() => ({
  setExpirationTime: mockSetExpirationTime,
}));
const mockSignJwt = jest.fn(() => ({
  setProtectedHeader: mockSetProtectedHeader,
}));

jest.mock("next/headers", () => ({
  cookies: (...args) => mockCookies(...args),
}));

jest.mock("jose", () => ({
  SignJWT: function SignJWT(...args) {
    return mockSignJwt(...args);
  },
  jwtVerify: (...args) => mockJwtVerify(...args),
}));

import { getSessionUser, setSessionUser } from "../auth";

describe("session cookie helper", () => {
  const cookieStore = {
    delete: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue(cookieStore);
    mockSign.mockResolvedValue("signed-session-token");
  });

  it("signs and stores the trusted login result with the existing cookie contract", async () => {
    const user = { id: 17, role: "CUSTOMER", fullName: "Test Customer" };

    await setSessionUser(user);

    expect(mockSignJwt).toHaveBeenCalledWith(user);
    expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
    expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "session-token",
      "signed-session-token",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "lax",
      }),
    );
  });

  it("clears the session without signing a token", async () => {
    await setSessionUser(null);

    expect(cookieStore.delete).toHaveBeenCalledWith("session-token");
    expect(mockSignJwt).not.toHaveBeenCalled();
  });

  it("returns a verified session payload", async () => {
    cookieStore.get.mockReturnValue({ value: "valid-token" });
    mockJwtVerify.mockResolvedValue({
      payload: { id: 17, role: "CUSTOMER" },
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: 17,
      role: "CUSTOMER",
    });
  });

  it("fails closed for missing or invalid cookies", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getSessionUser()).resolves.toBeNull();

    cookieStore.get.mockReturnValue({ value: "invalid-token" });
    mockJwtVerify.mockRejectedValue(new Error("Invalid token"));
    await expect(getSessionUser()).resolves.toBeNull();
  });
});
