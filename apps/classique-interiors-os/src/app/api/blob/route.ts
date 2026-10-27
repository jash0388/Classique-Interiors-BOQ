import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("https://") || !url.includes(".private.blob.vercel-storage.com/")) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

  const session = await getSession();
  const [siteVisitFile, quoteFile] = await Promise.all([
    db.siteVisitFile.findFirst({
      where: { url },
      select: { id: true, siteVisit: { select: { boq: { select: { visitToken: true } } } } },
    }),
    db.vendorQuote.findFirst({ where: { fileUrl: url }, select: { id: true } }),
  ]);
  const token = req.nextUrl.searchParams.get("token");
  const allowedForVisitLink = Boolean(token && siteVisitFile?.siteVisit.boq.visitToken === token);
  const authorized = Boolean((session && (siteVisitFile || quoteFile)) || allowedForVisitLink);
  if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filename = req.nextUrl.searchParams.get("name") || new URL(url).pathname.split("/").pop() || "file";
  const forceDownload = req.nextUrl.searchParams.get("dl");
  const inline = result.blob.contentType.startsWith("image/") || result.blob.contentType.startsWith("video/") || result.blob.contentType === "application/pdf";
  const disposition = forceDownload || !inline ? "attachment" : "inline";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
