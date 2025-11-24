const USER_ROLES = {
  SUPERADMIN: "SUPERADMIN",
  TRANSPORT: "TRANSPORT",
  SHOOT: "SHOOT",
  CUSTOMER: "CUSTOMER",
};

const NEXTAUTH_CONFIG = {
  secret: process.env.NEXTAUTH_SECRET,
  baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

export { USER_ROLES, NEXTAUTH_CONFIG };
