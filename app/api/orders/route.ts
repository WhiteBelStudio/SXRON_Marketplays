import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:"Не авторизован"},{status:401});
  const result = await db.query(
    `SELECT o.*, COALESCE(json_agg(json_build_object('listingId',oi.listing_id,'quantity',oi.quantity,'unitPrice',oi.unit_price)) FILTER (WHERE oi.id IS NOT NULL),'[]') items
     FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
     WHERE o.buyer_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`,
    [user.id],
  );
  return NextResponse.json({ orders: result.rows });
}
