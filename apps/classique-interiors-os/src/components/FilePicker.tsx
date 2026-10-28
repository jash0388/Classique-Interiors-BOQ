"use client";

import { useRef, useState } from "react";

export type FileMeta = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  kind: string;
};

export default function FilePicker({
  name,
  accept,
  multiple = true,
  camera = false,
  visitToken,
  uploadSessionId,
  uploadToken,
  maxFiles,
  mode = "local",
  initial = [],
  onUploadingChange,
  onFileSelected,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  camera?: boolean;
  visitToken?: string;
  uploadSessionId?: string;
  uploadToken?: string;
  maxFiles?: number;
  mode?: "local" | "blob";
  initial?: FileMeta[];
  onUploadingChange?: (uploading: boolean) => void;
  onFileSelected?: (file: File) => void;
}) {
  const [metas, setMetas] = useState<FileMeta[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputKey = useRef(0);
  const pendingUploads = useRef(0);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError("");
    const picked = Array.from(list);
    if (maxFiles && metas.length + picked.length > maxFiles) {
      setError(`Choose no more than ${maxFiles} files.`);
      return;
    }
    pendingUploads.current += picked.length;
    setBusy(pendingUploads.current);
    onUploadingChange?.(true);
    try {
      for (const file of picked) {
        onFileSelected?.(file);
        const uploaded = await uploadOne(file);
        setMetas((m) => [...m, uploaded]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed, please try again.");
    } finally {
      pendingUploads.current = Math.max(0, pendingUploads.current - picked.length);
      setBusy(pendingUploads.current);
      onUploadingChange?.(pendingUploads.current > 0);
      inputKey.current += 1;
    }
  }

  async function uploadOne(file: File): Promise<FileMeta> {
    if (mode === "blob") {
      const { upload } = await import("@vercel/blob/client");
      const safeName = file.name.replace(/[\\/]+/g, "_").slice(0, 160) || "reference-image";
      const pathname = uploadSessionId ? `client-intake/${uploadSessionId}/${safeName}` : file.name;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/upload/blob",
        clientPayload: uploadToken ?? visitToken ?? "",
      });
      return {
        url: blob.url,
        filename: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        kind: file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : "document",
      };
    }
    const fd = new FormData();
    fd.append("file", file);
    if (visitToken) fd.append("visitToken", visitToken);
    if (uploadToken) fd.append("intakeUploadToken", uploadToken);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed");
    return json.files[0];
  }

  function removeAt(i: number) {
    setMetas((m) => m.filter((_, idx) => idx !== i));
  }

  const inputProps = {
    type: "file",
    accept,
    multiple,
    className: "hidden",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files),
  };

  return (
    <div className={`space-y-2 rounded-xl ${dragging ? "bg-teal-50 ring-2 ring-teal-500" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}>
      <div className="flex flex-wrap gap-2">
        <label key={`pick-${inputKey.current}`} className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
          📎 Choose files
          <input {...inputProps} />
        </label>
        {camera ? (
          <label key={`cam-${inputKey.current}`} className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
            📷 Camera
            <input {...inputProps} accept="image/*" capture="environment" />
          </label>
        ) : null}
        {busy > 0 ? <span className="self-center text-sm text-stone-500">Uploading {busy} file(s)…</span> : null}
      </div>
      <p className="text-xs text-stone-400">{dragging ? "Drop files to upload" : "You can also drag files here."}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {metas.length > 0 ? (
        <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
          {metas.map((m, i) => (
            <li key={m.url + i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">
                <span className="mr-1.5">{m.kind === "photo" ? "🖼️" : m.kind === "video" ? "🎬" : "📄"}</span>
                {m.filename}
              </span>
              <button type="button" onClick={() => removeAt(i)} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input type="hidden" name={name} value={JSON.stringify(metas)} />
    </div>
  );
}
