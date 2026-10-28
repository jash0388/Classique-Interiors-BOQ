import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { unzipSync } from "fflate";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_DOC_TEXT_BYTES = 3 * 1024 * 1024;

function docxText(bytes: Uint8Array): string {
  let tooLarge = false;
  const files = unzipSync(bytes, { filter: (f) => {
    if (f.name === "word/document.xml" && f.originalSize > MAX_DOC_TEXT_BYTES) tooLarge = true;
    return f.name === "word/document.xml" && f.originalSize <= MAX_DOC_TEXT_BYTES;
  } });
  const xml = files["word/document.xml"];
  if (!xml || tooLarge) throw new Error("The Word quotation is too large to read safely.");
  return new TextDecoder().decode(xml)
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\n{3,}/g, "\n\n");
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  // PDF.js only needs a matrix constructor for module initialization during text extraction.
  // This lightweight polyfill is intentionally limited to text extraction; no PDF rendering occurs here.
  const globals = globalThis as unknown as { DOMMatrix?: new (values?: number[]) => object };
  if (!globals.DOMMatrix) {
    globals.DOMMatrix = class {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(values?: number[]) { if (values) [this.a, this.b, this.c, this.d, this.e, this.f] = values; }
    };
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: bytes, verbosity: 0, useSystemFonts: true }).promise;
  const pages: string[] = [];
  try {
    for (let pageNo = 1; pageNo <= Math.min(document.numPages, 40); pageNo++) {
      const page = await document.getPage(pageNo);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item && "transform" in item);
      // Restore a readable sequence from positioned PDF text runs, grouped into visual lines.
      items.sort((a, b) => Math.abs(b.transform[5] - a.transform[5]) > 2 ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]);
      const lines: { y: number; parts: { x: number; text: string }[] }[] = [];
      for (const item of items) {
        const y = item.transform[5];
        let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
        if (!line) { line = { y, parts: [] }; lines.push(line); }
        line.parts.push({ x: item.transform[4], text: item.str });
      }
      lines.sort((a, b) => b.y - a.y);
      pages.push(lines.map((line) => line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(" ")).join("\n"));
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await document.destroy();
  }
}

function getAmountCandidates(text: string) {
  const out: { label: string; amount: number; excerpt: string }[] = [];
  const number = "(?:₹|Rs\\.?|INR)?\\s*([\\d,]+(?:\\.\\d{1,2})?)";
  const labels = [
    ["Grand total", `grand\\s+total[^\\n\\r]{0,60}?${number}`],
    ["Total amount", `total\\s+amount[^\\n\\r]{0,60}?${number}`],
    ["Amount payable", `amount\\s+(?:payable|due)[^\\n\\r]{0,60}?${number}`],
    ["Net payable", `net\\s+payable[^\\n\\r]{0,60}?${number}`],
    ["Final total", `final\\s+total[^\\n\\r]{0,60}?${number}`],
    ["Package price", `(?:final\\s+negotiated\\s+)?package\\s+price[^\\n\\r]{0,60}?${number}`],
    ["Provisional total", `provisional\\s+total[^\\n\\r]{0,80}?${number}`],
    ["Total including tax", `total\\s+(?:including|incl\\.?)[^\\n\\r]{0,30}?(?:tax|gst)[^\\n\\r]{0,40}?${number}`],
  ] as const;
  for (const [label, pattern] of labels) {
    const re = new RegExp(pattern, "gi");
    for (const match of text.matchAll(re)) {
      const raw = match[1]?.replace(/,/g, "");
      const amount = Number(raw);
      if (Number.isFinite(amount) && amount > 0 && !out.some((v) => v.amount === amount)) {
        out.push({ label, amount, excerpt: match[0].trim().slice(0, 180) });
      }
    }
  }
  return out.slice(0, 20);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a quotation file first." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Quotation files must be 15 MB or smaller." }, { status: 413 });
  const ext = file.name.toLowerCase().split(".").pop();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  try {
    if (ext === "pdf") text = await pdfText(bytes);
    else if (ext === "docx") text = docxText(bytes);
    else if (["xlsx", "xls", "csv"].includes(ext ?? "")) {
      const wb = XLSX.read(bytes, { type: "array", cellDates: true });
      text = wb.SheetNames.map((name) => `SHEET: ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`).join("\n\n");
    } else if (ext === "txt") text = new TextDecoder().decode(bytes);
    else return NextResponse.json({ error: "This file is saved as an attachment, but automatic reading supports text PDFs, Word documents, and Excel/CSV. Images and scans need OCR." }, { status: 415 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read this quotation. You can still attach it and enter the verified total manually." }, { status: 422 });
  }

  const normalized = text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  const candidates = getAmountCandidates(normalized);
  const warnings: string[] = [];
  if (/\b(draft|provisional|not approved|for vendor confirmation|subject to confirmation)\b/i.test(normalized)) warnings.push("The document appears to be a draft or provisional. Confirm it is vendor-authorized.");
  if (/\b(pending|rate required|excluded from|not included)\b/i.test(normalized)) warnings.push("The document mentions pending or excluded prices. Check for missing items before comparing totals.");
  if (normalized.trim().length < 80) warnings.push("No readable text was found. This may be a scanned document; OCR or manual review is needed.");
  return NextResponse.json({
    filename: file.name,
    charactersRead: normalized.length,
    candidates,
    warnings,
    preview: normalized.slice(0, 16000),
    readMode: ext === "pdf" ? "PDF text extraction (scans are not OCR'd)" : "Document text extraction",
  });
}
