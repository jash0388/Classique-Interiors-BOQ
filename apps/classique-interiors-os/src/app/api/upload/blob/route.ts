import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  const json = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (_pathname, clientPayload) => {
      let authorized = Boolean(await getSession());
      if (!authorized && clientPayload) {
        const boq = await db.bOQ.findUnique({ where: { visitToken: clientPayload }, select: { deletedAt: true } });
        authorized = Boolean(boq && !boq.deletedAt);
      }
      if (!authorized) throw new Error("Not authorized");
      return {
        tokenPayload: JSON.stringify({ visitToken: clientPayload || null }),
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async () => {},
  });

  return NextResponse.json(json);
}
