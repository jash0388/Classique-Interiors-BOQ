import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { BOQ_TRASH_RETENTION_DAYS, trashExpiry } from "@/lib/boq-trash";
import { formatDateTime } from "@/lib/format";
import { Card, Empty, btn } from "@/components/ui";
import { restoreBOQ } from "../actions";

export const metadata = { title: "BOQ Trash" };

export default async function BoqTrashPage() {
  await requireRole("OWNER");
  const deleted = await db.bOQ.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, number: true, title: true, clientName: true, deletedAt: true },
  });
  const now = Date.now();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-stone-900">Deleted BOQs</h1>
        <p className="text-sm text-stone-500">Items stay here with their attachments for {BOQ_TRASH_RETENTION_DAYS} days. Restore them before the expiry date.</p>
      </div>
      <Card>
        {deleted.length === 0 ? (
          <Empty>Trash is empty.</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {deleted.map((boq) => {
              const expiresAt = boq.deletedAt ? trashExpiry(boq.deletedAt) : new Date();
              const canRestore = expiresAt.getTime() > now;
              return (
                <li key={boq.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{boq.number} — {boq.title}</p>
                    <p className="text-sm text-stone-500">{boq.clientName}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {canRestore ? `Permanently deleted after ${formatDateTime(expiresAt)}` : "Purge pending — recovery period expired"}
                    </p>
                  </div>
                  {canRestore ? (
                    <form action={restoreBOQ}>
                      <input type="hidden" name="boqId" value={boq.id} />
                      <button type="submit" className={btn.secondary}>Restore BOQ</button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
