export const BOQ_STATUSES = [
  "DRAFT",
  "ASSIGNED",
  "SITE_VISIT_DONE",
  "VENDOR_QUOTING",
  "QUOTES_RECEIVED",
  "COMPLETED",
  "ON_HOLD",
] as const;
export type BoqStatus = (typeof BOQ_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Site visit assigned",
  SITE_VISIT_DONE: "Site visit done",
  VENDOR_QUOTING: "Vendor quoting",
  QUOTES_RECEIVED: "Quotes received",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
};

export const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  ASSIGNED: "bg-blue-100 text-blue-800",
  SITE_VISIT_DONE: "bg-amber-100 text-amber-800",
  VENDOR_QUOTING: "bg-violet-100 text-violet-800",
  QUOTES_RECEIVED: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-green-100 text-green-800",
  ON_HOLD: "bg-red-100 text-red-700",
};

export function statusLabel(s: string) {
  return STATUS_LABEL[s] ?? s;
}

export function statusColor(s: string) {
  return STATUS_COLOR[s] ?? "bg-stone-200 text-stone-700";
}

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Procurement manager",
  FIELD: "Site executive",
};
