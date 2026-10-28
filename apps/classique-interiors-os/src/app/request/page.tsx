import Link from "next/link";
import { Card } from "@/components/ui";
import { COMPANY } from "@/lib/company";
import { newClientUploadSession } from "@/lib/client-intake-token";
import { storageMode } from "@/lib/storage";
import ClientRequestForm from "./ClientRequestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request a BOQ" };

export default function ClientRequestPage() {
  const session = newClientUploadSession();
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 font-bold text-white">CI</div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{COMPANY.name}</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Request a BOQ</h1>
          <p className="mt-2 text-sm text-stone-600">Share the project scope, site details and reference images. We’ll send a tracking token when your request is submitted.</p>
        </header>
        <Card title="Project details" subtitle="Fields marked * are required.">
          <ClientRequestForm uploadSessionId={session.sessionId} uploadToken={session.token} mode={storageMode()} />
        </Card>
        <p className="text-center text-xs text-stone-500">Already submitted? <Link className="font-medium text-teal-700 underline" href="/login#track-request">Check your request status</Link></p>
      </div>
    </main>
  );
}
