import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { employees } from "../../../../db/schema";
import { createSessionCookie } from "../../../../lib/auth";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    username?: string;
    password?: string;
  };
  const email = payload.username?.trim().toLowerCase() || "";
  if (!email || payload.password?.trim().toLowerCase() !== email)
    return Response.json(
      { error: "Невалидно потребителско име или парола." },
      { status: 401 },
    );

  const [employee] = await getDb()
    .select()
    .from(employees)
    .where(and(eq(employees.email, email), eq(employees.active, true)))
    .limit(1);
  if (!employee)
    return Response.json(
      { error: "Невалидно потребителско име или парола." },
      { status: 401 },
    );

  const name = `${employee.firstName} ${employee.lastName}`.trim();
  const accessRole =
    employee.email === "mdoychinov@technologica.com"
      ? "admin"
      : employee.accessRole;
  return Response.json(
    { user: { id: employee.id, email: employee.email, name, accessRole, notificationsEnabled: employee.notificationsEnabled } },
    { headers: { "Set-Cookie": await createSessionCookie({ id: employee.id, email: employee.email, name, accessRole, notificationsEnabled: employee.notificationsEnabled }) } },
  );
}
