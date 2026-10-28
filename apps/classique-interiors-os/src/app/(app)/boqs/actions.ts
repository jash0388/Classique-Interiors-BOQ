"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";
import { trashCutoff } from "@/lib/boq-trash";

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

export async function trashBOQ(formData: FormData) {
  await requireRole("OWNER");
  const boqId = str(formData.get("boqId"));
  if (!boqId) throw new Error("BOQ not found.");

  const result = await db.bOQ.updateMany({
    where: { id: boqId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!result.count) throw new Error("BOQ not found or already in Trash.");

  revalidatePath("/boqs");
  revalidatePath("/boqs/trash");
  revalidatePath("/dashboard");
  redirect("/boqs");
}

export async function restoreBOQ(formData: FormData) {
  await requireRole("OWNER");
  const boqId = str(formData.get("boqId"));
  if (!boqId) throw new Error("BOQ not found.");

  const result = await db.bOQ.updateMany({
    where: { id: boqId, deletedAt: { gt: trashCutoff() } },
    data: { deletedAt: null },
  });
  if (!result.count) throw new Error("This BOQ's 15-day recovery period has expired.");

  revalidatePath("/boqs");
  revalidatePath("/boqs/trash");
  revalidatePath("/dashboard");
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
      status: "DRAFT",
      visitToken: newToken(),
      createdById: user.uid,
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

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true, deletedAt: true, number: true, title: true, clientName: true } });
  if (!boq || boq.deletedAt) throw new Error("BOQ not found.");
  const assignee = await db.user.findFirst({ where: { id: assignedToId, role: "FIELD", active: true }, select: { name: true, email: true } });
  if (!assignee) throw new Error("Select an active site team member.");
  const visitToken = newToken();

  const resetStatuses = ["DRAFT", "REQUEST_RECEIVED", "ASSIGNED", "SITE_VISIT_DONE", "ON_HOLD"];
  await db.bOQ.update({
    where: { id: boqId },
    data: {
      assignedToId,
      assignedAt: new Date(),
      visitToken,
      status: resetStatuses.includes(boq.status) ? "ASSIGNED" : boq.status,
    },
  });

  revalidatePath(`/boqs/${boqId}`);
  revalidatePath("/boqs");
  revalidatePath("/dashboard");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !assignee.email) {
    return { emailSent: false, emailError: "Automatic email is not configured for this app yet. Use the Email button to send the assignment." };
  }
  try {
    const h = await headers();
    const appUrl = process.env.APP_URL || `${h.get("x-forwarded-proto") || "https"}://${h.get("host") || "localhost:3000"}`;
    const actualVisitUrl = `${appUrl.replace(/\/$/, "")}/visit/${visitToken}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [assignee.email],
        subject: `Site visit assigned: ${boq.number}`,
        text: `Hi ${assignee.name},\n\nA site visit has been assigned to you.\nBOQ: ${boq.number}\nProject: ${boq.title}\nClient: ${boq.clientName}\n\nOpen the visit report and submit your details and photos here:\n${actualVisitUrl}\n`,
      }),
      cache: "no-store",
    });
    if (!response.ok) return { emailSent: false, emailError: "Assignment saved, but email delivery failed. Use the Email button to send the link manually." };
    return { emailSent: true, emailError: "" };
  } catch {
    return { emailSent: false, emailError: "Assignment saved, but email delivery failed. Use the Email button to send the link manually." };
  }
}

export async function setHold(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const boqId = str(formData.get("boqId"));
  const hold = str(formData.get("hold")) === "1";
  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true, deletedAt: true } });
  if (!boq || boq.deletedAt) throw new Error("BOQ not found.");

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
  if (!boqId) throw new Error("BOQ not found.");

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true, deletedAt: true } });
  if (!boq || boq.deletedAt) throw new Error("BOQ not found.");
  const vendorId = str(formData.get("vendorId")) || null;
  const savedVendor = vendorId ? await db.vendor.findFirst({ where: { id: vendorId, active: true } }) : null;
  if (vendorId && !savedVendor) throw new Error("Saved vendor not found or archived.");
  const vendorName = savedVendor?.name || str(formData.get("vendorName"));
  if (!vendorName) throw new Error("Choose or enter a vendor name.");

  const dueDateRaw = str(formData.get("dueDate"));
  await db.vendorInquiry.create({
    data: {
      boqId,
      vendorId,
      vendorName,
      vendorPhone: savedVendor?.phone || str(formData.get("vendorPhone")) || null,
      vendorEmail: savedVendor?.email || str(formData.get("vendorEmail")) || null,
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
  const boq = await db.bOQ.findFirst({ where: { id: boqId, deletedAt: null }, select: { id: true } });
  if (!boq) throw new Error("BOQ not found.");
  await db.vendorInquiry.delete({ where: { id: inquiryId } });
  revalidatePath(`/boqs/${boqId}`);
}

export async function addVendorQuote(formData: FormData) {
  const user = await requireRole("OWNER", "MANAGER");
  const inquiryId = str(formData.get("inquiryId"));
  const boqId = str(formData.get("boqId"));
  const amount = num(formData.get("amount"));
  if (!inquiryId || amount <= 0) throw new Error("Enter a valid quotation amount.");
  if (str(formData.get("reviewConfirmed")) !== "on") throw new Error("Review the quotation and confirm its amount, tax basis and exclusions before saving.");

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

  const boq = await db.bOQ.findUnique({ where: { id: boqId }, select: { status: true, deletedAt: true } });
  if (boq && !boq.deletedAt && ["DRAFT", "ASSIGNED", "SITE_VISIT_DONE", "VENDOR_QUOTING"].includes(boq.status)) {
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
  if (!boq || boq.deletedAt || !inquiry || inquiry.boqId !== boqId) throw new Error("Vendor or BOQ not found.");

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
