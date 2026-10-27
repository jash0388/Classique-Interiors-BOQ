export const btn = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50",
  wa: "inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50",
  sm: "inline-flex items-center justify-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50",
};

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
          <div>
            {title ? <h2 className="text-sm font-semibold text-stone-900">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-stone-400">{children}</p>;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{k}</dt>
      <dd className="text-sm font-medium text-stone-900">{v || "—"}</dd>
    </div>
  );
}
