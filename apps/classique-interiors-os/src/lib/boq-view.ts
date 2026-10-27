import { BOQ, User, VendorInquiry, VendorQuote } from "@prisma/client";

export type BoqWithIncludes = Pick<BOQ, "id" | "number" | "title" | "clientName" | "siteAddress" | "city" | "deadline" | "status"> & {
  assignedTo: Pick<User, "name"> | null;
  vendorInquiries: (Pick<VendorInquiry, "id" | "vendorName"> & { quotes: Pick<VendorQuote, "amount" | "receivedAt">[] })[];
};

export type BoqView = {
  id: string;
  number: string;
  title: string;
  clientName: string;
  siteAddress: string;
  city: string | null;
  deadline: string | null;
  status: string;
  assignedToName: string | null;
  vendorsCount: number;
  quotesCount: number;
  l1VendorName: string | null;
  overdue: boolean;
};

export function toBoqView(boq: BoqWithIncludes): BoqView {
  const latestByInquiry = new Map<string, { amount: number; receivedAt: Date; vendorName: string }>();
  for (const inquiry of boq.vendorInquiries) {
    for (const quote of inquiry.quotes) {
      const latest = latestByInquiry.get(inquiry.id);
      if (!latest || quote.receivedAt > latest.receivedAt) {
        latestByInquiry.set(inquiry.id, { ...quote, vendorName: inquiry.vendorName });
      }
    }
  }
  const l1 = [...latestByInquiry.values()].sort((a, b) => a.amount - b.amount)[0];
  return {
    id: boq.id,
    number: boq.number,
    title: boq.title,
    clientName: boq.clientName,
    siteAddress: boq.siteAddress,
    city: boq.city,
    deadline: boq.deadline ? boq.deadline.toISOString() : null,
    status: boq.status,
    assignedToName: boq.assignedTo?.name ?? null,
    vendorsCount: boq.vendorInquiries.length,
    quotesCount: boq.vendorInquiries.filter((v) => v.quotes.length > 0).length,
    l1VendorName: l1?.vendorName ?? null,
    overdue: Boolean(boq.deadline && boq.deadline.getTime() < Date.now() && boq.status !== "COMPLETED"),
  };
}
