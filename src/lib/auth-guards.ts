import { auth } from "@/auth";
import type { Session } from "next-auth";

type SessionUser = Session["user"];

export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}
