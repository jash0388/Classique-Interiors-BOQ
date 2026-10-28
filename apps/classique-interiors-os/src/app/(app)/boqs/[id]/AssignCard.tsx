"use client";

import { useState } from "react";
import CopyButton from "@/components/CopyButton";
import SubmitButton from "@/components/SubmitButton";
import { btn } from "@/components/ui";
import { assignBOQ } from "../actions";

export default function AssignCard({
  boqId,
  assignedToId,
  fieldUsers,
  waHref,
  mailHref,
  visitUrl,
  assignedToName,
}: {
  boqId: string;
  assignedToId: string | null;
  fieldUsers: { id: string; name: string; city: string | null }[];
  waHref: string | null;
  mailHref: string | null;
  visitUrl: string;
  assignedToName: string | null;
}) {
  const [notification, setNotification] = useState("");

  async function saveAndNotify(formData: FormData) {
    setNotification("");
    const result = await assignBOQ(formData);
    setNotification(result.emailSent ? "Assignment saved and email notification sent to the team member." : result.emailError);
  }

  return (
    <div className="space-y-3">
      <form action={saveAndNotify} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="boqId" value={boqId} />
        <div className="flex-1">
          <label>{assignedToId ? "Reassign site visit to" : "Assign site visit to"}</label>
          <select name="assignedToId" defaultValue={assignedToId ?? ""} required>
            <option value="" disabled>
              — Select person —
            </option>
            {fieldUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.city ? ` (${u.city})` : ""}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className={btn.primary} pendingLabel="Assigning…">
          {assignedToId ? "Reassign" : "Assign"}
        </SubmitButton>
      </form>
      {notification ? <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notification}</p> : null}

      {assignedToId ? (
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="mb-2 text-xs font-medium text-stone-500">
            Assigned to <span className="font-semibold text-stone-700">{assignedToName}</span> — send them the visit link:
          </p>
          <div className="flex flex-wrap gap-2">
            {waHref ? (
              <a href={waHref} target="_blank" rel="noreferrer" className={btn.wa}>
                WhatsApp
              </a>
            ) : null}
            {mailHref ? (
              <a href={mailHref} className={btn.secondary}>
                Email
              </a>
            ) : null}
            <a href={visitUrl} target="_blank" rel="noreferrer" className={btn.secondary}>
              Open visit page
            </a>
            <CopyButton text={visitUrl} />
          </div>
          <p className="mt-2 break-all text-xs text-stone-400">{visitUrl}</p>
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Not assigned yet — pick a person above, then share the visit link on WhatsApp or email.
        </p>
      )}
    </div>
  );
}
