import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import { statusLabel, statusColor } from "@/lib/status";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { assignmentMessage, assignmentSubject, mailLink, waLink } from "@/lib/notify";
import { rankVendors, latestQuote, type InquiryWithQuotes } from "@/lib/l1";
import { Card, StatusChip, Empty, KV, btn } from "@/components/ui";
import { setHold, removeVendorInquiry } from "../actions";
import AssignCard from "./AssignCard";
import { AddVendorForm, QuoteForm } from "./VendorForms";
import QuotationPanel from "./QuotationPanel";

export default async function BoqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const boq = await db.bOQ.findUnique({
    where: { id },
    include: {
      items: { orderBy: { srNo: "asc" } },
      siteVisit: { include: { files: { orderBy: { createdAt: "asc" } } } },
      vendorInquiries: { include: { quotes: { orderBy: { receivedAt: "desc" } } }, orderBy: { createdAt: "asc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      assignedTo: true,
      createdBy: true,
    },
  });
  if (!boq) notFound();
  if (user.role === "FIELD" && boq.assignedToId !== user.uid) notFound();

  const canManage = user.role === "OWNER" || user.role === "MANAGER";
  const mode = storageMode();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;
  const visitUrl = `${baseUrl}/visit/${boq.visitToken}`;

  const msg = assignmentMessage(boq, visitUrl, user.name);
  const waHref = waLink(boq.assignedTo?.phone, msg);
  const mailHref = mailLink(boq.assignedTo?.email, assignmentSubject(boq), msg);

  const ranked = rankVendors(boq.vendorInquiries as InquiryWithQuotes[]);
  const l1 = ranked.find((r) => r.isL1);

  const fieldUsers = canManage
    ? await db.user.findMany({ where: { role: "FIELD", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } })
    : [];

  const visit = boq.siteVisit;
  const photos = (visit?.files ?? []).filter((f) => f.kind === "photo");
  const videos = (visit?.files ?? []).filter((f) => f.kind === "video");
  const docs = (visit?.files ?? []).filter((f) => f.kind === "document");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={user.role === "FIELD" ? "/dashboard" : "/boqs"} className="text-sm text-stone-500 hover:text-stone-700">
          ← Back
        </Link>
        {canManage && boq.status !== "ON_HOLD" && boq.status !== "COMPLETED" ? (
          <form action={setHold}>
            <input type="hidden" name="boqId" value={boq.id} />
            <input type="hidden" name="hold" value="1" />
            <button type="submit" className={btn.sm}>
              Put on hold
            </button>
          </form>
        ) : null}
        {canManage && boq.status === "ON_HOLD" ? (
          <form action={setHold}>
            <input type="hidden" name="boqId" value={boq.id} />
            <input type="hidden" name="hold" value="0" />
            <button type="submit" className={btn.sm}>
              Resume
            </button>
          </form>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-stone-900">{boq.number}</h1>
          <StatusChip label={statusLabel(boq.status)} color={statusColor(boq.status)} />
          {l1 ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              L1: {l1.inquiry.vendorName} · {formatINR(l1.quote.amount)}
            </span>
          ) : null}
        </div>
        <p className="mb-4 text-sm font-medium text-stone-700">{boq.title}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <KV k="Client" v={boq.clientName} />
          <KV k="Contact person" v={boq.clientContactName ? `${boq.clientContactName}${boq.clientContactPhone ? ` · ${boq.clientContactPhone}` : ""}` : null} />
          <KV k="Deadline" v={boq.deadline ? formatDate(boq.deadline) : null} />
          <KV k="Site address" v={boq.siteAddress} />
          <KV k="City" v={boq.city} />
          <KV k="Assigned to" v={boq.assignedTo?.name ?? null} />
          <KV k="Created by" v={boq.createdBy.name} />
          <KV k="Created on" v={formatDate(boq.createdAt)} />
          {boq.siteDetails ? <KV k="Site details" v={boq.siteDetails} /> : null}
          {boq.notes ? <KV k="Internal notes" v={boq.notes} /> : null}
        </dl>
      </div>

      <Card title="BOQ items" subtitle={`${boq.items.length} item(s)`}>
        {boq.items.length === 0 ? (
          <Empty>No items entered.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-stone-50 text-left text-xs text-stone-500">
                <tr>
                  <th className="w-8 px-3 py-2">#</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="w-20 px-3 py-2">Unit</th>
                  <th className="w-20 px-3 py-2">Qty</th>
                  <th className="w-40 px-3 py-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {boq.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 text-xs text-stone-400">{it.srNo}</td>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-stone-500">{it.unit}</td>
                    <td className="px-3 py-2">{it.quantity}</td>
                    <td className="px-3 py-2 text-stone-500">{it.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManage ? (
        <Card title="Site visit assignment">
          <AssignCard
            boqId={boq.id}
            assignedToId={boq.assignedToId}
            assignedToName={boq.assignedTo?.name ?? null}
            fieldUsers={fieldUsers}
            waHref={waHref}
            mailHref={mailHref}
            visitUrl={visitUrl}
          />
        </Card>
      ) : null}

      <Card title="Site visit report">
        {!visit ? (
          <Empty>No site visit submitted yet{canManage ? " — the assigned person uploads it via their visit link." : "."}</Empty>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              Submitted {formatDateTime(visit.visitedAt)}
              {boq.assignedTo ? ` by ${boq.assignedTo.name}` : ""}
            </p>
            {photos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {photos.map((f) => (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" title={f.filename}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.filename} className="h-24 w-24 rounded-lg object-cover ring-1 ring-stone-200" />
                  </a>
                ))}
              </div>
            ) : null}
            {videos.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {videos.map((f) => (
                  <li key={f.id}>
                    🎬{" "}
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      {f.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {docs.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {docs.map((f) => (
                  <li key={f.id}>
                    📄{" "}
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      {f.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {visit.notes ? <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{visit.notes}</p> : null}
          </div>
        )}
      </Card>

      <Card
        title="Sub-vendor inquiries"
        subtitle="Package = vendor BOQ (Excel) + site photos & notes + instructions. Share the ZIP with vendors, then enter their quotes here."
        actions={canManage ? <AddVendorForm boqId={boq.id} /> : undefined}
      >
        {boq.vendorInquiries.length === 0 ? (
          <Empty>{canManage ? "No vendors added yet. Add vendors, download the package ZIP and send it to them." : "No vendors added yet."}</Empty>
        ) : (
          <div className="space-y-3">
            {boq.vendorInquiries.map((inq) => {
              const lq = latestQuote(inq as InquiryWithQuotes);
              const isL1 = ranked.find((r) => r.inquiry.id === inq.id)?.isL1 ?? false;
              return (
                <div key={inq.id} className="rounded-xl ring-1 ring-stone-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {inq.vendorName}
                        {isL1 ? (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">L1</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-stone-500">
                        {inq.vendorPhone || "no phone"}
                        {inq.vendorEmail ? ` · ${inq.vendorEmail}` : ""}
                        {inq.dueDate ? ` · quote due ${formatDate(inq.dueDate)}` : ""}
                      </p>
                      {lq ? (
                        <p className="mt-1 text-sm">
                          Quoted: <span className="font-semibold">{formatINR(lq.amount)}</span>
                          {lq.leadTimeDays ? <span className="text-xs text-stone-500"> · {lq.leadTimeDays} days</span> : null}
                          {lq.fileName ? (
                            <>
                              {" · "}
                              <a href={lq.fileUrl ?? "#"} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                                {lq.fileName}
                              </a>
                            </>
                          ) : null}
                          {lq.notes ? <span className="text-xs text-stone-500"> · {lq.notes}</span> : null}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-stone-400">Quotation not received yet</p>
                      )}
                    </div>
                    {canManage ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a href={`/api/boqs/${boq.id}/package?inquiry=${inq.id}`} className={btn.sm}>
                          ⬇ Package ZIP
                        </a>
                        <a href={`/api/boqs/${boq.id}/vendor-boq?inquiry=${inq.id}`} className={btn.sm}>
                          ⬇ BOQ Excel
                        </a>
                        <QuoteForm boqId={boq.id} inquiryId={inq.id} vendorName={inq.vendorName} mode={mode} items={boq.items.map((it) => ({ id: it.id, srNo: it.srNo, description: it.description, unit: it.unit, quantity: it.quantity }))} />
                        <form action={removeVendorInquiry}>
                          <input type="hidden" name="inquiryId" value={inq.id} />
                          <input type="hidden" name="boqId" value={boq.id} />
                          <button type="submit" className={btn.sm} title="Remove vendor">
                            ✕
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {ranked.length > 0 ? (
              <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-stone-50 text-left text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Vendor</th>
                      <th className="px-3 py-2 text-right">Quoted amount</th>
                      <th className="px-3 py-2">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ranked.map((r) => (
                      <tr key={r.inquiry.id} className={r.isL1 ? "bg-green-50/60" : ""}>
                        <td className="px-3 py-2">
                          {r.isL1 ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">L1</span> : `#${r.rank}`}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.inquiry.vendorName}</td>
                        <td className="px-3 py-2 text-right">{formatINR(r.quote.amount, { decimals: true })}</td>
                        <td className="px-3 py-2 text-xs text-stone-500">{formatDateTime(r.quote.receivedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {canManage ? (
        <Card title="Final client quotation" subtitle="Pick the base quote, add margin and GST — you get a ready-to-send PDF.">
          <QuotationPanel
            boqId={boq.id}
            options={ranked.map((r) => ({ inquiryId: r.inquiry.id, vendorName: r.inquiry.vendorName, amount: r.quote.amount, isL1: r.isL1 }))}
          />
          {boq.quotations.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
              {boq.quotations.map((q) => (
                <div key={q.id} id={`quotation-${q.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{q.number}</p>
                    <p className="text-xs text-stone-500">
                      {q.vendorName} · margin {q.marginPercent}% · GST {q.gstPercent}% ·{" "}
                      <span className="font-semibold text-stone-700">Total {formatINR(q.grandTotal, { decimals: true })}</span> · {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <a href={`/api/quotations/${q.id}/pdf`} className={btn.sm}>
                    ⬇ Download PDF
                  </a>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
