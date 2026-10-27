import { BOQ, User, VendorInquiry, VendorQuote } from "@prisma/client";
import { rankVendors, type InquiryWithQuotes } from "@/lib/l1";

export type BoqWithIncludes = BOQ & {
  assignedTo: User | null;
  createdBy: User;
  vendorInquiries: (VendorInquiry & { quotes: VendorQuote[] })[];
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
  const ranked = rankVendors(boq.vendorInquiries as InquiryWithQuotes[]);
  const l1 = ranked.find((r) => r.isL1);
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
    l1VendorName: l1?.inquiry.vendorName ?? null,
    overdue: Boolean(boq.deadline && boq.deadline.getTime() < Date.now() && boq.status !== "COMPLETED"),
  };
}
