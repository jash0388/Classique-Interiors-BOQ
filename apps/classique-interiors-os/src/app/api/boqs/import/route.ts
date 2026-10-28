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
  unit: ["uom", "unit of measure", "unit"],
  quantity: ["qty", "quantity"],
  remarks: ["remark", "note"],
};

function findHeaderRow(rows: unknown[][]): { row: number; map: Record<string, number> } | null {
  let best: { row: number; map: Record<string, number>; score: number } | null = null;
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const cells = (rows[r] || []).map((c) => String(c ?? "").toLowerCase().replace(/[.*#:]/g, " ").trim());
    const map: Record<string, number> = {};
    let hits = 0;
    for (const [key, words] of Object.entries(KEYS)) {
      const exact = cells.findIndex((c) => words.some((w) => c === w));
      const partial = key === "unit" ? -1 : cells.findIndex((c) => words.some((w) => c.includes(w)));
      const idx = exact >= 0 ? exact : partial;
      if (idx >= 0 && !(key in map)) {
        map[key] = idx;
        hits++;
      }
    }
    if (hits >= 2 && map.description !== undefined) {
      const score = hits + (map.quantity !== undefined ? 2 : 0) + (map.unit !== undefined ? 1 : 0);
      if (!best || score > best.score) best = { row: r, map, score };
    }
  }
  return best ? { row: best.row, map: best.map } : null;
}

function readMetadata(rows: unknown[][]): Record<string, string> {
  const result: Record<string, string> = {};
  const labels: Record<string, string[]> = {
    title: ["boq title", "title", "scope"],
    projectName: ["project"],
    clientName: ["account name", "client", "customer", "company"],
    clientContactName: ["requestor name", "requester name", "contact person"],
    clientContactPhone: ["requestor contact number", "contact number", "phone", "mobile"],
    siteAddress: ["site address", "location", "site"],
    city: ["site name", "city"],
    deadline: ["expected wc date", "deadline", "due date", "completion date"],
  };
  const save = (key: string, raw: unknown) => {
    let value = String(raw ?? "").trim();
    if (key === "deadline" && typeof raw === "number" && raw > 20000 && raw < 80000) {
      value = new Date(Date.UTC(1899, 11, 30) + Math.floor(raw) * 86400000).toISOString().slice(0, 10);
    }
    if (value && !result[key]) result[key] = value;
  };
  for (const row of rows.slice(0, 40)) {
    const cells = (row || []).map((v) => v instanceof Date ? v : String(v ?? "").trim());
    const first = cells.find(Boolean) ?? "";
    if (!result.title && /^(?:boq\s+title\b|boq\s*(?:[–—-]|for\b)|bill of quantities\b|sor\b)/i.test(String(first))) save("title", String(first).replace(/^(?:boq\s+title\s*[:\-–—]?\s*|title\s*[:\-–—]?\s*)/i, ""));
    if (!result.title && /\bsor\s+for\b/i.test(String(first))) save("title", String(first));
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const lower = String(cell).toLowerCase().replace(/[＊*]/g, "").trim();
      for (const [key, aliases] of Object.entries(labels)) {
        const label = aliases.find((a) => lower === a || lower.startsWith(a + " :") || lower.startsWith(a + ":") || lower.startsWith(a + " -"));
        if (!label || result[key]) continue;
        const inline = String(cell).replace(/[＊*]/g, "").replace(new RegExp(`^${label}\\s*[:\\-–—]?\\s*`, "i"), "").trim();
        const knownLabels = Object.values(labels).flat().map((value) => value.toLowerCase());
        const next = cells.slice(i + 1).find((value) => { const text = String(value ?? "").trim(); return text && !/^\*?\s*mandatory(?:\s+field)?\s*$/i.test(text) && !/^\*+$/.test(text) && !knownLabels.includes(text.toLowerCase()); });
        save(key, inline || next || "");
      }
      const inline = String(cell).match(/^(client|project|title|site)\s*:\s*(.+)$/i);
      if (inline) {
        const key = /^client$/i.test(inline[1]) ? "clientName" : /^(project|title)$/i.test(inline[1]) ? "title" : "siteAddress";
        save(key, inline[2].trim());
      }
    }
  }
  if (!result.title && result.projectName) result.title = result.projectName;
  delete result.projectName;
  return result;
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
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "Could not read this file. Use .xlsx, .xls or .csv." }, { status: 400 });
  }

  let chosen: { name: string; rows: unknown[][]; header: ReturnType<typeof findHeaderRow>; score: number } | null = null;
  const metadataBySheet: Record<string, Record<string, string>> = {};
  for (const name of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null }) as unknown[][];
    const h = findHeaderRow(sheetRows);
    const score = h ? (h.map.quantity !== undefined ? 5 : 0) + (h.map.unit !== undefined ? 2 : 0) + (h.map.remarks !== undefined ? 1 : 0) : 0;
    if (h && (!chosen || score > chosen.score)) chosen = { name, rows: sheetRows, header: h, score };
    metadataBySheet[name] = readMetadata(sheetRows);
  }
  const rows = chosen?.rows ?? [];
  const header = chosen?.header ?? null;
  const metadata: Record<string, string> = { ...(chosen ? metadataBySheet[chosen.name] : {}) };
  for (const other of Object.values(metadataBySheet)) for (const [key, value] of Object.entries(other)) if (!metadata[key]) metadata[key] = value;
  const out: ParsedRow[] = [];

  const start = header ? header.row + 1 : 0;
  const map = header?.map ?? { description: 0, unit: 1, quantity: 2, remarks: 3 };

  for (let r = start; r < rows.length && out.length < 500; r++) {
    const cells = rows[r] || [];
    const boundary = cells.some((cell) => /^(notes\s+and\s+comments|total)$/i.test(String(cell ?? "").trim()));
    if (boundary) break;
    const description = String(cells[map.description] ?? "").trim();
    if (!description || /^(grand\s+)?total\b/i.test(description)) continue;
    const unit = String(cells[map.unit] ?? "").trim() || "nos";
    const quantity = parseQty(cells[map.quantity]);
    const remarks = map.remarks !== undefined ? String(cells[map.remarks] ?? "").trim() : "";
    out.push({ description, unit, quantity, remarks });
  }

  if (!out.length) return NextResponse.json({ error: "Could not identify BOQ line items. Use a sheet with Description, Unit/UOM and Qty columns." }, { status: 422 });
  return NextResponse.json({ rows: out, metadata, sheet: chosen?.name });
}
