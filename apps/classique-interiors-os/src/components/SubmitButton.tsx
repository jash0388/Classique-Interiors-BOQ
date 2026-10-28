"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className,
  pendingLabel = "Saving…",
  disabled = false,
}: {
  children: React.ReactNode;
  className: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
