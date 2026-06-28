"use server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { sessionConfig } from "@/lib/config/session";

/**
 * Sets the session user by converting the object to a JWT token and storing it in an httpOnly cookie.
 * @param {Object} user - The user object to store in the session.
 */
export async function setSessionUser(user) {
  const cookieStore = await cookies();

  if (!user) {
    cookieStore.delete(sessionConfig.cookieName);
    return;
  }

  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(sessionConfig.key);

  cookieStore.set(sessionConfig.cookieName, token, {
    httpOnly: true,
    secure: sessionConfig.secureCookies,
    sameSite: "lax",
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
  const token = cookieStore.get(sessionConfig.cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, sessionConfig.key);
    return payload;
  } catch (_error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Alias for getSessionUser for convenience
 */
export const auth = getSessionUser;
