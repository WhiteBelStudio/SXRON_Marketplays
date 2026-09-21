import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Не авторизован" },{status:401});
  const result = await db.query(
    "SELECT l.* FROM favorites f JOIN listings l ON l.id=f.listing_id WHERE f.user_id=$1 ORDER BY f.created_at DESC",
    [user.id],
  );
  return NextResponse.json({ listings: result.rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Не авторизован" },{status:401});
  const { listingId } = await request.json();
  await db.query("INSERT INTO favorites(user_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[user.id,listingId]);
  return NextResponse.json({ ok:true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:"Не авторизован" },{status:401});
  const { listingId } = await request.json();
  await db.query("DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2",[user.id,listingId]);
  return NextResponse.json({ ok:true });
}
