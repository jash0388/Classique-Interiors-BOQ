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

export default function ItemsEditor({ name = "items" }: { name?: string }) {
  const [rows, setRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700">
          Items <span className="text-stone-400">({rows.filter((r) => r.description.trim()).length})</span>
        </p>
        <div className="flex items-center gap-2">
          {importing ? <span className="text-xs text-stone-500">Reading file…</span> : null}
          <label
            key={fileKey.current}
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            ⬆ Import Excel / CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
              }}
            />
          </label>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
