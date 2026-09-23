import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  try {
    const result = await db.query(
      `SELECT c.id,
              c.listing_id,
              (
                SELECT json_agg(m ORDER BY m.created_at DESC)
                FROM (
                  SELECT id, sender_id, body, created_at
                  FROM messages
                  WHERE conversation_id = c.id
                  ORDER BY created_at DESC
                  LIMIT 50
                ) m
              ) AS messages
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [user.id],
    );

    return NextResponse.json({ conversations: result.rows });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить чаты." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const conversationId =
      body.conversationId ? String(body.conversationId) : null;
    const listingId = body.listingId ? String(body.listingId) : null;
    const messageBody = String(body.body ?? "").trim();

    if (!messageBody || messageBody.length > 4000) {
      return NextResponse.json(
        { error: "Сообщение должно содержать от 1 до 4000 символов." },
        { status: 400 },
      );
    }
    if (conversationId && !UUID_RE.test(conversationId)) {
      return NextResponse.json(
        { error: "Некорректный conversationId." },
        { status: 400 },
      );
    }
    if (listingId && !UUID_RE.test(listingId)) {
      return NextResponse.json(
        { error: "Некорректный listingId." },
        { status: 400 },
      );
    }
    if (!conversationId && !listingId) {
      return NextResponse.json(
        { error: "Укажите conversationId или listingId." },
        { status: 400 },
      );
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let resolvedConversationId = conversationId;

      if (resolvedConversationId) {
        const member = await client.query(
          "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
          [resolvedConversationId, user.id],
        );

        if (!member.rows[0]) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Нет доступа к этому чату." },
            { status: 403 },
          );
        }
      } else {
        const listingResult = await client.query(
          "SELECT id, owner_id FROM listings WHERE id = $1 AND status = 'published' LIMIT 1",
          [listingId],
        );
        const listing = listingResult.rows[0];

        if (!listing) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Объявление не найдено." },
            { status: 404 },
          );
        }

        if (listing.owner_id === user.id) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Нельзя создать чат с самим собой." },
            { status: 400 },
          );
        }

        const existing = await client.query(
          `SELECT c.id
           FROM conversations c
           JOIN conversation_members a
             ON a.conversation_id = c.id AND a.user_id = $1
           JOIN conversation_members b
             ON b.conversation_id = c.id AND b.user_id = $2
           WHERE c.listing_id = $3
           LIMIT 1`,
          [user.id, listing.owner_id, listingId],
        );

        if (existing.rows[0]) {
          resolvedConversationId = existing.rows[0].id;
        } else {
          const conversation = await client.query(
            "INSERT INTO conversations (listing_id) VALUES ($1) RETURNING id",
            [listingId],
          );
          resolvedConversationId = conversation.rows[0].id;

          await client.query(
            `INSERT INTO conversation_members (conversation_id, user_id)
             VALUES ($1, $2), ($1, $3)`,
            [resolvedConversationId, user.id, listing.owner_id],
          );
        }
      }

      const message = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, sender_id, body, created_at`,
        [resolvedConversationId, user.id, messageBody],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: message.rows[0],
          conversationId: resolvedConversationId,
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json({ error: "Не удалось отправить сообщение." }, { status: 500 });
  }
}
