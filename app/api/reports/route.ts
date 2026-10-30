import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { actionLog, documents, inquiries, notificationLog } from "../../../db/schema";
import { requireUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  const db = getDb();
  const [inquiryRows, documentRows, actionRows, notificationRows] = await Promise.all([
    db.select().from(inquiries).orderBy(desc(inquiries.receivedAt)),
    db.select().from(documents).orderBy(desc(documents.createdAt)),
    db.select().from(actionLog).orderBy(desc(actionLog.createdAt)),
    db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)),
  ]);
  return Response.json({ inquiries: inquiryRows, documents: documentRows, actions: actionRows, notifications: notificationRows });
}
