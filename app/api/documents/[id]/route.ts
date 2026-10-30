import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { documents } from "../../../../db/schema";
import { requireUser } from "../../../../lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  const { id } = await params; const [doc] = await getDb().select().from(documents).where(eq(documents.id, Number(id))).limit(1);
  if (!doc) return new Response("Файлът не е намерен", { status: 404 }); const object = await env.BUCKET.get(doc.objectKey);
  if (!object) return new Response("Файлът липсва", { status: 404 });
  return new Response(object.body, { headers: { "content-type": doc.contentType, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}` } });
}
