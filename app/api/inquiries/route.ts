import { and, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  clients,
  employees,
  inquiries,
  notificationLog,
  type NewInquiry,
} from "../../../db/schema";
import { eq } from "drizzle-orm";
import { notifyForEvent } from "../../../lib/notifications";
import { audit } from "../../../lib/audit";
import { canonicalStatus } from "../../../lib/workflow";
import { requireUser } from "../../../lib/auth";

const seedRows: NewInquiry[] = [
  {
    referenceNo: 1024,
    year: 2026,
    client: "Булгартрансгаз ЕАД",
    internalNo: "HD #75570",
    receivedAt: "2026-08-28",
    description: "Ограничен интерфейсен профил за необходимите функционалности",
    status: "1 Чака оценка от ТЛ",
    recipient: "Мартин Дойчинов",
    statusComment: "За разпределяне на седмичната среща",
  },
  {
    referenceNo: 1019,
    year: 2026,
    client: "А1 България ЕАД",
    internalNo: "HD #70128",
    receivedAt: "2026-08-18",
    offerSentAt: "2026-08-26",
    description: "Електронно трудово досие - допълнителни услуги",
    status: "4 Чака потвърждение",
    recipient: "Десислава Желева",
    analyst: "Беатриче Томова",
    evaluationDueAt: "2026-08-25",
    statusComment: "Офертата е изпратена по имейл",
  },
  {
    referenceNo: 1015,
    year: 2026,
    client: "Юробанк България АД",
    internalNo: "HD #69941",
    receivedAt: "2026-08-11",
    confirmedAt: "2026-08-24",
    description: "Справка за проверка на роднини",
    status: "5 Потвърдена оценка от клиента",
    recipient: "Калина Недева",
    analyst: "Таня Иванова",
    evaluationDueAt: "2026-08-21",
    statusComment: "За определяне на PM",
  },
  {
    referenceNo: 1008,
    year: 2026,
    client: "Фрапорт Туин Стар Еърпорт Мениджмънт АД",
    internalNo: "HD #69518",
    receivedAt: "2026-07-29",
    offerSentAt: "2026-08-05",
    confirmedAt: "2026-08-10",
    description: "Промяна на справка Присъствена форма",
    status: "6 Разработва се ",
    recipient: "Мартин Дойчинов",
    analyst: "Таня Иванова",
    evaluationDueAt: "2026-08-04",
    projectManager: "Беатриче Томова",
    statusComment: "Разработката е в процес",
  },
  {
    referenceNo: 997,
    year: 2026,
    client: "ВидеоЛукс",
    internalNo: "HD #69077",
    receivedAt: "2026-07-08",
    offerSentAt: "2026-07-15",
    confirmedAt: "2026-07-21",
    implementedAt: "2026-08-27",
    description: "Разширение на заключването на графици",
    status: "7 Внедрен / очаква се приемане",
    recipient: "Петя Димитрова",
    analyst: "Мартин Дойчинов",
    projectManager: "Петя Димитрова",
    statusComment: "Очаква се подписан протокол",
  },
  {
    referenceNo: 982,
    year: 2026,
    client: "Софарма Трейдинг АД",
    internalNo: "HD #68412",
    receivedAt: "2026-06-12",
    offerSentAt: "2026-06-19",
    confirmedAt: "2026-06-24",
    implementedAt: "2026-08-14",
    description: "Миграция на шаблони на документи",
    status: "8 Приключен (приет)",
    recipient: "Даниел Венев",
    analyst: "Калина Недева",
    projectManager: "Даниел Венев",
    statusComment: "Протоколът е подписан; готово за фактуриране",
  },
];

export async function GET(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  try {
    const db = getDb();
    const base = await db
      .select()
      .from(inquiries)
      .orderBy(desc(inquiries.year), desc(inquiries.referenceNo));
    for (const row of base.filter(
      (x) => canonicalStatus(x.status).startsWith("5 ") && x.offerSentAt,
    )) {
      const due = new Date(row.offerSentAt + "T00:00:00Z");
      due.setUTCMonth(due.getUTCMonth() + 3);
      if (due <= new Date()) {
        const [sent] = await db
          .select({ id: notificationLog.id })
          .from(notificationLog)
          .where(
            and(
              eq(notificationLog.inquiryId, row.id),
              eq(notificationLog.event, "no_response_due"),
            ),
          )
          .limit(1);
        if (!sent) await notifyForEvent(row, "no_response_due");
      }
    }
    return Response.json({
      inquiries: base.map((row) => ({
        ...row,
        status: canonicalStatus(row.status),
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Грешка при зареждане",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  try {
    const payload = (await request.json()) as Partial<NewInquiry> & {
      clientId?: number;
      recipientEmployeeId?: number;
      analystEmployeeId?: number;
      projectManagerEmployeeId?: number;
    };
    if (
      (!payload.clientId && !payload.client?.trim()) ||
      !payload.description?.trim() ||
      !payload.receivedAt ||
      !payload.recipientEmployeeId
    )
      return Response.json(
        { error: "Клиент, дата, описание и Получил заявката са задължителни." },
        { status: 400 },
      );
    const db = getDb();
    const [last] = await db
      .select({ referenceNo: inquiries.referenceNo })
      .from(inquiries)
      .orderBy(desc(inquiries.referenceNo))
      .limit(1);
    const [selectedClient] = payload.clientId
      ? await db
          .select()
          .from(clients)
          .where(eq(clients.id, payload.clientId))
          .limit(1)
      : [];
    const people = await db.select().from(employees);
    const personName = (id?: number | null) => {
      const p = people.find((x) => x.id === id);
      return p ? `${p.firstName} ${p.lastName}` : "";
    };
    const [created] = await db
      .insert(inquiries)
      .values({
        referenceNo:
          payload.referenceNo ?? Math.max((last?.referenceNo ?? 1188) + 1, 1189),
        year: payload.year ?? Number(payload.receivedAt.slice(0, 4)),
        client: selectedClient?.name ?? payload.client.trim(),
        clientId: selectedClient?.id,
        internalNo: payload.internalNo ?? "",
        receivedAt: payload.receivedAt,
        description: payload.description.trim(),
        status: "1 Регистрирано – за разпределяне",
        recipientEmployeeId: payload.recipientEmployeeId,
        recipient: personName(payload.recipientEmployeeId),
        requestType:
          payload.requestType === "service"
            ? "service"
            : "configuration_change",
        statusComment: payload.statusComment ?? "",
      })
      .returning();
    await audit(
      request,
      created.id,
      "inquiry_registered",
      "Създадена нова заявка",
    );
    await notifyForEvent(created, "inquiry_registered");
    return Response.json({ inquiry: created }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Грешка при запис" },
      { status: 500 },
    );
  }
}
