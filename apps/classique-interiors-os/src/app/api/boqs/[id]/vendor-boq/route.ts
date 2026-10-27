import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildVendorBoqXlsx } from "@/lib/vendor-boq";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;
  const inquiryParam = req.nextUrl.searchParams.get("inquiry");

  const boq = await db.bOQ.findUnique({ where: { id }, include: { items: { orderBy: { srNo: "asc" } } } });
  if (!boq || boq.deletedAt) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

  const inquiry = inquiryParam
    ? await db.vendorInquiry.findUnique({ where: { id: inquiryParam } })
    : await db.vendorInquiry.findFirst({ where: { boqId: id }, orderBy: { createdAt: "asc" } });
  if (!inquiry || inquiry.boqId !== id) {
    return NextResponse.json({ error: "Vendor inquiry not found" }, { status: 404 });
  }

  const buf = await buildVendorBoqXlsx(boq, inquiry);
  const filename = `BOQ-${boq.number}-${inquiry.vendorName.replace(/[^a-zA-Z0-9]+/g, "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
