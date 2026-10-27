import ExcelJS from "exceljs";
import type { BOQ, BOQItem, VendorInquiry } from "@prisma/client";
import { formatDate } from "@/lib/format";

type BoqWithItems = BOQ & { items: BOQItem[] };

export async function buildVendorBoqXlsx(boq: BoqWithItems, inquiry: VendorInquiry): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BOQ", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [
    { width: 6 },
    { width: 52 },
    { width: 10 },
    { width: 12 },
    { width: 28 },
  ];

  const title = ws.addRow(["BILL OF QUANTITIES"]);
  title.font = { bold: true, size: 14 };
  ws.mergeCells(`A${title.number}:E${title.number}`);
  title.alignment = { horizontal: "center" };

  const ref = ws.addRow([`Reference: ${boq.number}`]);
  ref.font = { size: 10 };
  ws.mergeCells(`A${ref.number}:E${ref.number}`);

  const site = ws.addRow([`Site location: ${boq.siteAddress}${boq.city ? `, ${boq.city}` : ""}`]);
  site.font = { size: 10 };
  ws.mergeCells(`A${site.number}:E${site.number}`);

  const due = ws.addRow([`Quotation submission deadline: ${formatDate(inquiry.dueDate ?? boq.deadline)}`]);
  due.font = { size: 10 };
  ws.mergeCells(`A${due.number}:E${due.number}`);

  ws.addRow([]);

  if (inquiry.instructions) {
    const instr = ws.addRow(["Instructions to vendor"]);
    instr.font = { bold: true, size: 10 };
    const body = ws.addRow([inquiry.instructions]);
    body.alignment = { wrapText: true, vertical: "top" };
    body.font = { size: 9 };
    ws.mergeCells(`A${body.number}:E${body.number}`);
    ws.getRow(body.number).height = 42;
    ws.addRow([]);
  }

  const head = ws.addRow(["Sr No", "Description of Item / Work", "Unit", "Quantity", "Remarks"]);
  head.eachCell((c) => {
    c.font = { bold: true, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  for (const it of boq.items) {
    const row = ws.addRow([it.srNo, it.description, it.unit, it.quantity, it.remarks || ""]);
    row.eachCell((c) => {
      c.font = { size: 10 };
      c.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } };
    });
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  ws.addRow([]);
  const note = ws.addRow([
    "Please quote your rates inclusive of all costs mentioned in the instructions above and submit before the deadline.",
  ]);
  note.font = { italic: true, size: 9 };
  ws.mergeCells(`A${note.number}:E${note.number}`);
  ws.getRow(note.number).height = 26;
  note.alignment = { wrapText: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
