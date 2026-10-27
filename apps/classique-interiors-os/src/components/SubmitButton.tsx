"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  className: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
