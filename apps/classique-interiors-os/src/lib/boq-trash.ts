export const BOQ_TRASH_RETENTION_DAYS = 15;
export const BOQ_TRASH_RETENTION_MS = BOQ_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function trashExpiry(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + BOQ_TRASH_RETENTION_MS);
}

export function trashCutoff(now = new Date()): Date {
  return new Date(now.getTime() - BOQ_TRASH_RETENTION_MS);
}
