import { requireRole } from "@/lib/auth";
import { createBOQ } from "../actions";
import ItemsEditor from "@/components/ItemsEditor";
import SubmitButton from "@/components/SubmitButton";
import { Card, btn } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "New BOQ" };

export default async function NewBoqPage() {
  await requireRole("OWNER", "MANAGER");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-900">New BOQ</h1>
        <Link href="/boqs" className={btn.sm}>
          Cancel
        </Link>
      </div>

      <form action={createBOQ} className="space-y-4">
        <Card title="Inquiry details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label>Title / scope *</label>
              <input name="title" type="text" required placeholder="e.g. Office interior fit-out — 4th floor" />
            </div>
            <div>
              <label>Client name *</label>
              <input name="clientName" type="text" required placeholder="e.g. JLL / ITC Sonar" />
            </div>
            <div>
              <label>Client contact person</label>
              <input name="clientContactName" type="text" placeholder="Name" />
            </div>
            <div>
              <label>Client contact phone</label>
              <input name="clientContactPhone" type="tel" placeholder="+91…" />
            </div>
            <div>
              <label>City</label>
              <input name="city" type="text" placeholder="e.g. Bangalore" />
            </div>
            <div className="sm:col-span-2">
              <label>Site address *</label>
              <input name="siteAddress" type="text" required placeholder="Full site address" />
            </div>
            <div className="sm:col-span-2">
              <label>Site details / access notes</label>
              <textarea name="siteDetails" rows={2} placeholder="Timing, entry gate, floor, lift access, parking…" />
            </div>
            <div>
              <label>Deadline (end date)</label>
              <input name="deadline" type="date" />
            </div>
            <div className="sm:col-span-2">
              <label>Internal notes</label>
              <textarea name="notes" rows={2} placeholder="Anything the assigned person should know" />
            </div>
          </div>
        </Card>

        <Card title="BOQ items">
          <ItemsEditor />
        </Card>

        <div className="flex justify-end">
          <SubmitButton className={btn.primary} pendingLabel="Creating…">
            Save BOQ · assign next
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
