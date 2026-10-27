import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import archiver from "archiver";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildVendorBoqXlsx } from "@/lib/vendor-boq";
import { fileBytes } from "@/lib/storage";
import { formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;
  const inquiryId = req.nextUrl.searchParams.get("inquiry");

  const boq = await db.bOQ.findUnique({
    where: { id },
    include: { items: { orderBy: { srNo: "asc" } }, siteVisit: { include: { files: true } } },
  });
  if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

  const inquiry = inquiryId
    ? await db.vendorInquiry.findUnique({ where: { id: inquiryId } })
    : await db.vendorInquiry.findFirst({ where: { boqId: id }, orderBy: { createdAt: "asc" } });
  if (!inquiry || inquiry.boqId !== id) {
    return NextResponse.json({ error: "Vendor inquiry not found" }, { status: 404 });
  }

  const xlsx = await buildVendorBoqXlsx(boq, inquiry);

  const visit = boq.siteVisit;
  const notesTxt = [
    `SITE VISIT NOTES`,
    `================`,
    `BOQ: ${boq.number} — ${boq.title}`,
    `Client: ${boq.clientName}`,
    `Site address: ${boq.siteAddress}${boq.city ? `, ${boq.city}` : ""}`,
    `Deadline: ${formatDate(boq.deadline)}`,
    ``,
    `Site details: ${boq.siteDetails || "—"}`,
    ``,
    `Notes from site visit (${visit ? new Date(visit.visitedAt).toLocaleString("en-IN") : "no visit yet"}):`,
    visit?.notes || "No written notes.",
    ``,
  ].join("\n");

  const instructionsTxt = [
    `INSTRUCTIONS TO VENDOR`,
    `======================`,
    `BOQ: ${boq.number}`,
    ``,
    inquiry.instructions || "No special instructions.",
    ``,
    `Please submit your quotation before ${formatDate(inquiry.dueDate ?? boq.deadline)}.`,
    ``,
  ].join("\n");

  const zip = archiver("zip", { zlib: { level: 9 } });
  const usedNames = new Set<string>();
  const unique = (name: string) => {
    let n = name;
    let i = 1;
    while (usedNames.has(n)) {
      const dot = name.lastIndexOf(".");
      n = dot >= 0 ? `${name.slice(0, dot)}-${i}${name.slice(dot)}` : `${name}-${i}`;
      i++;
    }
    usedNames.add(n);
    return n;
  };

  zip.append(xlsx, { name: `BOQ-${boq.number}.xlsx` });
  zip.append(Buffer.from(instructionsTxt, "utf8"), { name: "Instructions-to-Vendor.txt" });
  zip.append(Buffer.from(notesTxt, "utf8"), { name: "Site-Visit-Notes.txt" });

  if (visit) {
    for (const f of visit.files) {
      try {
        const bytes = await fileBytes(f.url);
        if (bytes) {
          zip.append(bytes.body, { name: unique(`Site-Visit/${f.filename}`) });
        }
      } catch {
        // skip files that cannot be read
      }
    }
  }

  void zip.finalize();

  const vendorSlug = inquiry.vendorName.replace(/[^a-zA-Z0-9]+/g, "-");
  const filename = `Vendor-Package-${boq.number}-${vendorSlug}.zip`;

  return new NextResponse(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
