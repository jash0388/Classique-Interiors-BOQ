import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyClientUploadToken } from "@/lib/client-intake-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  const json = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let authorized = Boolean(await getSession());
      const intake = verifyClientUploadToken(clientPayload);
      if (intake) {
        if (!pathname.startsWith(`client-intake/${intake.sessionId}/`)) throw new Error("Upload path is not part of this request session.");
        const uploadedCount = await db.clientReferenceFile.count({ where: { uploadSessionId: intake.sessionId, purgedAt: null } });
        if (uploadedCount >= 8) throw new Error("This request already has the maximum of 8 reference images.");
        return {
          tokenPayload: JSON.stringify({ purpose: "client-intake", sessionId: intake.sessionId }),
          addRandomSuffix: true,
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          validUntil: intake.expiresAt,
        };
      }
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
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      if (!tokenPayload) return;
      let payload: { purpose?: string; sessionId?: string };
      try { payload = JSON.parse(tokenPayload); } catch { return; }
      const sessionId = payload.sessionId;
      if (payload.purpose !== "client-intake" || typeof sessionId !== "string" || !/^[a-f0-9]{32}$/.test(sessionId)) return;
      if (!blob.pathname.startsWith(`client-intake/${sessionId}/`)) return;
      const filename = decodeURIComponent(blob.pathname.split("/").pop() || "reference-image").slice(0, 200);
      await db.clientReferenceFile.upsert({
        where: { url: blob.url },
        create: { uploadSessionId: sessionId, url: blob.url, filename, size: 0, mimeType: blob.contentType },
        update: {},
      });
    },
  });

  return NextResponse.json(json);
}
