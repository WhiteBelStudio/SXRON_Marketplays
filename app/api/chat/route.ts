import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:"Не авторизован"},{status:401});
  const result = await db.query(
    `SELECT c.id,c.listing_id,
      (SELECT json_agg(m ORDER BY m.created_at DESC) FROM (SELECT id,sender_id,body,created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 50) m) messages
     FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id
     WHERE cm.user_id=$1 ORDER BY c.created_at DESC`,
    [user.id],
  );
  return NextResponse.json({ conversations: result.rows });
}
