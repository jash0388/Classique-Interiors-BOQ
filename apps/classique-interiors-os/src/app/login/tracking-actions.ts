"use server";

import { db } from "@/lib/db";
import { hashTrackingToken } from "@/lib/client-intake-token";

export type TrackingState = { error?: string; status?: string; boqNumber?: string };

export async function trackClientRequest(_previous: TrackingState, form: FormData): Promise<TrackingState> {
  const token = String(form.get("trackingToken") ?? "").trim().toUpperCase();
  if (!/^CI-\d{4}-[A-F0-9]{24}$/.test(token)) return { error: "Enter the tracking token exactly as shown after submission." };
  const boq = await db.bOQ.findUnique({
    where: { publicTrackingTokenHash: hashTrackingToken(token) },
    select: { number: true, status: true, deletedAt: true },
  });
  if (!boq || boq.deletedAt) return { error: "We couldn't find a request with that token." };
  const status: Record<string, string> = {
    REQUEST_RECEIVED: "Request received — awaiting review",
    DRAFT: "Request received — awaiting review",
    ASSIGNED: "Site visit scheduled",
    SITE_VISIT_DONE: "Site visit completed",
    VENDOR_QUOTING: "Vendor pricing in progress",
    QUOTES_RECEIVED: "Quotes received — preparing the estimate",
    COMPLETED: "Estimate completed",
    ON_HOLD: "Request temporarily on hold",
  };
  return { status: status[boq.status] ?? "Request received", boqNumber: boq.number };
}
