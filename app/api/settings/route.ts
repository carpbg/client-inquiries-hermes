import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { appSettings, notificationTemplates } from "../../../db/schema";
import {
  encryptSecret,
  ensureNotificationDefaults,
} from "../../../lib/notifications";
import { requireAccess, requireUser } from "../../../lib/auth";
export async function GET(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  await ensureNotificationDefaults();
  const [settings, templates] = await Promise.all([
    getDb().select().from(appSettings),
    getDb()
      .select()
      .from(notificationTemplates)
      .orderBy(asc(notificationTemplates.stepNo)),
  ]);
  const values = Object.fromEntries(settings.map((x) => [x.key, x.value]));
  return Response.json({
    settings: {
      apiKeyConfigured: Boolean(values.resend_api_key),
      fromEmail: values.notification_from_email || "onboarding@resend.dev",
      fromName: values.notification_from_name || "Клиентски запитвания",
    },
    templates: templates.map((x) => ({
      ...x,
      recipientRoles: (JSON.parse(x.recipientRoles) as string[]).filter(
        (role) => role !== "stakeholders",
      ),
    })),
  });
}
export async function PUT(request: Request) {
  const unauthorized = await requireAccess(request,["admin"]); if (unauthorized) return unauthorized;
  try {
    const payload = (await request.json()) as {
      apiKey?: string;
      fromEmail?: string;
      fromName?: string;
      templates?: Array<{
        id: number;
        recipientRoles: string[];
        subjectTemplate: string;
        bodyTemplate: string;
        enabled: boolean;
      }>;
    };
    const writes: Array<Promise<unknown>> = [];
    const set = (key: string, value: string) =>
      getDb()
        .insert(appSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
    if (payload.apiKey?.trim())
      writes.push(
        set("resend_api_key", await encryptSecret(payload.apiKey.trim())),
      );
    if (payload.fromEmail)
      writes.push(set("notification_from_email", payload.fromEmail.trim()));
    if (payload.fromName)
      writes.push(set("notification_from_name", payload.fromName.trim()));
    for (const t of payload.templates ?? [])
      writes.push(
        getDb()
          .update(notificationTemplates)
          .set({
            recipientRoles: JSON.stringify(
              t.recipientRoles.filter((role) => role !== "stakeholders"),
            ),
            subjectTemplate: t.subjectTemplate,
            bodyTemplate: t.bodyTemplate,
            enabled: t.enabled,
          })
          .where(eq(notificationTemplates.id, t.id)),
      );
    await Promise.all(writes);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Грешка при запис" },
      { status: 500 },
    );
  }
}
