"use client";

import { useActionState, useState } from "react";
import FilePicker from "@/components/FilePicker";
import { btn } from "@/components/ui";
import { submitVisit, type VisitState } from "./actions";

const initial: VisitState = {};

export default function VisitForm({ token, mode }: { token: string; mode: "local" | "blob" }) {
  const [state, formAction, pending] = useActionState(submitVisit, initial);
  const [uploading, setUploading] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label>Site photos / videos / files *</label>
        <FilePicker name="files" accept="image/*,video/*" camera mode={mode} visitToken={token} onUploadingChange={setUploading} />
      </div>
      <div>
        <label>Visit notes</label>
        <textarea name="notes" rows={4} placeholder="Site condition, measurements, access issues, what you observed…" />
      </div>
      {state.ok ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          ✓ Uploaded successfully. Thank you! You can add more files or close this page.
        </p>
      ) : null}
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button type="submit" disabled={pending || uploading} className={`${btn.primary} w-full py-3`}>
        {uploading ? "Uploading files…" : pending ? "Submitting…" : "Submit visit report"}
      </button>
    </form>
  );
}
