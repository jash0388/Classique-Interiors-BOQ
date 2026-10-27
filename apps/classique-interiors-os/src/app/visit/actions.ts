"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export type VisitState = { ok?: boolean; error?: string };

type FileMeta = { url: string; filename: string; size: number; mimeType: string; kind: string };

function parseFiles(raw: FormDataEntryValue | null): FileMeta[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((f) => f && typeof f.url === "string" && typeof f.filename === "string")
      .slice(0, 100)
      .map((f) => ({
        url: String(f.url),
        filename: String(f.filename).slice(0, 200),
        size: Number(f.size) || 0,
        mimeType: String(f.mimeType ?? "application/octet-stream"),
        kind: ["photo", "video", "document"].includes(f.kind) ? String(f.kind) : "document",
      }));
  } catch {
    return [];
  }
}

export async function submitVisit(_prev: VisitState, formData: FormData): Promise<VisitState> {
  const token = str(formData.get("token"));
  const boq = await db.bOQ.findUnique({ where: { visitToken: token }, select: { id: true, status: true } });
  if (!boq) return { error: "This link is not valid anymore. Please ask your manager for a new one." };

  const session = await getSession();
  const notes = str(formData.get("notes"));
  const files = parseFiles(formData.get("files"));

  const existing = await db.siteVisit.findUnique({
    where: { boqId: boq.id },
    select: { id: true, notes: true, submittedById: true, files: { select: { id: true }, take: 1 } },
  });
  if (files.length === 0 && !existing?.files.length) {
    return { error: "Attach at least one photo or file and wait for the upload to finish before submitting." };
  }
  let siteVisitId: string;
  if (existing) {
    await db.siteVisit.update({
      where: { id: existing.id },
      data: { notes: notes || existing.notes, visitedAt: new Date(), submittedById: session?.uid ?? existing.submittedById },
    });
    siteVisitId = existing.id;
  } else {
    const created = await db.siteVisit.create({
      data: { boqId: boq.id, notes: notes || null, submittedById: session?.uid ?? null },
    });
    siteVisitId = created.id;
  }

  if (files.length > 0) {
    await db.siteVisitFile.createMany({ data: files.map((f) => ({ ...f, siteVisitId })) });
  }

  if (["DRAFT", "ASSIGNED"].includes(boq.status)) {
    await db.bOQ.update({ where: { id: boq.id }, data: { status: "SITE_VISIT_DONE" } });
  }

  revalidatePath(`/boqs/${boq.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
