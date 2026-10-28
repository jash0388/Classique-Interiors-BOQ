"use client";

import { useState } from "react";
import FilePicker from "@/components/FilePicker";
import SubmitButton from "@/components/SubmitButton";
import { btn } from "@/components/ui";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { addVendorInquiry, addVendorQuote } from "../actions";

export function AddVendorForm({ boqId, vendors = [] }: { boqId: string; vendors?: { id: string; name: string; trade: string; phone: string | null; email: string | null }[] }) {
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
      {vendors.length ? <div><label>Choose from saved vendors</label><select name="vendorId" defaultValue=""><option value="">— Or enter a one-time vendor below —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name} · {v.trade}</option>)}</select><p className="mt-1 text-xs text-stone-500">Choosing a saved vendor fills their contact details when the request is created.</p></div> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label>Vendor name *</label>
          <input name="vendorName" type="text" placeholder="e.g. Shree Enterprises (optional if choosing a saved vendor)" />
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
  const [amount, setAmount] = useState("");
  const [reading, setReading] = useState(false);
  const [readResult, setReadResult] = useState<{ candidates: { label: string; amount: number; excerpt: string }[]; warnings: string[]; preview: string; readMode: string } | null>(null);
  const [readError, setReadError] = useState("");

  async function readQuoteFile(file: File) {
    setReading(true);
    setReadError("");
    setReadResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/quotes/extract", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read the quotation.");
      setReadResult(result);
      const preferred = result.candidates?.find((c: { label: string }) => c.label === "Grand total") ?? result.candidates?.[0];
      if (preferred) setAmount(String(preferred.amount));
    } catch (error) {
      setReadError(error instanceof Error ? error.message : "Could not read the quotation.");
    } finally {
      setReading(false);
    }
  }

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
          <input name="amount" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 450000" />
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
        <label>Drop or attach their quotation file (PDF/scan/spreadsheet)</label>
        <FilePicker name="quoteFile" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.docx,.txt" multiple={false} mode={mode} onFileSelected={readQuoteFile} />
        <p className="mt-1 text-xs text-stone-500">Check the original quotation’s line items, taxes, exclusions and final total before entering the amount. The app ranks L1 from the verified total you save.</p>
      </div>
      {reading ? <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Reading quotation text and checking for totals… Please still verify the result against the original.</p> : null}
      {readError ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{readError}</p> : null}
      {readResult ? <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
        <p className="font-semibold text-teal-900">Read {readResult.readMode}. Check every suggested figure against the attached original.</p>
        {readResult.candidates.length ? <div className="flex flex-wrap gap-2">{readResult.candidates.map((candidate, i) => <button key={`${candidate.label}-${candidate.amount}-${i}`} type="button" onClick={() => setAmount(String(candidate.amount))} className="rounded-lg border border-teal-300 bg-white px-3 py-2 text-left hover:bg-teal-100"><span className="block text-xs text-stone-500">{candidate.label}</span><span className="font-semibold">{formatINR(candidate.amount)}</span><span className="block max-w-64 truncate text-xs text-stone-500">{candidate.excerpt}</span></button>)}</div> : <p className="text-amber-900">No total was confidently identified. Enter the amount after checking the original.</p>}
        {readResult.warnings.map(w => <p key={w} className="text-amber-900">⚠ {w}</p>)}
        <details><summary className="cursor-pointer text-xs font-medium text-teal-800">Review extracted text</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-stone-700">{readResult.preview}</pre></details>
      </div> : null}
      <label className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm"><input type="checkbox" name="reviewConfirmed" required className="mt-0.5 !w-auto" /><span>I checked the original quote and confirmed the amount, tax basis, exclusions, and any missing or provisional items.</span></label>
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
