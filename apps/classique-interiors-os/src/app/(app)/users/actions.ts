"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export async function addUser(formData: FormData) {
  await requireRole("OWNER");
  const name = str(formData.get("name"));
  const email = str(formData.get("email")).toLowerCase();
  const role = str(formData.get("role"));
  const password = str(formData.get("password"));
  if (!name || !email || !["OWNER", "MANAGER", "FIELD"].includes(role) || password.length < 6) {
    throw new Error("Name, email, role and a 6+ character password are required.");
  }
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) throw new Error("A user with this email already exists.");

  await db.user.create({
    data: {
      name,
      email,
      role,
      city: str(formData.get("city")) || null,
      phone: str(formData.get("phone")) || null,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  revalidatePath("/users");
}

export async function toggleUserActive(formData: FormData) {
  await requireRole("OWNER");
  const id = str(formData.get("userId"));
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found.");
  if (user.role === "OWNER" && user.active) throw new Error("The owner account cannot be deactivated.");
  await db.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/users");
}

export async function resetPassword(formData: FormData) {
  await requireRole("OWNER");
  const id = str(formData.get("userId"));
  const password = str(formData.get("password"));
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/users");
}
