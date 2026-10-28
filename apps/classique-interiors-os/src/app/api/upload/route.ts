import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { putFile } from "@/lib/storage";
import { verifyClientUploadToken } from "@/lib/client-intake-token";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|heic)|video\/(mp4|quicktime|webm)|application\/(pdf|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel|msword)|text\/(plain|csv))$/i;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload" }, { status: 400 });
  }
  const visitToken = form.get("visitToken");
  const intakeUploadToken = form.get("intakeUploadToken");
  const intake = typeof intakeUploadToken === "string" ? verifyClientUploadToken(intakeUploadToken) : null;
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files sent" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can upload up to ${MAX_FILES} files at a time` }, { status: 413 });
  }
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} exceeds the 8 MB limit` }, { status: 413 });
    }
    if (!ALLOWED_MIME.test(file.type)) {
      return NextResponse.json({ error: `${file.name} has an unsupported file type` }, { status: 415 });
    }
  }

  if (intake && (files.length > 8 || files.some((file) => !file.type.toLowerCase().startsWith("image/")))) {
    return NextResponse.json({ error: "Client requests allow up to 8 reference images." }, { status: 415 });
  }
  if (intake) {
    const uploadedCount = await db.clientReferenceFile.count({ where: { uploadSessionId: intake.sessionId, purgedAt: null } });
    if (uploadedCount + files.length > 8) return NextResponse.json({ error: "This request allows up to 8 reference images." }, { status: 413 });
  }

  let authorized = false;
  if (visitToken && typeof visitToken === "string") {
    const boq = await db.bOQ.findUnique({ where: { visitToken }, select: { deletedAt: true } });
    authorized = Boolean(boq && !boq.deletedAt);
  }
  if (!authorized) authorized = Boolean(await getSession());
  if (intake) authorized = true;
  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const stored = [];
  for (const file of files) {
    const saved = await putFile(file, intake?.sessionId);
    stored.push(saved);
    if (intake) {
      await db.clientReferenceFile.create({
        data: {
          uploadSessionId: intake.sessionId,
          url: saved.url,
          filename: saved.filename.slice(0, 200),
          size: saved.size,
          mimeType: saved.mimeType,
        },
      });
    }
  }
  return NextResponse.json({ files: stored });
}
