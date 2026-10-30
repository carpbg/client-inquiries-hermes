import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  clients,
  employees,
  inquiries,
  type NewInquiry,
} from "../../../../db/schema";
import { audit } from "../../../../lib/audit";
import { requireUser } from "../../../../lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const incoming = (await request.json()) as Partial<NewInquiry> & {
      clientId?: number;
    };
    const payload: Partial<NewInquiry> = {
      internalNo: incoming.internalNo ?? "",
      receivedAt: incoming.receivedAt,
      description: incoming.description,
      statusComment: incoming.statusComment ?? "",
      recipientEmployeeId: incoming.recipientEmployeeId,
      requestType:
        incoming.requestType === "service" ? "service" : "configuration_change",
      folderPath: incoming.folderPath ?? "",
    };
    if (incoming.clientId) {
      const [client] = await getDb()
        .select()
        .from(clients)
        .where(eq(clients.id, incoming.clientId))
        .limit(1);
      if (client) {
        payload.client = client.name;
        payload.clientId = client.id;
      }
    }
    const people = await getDb().select().from(employees);
    const personName = (personId?: number | null) => {
      const p = people.find((x) => x.id === personId);
      return p ? `${p.firstName} ${p.lastName}` : "";
    };
    if (payload.recipientEmployeeId !== undefined)
      payload.recipient = personName(payload.recipientEmployeeId);
    const [before] = await getDb()
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, Number(id)))
      .limit(1);
    const [updated] = await getDb()
      .update(inquiries)
      .set({ ...payload, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(inquiries.id, Number(id)))
      .returning();
    if (updated)
      await audit(
        request,
        updated.id,
        "inquiry_edited",
        "Редактирани основни данни",
      );
    return updated
      ? Response.json({ inquiry: updated })
      : Response.json({ error: "Запитването не е намерено." }, { status: 404 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Грешка при актуализация",
      },
      { status: 500 },
    );
  }
}
