import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { documents } from "../../../db/schema";
import { actorFromRequest, audit } from "../../../lib/audit";
import { requireUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  const inquiryId = Number(new URL(request.url).searchParams.get("inquiryId"));
  if (!inquiryId)
    return Response.json({ error: "Липсва inquiryId" }, { status: 400 });
  return Response.json({
    documents: await getDb()
      .select()
      .from(documents)
      .where(eq(documents.inquiryId, inquiryId)),
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireUser(request); if (unauthorized) return unauthorized;
  try {
    const form = await request.formData(),
      file = form.get("file"),
      inquiryId = Number(form.get("inquiryId")),
      category = String(form.get("category") || ""),
      note = String(form.get("note") || "").trim();
    const hasFile = file instanceof File && file.size > 0;
    if (!inquiryId || !category || (!hasFile && !note))
      return Response.json(
        { error: "Прикачете файл или въведете бележка към документа." },
        { status: 400 },
      );
    if (hasFile && file.size > 15 * 1024 * 1024)
      return Response.json(
        { error: "Максималният размер на файл е 15 MB." },
        { status: 400 },
      );
    const objectKey = hasFile
      ? `inquiries/${inquiryId}/${category}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      : "";
    if (hasFile)
      await env.BUCKET.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: { originalName: file.name },
      });
    const actor = await actorFromRequest(request);
    const [created] = await getDb()
      .insert(documents)
      .values({
        inquiryId,
        category,
        fileName: hasFile ? file.name : "",
        objectKey,
        contentType: hasFile ? file.type || "application/octet-stream" : "",
        sizeBytes: hasFile ? file.size : 0,
        uploadedBy: actor.actorName,
        note,
      })
      .returning();
    await audit(
      request,
      inquiryId,
      hasFile ? "document_uploaded" : "document_note_added",
      `${category}${hasFile ? `: ${file.name}` : ""}${note ? ` · Бележка: ${note}` : ""}`,
    );
    return Response.json({ document: created }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Грешка при качване" },
      { status: 500 },
    );
  }
}
