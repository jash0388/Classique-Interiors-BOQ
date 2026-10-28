"use server";

import { redirect } from "next/navigation";
import { authenticate, setSessionCookie } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Please enter your email and password." };

  const session = await authenticate(email, password);
  if (!session) return { error: "Wrong email or password, or the account is inactive." };

  await setSessionCookie(session);
  redirect("/dashboard");
}
