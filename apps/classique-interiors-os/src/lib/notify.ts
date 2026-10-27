import { formatDate, formatINR } from "@/lib/format";
import type { BOQ, User } from "@prisma/client";

export type BoqWithRefs = BOQ & { assignedTo: User | null };

export function assignmentMessage(
  boq: BoqWithRefs,
  visitUrl: string,
  managerName: string,
): string {
  const lines = [
    `Hi ${boq.assignedTo?.name ?? "there"},`,
    "",
    `A site visit has been assigned to you by ${managerName} (Classique Interiors).`,
    "",
    `BOQ: ${boq.number} — ${boq.title}`,
    `Client: ${boq.clientName}`,
    `Site address: ${boq.siteAddress}${boq.city ? `, ${boq.city}` : ""}`,
  ];
  if (boq.clientContactName) {
    lines.push(`Contact person: ${boq.clientContactName}${boq.clientContactPhone ? ` (${boq.clientContactPhone})` : ""}`);
  }
  if (boq.deadline) lines.push(`Deadline: ${formatDate(boq.deadline)}`);
  if (boq.siteDetails) lines.push(`Site details: ${boq.siteDetails}`);
  if (boq.notes) lines.push(`Notes: ${boq.notes}`);
  lines.push(
    "",
    "Please visit the site and upload your photos, files and notes here:",
    visitUrl,
    "",
    "— Sent from Classique Interiors OS",
  );
  return lines.join("\n");
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.length === 10 ? "91" + digits : digits;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`;
}

export function mailLink(email: string | null | undefined, subject: string, body: string): string | null {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function assignmentSubject(boq: BoqWithRefs): string {
  return `Site visit assigned: ${boq.number} — ${boq.title}`;
}

export function quoteSummaryLine(vendorName: string, amount: number, isL1: boolean): string {
  return `${vendorName}: ${formatINR(amount)}${isL1 ? " (L1)" : ""}`;
}
