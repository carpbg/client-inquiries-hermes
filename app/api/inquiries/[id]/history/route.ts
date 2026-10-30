import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { actionLog, notificationLog } from "../../../../../db/schema";
import { requireUser } from "../../../../../lib/auth";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  const inquiryId = Number((await params).id);
  const [actions, notifications] = await Promise.all([
    getDb()
      .select()
      .from(actionLog)
      .where(eq(actionLog.inquiryId, inquiryId))
      .orderBy(desc(actionLog.createdAt)),
    getDb()
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.inquiryId, inquiryId))
      .orderBy(desc(notificationLog.createdAt)),
  ]);
  return Response.json({ actions, notifications });
}
