"use server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Use environment variable in production
const key = new TextEncoder().encode(JWT_SECRET);

/**
 * Sets the session user by converting the object to a JWT token and storing it in an httpOnly cookie.
 * @param {Object} user - The user object to store in the session.
 */
export async function setSessionUser(user) {
  const cookieStore = await cookies();

  if (!user) {
    cookieStore.delete("session-token");
    return;
  }

  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);

  cookieStore.set("session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Gets the session user by verifying the JWT token from the httpOnly cookie and returning the parsed object.
 * @returns {Object|null} The parsed user object if the token is valid, otherwise null.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Alias for getSessionUser for convenience
 */
export const auth = getSessionUser;
