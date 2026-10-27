"use client";

import { useState } from "react";
import FilePicker from "@/components/FilePicker";
import SubmitButton from "@/components/SubmitButton";
import { btn } from "@/components/ui";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";
import { addVendorInquiry, addVendorQuote } from "../actions";

export function AddVendorForm({ boqId }: { boqId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.sm}>
        + Add vendor
      </button>
    );
  }

  return (
    <form action={addVendorInquiry} className="space-y-3 rounded-xl bg-stone-50 p-3">
      <input type="hidden" name="boqId" value={boqId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label>Vendor name *</label>
          <input name="vendorName" type="text" required placeholder="e.g. Shree Enterprises" />
        </div>
        <div>
          <label>Vendor phone</label>
          <input name="vendorPhone" type="tel" placeholder="+91…" />
        </div>
        <div>
          <label>Vendor email</label>
          <input name="vendorEmail" type="email" placeholder="vendor@company.com" />
        </div>
        <div>
          <label>Quote due date</label>
          <input name="dueDate" type="date" />
        </div>
      </div>
      <div>
        <label>Instructions to vendor</label>
        <textarea name="instructions" rows={3} defaultValue={DEFAULT_INSTRUCTIONS} />
      </div>
      <div className="flex gap-2">
        <SubmitButton className={btn.primary} pendingLabel="Adding…">
          Add vendor
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type ItemOpt = { id: string; srNo: number; description: string; unit: string; quantity: number };

export function QuoteForm({
  boqId,
  inquiryId,
  vendorName,
  items,
  mode,
}: {
  boqId: string;
  inquiryId: string;
  vendorName: string;
  items: ItemOpt[];
  mode: "local" | "blob";
}) {
  const [open, setOpen] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [rates, setRates] = useState<Record<string, string>>({});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.sm}>
        + Enter quotation
      </button>
    );
  }

  const itemRates = Object.entries(rates)
    .filter(([, r]) => r !== "" && Number(r) >= 0)
    .map(([boqItemId, r]) => ({ boqItemId, rate: Number(r) }));

  return (
    <form action={addVendorQuote} className="space-y-3 rounded-xl bg-stone-50 p-3">
      <p className="text-sm font-semibold text-stone-700">Quotation from {vendorName}</p>
      <input type="hidden" name="boqId" value={boqId} />
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="itemRates" value={itemRates.length === items.length ? JSON.stringify(itemRates) : ""} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label>Quoted amount (₹) *</label>
          <input name="amount" type="number" min="1" step="0.01" required placeholder="e.g. 450000" />
        </div>
        <div>
          <label>Delivery days</label>
          <input name="leadTimeDays" type="number" min="1" placeholder="e.g. 21" />
        </div>
        <div>
          <label>Notes</label>
          <input name="notes" type="text" placeholder="e.g. Excludes GST" />
        </div>
      </div>
      <div>
        <label>Attach their quotation file (PDF/scan, optional)</label>
        <FilePicker name="quoteFile" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" multiple={false} mode={mode} />
      </div>
      {items.length > 0 ? (
        <div>
          <button type="button" onClick={() => setShowRates((s) => !s)} className="text-xs font-medium text-teal-700 hover:underline">
            {showRates ? "− Hide item-wise rates" : "+ Enter item-wise rates (optional, makes the client quotation accurate)"}
          </button>
          {showRates ? (
            <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-stone-200 p-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-xs text-stone-400">{it.srNo}</span>
                  <span className="flex-1 truncate" title={it.description}>
                    {it.description}
                    <span className="text-xs text-stone-400">
                      {" "}
                      ({it.quantity} {it.unit})
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[it.id] ?? ""}
                    onChange={(e) => setRates((r) => ({ ...r, [it.id]: e.target.value }))}
                    placeholder="rate"
                    className="!w-28"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton className={btn.primary} pendingLabel="Saving…">
          Save quotation
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
