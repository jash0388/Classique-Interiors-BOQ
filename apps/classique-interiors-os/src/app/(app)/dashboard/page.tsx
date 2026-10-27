import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toBoqView } from "@/lib/boq-view";
import BoqList from "@/components/BoqList";
import { Card, Empty, btn } from "@/components/ui";
import { statusLabel } from "@/lib/status";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "FIELD") {
    const boqs = await db.bOQ.findMany({
      where: { assignedToId: user.uid, deletedAt: null },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
      select: {
        id: true,
        number: true,
        title: true,
        clientName: true,
        siteAddress: true,
        city: true,
        deadline: true,
        status: true,
        visitToken: true,
      },
    });
    const mine = boqs.filter((b) => b.status !== "COMPLETED");
    const done = boqs.filter((b) => b.status === "COMPLETED");
    const visitLinks = new Map(boqs.map((b) => [b.id, `/visit/${b.visitToken}`]));

    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-lg font-bold text-stone-900">Hi {user.name.split(" ")[0]} 👋</h1>
        <p className="-mt-2 text-sm text-stone-500">Your assigned site visits are listed below.</p>

        <Card title="Pending visits">
          {mine.length === 0 ? (
            <Empty>No site visits assigned to you right now.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {mine.map((b) => {
                const overdue = b.deadline && b.deadline < new Date() && b.status !== "COMPLETED";
                return (
                  <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/boqs/${b.id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                          {b.number} — {b.title}
                        </Link>
                        <p className="text-sm text-stone-500">
                          {b.clientName} · {b.siteAddress}
                          {b.city ? `, ${b.city}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          Deadline:{" "}
                          <span className={overdue ? "font-semibold text-red-600" : ""}>{b.deadline ? new Date(b.deadline).toLocaleDateString("en-IN") : "—"}</span>
                          {" · "}
                          {statusLabel(b.status)}
                        </p>
                      </div>
                      <Link href={visitLinks.get(b.id)!} className={btn.primary}>
                        Upload visit report
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {done.length > 0 ? (
          <Card title="Completed">
            <ul className="space-y-1 text-sm">
              {done.map((b) => (
                <li key={b.id}>
                  <Link href={`/boqs/${b.id}`} className="text-teal-700 hover:underline">
                    {b.number} — {b.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  const summarySelect = {
    id: true,
    number: true,
    title: true,
    clientName: true,
    siteAddress: true,
    city: true,
    deadline: true,
    status: true,
    assignedTo: { select: { name: true } },
    vendorInquiries: {
      select: {
        id: true,
        vendorName: true,
        quotes: { select: { amount: true, receivedAt: true } },
      },
    },
  } as const;
  const [boqs, assigned, quoting, quotesReceived, completed] = await Promise.all([
    db.bOQ.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8, select: summarySelect }),
    db.bOQ.count({ where: { status: "ASSIGNED", deletedAt: null } }),
    db.bOQ.count({ where: { status: "VENDOR_QUOTING", deletedAt: null } }),
    db.bOQ.count({ where: { status: "QUOTES_RECEIVED", deletedAt: null } }),
    db.bOQ.count({ where: { status: "COMPLETED", deletedAt: null } }),
  ]);
  const views = boqs.map((boq) => toBoqView(boq));

  const stats = [
    { label: "Site visit pending", value: assigned, href: "/boqs?status=ASSIGNED" },
    { label: "Vendor quoting", value: quoting, href: "/boqs?status=VENDOR_QUOTING" },
    { label: "Quotes received", value: quotesReceived, href: "/boqs?status=QUOTES_RECEIVED" },
    { label: "Completed", value: completed, href: "/boqs?status=COMPLETED" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500">Quotation phase overview</p>
        </div>
        <Link href="/boqs/new" className={btn.primary}>
          + New BOQ
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 hover:ring-teal-300"
          >
            <p className="text-3xl font-bold text-teal-800">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-stone-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <Card title="Recent BOQs" actions={<Link href="/boqs" className={btn.sm}>View all</Link>}>
          <BoqList boqs={views} emptyText="Nothing here yet. Create your first BOQ." />
      </Card>
    </div>
  );
}
