import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:"Не авторизован"},{status:401});
  const body = await request.json();
  const rating = Number(body.rating);
  if (rating < 1 || rating > 5) return NextResponse.json({error:"Оценка должна быть 1–5."},{status:400});
  const result = await db.query(
    "INSERT INTO reviews(order_id,author_id,seller_id,listing_id,rating,text) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [body.orderId,user.id,body.sellerId ?? null,body.listingId ?? null,rating,String(body.text ?? "").slice(0,2000)],
  );
  return NextResponse.json({ review:result.rows[0] },{status:201});
}
