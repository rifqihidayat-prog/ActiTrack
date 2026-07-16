import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_KEY = "actitrack_session";
const SECRET = "actitrack-secret-key-2026";

async function sign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSessionFromCookie(raw: string | undefined): Promise<{ role: string } | null> {
  if (!raw) return null;
  try {
    const dot = raw.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if ((await sign(payload)) !== sig) return null;
    return JSON.parse(payload);
  } catch { return null; }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_KEY)?.value;
  const user = await getSessionFromCookie(raw);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api).*)"],
};
