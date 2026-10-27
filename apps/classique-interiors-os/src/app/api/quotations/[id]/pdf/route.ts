import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { renderQuotationPdf, type QuotationSnapshotItem } from "@/lib/quotation-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;
  const q = await db.quotation.findUnique({ where: { id }, include: { boq: true } });
  if (!q || q.boq.deletedAt) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  const items: QuotationSnapshotItem[] = JSON.parse(q.itemsSnapshotJson);

  const pdf = await renderQuotationPdf({
    number: q.number,
    date: q.createdAt,
    clientName: q.boq.clientName,
    clientContactName: q.boq.clientContactName,
    siteAddress: q.boq.siteAddress,
    city: q.boq.city,
    boqNumber: q.boq.number,
    boqTitle: q.boq.title,
    items,
    subtotal: q.subtotal,
    marginPercent: q.marginPercent,
    marginAmount: q.marginAmount,
    taxableValue: q.subtotal + q.marginAmount,
    gstPercent: q.gstPercent,
    gstAmount: q.gstAmount,
    grandTotal: q.grandTotal,
  });

  const filename = `Quotation-${q.number.replace(/[^a-zA-Z0-9]+/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
