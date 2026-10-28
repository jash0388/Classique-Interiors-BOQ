import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trashCutoff } from "@/lib/boq-trash";
import { deleteStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Purge job is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = trashCutoff();
  const select = {
    id: true,
    referenceFiles: { select: { id: true, url: true, purgedAt: true } },
    siteVisit: { select: { files: { select: { id: true, url: true, purgedAt: true } } } },
    vendorInquiries: {
      select: {
        quotes: { select: { id: true, fileUrl: true, filePurgedAt: true } },
      },
    },
  } as const;
  const unattempted = await db.bOQ.findMany({
    where: { deletedAt: { lte: cutoff }, purgeAttemptedAt: null },
    orderBy: { deletedAt: "asc" },
    take: 20,
    select,
  });
  const expired = unattempted.length > 0 ? unattempted : await db.bOQ.findMany({
    where: { deletedAt: { lte: cutoff }, purgeAttemptedAt: { not: null } },
    orderBy: { purgeAttemptedAt: "asc" },
    take: 20,
    select,
  });

  let purged = 0;
  let failed = 0;
  for (const boq of expired) {
    try {
      await db.bOQ.update({ where: { id: boq.id }, data: { purgeAttemptedAt: new Date() } });
      for (const file of boq.referenceFiles) {
        if (file.purgedAt) continue;
        await deleteStoredFile(file.url);
        await db.clientReferenceFile.update({ where: { id: file.id }, data: { purgedAt: new Date() } });
      }
      for (const file of boq.siteVisit?.files ?? []) {
        if (file.purgedAt) continue;
        await deleteStoredFile(file.url);
        await db.siteVisitFile.update({ where: { id: file.id }, data: { purgedAt: new Date() } });
      }
      for (const inquiry of boq.vendorInquiries) {
        for (const quote of inquiry.quotes) {
          if (!quote.fileUrl || quote.filePurgedAt) continue;
          await deleteStoredFile(quote.fileUrl);
          await db.vendorQuote.update({ where: { id: quote.id }, data: { filePurgedAt: new Date() } });
        }
      }
      await db.bOQ.deleteMany({ where: { id: boq.id, deletedAt: { lte: cutoff } } });
      purged++;
    } catch {
      // Keep the BOQ and file metadata so the next scheduled run can retry.
      failed++;
      await db.bOQ.updateMany({ where: { id: boq.id }, data: { purgeAttemptedAt: new Date() } });
    }
  }

  const orphanCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphaned = await db.clientReferenceFile.findMany({
    where: { boqId: null, purgedAt: null, createdAt: { lte: orphanCutoff } },
    orderBy: { createdAt: "asc" }, take: 20, select: { id: true, url: true },
  });
  for (const file of orphaned) {
    try {
      await deleteStoredFile(file.url);
      await db.clientReferenceFile.update({ where: { id: file.id }, data: { purgedAt: new Date() } });
      purged++;
    } catch { failed++; }
  }

  return NextResponse.json({ processed: expired.length, orphaned: orphaned.length, purged, failed });
}
