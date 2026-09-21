import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const normalized = String(username ?? "").trim().toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    return NextResponse.json({ error: "Некорректный username." }, { status: 400 });
  }

  const result = await db.query(
    `SELECT u.id,u.username,u.display_name,u.avatar_url,u.role,u.created_at,
            s.store_name,s.slug,s.description,s.logo_url,s.rating,s.review_count
     FROM users u
     LEFT JOIN sellers s ON s.user_id=u.id
     WHERE lower(u.username)=lower($1) AND u.is_blocked=false
     LIMIT 1`,
    [normalized],
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
  }

  return NextResponse.json({ user: result.rows[0] });
}
