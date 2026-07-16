"use server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";

export async function loginAction(username: string, password: string): Promise<{ error?: string }> {
  if (!username || !password) return { error: "Username dan password harus diisi" };

  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) return { error: "Username tidak ditemukan" };

  if (!verifyPassword(password, user.password)) return { error: "Password salah" };

  await createSession({ id: user.id, name: user.name, storeName: user.storeName, role: user.role as "admin" | "user" });
  return {};
}
