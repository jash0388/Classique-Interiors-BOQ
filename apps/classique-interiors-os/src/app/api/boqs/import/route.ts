import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type ParsedRow = {
  description: string;
  unit: string;
  quantity: number;
  remarks: string;
};

const KEYS = {
  description: ["description", "item", "particular", "scope", "work", "detail"],
  unit: ["unit", "uom"],
  quantity: ["qty", "quantity"],
  remarks: ["remark", "note"],
};

function findHeaderRow(rows: unknown[][]): { row: number; map: Record<string, number> } | null {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const cells = (rows[r] || []).map((c) => String(c ?? "").toLowerCase().trim());
    const map: Record<string, number> = {};
    let hits = 0;
    for (const [key, words] of Object.entries(KEYS)) {
      if (key in map) continue;
      const idx = cells.findIndex((c) => words.some((w) => c.includes(w)));
      if (idx >= 0) {
        map[key] = idx;
        hits++;
      }
    }
    if (hits >= 2 && map.description !== undefined) {
      return { row: r, map };
    }
  }
  return null;
}

function parseQty(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file sent" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let rows: unknown[][];
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
  } catch {
    return NextResponse.json({ error: "Could not read this file. Use .xlsx, .xls or .csv." }, { status: 400 });
  }

  const header = findHeaderRow(rows);
  const out: ParsedRow[] = [];

  const start = header ? header.row + 1 : 0;
  const map = header?.map ?? { description: 0, unit: 1, quantity: 2, remarks: 3 };

  for (let r = start; r < rows.length && out.length < 500; r++) {
    const cells = rows[r] || [];
    const description = String(cells[map.description] ?? "").trim();
    if (!description || description.toLowerCase() === "grand total") continue;
    const unit = String(cells[map.unit] ?? "").trim() || "nos";
    const quantity = parseQty(cells[map.quantity]);
    const remarks = map.remarks !== undefined ? String(cells[map.remarks] ?? "").trim() : "";
    out.push({ description, unit, quantity, remarks });
  }

  return NextResponse.json({ rows: out });
}
