"use client";

import { useRef, useState } from "react";
import { btn } from "@/components/ui";

export type ItemRow = {
  description: string;
  unit: string;
  quantity: number | string;
  remarks: string;
};

const emptyRow: ItemRow = { description: "", unit: "nos", quantity: "", remarks: "" };

export default function ItemsEditor({ name = "items", allowImport = true }: { name?: string; allowImport?: boolean }) {
  const [rows, setRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileKey = useRef(0);

  function update(i: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function importFile(file: File) {
    setError("");
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/boqs/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setImportNotice(`Imported ${json.rows?.length ?? 0} item rows${json.sheet ? ` from “${json.sheet}”` : ""}. Recognized blank project fields were filled; please review all values.`);
      for (const [name, raw] of Object.entries(json.metadata ?? {})) {
        const value = String(raw ?? "").trim();
        const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
        if (!input || input.value.trim() || !value) continue;
        const normalized = input.type === "date" ? (() => { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); })() : value;
        if (!normalized) continue;
        const setter = input instanceof HTMLInputElement ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set : Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(input, normalized);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const parsed: ItemRow[] = (json.rows || []).map((r: ItemRow) => ({
        description: r.description,
        unit: r.unit || "nos",
        quantity: r.quantity || "",
        remarks: r.remarks || "",
      }));
      if (parsed.length === 0) throw new Error("No item rows found in the file.");
      setRows((rs) => {
        const base = rs.filter((r) => r.description.trim() !== "");
        return [...base, ...parsed];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      fileKey.current += 1;
    }
  }

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 ${dragging ? "border-teal-600 bg-teal-50" : "border-stone-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) importFile(f); }}
      >
        <p className="text-sm font-medium text-stone-700">
          {dragging ? "Drop BOQ spreadsheet here" : <>BOQ items <span className="text-stone-400">({rows.filter((r) => r.description.trim()).length}) · Drop an Excel/CSV file to fill these rows</span></>}
        </p>
        <div className="flex items-center gap-2">
          {importing ? <span className="text-xs text-stone-500">Reading file…</span> : null}
          {allowImport ? <label
            key={fileKey.current}
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            ⬆ Choose Excel / CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
              }}
            />
          </label> : null}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {importNotice ? <p className="text-sm text-teal-800">{importNotice}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Description</th>
              <th className="w-24 px-2 py-2">Unit</th>
              <th className="w-24 px-2 py-2">Qty</th>
              <th className="w-40 px-2 py-2">Remarks</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5 text-xs text-stone-400">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={r.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="e.g. False ceiling with gypsum board"
                    className="!border-0 !px-1 !py-1 focus:!ring-0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={r.unit}
                    onChange={(e) => update(i, { unit: e.target.value })}
                    className="!border-0 !px-1 !py-1 focus:!ring-0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={r.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                    className="!border-0 !px-1 !py-1 focus:!ring-0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={r.remarks}
                    onChange={(e) => update(i, { remarks: e.target.value })}
                    className="!border-0 !px-1 !py-1 focus:!ring-0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))}
                    className="text-stone-400 hover:text-red-600"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-stone-50 text-xs text-stone-500">
              <td colSpan={3} className="px-2 py-1.5">
                Total quantity
              </td>
              <td className="px-2 py-1.5">{totalQty || "—"}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setRows((rs) => [...rs, { ...emptyRow }])} className={btn.sm}>
          + Add row
        </button>
      </div>

      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.description.trim()))} />
    </div>
  );
}
