"use client";

import { useActionState } from "react";
import { trackClientRequest, type TrackingState } from "./tracking-actions";

const initial: TrackingState = {};

export default function RequestTracker() {
  const [state, action, pending] = useActionState(trackClientRequest, initial);
  return (
    <section id="track-request" className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <h2 className="font-semibold text-stone-900">Track a client request</h2>
      <p className="mt-1 text-xs text-stone-500">Enter the token you received after submitting a BOQ request.</p>
      <form action={action} className="mt-3 space-y-3">
        <label htmlFor="trackingToken">Tracking token</label>
        <input id="trackingToken" name="trackingToken" required autoCapitalize="characters" autoComplete="off" placeholder="CI-2026-…" />
        {state.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
        {state.status ? <p role="status" className="rounded-lg bg-teal-50 px-3 py-3 text-sm text-teal-900"><span className="font-semibold">{state.boqNumber}</span><br />{state.status}</p> : null}
        <button type="submit" disabled={pending} className="w-full rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60">{pending ? "Checking…" : "Check status"}</button>
      </form>
    </section>
  );
}
