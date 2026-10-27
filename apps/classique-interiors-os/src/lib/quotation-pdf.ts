import PDFDocument from "pdfkit";
import { COMPANY } from "@/lib/company";

export type QuotationSnapshotItem = {
  srNo: number;
  description: string;
  unit: string;
  quantity: number;
  remarks: string;
  rate: number;
  amount: number;
};

export type QuotationPdfData = {
  number: string;
  date: Date;
  clientName: string;
  clientContactName: string | null;
  siteAddress: string;
  city: string | null;
  boqNumber: string;
  boqTitle: string;
  items: QuotationSnapshotItem[];
  subtotal: number;
  marginPercent: number;
  marginAmount: number;
  taxableValue: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
};

function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function renderQuotationPdf(d: QuotationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 54, left: 40, right: 40 },
      bufferPages: true,
      info: { Title: `Quotation ${d.number}` },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const L = 40;
    const R = W - 40;

    // Header
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f766e").text(COMPANY.name.toUpperCase(), L, 42);
    doc.font("Helvetica").fontSize(8.5).fillColor("#44403c")
      .text(`${COMPANY.address}  ·  ${COMPANY.phone}  ·  ${COMPANY.email}`, L, 64);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text("QUOTATION", R - 110, 42, { width: 110, align: "left" });
    doc.font("Helvetica").fontSize(9).fillColor("#44403c");
    doc.text(`No: ${d.number}`, R - 110, 60, { width: 110 });
    doc.text(`Date: ${d.date.toLocaleDateString("en-IN")}`, R - 110, 72, { width: 110 });
    doc.text(`Ref: ${d.boqNumber}`, R - 110, 84, { width: 110 });

    const hr = 100;
    doc.moveTo(L, hr).lineTo(R, hr).lineWidth(1.2).strokeColor("#0f766e").stroke();

    // Client / site
    let y = 114;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text("To:", L, y);
    doc.font("Helvetica").fontSize(9.5).fillColor("#1c1917");
    doc.text(d.clientName, L + 26, y);
    y += 13;
    if (d.clientContactName) {
      doc.font("Helvetica").fontSize(9).fillColor("#44403c").text(`Attn: ${d.clientContactName}`, L + 26, y);
      y += 12;
    }
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text("Site:", L, y);
    doc.font("Helvetica").fontSize(9).fillColor("#1c1917")
      .text(`${d.siteAddress}${d.city ? `, ${d.city}` : ""}`, L + 30, y, { width: 360 });
    y += Math.max(14, doc.heightOfString(d.siteAddress, { width: 360 }) + 2);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text("Work:", L, y);
    doc.font("Helvetica").fontSize(9).fillColor("#1c1917").text(d.boqTitle, L + 36, y, { width: 360 });
    y += Math.max(16, doc.heightOfString(d.boqTitle, { width: 360 }) + 8);

    // Table
    const colX = { sr: L, desc: L + 24, unit: 320, qty: 380, rate: 430, amt: R - 70 };
    const colW = { desc: 280, unit: 50, qty: 40, rate: 60, amt: 70 };

    function tableHeader(yy: number) {
      doc.rect(L, yy, R - L, 18).fill("#0f766e");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
      doc.text("#", colX.sr, yy + 5);
      doc.text("Description", colX.desc, yy + 5, { width: colW.desc });
      doc.text("Unit", colX.unit, yy + 5, { width: colW.unit });
      doc.text("Qty", colX.qty, yy + 5, { width: colW.qty });
      doc.text("Rate (Rs.)", colX.rate, yy + 5, { width: colW.rate });
      doc.text("Amount (Rs.)", colX.amt, yy + 5, { width: colW.amt });
      return yy + 18;
    }

    y = tableHeader(y);
    doc.font("Helvetica").fontSize(8.5).fillColor("#1c1917");

    for (const it of d.items) {
      const descH = Math.max(doc.heightOfString(it.description, { width: colW.desc }), 12);
      const rowH = Math.max(descH + 6, 18);

      if (y + rowH > doc.page.height - 120) {
        doc.addPage();
        y = 40;
        y = tableHeader(y);
        doc.font("Helvetica").fontSize(8.5).fillColor("#1c1917");
      }

      if (d.items.indexOf(it) % 2 === 1) {
        doc.rect(L, y, R - L, rowH).fill("#f8fafc");
        doc.fillColor("#1c1917");
      }

      doc.font("Helvetica").fontSize(8.5).fillColor("#1c1917");
      doc.text(String(it.srNo), colX.sr, y + 5);
      doc.text(it.description, colX.desc, y + 4, { width: colW.desc });
      doc.text(it.unit, colX.unit, y + 5, { width: colW.unit });
      doc.text(String(it.quantity), colX.qty, y + 5, { width: colW.qty, align: "right" });
      doc.text(inr(it.rate), colX.rate, y + 5, { width: colW.rate, align: "right" });
      doc.text(inr(it.amount), colX.amt, y + 5, { width: colW.amt, align: "right" });

      doc.moveTo(L, y + rowH).lineTo(R, y + rowH).lineWidth(0.4).strokeColor("#e7e5e4").stroke();
      y += rowH;
    }

    // Totals
    y += 10;
    if (y + 110 > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    const tx = R - 220;
    const tw = 220;

    function totalRow(label: string, value: string, opts?: { bold?: boolean }) {
      doc.font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5)
        .fillColor("#0f172a").text(label, tx, y, { width: tw - 90, align: "left" });
      doc.text(value, R - 88, y, { width: 88, align: "right" });
      y += 16;
    }

    totalRow("Subtotal", inr(d.subtotal));
    totalRow(`Margin (${d.marginPercent}%)`, inr(d.marginAmount));
    totalRow("Taxable value", inr(d.taxableValue));
    totalRow(`GST (${d.gstPercent}%)`, inr(d.gstAmount));

    y += 4;
    doc.rect(tx, y, tw, 22).fill("#0f766e");
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
      .text("GRAND TOTAL", tx + 8, y + 6, { width: tw - 100 });
    doc.text(`Rs. ${inr(d.grandTotal)}`, tx + 100, y + 6, { width: tw - 108, align: "right" });
    y += 30;

    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#44403c")
      .text(`Amount in words: rupees ${rupeesInWords(d.grandTotal)} only`, L, y, { width: R - L });
    y += 24;

    // Terms
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("Terms & Conditions", L, y);
    y += 14;
    doc.font("Helvetica").fontSize(8.5).fillColor("#44403c");
    const terms = [
      "This quotation is valid for 15 days from the date of issue.",
      "Payment terms as mutually agreed with the client.",
      "GST is applicable as stated above.",
      "Execution schedule will be confirmed on work order.",
    ];
    for (const t of terms) {
      doc.text(`•  ${t}`, L, y, { width: R - L });
      y += 12;
    }

    y += 24;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(`For ${COMPANY.name}`, R - 180, y, { width: 180, align: "left" });
    y += 42;
    doc.moveTo(R - 180, y).lineTo(R, y).lineWidth(0.5).strokeColor("#a8a29e").stroke();
    doc.font("Helvetica").fontSize(8.5).fillColor("#44403c").text("Authorised Signatory", R - 180, y + 4, { width: 180 });

    // Footers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(7.5).fillColor("#78716c")
        .text(`Generated by ${COMPANY.name} OS`, L, doc.page.height - 36, { lineBreak: false });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, R - 80, doc.page.height - 36, { width: 80, align: "right", lineBreak: false });
    }

    doc.end();
  });
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function two(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function rupeesInWords(amount: number): string {
  const n = Math.floor(amount);
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(two(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thousand) parts.push(two(thousand) + " Thousand");
  if (rest) {
    const h = Math.floor(rest / 100);
    const o = rest % 100;
    let s = "";
    if (h) s += ONES[h] + " Hundred";
    if (o) s += (s ? " " : "") + two(o);
    parts.push(s);
  }
  return parts.join(" ") || "Zero";
}
