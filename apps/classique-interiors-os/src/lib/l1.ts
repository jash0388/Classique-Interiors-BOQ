import type { VendorInquiry, VendorQuote } from "@prisma/client";

export type InquiryWithQuotes = VendorInquiry & { quotes: VendorQuote[] };

export function latestQuote(inq: InquiryWithQuotes): VendorQuote | null {
  if (inq.quotes.length === 0) return null;
  return inq.quotes.reduce((a, b) => (a.receivedAt >= b.receivedAt ? a : b));
}

export type RankedVendor = {
  inquiry: VendorInquiry;
  quote: VendorQuote;
  rank: number;
  isL1: boolean;
};

/** Ranks vendors by their latest quote amount (ascending); lowest is L1. */
export function rankVendors(inquiries: InquiryWithQuotes[]): RankedVendor[] {
  const ranked = inquiries
    .map((inq) => ({ inq, quote: latestQuote(inq) }))
    .filter((x): x is { inq: InquiryWithQuotes; quote: VendorQuote } => x.quote !== null)
    .sort((a, b) => a.quote.amount - b.quote.amount);

  const out: RankedVendor[] = [];
  let rank = 0;
  let prevAmount: number | null = null;
  for (const x of ranked) {
    if (prevAmount === null || x.quote.amount > prevAmount) {
      rank += 1;
      prevAmount = x.quote.amount;
    }
    out.push({ inquiry: x.inq, quote: x.quote, rank, isL1: rank === 1 });
  }
  return out;
}
