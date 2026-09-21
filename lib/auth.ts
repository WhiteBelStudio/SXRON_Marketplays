import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "sxron_session";
const DAYS = 30;

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 86400000);

  await db.query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)",
    [userId, hashToken(token), expires],
  );

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const result = await db.query(
    `SELECT u.id,u.email,u.username,u.display_name,u.avatar_url,u.role,u.is_blocked,u.created_at
     FROM sessions s
     JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at > now() AND u.is_blocked=false
     LIMIT 1`,
    [hashToken(token)],
  );

  return result.rows[0] ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (token) {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(token)]);
  }

  store.delete(COOKIE);
}

export async function destroyAllUserSessions(userId: string) {
  await db.query("DELETE FROM sessions WHERE user_id=$1", [userId]);
}

export async function cleanupExpiredSessions() {
  await db.query("DELETE FROM sessions WHERE expires_at <= now()");
}
