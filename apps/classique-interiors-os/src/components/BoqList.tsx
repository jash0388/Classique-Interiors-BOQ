"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusChip, Empty } from "@/components/ui";
import { statusLabel, statusColor } from "@/lib/status";
import { formatDate } from "@/lib/format";
import type { BoqView } from "@/lib/boq-view";

function Deadline({ v }: { v: BoqView }) {
  if (!v.deadline) return <span className="text-stone-400">—</span>;
  return (
    <span className={v.overdue ? "font-semibold text-red-600" : ""}>
      {formatDate(v.deadline)}
      {v.overdue ? " · overdue" : ""}
    </span>
  );
}

export default function BoqList({ boqs, emptyText = "No BOQs yet." }: { boqs: BoqView[]; emptyText?: string }) {
  const router = useRouter();
  if (boqs.length === 0) return <Empty>{emptyText}</Empty>;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl ring-1 ring-stone-200 md:block">
        <table className="w-full bg-white text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">BOQ</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Assigned to</th>
              <th className="px-4 py-3">Vendors</th>
              <th className="px-4 py-3">L1</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {boqs.map((v) => (
              <tr
                key={v.id}
                className="cursor-pointer hover:bg-stone-50"
                onMouseEnter={() => router.prefetch(`/boqs/${v.id}`)}
                onFocus={() => router.prefetch(`/boqs/${v.id}`)}
                tabIndex={0}
                aria-label={`Open BOQ ${v.number}`}
                onClick={(event) => {
                  const target = event.target;
                  if (target instanceof HTMLElement && target.closest("a, button")) return;
                  router.push(`/boqs/${v.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/boqs/${v.id}`);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <Link href={`/boqs/${v.id}`} className="font-medium text-teal-700 hover:underline">
                    {v.number}
                  </Link>
                  <Link href={`/boqs/${v.id}`} className="block max-w-xs truncate text-xs text-stone-500 hover:text-teal-700 hover:underline">
                    {v.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{v.clientName}</td>
                <td className="px-4 py-3">
                  <p className="max-w-[180px] truncate">{v.city || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <Deadline v={v} />
                </td>
                <td className="px-4 py-3">{v.assignedToName ?? <span className="text-stone-400">Unassigned</span>}</td>
                <td className="px-4 py-3">
                  {v.quotesCount}/{v.vendorsCount || "—"}
                </td>
                <td className="px-4 py-3">
                  {v.l1VendorName ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      L1: {v.l1VendorName}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusChip label={statusLabel(v.status)} color={statusColor(v.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {boqs.map((v) => (
          <Link
            key={v.id}
            href={`/boqs/${v.id}`}
            className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold text-teal-700">{v.number}</span>
              <StatusChip label={statusLabel(v.status)} color={statusColor(v.status)} />
            </div>
            <p className="text-sm font-medium text-stone-900">{v.title}</p>
            <p className="mt-0.5 text-sm text-stone-500">
              {v.clientName} · {v.city || v.siteAddress}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
              <span>
                Visit: <Deadline v={v} />
              </span>
              <span>Assigned: {v.assignedToName ?? "—"}</span>
              {v.l1VendorName ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">L1: {v.l1VendorName}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
