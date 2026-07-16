import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";

const SESSION_KEY = "actitrack_session";
const SECRET = "actitrack-secret-key-2026";

export interface SessionUser {
  id: number;
  name: string;
  storeName: string;
  role: "admin" | "user";
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const payload = JSON.stringify(user);
  const sig = sign(payload);
  cookieStore.set(SESSION_KEY, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_KEY)?.value;
    if (!raw) return null;
    const dot = raw.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if (sign(payload) !== sig) return null;
    return JSON.parse(payload);
  } catch { return null; }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}
