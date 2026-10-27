import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { storedPath, MIME_BY_EXT } from "@/lib/storage";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const session = await getSession();
  let authorized = Boolean(session);
  if (!authorized) {
    const token = req.nextUrl.searchParams.get("token");
    if (token) {
      const boq = await db.bOQ.findUnique({ where: { visitToken: token }, select: { id: true } });
      authorized = Boolean(boq);
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { name } = await ctx.params;
  const p = storedPath(`/api/files/${name}`);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await stat(p);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(p).toLowerCase();
  const mime = MIME_BY_EXT[ext] || "application/octet-stream";
  const inline = mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/pdf";
  const download = req.nextUrl.searchParams.get("dl");
  const originalName = req.nextUrl.searchParams.get("name");
  const disposition = download || !inline ? "attachment" : "inline";
  const filename = originalName || path.basename(p);

  const stream = Readable.toWeb(createReadStream(p)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
