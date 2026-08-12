const mockCompare = jest.fn();
const mockFindOne = jest.fn();
const mockSetSessionUser = jest.fn();
const mockBuildSessionData = jest.fn();
const mockSendCustomerOtp = jest.fn();
const mockVerifyCustomerOtp = jest.fn();
const mockHeaders = jest.fn();

jest.mock("bcrypt", () => ({
  compare: (...args) => mockCompare(...args),
}));

jest.mock("next/headers", () => ({
  headers: (...args) => mockHeaders(...args),
}));

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findOne: (...args) => mockFindOne(...args),
    },
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  setSessionUser: (...args) => mockSetSessionUser(...args),
}));

jest.mock("@/lib/services/customerAuth", () => ({
  buildCustomerSessionUserData: (...args) => mockBuildSessionData(...args),
  sendCustomerOtp: (...args) => mockSendCustomerOtp(...args),
  verifyCustomerOtp: (...args) => mockVerifyCustomerOtp(...args),
}));

jest.unmock("../auth");
jest.unmock("../utils");

const { adminLogin, customerVerifyOtp, logout } = require("../auth");

describe("authentication server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders.mockResolvedValue({
      get: jest.fn((name) => (name === "x-real-ip" ? "127.0.0.1" : null)),
    });
  });

  it("preserves administrator login and stores the database-derived session", async () => {
    const databaseUser = {
      id: 7,
      email: "admin@example.com",
      password: "stored-hash",
      role: "SUPERADMIN",
    };
    const sessionData = {
      id: 7,
      email: "admin@example.com",
      role: "SUPERADMIN",
    };
    mockFindOne.mockResolvedValue(databaseUser);
    mockCompare.mockResolvedValue(true);
    mockBuildSessionData.mockReturnValue(sessionData);

    const result = await adminLogin({
      email: "admin@example.com",
      password: "entered-password",
    });

    expect(result).toEqual({
      success: true,
      message: null,
      data: sessionData,
    });
    expect(mockBuildSessionData).toHaveBeenCalledWith(databaseUser);
    expect(mockSetSessionUser).toHaveBeenCalledWith(sessionData);
  });

  it("preserves customer OTP login and stores only the verified result", async () => {
    const sessionData = {
      id: 19,
      phone: "+971500000019",
      role: "CUSTOMER",
    };
    mockVerifyCustomerOtp.mockResolvedValue(sessionData);

    const result = await customerVerifyOtp({
      verificationId: "verification-id",
      otp: "123456",
    });

    expect(result.success).toBe(true);
    expect(mockVerifyCustomerOtp).toHaveBeenCalledWith({
      verificationId: "verification-id",
      otp: "123456",
      requestSource: "127.0.0.1",
    });
    expect(mockSetSessionUser).toHaveBeenCalledWith(sessionData);
  });

  it("preserves logout by clearing the session cookie", async () => {
    const result = await logout();

    expect(result.success).toBe(true);
    expect(mockSetSessionUser).toHaveBeenCalledWith(null);
  });
});
