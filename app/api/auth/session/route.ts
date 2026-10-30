import { getAuthorizedUser } from "../../../../lib/auth";
import { getDb } from "../../../../db";
import { employees } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getAuthorizedUser(request);
  return user
    ? Response.json({ user })
    : Response.json({ user: null }, { status: 401 });
}

export async function PUT(request: Request) {
  const user = await getAuthorizedUser(request);
  if (!user) return Response.json({ error: "Необходим е вход в приложението." }, { status: 401 });
  const body = await request.json() as { notificationsEnabled?: boolean };
  if (typeof body.notificationsEnabled !== "boolean") return Response.json({ error: "Невалидна настройка." }, { status: 400 });
  await getDb().update(employees).set({ notificationsEnabled: body.notificationsEnabled }).where(eq(employees.id, user.id));
  return Response.json({ user: { ...user, notificationsEnabled: body.notificationsEnabled } });
}
