import { cx } from "@/lib/utils";

/** Server-safe admin UI primitives shared across console pages. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="card h-full p-5 transition hover:border-brand-200">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
  if (href)
    return (
      <a href={href} className="block h-full">
        {body}
      </a>
    );
  return body;
}

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cx("badge", className)}>{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-medium text-ink-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

export const th =
  "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400";
export const td = "px-4 py-3 text-sm text-ink-700 align-middle";
export const tableWrap = "card overflow-x-auto";
export const table = "w-full min-w-[720px] divide-y divide-ink-100";
export const thead = "bg-ink-50/70";
