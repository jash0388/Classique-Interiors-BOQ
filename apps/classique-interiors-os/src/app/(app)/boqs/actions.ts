"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";

function newToken() {
  return crypto.randomBytes(24).toString("hex");
}

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function num(v: FormDataEntryValue | null, def = 0): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : def;
}

async function nextBoqNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.bOQ.count();
  for (let i = 1; i < 50; i++) {
    const candidate = `CI-B-${year}-${String(count + i).padStart(4, "0")}`;
    const exists = await db.bOQ.findUnique({ where: { number: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `CI-B-${year}-${Date.now()}`;
}

async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.quotation.count();
  for (let i = 1; i < 50; i++) {
    const candidate = `CI/Q/${year}/${String(count + i).padStart(3, "0")}`;
    const exists = await db.quotation.findUnique({ where: { number: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `CI/Q/${year}/${Date.now()}`;
}

type ItemInput = { description: string; unit: string; quantity: number; remarks: string };

function parseItems(raw: FormDataEntryValue | null): ItemInput[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({
        description: String(r.description ?? "").trim(),
        unit: String(r.unit ?? "nos").trim() || "nos",
        quantity: Number(r.quantity) || 0,
        remarks: String(r.remarks ?? "").trim(),
      }))
      .filter((r) => r.description.length > 0)
      .slice(0, 500);
  } catch {
    return [];
  }
}

export async function createBOQ(formData: FormData) {
  const user = await requireRole("OWNER", "MANAGER");

  const title = str(formData.get("title"));
  const clientName = str(formData.get("clientName"));
  const siteAddress = str(formData.get("siteAddress"));
  if (!title || !clientName || !siteAddress) {
    throw new Error("Title, client and site address are required.");
  }

  const deadlineRaw = str(formData.get("deadline"));
  const assignedToId = str(formData.get("assignedToId")) || null;
  const items = parseItems(formData.get("items"));

  const number = await nextBoqNumber();
  const boq = await db.bOQ.create({
    data: {
      number,
      title,
      clientName,
      clientContactName: str(formData.get("clientContactName")) || null,
      clientContactPhone: str(formData.get("clientContactPhone")) || null,
      siteAddress,
      city: str(formData.get("city")) || null,
      siteDetails: str(formData.get("siteDetails")) || null,
      deadline: deadlineRaw ? new Date(deadlineRaw) : null,
      notes: str(formData.get("notes")) || null,
      status: assignedToId ? "ASSIGNED" : "DRAFT",
      visitToken: newToken(),
      createdById: user.uid,
      assignedToId,
      assignedAt: assignedToId ? new Date() : null,
      items: { create: items.map((it, i) => ({ srNo: i + 1, ...it })) },
    },
  });

  revalidatePath("/boqs");
  revalidatePath("/dashboard");
  redirect(`/boqs/${boq.id}`);
}

export async function assignBOQ(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const boqId = str(formData.get("boqId"));
  const assignedToId = str(formData.get("assignedToId"));
  if (!boqId || !assignedToId) throw new Error("Pick a person to assign.");

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true } });
  if (!boq) throw new Error("BOQ not found.");

  const resetStatuses = ["DRAFT", "ASSIGNED", "SITE_VISIT_DONE", "ON_HOLD"];
  await db.bOQ.update({
    where: { id: boqId },
    data: {
      assignedToId,
      assignedAt: new Date(),
      visitToken: newToken(),
      status: resetStatuses.includes(boq.status) ? "ASSIGNED" : boq.status,
    },
  });

  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");
}

export async function setHold(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const boqId = str(formData.get("boqId"));
  const hold = str(formData.get("hold")) === "1";
  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true } });
  if (!boq) throw new Error("BOQ not found.");

  let status = boq.status;
  if (hold) status = "ON_HOLD";
  else if (boq.status === "ON_HOLD") status = "ASSIGNED";

  await db.bOQ.update({ where: { id: boqId }, data: { status } });
  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");
}

export async function addVendorInquiry(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const boqId = str(formData.get("boqId"));
  const vendorName = str(formData.get("vendorName"));
  if (!boqId || !vendorName) throw new Error("Vendor name is required.");

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true } });
  if (!boq) throw new Error("BOQ not found.");

  const dueDateRaw = str(formData.get("dueDate"));
  await db.vendorInquiry.create({
    data: {
      boqId,
      vendorName,
      vendorPhone: str(formData.get("vendorPhone")) || null,
      vendorEmail: str(formData.get("vendorEmail")) || null,
      instructions: str(formData.get("instructions")) || DEFAULT_INSTRUCTIONS,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  const goQuoting = ["DRAFT", "ASSIGNED", "SITE_VISIT_DONE", "VENDOR_QUOTING"];
  if (goQuoting.includes(boq.status)) {
    await db.bOQ.update({ where: { id: boqId }, data: { status: "VENDOR_QUOTING" } });
  }

  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");
}

export async function removeVendorInquiry(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const inquiryId = str(formData.get("inquiryId"));
  const boqId = str(formData.get("boqId"));
  await db.vendorInquiry.delete({ where: { id: inquiryId } });
  revalidatePath(`/boqs/${boqId}`);
}

export async function addVendorQuote(formData: FormData) {
  const user = await requireRole("OWNER", "MANAGER");
  const inquiryId = str(formData.get("inquiryId"));
  const boqId = str(formData.get("boqId"));
  const amount = num(formData.get("amount"));
  if (!inquiryId || amount <= 0) throw new Error("Enter a valid quotation amount.");

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  try {
    const files = JSON.parse(str(formData.get("quoteFile")) || "[]");
    if (Array.isArray(files) && files[0]?.url) {
      fileUrl = String(files[0].url);
      fileName = String(files[0].filename ?? "");
    }
  } catch {}

  const itemRatesRaw = str(formData.get("itemRates"));
  let itemRatesJson: string | null = null;
  if (itemRatesRaw) {
    try {
      const arr = JSON.parse(itemRatesRaw);
      if (Array.isArray(arr) && arr.length > 0) itemRatesJson = JSON.stringify(arr);
    } catch {}
  }

  const leadTimeDays = num(formData.get("leadTimeDays"), 0);

  await db.vendorQuote.create({
    data: {
      inquiryId,
      amount,
      itemRatesJson,
      leadTimeDays: leadTimeDays > 0 ? Math.round(leadTimeDays) : null,
      notes: str(formData.get("notes")) || null,
      fileUrl,
      fileName,
      enteredById: user.uid,
    },
  });
  await db.vendorInquiry.update({ where: { id: inquiryId }, data: { status: "QUOTATION_RECEIVED" } });

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true } });
  if (boq && ["DRAFT", "ASSIGNED", "SITE_VISIT_DONE", "VENDOR_QUOTING"].includes(boq.status)) {
    await db.bOQ.update({ where: { id: boqId }, data: { status: "QUOTES_RECEIVED" } });
  }

  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");
}

export async function generateQuotation(formData: FormData) {
  const user = await requireRole("OWNER", "MANAGER");
  const boqId = str(formData.get("boqId"));
  const inquiryId = str(formData.get("inquiryId"));
  const marginPercent = num(formData.get("marginPercent"), 0);
  const gstPercent = num(formData.get("gstPercent"), 0);
  if (!boqId || !inquiryId) throw new Error("Select a vendor.");

  const boq = await db.bOQ.findUnique({
    where: { id: boqId },
    include: { items: { orderBy: { srNo: "asc" } } },
  });
  const inquiry = await db.vendorInquiry.findUnique({
    where: { id: inquiryId },
    include: { quotes: { orderBy: { receivedAt: "desc" } } },
  });
  if (!boq || !inquiry || inquiry.boqId !== boqId) throw new Error("Vendor or BOQ not found.");

  const quote = inquiry.quotes[0];
  if (!quote) throw new Error("This vendor has not submitted a quotation yet.");

  const rates = new Map<string, number>();
  if (quote.itemRatesJson) {
    try {
      const arr = JSON.parse(quote.itemRatesJson);
      for (const r of arr) {
        if (r.boqItemId && Number(r.rate) >= 0) rates.set(String(r.boqItemId), Number(r.rate));
      }
    } catch {}
  }

  const totalQty = boq.items.reduce((s, it) => s + it.quantity, 0);
  const snapshot = boq.items.map((it) => {
    const rate = rates.get(it.id) ?? (it.quantity > 0 && totalQty > 0 ? (quote.amount * it.quantity) / totalQty / it.quantity : quote.amount / boq.items.length);
    const rounded = Math.round(rate * 100) / 100;
    return {
      srNo: it.srNo,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      remarks: it.remarks ?? "",
      rate: rounded,
      amount: Math.round(rounded * it.quantity * 100) / 100,
    };
  });

  const subtotal = Math.round(snapshot.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const marginAmount = Math.round(subtotal * (marginPercent / 100) * 100) / 100;
  const taxable = Math.round((subtotal + marginAmount) * 100) / 100;
  const gstAmount = Math.round(taxable * (gstPercent / 100) * 100) / 100;
  const grandTotal = Math.round((taxable + gstAmount) * 100) / 100;

  const quotation = await db.quotation.create({
    data: {
      boqId,
      number: await nextQuotationNumber(),
      vendorInquiryId: inquiryId,
      vendorName: inquiry.vendorName,
      marginPercent,
      gstPercent,
      subtotal,
      marginAmount,
      gstAmount,
      grandTotal,
      itemsSnapshotJson: JSON.stringify(snapshot),
      createdById: user.uid,
    },
  });

  await db.bOQ.update({ where: { id: boqId }, data: { status: "COMPLETED" } });

  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");
  redirect(`/boqs/${boqId}#quotation-${quotation.id}`);
}
