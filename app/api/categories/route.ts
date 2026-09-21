import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

type CategoryNode = CategoryRow & {
  children: CategoryNode[];
};

export async function GET() {
  try {
    const result = await db.query<CategoryRow>(
      `SELECT id,name,slug,parent_id,sort_order
       FROM categories
       WHERE is_active=true
       ORDER BY
         CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
         sort_order,
         name`,
    );

    const nodes = new Map<string, CategoryNode>();
    for (const row of result.rows) {
      nodes.set(row.id, { ...row, children: [] });
    }

    const tree: CategoryNode[] = [];
    for (const node of nodes.values()) {
      if (node.parent_id && nodes.has(node.parent_id)) {
        nodes.get(node.parent_id)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    return NextResponse.json({
      categories: tree,
      flat: result.rows,
    });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить категории." }, { status: 500 });
  }
}
