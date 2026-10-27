"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { btn } from "@/components/ui";
import { generateQuotation } from "../actions";

export default function QuotationPanel({
  boqId,
  options,
}: {
  boqId: string;
  options: { inquiryId: string; vendorName: string; amount: number; isL1: boolean }[];
}) {
  const [vendor, setVendor] = useState(options.find((o) => o.isL1)?.inquiryId ?? options[0]?.inquiryId ?? "");

  if (options.length === 0) {
    return <p className="text-sm text-stone-400">Enter at least one vendor quotation to generate the client quotation.</p>;
  }

  return (
    <form action={generateQuotation} className="space-y-3">
      <input type="hidden" name="boqId" value={boqId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label>Base vendor quotation</label>
          <select name="inquiryId" value={vendor} onChange={(e) => setVendor(e.target.value)} required>
            {options.map((o) => (
              <option key={o.inquiryId} value={o.inquiryId}>
                {o.vendorName} — ₹{o.amount.toLocaleString("en-IN")}
                {o.isL1 ? " (L1)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Margin / profit % *</label>
          <input name="marginPercent" type="number" min="0" max="200" step="0.5" required defaultValue={20} />
        </div>
        <div>
          <label>GST %</label>
          <input name="gstPercent" type="number" min="0" max="28" step="0.01" defaultValue={18} />
        </div>
      </div>
      <SubmitButton className={btn.primary} pendingLabel="Generating…">
        Generate client quotation
      </SubmitButton>
    </form>
  );
}
