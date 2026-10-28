"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashTrackingToken, newTrackingToken, verifyClientUploadToken } from "@/lib/client-intake-token";

export type ClientRequestState = { error?: string; trackingToken?: string; boqNumber?: string };
type RequestItem = { description: string; unit: string; quantity: number; remarks: string };
type ReferenceMeta = { url: string; filename: string; size: number; mimeType: string };

function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }

function parseItems(raw: string): RequestItem[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.map((row: unknown) => {
      const item = row && typeof row === "object" ? row as Record<string, unknown> : {};
      return {
        description: String(item.description ?? "").trim().slice(0, 500),
        unit: String(item.unit ?? "nos").trim().slice(0, 30) || "nos",
        quantity: Number(item.quantity),
        remarks: String(item.remarks ?? "").trim().slice(0, 500),
      };
    }).filter((item) => item.description && Number.isFinite(item.quantity) && item.quantity > 0).slice(0, 100);
  } catch { return []; }
}

function parseReferences(raw: string): ReferenceMeta[] | null {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value) || value.length > 8) return null;
    const files = value.map((entry: unknown) => {
      const file = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return {
        url: String(file.url ?? ""),
        filename: String(file.filename ?? "").slice(0, 200),
        size: Number(file.size),
        mimeType: String(file.mimeType ?? "").toLowerCase(),
      };
    });
    if (files.some((file) => !file.url || !file.filename || !file.mimeType.startsWith("image/") || !Number.isFinite(file.size) || file.size < 0 || file.size > 8 * 1024 * 1024)) return null;
    return files;
  } catch { return null; }
}

export async function createClientRequest(_previous: ClientRequestState, form: FormData): Promise<ClientRequestState> {
  if (value(form, "website")) return { error: "We couldn't submit the request. Please reload and try again." };
  const uploadToken = value(form, "uploadToken");
  const uploadSession = verifyClientUploadToken(uploadToken);
  if (!uploadSession) return { error: "This form expired. Reload the page and submit again." };

  const title = value(form, "title").slice(0, 180);
  const clientName = value(form, "clientName").slice(0, 160);
  const siteAddress = value(form, "siteAddress").slice(0, 500);
  const items = parseItems(value(form, "items"));
  const references = parseReferences(value(form, "files"));
  if (!title || !clientName || !siteAddress) return { error: "Project title, client name and site address are required." };
  if (items.length === 0) return { error: "Add at least one BOQ item with a quantity." };
  if (!references) return { error: "Please remove unsupported images or files over 8 MB and try again." };

  const remote = references.length ? await db.clientReferenceFile.findMany({
    where: { uploadSessionId: uploadSession.sessionId, boqId: null, purgedAt: null, url: { in: references.map((file) => file.url) } },
    select: { url: true },
  }) : [];
  if (remote.length !== references.length) return { error: "An image upload is still finishing. Wait a moment and submit again." };

  const owner = await db.user.findFirst({ where: { role: "OWNER", active: true }, select: { id: true } });
  if (!owner) return { error: "The team is not accepting requests right now. Please try again later." };
  const trackingToken = newTrackingToken();
  const year = new Date().getFullYear();
  const count = await db.bOQ.count();
  const number = `CI-B-${year}-${String(count + 1).padStart(4, "0")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const deadlineValue = value(form, "deadline");
  const deadline = deadlineValue ? new Date(`${deadlineValue}T00:00:00.000Z`) : null;
  if (deadline && !Number.isFinite(deadline.getTime())) return { error: "Enter a valid deadline." };

  try {
    const boq = await db.$transaction(async (tx) => {
      const created = await tx.bOQ.create({
        data: {
          number,
          title,
          clientName,
          clientContactName: value(form, "contactName").slice(0, 160) || null,
          clientContactPhone: value(form, "contactPhone").slice(0, 50) || null,
          siteAddress,
          city: value(form, "city").slice(0, 100) || null,
          siteDetails: value(form, "siteDetails").slice(0, 3000) || null,
          deadline,
          status: "REQUEST_RECEIVED",
          visitToken: crypto.randomBytes(24).toString("hex"),
          publicTrackingTokenHash: hashTrackingToken(trackingToken),
          createdById: owner.id,
          items: { create: items.map((item, index) => ({ ...item, srNo: index + 1 })) },
        },
      });
      for (const file of references) {
        const result = await tx.clientReferenceFile.updateMany({
          where: { uploadSessionId: uploadSession.sessionId, url: file.url, boqId: null, purgedAt: null },
          data: { boqId: created.id, filename: file.filename, size: file.size, mimeType: file.mimeType },
        });
        if (result.count !== 1) throw new Error("Reference image could not be attached.");
      }
      return created;
    });
    revalidatePath("/boqs");
    revalidatePath("/dashboard");
    return { trackingToken, boqNumber: boq.number };
  } catch {
    return { error: "We couldn't save the request. Please try again or contact Classique Interiors." };
  }
}
