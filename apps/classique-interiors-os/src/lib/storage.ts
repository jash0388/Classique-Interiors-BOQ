import { mkdir, writeFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type FileKind = "photo" | "video" | "document";

export type StoredFile = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  kind: FileKind;
};

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function storageMode(): "local" | "blob" {
  return process.env.STORAGE === "blob" ? "blob" : "local";
}

export function kindOf(mimeType: string): FileKind {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function safeStoredName(original: string) {
  const ext = path.extname(original).toLowerCase().slice(0, 12);
  const base =
    path
      .basename(original, path.extname(original))
      .replace(/[^a-zA-Z0-9-_ ]+/g, "_")
      .trim()
      .slice(0, 60) || "file";
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${ext}`;
}

async function putLocal(file: File): Promise<StoredFile> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = safeStoredName(file.name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buf);
  return {
    url: `/api/files/${storedName}`,
    filename: file.name,
    size: buf.length,
    mimeType: file.type || "application/octet-stream",
    kind: kindOf(file.type),
  };
}

async function putBlob(file: File): Promise<StoredFile> {
  const { put } = await import("@vercel/blob");
  const blob = await put(safeStoredName(file.name), file, {
    access: "private",
    contentType: file.type || "application/octet-stream",
  });
  return {
    url: blob.url,
    filename: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    kind: kindOf(file.type),
  };
}

export async function putFile(file: File): Promise<StoredFile> {
  if (storageMode() === "blob") return putBlob(file);
  return putLocal(file);
}

export function storedPath(url: string): string | null {
  const prefix = "/api/files/";
  if (!url.startsWith(prefix)) return null;
  const name = path.basename(url.slice(prefix.length));
  return path.join(UPLOAD_DIR, name);
}

export async function fileBytes(url: string): Promise<{ body: Buffer; filename: string } | null> {
  if (url.startsWith("/api/files/")) {
    const p = storedPath(url);
    if (!p) return null;
    try {
      await stat(p);
    } catch {
      return null;
    }
    const chunks: Buffer[] = [];
    const stream = createReadStream(p);
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return { body: Buffer.concat(chunks), filename: path.basename(p) };
  }
  if (url.startsWith("http")) {
    if (url.includes(".private.blob.vercel-storage.com")) {
      const { get } = await import("@vercel/blob");
      const blob = await get(url, { access: "private" });
      if (!blob || blob.statusCode !== 200) return null;
      const body = Buffer.from(await new Response(blob.stream).arrayBuffer());
      const name = new URL(url).pathname.split("/").pop() || "file";
      return { body, filename: decodeURIComponent(name) };
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const name = new URL(url).pathname.split("/").pop() || "file";
    return { body: buf, filename: decodeURIComponent(name) };
  }
  return null;
}

export function fileHref(url: string, filename?: string, visitToken?: string): string {
  if (url.includes(".private.blob.vercel-storage.com/")) {
    const params = new URLSearchParams({ url });
    if (filename) params.set("name", filename);
    if (visitToken) params.set("token", visitToken);
    return `/api/blob?${params.toString()}`;
  }
  if (url.startsWith("/api/files/") && visitToken) {
    return `${url}?${new URLSearchParams({ token: visitToken }).toString()}`;
  }
  return url;
}

export const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip",
};
