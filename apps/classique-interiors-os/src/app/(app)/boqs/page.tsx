import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toBoqView } from "@/lib/boq-view";
import BoqList from "@/components/BoqList";
import { BOQ_STATUSES, statusLabel } from "@/lib/status";
import { btn } from "@/components/ui";

export const metadata = { title: "BOQs" };

export default async function BoqsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;

  const where = user.role === "FIELD" ? { assignedToId: user.uid } : status ? { status } : {};
  const boqs = await db.bOQ.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: true,
      createdBy: true,
      vendorInquiries: { include: { quotes: true } },
    },
  });

  const views = boqs.map(toBoqView);
  const isField = user.role === "FIELD";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-stone-900">{isField ? "My site visits" : "BOQs"}</h1>
        {!isField ? (
          <Link href="/boqs/new" className={btn.primary}>
            + New BOQ
          </Link>
        ) : null}
      </div>

      {!isField ? (
        <div className="flex flex-wrap gap-1.5">
          <FilterPill href="/boqs" label="All" active={!status} />
          {BOQ_STATUSES.map((s) => (
            <FilterPill key={s} href={`/boqs?status=${s}`} label={statusLabel(s)} active={status === s} />
          ))}
        </div>
      ) : null}

      <BoqList boqs={views} emptyText={status ? `No BOQs with this status.` : "No BOQs yet."} />
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-teal-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
      }`}
    >
      {label}
    </Link>
  );
}
