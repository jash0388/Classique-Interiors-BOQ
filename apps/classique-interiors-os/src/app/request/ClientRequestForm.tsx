"use client";

import { useActionState, useState } from "react";
import ItemsEditor from "@/components/ItemsEditor";
import FilePicker from "@/components/FilePicker";
import SubmitButton from "@/components/SubmitButton";
import { Card, btn } from "@/components/ui";
import { createClientRequest, type ClientRequestState } from "./actions";

const initial: ClientRequestState = {};

export default function ClientRequestForm({ uploadSessionId, uploadToken, mode }: { uploadSessionId: string; uploadToken: string; mode: "local" | "blob" }) {
  const [state, action] = useActionState(createClientRequest, initial);
  const [uploading, setUploading] = useState(false);
  if (state.trackingToken) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-teal-50 p-4 ring-1 ring-teal-200">
          <p className="font-semibold text-teal-900">Request submitted</p>
          <p className="mt-1 text-sm text-teal-800">Reference: {state.boqNumber}. Save this tracking token. It is shown only here.</p>
          <p className="mt-3 break-all rounded-lg bg-white px-3 py-3 font-mono text-lg font-bold tracking-wide text-stone-900">{state.trackingToken}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(state.trackingToken || "")} className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Copy token</button>
        </div>
        <p className="text-sm text-stone-600">To check progress, open the sign-in page, enter this token under “Track a client request,” and select Check status.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="uploadToken" value={uploadToken} />
      <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label>Project title / scope *</label><input name="title" required maxLength={180} placeholder="e.g. Office interior fit-out — 4th floor" /></div>
        <div><label>Client / company name *</label><input name="clientName" required maxLength={160} /></div>
        <div><label>Contact person</label><input name="contactName" maxLength={160} /></div>
        <div><label>Contact phone</label><input name="contactPhone" type="tel" maxLength={50} /></div>
        <div><label>City</label><input name="city" maxLength={100} /></div>
        <div className="sm:col-span-2"><label>Site address *</label><input name="siteAddress" required maxLength={500} /></div>
        <div><label>Target deadline</label><input name="deadline" type="date" /></div>
        <div className="sm:col-span-2"><label>Site details / project notes</label><textarea name="siteDetails" rows={3} maxLength={3000} placeholder="Floor, access, timing, project requirements…" /></div>
      </div>
      <Card title="BOQ items" subtitle="Add the work items and estimated quantities for the request."><ItemsEditor allowImport={false} /></Card>
      <Card title="Reference images" subtitle="Add up to 8 images, 8 MB each. Uploads are private to this request.">
        <FilePicker name="files" accept="image/jpeg,image/png,image/webp,image/heic" mode={mode} uploadSessionId={uploadSessionId} uploadToken={uploadToken} maxFiles={8} onUploadingChange={setUploading} />
      </Card>
      {uploading ? <p role="status" className="text-sm text-stone-600">Wait for reference images to finish uploading before you submit.</p> : null}
      {state.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="flex justify-end"><SubmitButton className={btn.primary} pendingLabel="Submitting…" disabled={uploading}>Submit BOQ request</SubmitButton></div>
      <p className="text-xs text-stone-500">Your submitted project details and images will be shared with the Classique Interiors team to prepare an estimate.</p>
    </form>
  );
}
