import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  appSettings,
  employees,
  notificationLog,
  notificationTemplates,
  type Inquiry,
} from "../db/schema";
import { defaultTemplates, statusLabel } from "./workflow";

type Runtime = {
  APP_SETTINGS_SECRET?: string;
  RESEND_API_KEY?: string;
  NOTIFICATION_FROM_EMAIL?: string;
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const interpolate = (template: string, inquiry: Inquiry, documentName = "") =>
  template.replace(/{{(\w+)}}/g, (_, key) =>
    String(
      (
        {
          referenceNo: inquiry.referenceNo,
          client: inquiry.client,
          description: inquiry.description,
          status: statusLabel(inquiry.status),
          recipient: inquiry.recipient || "—",
          analyst: inquiry.analyst || "—",
          projectManager: inquiry.projectManager || "—",
          documentName: documentName || "—",
        } as Record<string, unknown>
      )[key] ?? "",
    ),
  );
async function keyFromSecret(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptSecret(value: string) {
  const secret = (env as unknown as Runtime).APP_SETTINGS_SECRET;
  if (!secret)
    throw new Error("Липсва системен ключ за защита на настройките.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await keyFromSecret(secret),
    new TextEncoder().encode(value),
  );
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
}
export async function decryptSecret(value: string) {
  const secret = (env as unknown as Runtime).APP_SETTINGS_SECRET;
  if (!secret) return "";
  try {
    const [a, b] = value.split(".");
    const iv = Uint8Array.from(atob(a), (c) => c.charCodeAt(0)),
      data = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        await keyFromSecret(secret),
        data,
      ),
    );
  } catch {
    return "";
  }
}
export async function ensureNotificationDefaults() {
  for (const t of defaultTemplates)
    await getDb()
      .insert(notificationTemplates)
      .values({
        eventKey: t.eventKey,
        stepNo: t.stepNo,
        name: t.name,
        recipientRoles: t.recipientRoles,
        subjectTemplate: t.subjectTemplate,
        bodyTemplate: t.bodyTemplate,
        enabled: t.enabled,
      })
      .onConflictDoNothing();
}
async function resolveRecipients(inquiry: Inquiry, roles: string[]) {
  const ids: number[] = [];
  if (roles.includes("recipient") && inquiry.recipientEmployeeId)
    ids.push(inquiry.recipientEmployeeId);
  if (roles.includes("analyst") && inquiry.analystEmployeeId)
    ids.push(inquiry.analystEmployeeId);
  if (roles.includes("project_manager") && inquiry.projectManagerEmployeeId)
    ids.push(inquiry.projectManagerEmployeeId);
  const systemRoles = roles.filter(
    (x) => x === "contract_manager" || x === "department_head",
  );
  let addresses: string[] = [];
  if (ids.length)
    addresses.push(
      ...(
        await getDb()
          .select({ email: employees.email })
          .from(employees)
          .where(and(inArray(employees.id, ids), eq(employees.active, true), eq(employees.notificationsEnabled, true)))
      ).map((x) => x.email),
    );
  if (systemRoles.length)
    addresses.push(
      ...(
        await getDb()
          .select({ email: employees.email })
          .from(employees)
          .where(
            and(
              inArray(employees.systemRole, systemRoles),
              eq(employees.active, true),
              eq(employees.notificationsEnabled, true),
            ),
          )
      ).map((x) => x.email),
    );
  return [...new Set(addresses.filter((x) => x.includes("@")))];
}
export async function notifyForEvent(
  inquiry: Inquiry,
  eventKey: string,
  documentName = "",
) {
  await ensureNotificationDefaults();
  const [template] = await getDb()
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.eventKey, eventKey))
    .limit(1);
  if (!template?.enabled) return;
  const recipients = await resolveRecipients(
    inquiry,
    JSON.parse(template.recipientRoles) as string[],
  );
  const subject = interpolate(template.subjectTemplate, inquiry, documentName),
    body = interpolate(template.bodyTemplate, inquiry, documentName);
  if (!recipients.length) {
    await getDb()
      .insert(notificationLog)
      .values({
        inquiryId: inquiry.id,
        event: eventKey,
        recipients: "",
        subject,
        deliveryStatus: "skipped",
        errorMessage: "Няма валидни получатели.",
      });
    return;
  }
  const rows = await getDb().select().from(appSettings),
    settings = Object.fromEntries(rows.map((x) => [x.key, x.value]));
  const runtime = env as unknown as Runtime,
    apiKey = settings.resend_api_key
      ? await decryptSecret(settings.resend_api_key)
      : runtime.RESEND_API_KEY,
    fromEmail =
      settings.notification_from_email || runtime.NOTIFICATION_FROM_EMAIL,
    fromName = settings.notification_from_name || "Клиентски запитвания";
  let deliveryStatus = "pending_configuration",
    errorMessage = "Липсва конфигурация на имейл доставчик.";
  if (apiKey && fromEmail) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: recipients,
          subject,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.55">${body
            .split("\n")
            .map((x) => escapeHtml(x))
            .join("<br>")}</div>`,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      deliveryStatus = "sent";
      errorMessage = "";
    } catch (error) {
      deliveryStatus = "failed";
      errorMessage =
        error instanceof Error ? error.message : "Неуспешно изпращане";
    }
  }
  await getDb()
    .insert(notificationLog)
    .values({
      inquiryId: inquiry.id,
      event: eventKey,
      recipients: recipients.join(", "),
      subject,
      deliveryStatus,
      errorMessage,
    });
}
export async function sendTestEmail(to: string) {
  const rows = await getDb().select().from(appSettings),
    settings = Object.fromEntries(rows.map((x) => [x.key, x.value]));
  const apiKey = settings.resend_api_key
    ? await decryptSecret(settings.resend_api_key)
    : "";
  if (!apiKey || !settings.notification_from_email)
    throw new Error("Първо запазете API ключ и имейл на подателя.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `${settings.notification_from_name || "Клиентски запитвания"} <${settings.notification_from_email}>`,
      to: [to],
      subject: "Тестово известие от Клиентски запитвания",
      html: "<p>Настройките за автоматични уведомявания работят.</p>",
    }),
  });
  if (!response.ok) throw new Error(await response.text());
}
