import { getDb } from "../db";
import { actionLog } from "../db/schema";
import { getSession } from "./auth";
export async function actorFromRequest(request: Request) {
  const session = await getSession(request);
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  let name = "";
  if (
    encoded &&
    request.headers.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
  ) {
    try {
      name = decodeURIComponent(encoded);
    } catch {
      name = "";
    }
  }
  return {
    actorId: session ? String(session.id) : request.headers.get("oai-authenticated-user-id") || "",
    actorEmail: session?.email || request.headers.get("oai-authenticated-user-email") || "",
    actorName:
      session?.name || name ||
      request.headers.get("oai-authenticated-user-email") ||
      "Системен потребител",
  };
}
export async function audit(
  request: Request,
  inquiryId: number,
  action: string,
  details = "",
) {
  await getDb()
    .insert(actionLog)
    .values({ inquiryId, action, details, ...(await actorFromRequest(request)) });
}
