import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:"Не авторизован"},{status:401});
  const body = await request.json();
  const result = await db.query(
    "INSERT INTO reports(reporter_id,listing_id,reported_user_id,reason) VALUES($1,$2,$3,$4) RETURNING id,status,created_at",
    [user.id,body.listingId ?? null,body.reportedUserId ?? null,String(body.reason ?? "").slice(0,1000)],
  );
  return NextResponse.json({ report:result.rows[0] },{status:201});
}
