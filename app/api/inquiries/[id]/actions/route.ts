import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { documents, employees, inquiries } from "../../../../../db/schema";
import { audit } from "../../../../../lib/audit";
import { notifyForEvent } from "../../../../../lib/notifications";
import { canonicalStatus } from "../../../../../lib/workflow";
import { getAuthorizedUser, requireUser } from "../../../../../lib/auth";

const hasDocument = async (inquiryId: number, category: string) =>
  Boolean(
    (
      await getDb()
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.inquiryId, inquiryId),
            eq(documents.category, category),
          ),
        )
        .limit(1)
    )[0],
  );
const fail = (error: string) => Response.json({ error }, { status: 400 });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  try {
    const currentUser = await getAuthorizedUser(request);
    const inquiryId = Number((await params).id),
      p = (await request.json()) as Record<string, unknown>,
      action = String(p.action || "");
    const [before] = await getDb()
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId))
      .limit(1);
    if (!before)
      return Response.json(
        { error: "Заявката не е намерена." },
        { status: 404 },
      );
    const currentStatus = canonicalStatus(before.status);
    const set: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      },
      valid = (...prefixes: string[]) =>
        prefixes.some((x) => currentStatus.startsWith(x));
    let event = "";
    let auditDetails: Record<string, unknown> | null = null;
    const requireRole = (...roles: string[]) =>
      currentUser && roles.includes(currentUser.accessRole)
        ? null
        : Response.json({ error: "Нямате права за това действие." }, { status: 403 });
    if (action === "admin_correct") {
      const forbidden = requireRole("admin");
      if (forbidden) return forbidden;
      const reason = String(p.reason || "").trim();
      if (!reason) return fail("Причината за административната промяна е задължителна.");
      const resolvePerson = async (value: unknown, label: string) => {
        if (value === undefined) return null;
        const id = Number(value);
        if (!id) throw new Error(`Изберете ${label}.`);
        const [person] = await getDb().select().from(employees).where(eq(employees.id,id)).limit(1);
        if (!person) throw new Error(`Невалиден ${label}.`);
        return { id, name: `${person.firstName} ${person.lastName}` };
      };
      const recipient = await resolvePerson(p.recipientEmployeeId,"Получател");
      const analyst = await resolvePerson(p.analystEmployeeId,"Анализатор");
      const projectManager = await resolvePerson(p.projectManagerEmployeeId,"Отговорен PM");
      if (!recipient && !analyst && !projectManager && !p.returnToAnalysis)
        return fail("Изберете поне една административна промяна.");
      if (recipient) Object.assign(set,{recipientEmployeeId:recipient.id,recipient:recipient.name});
      if (analyst) Object.assign(set,{analystEmployeeId:analyst.id,analyst:analyst.name});
      if (projectManager) Object.assign(set,{projectManagerEmployeeId:projectManager.id,projectManager:projectManager.name});
      if (p.evaluationDueAt) set.evaluationDueAt=String(p.evaluationDueAt);
      if (p.returnToAnalysis) {
        if (!(analyst || before.analystEmployeeId) || !p.evaluationDueAt)
          return fail("За връщане в анализ са задължителни Анализатор и нов срок.");
        set.status="2 В анализ";
      }
      set.statusComment=reason;
      auditDetails={
        reason,
        returnToAnalysis:Boolean(p.returnToAnalysis),
        fromStatus:before.status,
        toStatus:set.status||before.status,
        recipient:{from:before.recipient,to:recipient?.name||before.recipient},
        analyst:{from:before.analyst,to:analyst?.name||before.analyst},
        projectManager:{from:before.projectManager,to:projectManager?.name||before.projectManager},
        evaluationDueAt:{from:before.evaluationDueAt,to:set.evaluationDueAt||before.evaluationDueAt},
      };
      event="administrative_change";
    } else if (action === "assign_analysis") {
      const forbidden = requireRole("manager","admin");
      if (forbidden) return forbidden;
      if (!valid("1", "2.1"))
        return fail("Разпределяне е допустимо само при чакаща оценка.");
      const analystId = Number(p.analystEmployeeId);
      if (!analystId || !p.evaluationDueAt)
        return fail("Изберете анализатор и срок за оценка.");
      const [person] = await getDb()
        .select()
        .from(employees)
        .where(eq(employees.id, analystId))
        .limit(1);
      if (!person) return fail("Невалиден анализатор.");
      Object.assign(set, {
        analystEmployeeId: analystId,
        analyst: `${person.firstName} ${person.lastName}`,
        evaluationDueAt: String(p.evaluationDueAt),
        status: "2 В анализ",
      });
      event = "analysis_assigned";
    } else if (action === "request_info") {
      if (!valid("2 ", "3 "))
        return fail(
          "Допълнителна информация може да се поиска по време на анализа.",
        );
      Object.assign(set, {
        status: "2.1 Очаква информация от клиента",
        statusComment: String(p.comment || "Очаква се информация от клиента"),
      });
      event = "client_feedback";
    } else if (action === "resume_analysis") {
      if (!valid("2.1")) return fail("Заявката не чака информация от клиента.");
      set.status = "2 В анализ";
    } else if (action === "submit_evaluation") {
      if (!valid("2 ", "2.1"))
        return fail("Оценката може да се предаде само от етап Анализ.");
      if (!before.analystEmployeeId || !before.evaluationDueAt)
        return fail("Преди предаване трябва да има анализатор и срок.");
      if (!(await hasDocument(inquiryId, "evaluation")))
        return fail("Първо качете документа с оценката.");
      set.status = "3 Оценка за съгласуване";
      event = "evaluation_uploaded";
    } else if (action === "agree_evaluation") {
      if (!valid("3 "))
        return fail("Оценката първо трябва да бъде предадена за съгласуване.");
      if (!(await hasDocument(inquiryId, "offer")))
        return fail("Първо качете съгласуваната оферта.");
      set.status = "4 Офертата е съгласувана";
      event = "evaluation_agreed";
    } else if (action === "send_offer") {
      if (!valid("4 ")) return fail("Офертата трябва да бъде съгласувана.");
      if (!(await hasDocument(inquiryId, "offer")))
        return fail("Липсва съгласувана оферта.");
      if (!p.offerSentAt || !p.offerChannel || !p.offerSentBy)
        return fail("Въведете дата, канал и изпращач.");
      Object.assign(set, {
        status: "5 Офертата е изпратена – очаква решение",
        offerSentAt: String(p.offerSentAt),
        offerChannel: String(p.offerChannel),
        offerSentBy: String(p.offerSentBy),
      });
      event = "offer_sent";
    } else if (action === "confirm_offer") {
      if (!valid("5 "))
        return fail("Потвърждение се регистрира само за изпратена оферта.");
      if (!p.decisionAt) return fail("Въведете дата на потвърждение.");
      Object.assign(set, {
        status: "6 Потвърдена от клиента – за разпределяне",
        confirmedAt: String(p.decisionAt),
        clientDecision: "confirmed",
        statusComment: String(
          p.comment ||
            "Потвърдена от клиента; папката следва да е със суфикс _потвърдена",
        ),
      });
      event = "client_confirmed";
    } else if (action === "reject_offer") {
      if (!valid("5 "))
        return fail("Отказ се регистрира само за изпратена оферта.");
      if (!p.decisionAt || !p.comment)
        return fail("Въведете дата и основание за отказа.");
      Object.assign(set, {
        status: "6.1 Отказана от клиента",
        confirmedAt: String(p.decisionAt),
        clientDecision: "rejected",
        statusComment: String(p.comment),
      });
      event = "client_rejected";
    } else if (action === "close_no_response") {
      if (!valid("5 ") || !before.offerSentAt)
        return fail("Служебно затваряне е допустимо само за изпратена оферта.");
      const due = new Date(before.offerSentAt + "T00:00:00Z");
      due.setUTCMonth(due.getUTCMonth() + 3);
      if (due > new Date())
        return fail("Все още не са изминали три месеца от изпращането.");
      Object.assign(set, {
        status: "6.2 Приключена без отговор от клиента",
        clientDecision: "no_response",
        statusComment: "служебно затворена",
      });
      event = "client_rejected";
    } else if (action === "postpone_no_response") {
      if (!valid("5 ") || !before.offerSentAt)
        return fail("Отлагане е допустимо само за изпратена оферта.");
      const due = new Date(before.offerSentAt + "T00:00:00Z");
      due.setUTCMonth(due.getUTCMonth() + 3);
      if (due > new Date())
        return fail("Все още не са изминали три месеца от изпращането.");
      Object.assign(set, {
        status: "6.3 Отложена",
        pausedFromStatus: currentStatus,
        lifecycleDecisionAt: String(p.decisionAt || new Date().toISOString().slice(0, 10)),
        lifecycleDecisionBy: String(p.decisionBy || before.recipient || ""),
        reviewAt: p.reviewAt ? String(p.reviewAt) : null,
        clientDecision: "postponed",
        statusComment: String(p.comment || "Отложена след изтичане на срока"),
      });
      event = "client_postponed";
    } else if (action === "stop_workflow") {
      const forbidden = requireRole("manager","admin");
      if (forbidden) return forbidden;
      const stoppedCodes = ["6.1", "6.2", "6.3", "6.4", "9", "10"];
      if (stoppedCodes.some((code) => currentStatus.startsWith(code)))
        return fail("Заявката не е в активен етап.");
      const decisionType = String(p.decisionType || "");
      const reason = String(p.comment || "").trim();
      const decisionBy = String(p.decisionBy || "").trim();
      const decisionAt = String(p.decisionAt || "").trim();
      if (!["postponed", "client_rejected", "internal_stopped"].includes(decisionType))
        return fail("Изберете решение.");
      if (!decisionAt || !reason || !decisionBy)
        return fail("Дата, основание и лице, взело решението, са задължителни.");
      const nextStatus =
        decisionType === "postponed"
          ? "6.3 Отложена"
          : decisionType === "client_rejected"
            ? "6.1 Отказана от клиента"
            : "6.4 Прекратена по вътрешно решение";
      Object.assign(set, {
        status: nextStatus,
        pausedFromStatus: currentStatus,
        lifecycleDecisionAt: decisionAt,
        lifecycleDecisionBy: decisionBy,
        reviewAt:
          decisionType === "postponed" && p.reviewAt
            ? String(p.reviewAt)
            : null,
        clientDecision: decisionType,
        statusComment: reason,
      });
      event =
        decisionType === "postponed"
          ? "client_postponed"
          : decisionType === "client_rejected"
            ? "client_rejected"
            : "";
    } else if (action === "resume_postponed") {
      const forbidden = requireRole("manager","admin");
      if (forbidden) return forbidden;
      if (!valid("6.3") || !before.pausedFromStatus)
        return fail("Липсва етап, към който заявката да бъде възобновена.");
      Object.assign(set, {
        status: before.pausedFromStatus,
        pausedFromStatus: null,
        lifecycleDecisionAt: null,
        lifecycleDecisionBy: "",
        reviewAt: null,
        clientDecision: "",
        statusComment: String(p.comment || "Заявката е възобновена."),
      });
    } else if (action === "assign_implementation") {
      const forbidden = requireRole("manager","admin");
      if (forbidden) return forbidden;
      if (!valid("6 "))
        return fail("Може да се разпредели само потвърдена оферта.");
      const pmId = Number(p.projectManagerEmployeeId);
      if (!pmId) return fail("Изберете Отговорен PM.");
      const [person] = await getDb()
        .select()
        .from(employees)
        .where(eq(employees.id, pmId))
        .limit(1);
      if (!person) return fail("Невалиден PM.");
      Object.assign(set, {
        status: "7 В реализация",
        projectManagerEmployeeId: pmId,
        projectManager: `${person.firstName} ${person.lastName}`,
      });
      event = "implementation_assigned";
    } else if (action === "mark_implemented") {
      if (!valid("7 "))
        return fail(
          "Само заявка в реализация може да бъде отбелязана като внедрена.",
        );
      if (!p.implementedAt) return fail("Въведете дата на внедряване.");
      if (before.requestType === "configuration_change" && !before.folderPath)
        return fail(
          "За промяна на конфигурация въведете папка или линк към документацията.",
        );
      if (
        before.requestType === "configuration_change" &&
        !(await hasDocument(inquiryId, "signed_cr"))
      )
        return fail(
          "За промяна на конфигурация е задължителна подписана заявка за промяна.",
        );
      Object.assign(set, {
        status: "8 Внедрена – очаква приемане",
        implementedAt: String(p.implementedAt),
      });
      event = "implementation_document";
    } else if (action === "complete") {
      if (!valid("8 ")) return fail("Заявката първо трябва да бъде внедрена.");
      if (!before.implementedAt) return fail("Липсва дата на внедряване.");
      if (!(await hasDocument(inquiryId, "signed_protocol")))
        return fail("Първо качете двустранно подписания протокол.");
      set.status = "9 Приета – за фактуриране";
      event = "signed_protocol";
    } else if (action === "invoice") {
      if (!valid("9 "))
        return fail("Фактура се регистрира след документалното приключване.");
      if (!p.invoiceNo || !p.invoiceDate)
        return fail("Въведете номер и дата на фактурата.");
      Object.assign(set, {
        status: "10 Фактурирана",
        invoiceNo: String(p.invoiceNo),
        invoiceDate: String(p.invoiceDate),
      });
      event = "invoice_uploaded";
    } else return fail("Неподдържано действие.");
    const actionComment = String(p.comment || "").trim();
    if (actionComment) set.statusComment = actionComment;
    const [updated] = await getDb()
      .update(inquiries)
      .set(set)
      .where(eq(inquiries.id, inquiryId))
      .returning();
    await audit(
      request,
      inquiryId,
      action,
      JSON.stringify(auditDetails || {
        from: before.status,
        to: updated.status,
        comment: p.comment || "",
      }),
    );
    if (event) await notifyForEvent(updated, event);
    return Response.json({ inquiry: updated });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Грешка при изпълнение на действието.",
      },
      { status: 500 },
    );
  }
}
