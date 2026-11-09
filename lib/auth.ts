import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { employees } from "../db/schema";

const COOKIE_NAME = "client_inquiries_session";
const SESSION_SECONDS = 12 * 60 * 60;

export type AppUser = {
  id: number;
  email: string;
  name: string;
  accessRole: "user" | "manager" | "admin";
  notificationsEnabled: boolean;
  exp: number;
};

export type AccessRole = AppUser["accessRole"];
const BOOTSTRAP_ADMIN_EMAIL = "mdoychinov@technologica.com";

function secret() {
  const value = (env as unknown as Record<string, unknown>).AUTH_SECRET;
  if (typeof value !== "string" || value.length < 32)
    throw new Error("AUTH_SECRET не е конфигуриран.");
  return value;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
    ),
  );
}

export async function createSessionCookie(
  user: Omit<AppUser, "exp">,
  secure = true,
) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...user,
        exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
      }),
    ),
  );
  const secureAttribute = secure ? "; Secure" : "";
  return `${COOKIE_NAME}=${payload}.${await signature(payload)}; Path=/; HttpOnly${secureAttribute}; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie(secure = true) {
  const secureAttribute = secure ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secureAttribute}; SameSite=Lax; Max-Age=0`;
}

export async function getSession(request: Request): Promise<AppUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [payload, suppliedSignature] = raw.split(".");
  if (!payload || !suppliedSignature) return null;
  if ((await signature(payload)) !== suppliedSignature) return null;
  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
    const user = JSON.parse(new TextDecoder().decode(bytes)) as AppUser;
    if (!user.id || !user.email || user.exp <= Math.floor(Date.now() / 1000))
      return null;
    return { ...user, accessRole: user.accessRole || "user", notificationsEnabled: user.notificationsEnabled !== false };
  } catch {
    return null;
  }
}

export async function getAuthorizedUser(request: Request) {
  const session = await getSession(request);
  if (!session) return null;
  const [employee] = await getDb()
    .select({ accessRole: employees.accessRole, active: employees.active, notificationsEnabled: employees.notificationsEnabled })
    .from(employees)
    .where(eq(employees.id, session.id))
    .limit(1);
  if (!employee?.active) return null;
  const accessRole =
    session.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
      ? "admin"
      : employee.accessRole;
  return { ...session, accessRole: accessRole as AccessRole, notificationsEnabled: employee.notificationsEnabled };
}

export async function requireUser(request: Request) {
  const user = await getAuthorizedUser(request);
  return user
    ? null
    : Response.json({ error: "Необходим е вход в приложението." }, { status: 401 });
}


export async function requireAccess(request: Request, roles: AccessRole[]) {
  const user = await getAuthorizedUser(request);
  if (!user)
    return Response.json(
      { error: "Необходим е вход в приложението." },
      { status: 401 },
    );
  return roles.includes(user.accessRole)
    ? null
    : Response.json(
        { error: "Нямате права за това действие." },
        { status: 403 },
      );
}
