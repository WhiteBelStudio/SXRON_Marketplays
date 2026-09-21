import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const result = await db.query("SELECT id,name,slug,parent_id FROM categories WHERE is_active=true ORDER BY sort_order,name");
  return NextResponse.json({ categories: result.rows });
}
