"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const val = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function saveVendor(fd: FormData) {
  const user = await requireRole("OWNER", "MANAGER");
  const id = val(fd, "id");
  const name = val(fd, "name");
  const trade = val(fd, "trade");
  if (!name || !trade) throw new Error("Vendor name and work type are required.");
  const data = { name, trade, phone: val(fd, "phone") || null, email: val(fd, "email") || null, city: val(fd, "city") || null, notes: val(fd, "notes") || null };
  if (id) await db.vendor.update({ where: { id }, data });
  else await db.vendor.create({ data: { ...data, createdById: user.uid } });
  revalidatePath("/vendors");
  revalidatePath("/boqs");
}

export async function toggleVendor(fd: FormData) {
  await requireRole("OWNER", "MANAGER");
  const id = val(fd, "id");
  const vendor = await db.vendor.findUnique({ where: { id }, select: { active: true } });
  if (!vendor) throw new Error("Vendor not found.");
  await db.vendor.update({ where: { id }, data: { active: !vendor.active } });
  revalidatePath("/vendors");
}
