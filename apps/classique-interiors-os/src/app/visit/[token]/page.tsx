import { db } from "@/lib/db";
import { storageMode } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import VisitForm from "../VisitForm";

export const metadata = { title: "Site visit" };

export default async function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const boq = await db.bOQ.findUnique({
    where: { visitToken: token },
    include: { assignedTo: true, siteVisit: { include: { files: true } } },
  });

  if (!boq) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
        <div className="max-w-sm text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-3 text-lg font-bold text-stone-900">Link not valid</h1>
          <p className="mt-1 text-sm text-stone-500">
            This visit link is invalid or has been replaced by a newer assignment. Please ask your manager for the latest link.
          </p>
        </div>
      </main>
    );
  }

  const mode = storageMode();
  const visit = boq.siteVisit;
  const srcFor = (url: string) => (url.startsWith("http") ? url : `${url}?token=${token}`);
  const photos = (visit?.files ?? []).filter((f) => f.kind === "photo");
  const videos = (visit?.files ?? []).filter((f) => f.kind === "video");
  const docs = (visit?.files ?? []).filter((f) => f.kind === "document");

  return (
    <main className="min-h-screen bg-stone-100 pb-16">
      <header className="bg-teal-900 px-4 py-5 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-teal-200">{COMPANY.name} · Site visit</p>
          <h1 className="mt-1 text-lg font-bold">{boq.number} — {boq.title}</h1>
          {boq.assignedTo ? <p className="mt-0.5 text-sm text-teal-100">Assigned to: {boq.assignedTo.name}</p> : null}
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Visit details</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-500">Client</dt>
              <dd className="text-sm font-medium">{boq.clientName}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Deadline</dt>
              <dd className="text-sm font-medium">{formatDate(boq.deadline)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-stone-500">Site address</dt>
              <dd className="text-sm font-medium">
                {boq.siteAddress}
                {boq.city ? `, ${boq.city}` : ""}
              </dd>
            </div>
            {boq.clientContactName ? (
              <div>
                <dt className="text-xs text-stone-500">Contact person</dt>
                <dd className="text-sm font-medium">
                  {boq.clientContactName}
                  {boq.clientContactPhone ? ` · ${boq.clientContactPhone}` : ""}
                </dd>
              </div>
            ) : null}
            {boq.siteDetails ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-stone-500">Site details</dt>
                <dd className="text-sm font-medium">{boq.siteDetails}</dd>
              </div>
            ) : null}
            {boq.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-stone-500">Notes from manager</dt>
                <dd className="text-sm font-medium">{boq.notes}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {visit && (visit.files.length > 0 || visit.notes) ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <h2 className="mb-1 text-sm font-semibold text-stone-900">Already uploaded</h2>
            <p className="mb-3 text-xs text-stone-500">Last submitted {formatDateTime(visit.visitedAt)}</p>
            {photos.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {photos.map((f) => (
                  <a key={f.id} href={srcFor(f.url)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={srcFor(f.url)} alt={f.filename} className="h-20 w-20 rounded-lg object-cover ring-1 ring-stone-200" />
                  </a>
                ))}
              </div>
            ) : null}
            {videos.length > 0 ? (
              <ul className="mb-3 space-y-1 text-sm">
                {videos.map((f) => (
                  <li key={f.id}>
                    🎬{" "}
                    <a href={srcFor(f.url)} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      {f.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {docs.length > 0 ? (
              <ul className="mb-3 space-y-1 text-sm">
                {docs.map((f) => (
                  <li key={f.id}>
                    📄{" "}
                    <a href={srcFor(f.url)} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      {f.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {visit.notes ? <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{visit.notes}</p> : null}
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="mb-1 text-sm font-semibold text-stone-900">
            {visit ? "Add more files / update notes" : "Submit your site visit"}
          </h2>
          <p className="mb-4 text-xs text-stone-500">Take photos on site, add what you observed, and submit.</p>
          <VisitForm token={token} mode={mode} />
        </section>
      </div>
    </main>
  );
}
