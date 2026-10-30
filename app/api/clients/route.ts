import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, inquiries } from "../../../db/schema";
import { requireAccess, requireUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  const db = getDb(); const existing = await db.select().from(clients);
  if (!existing.length) {
    const names = [...new Set((await db.select({ client: inquiries.client }).from(inquiries)).map(x => x.client).filter(Boolean))];
    if (names.length) await db.insert(clients).values(names.map(name => ({ name })));
  }
  return Response.json({ clients: await db.select().from(clients).orderBy(asc(clients.name)) });
}
export async function POST(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const { name } = await request.json() as { name?: string }; if (!name?.trim()) return Response.json({ error: "Наименованието е задължително." }, { status: 400 });
  const [created] = await getDb().insert(clients).values({ name: name.trim() }).returning(); return Response.json({ client: created }, { status: 201 });
}
export async function PUT(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const payload = await request.json() as { id?: number; name?: string; active?: boolean }; if (!payload.id) return Response.json({ error: "Липсва клиент." }, { status: 400 });
  const [updated] = await getDb().update(clients).set({ ...(payload.name?.trim()?{name:payload.name.trim()}:{}), ...(typeof payload.active==="boolean"?{active:payload.active}:{}) }).where(eq(clients.id,payload.id)).returning();
  return Response.json({ client: updated });
}
export async function DELETE(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  const id=Number(new URL(request.url).searchParams.get("id")); if(!id)return Response.json({error:"Липсва клиент."},{status:400});
  const used=await getDb().select({id:inquiries.id}).from(inquiries).where(eq(inquiries.clientId,id)).limit(1);
  if(used.length)return Response.json({error:"Клиентът се използва в заявка. Деактивирайте го, за да запазите историята."},{status:409});
  await getDb().delete(clients).where(eq(clients.id,id)); return Response.json({ok:true});
}
