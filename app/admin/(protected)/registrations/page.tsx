import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  getRegistrations,
  getRegistrationCounts,
  type RegistrationStatus,
} from "@/lib/queries/players";
import { RegistrationsSearch } from "@/components/admin/registrations-search";
import { RegistrationStatus as StatusBadge } from "@/components/admin/registration-status";

export const metadata: Metadata = {
  title: "Registrations",
  robots: { index: false, follow: false },
};

const STATUS_TABS: { key: RegistrationStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function RegistrationsPage({
  searchParams,
}: PageProps<"/admin/registrations">) {
  const sp = await searchParams;
  const status = (
    ["all", "pending", "approved", "rejected"].includes(String(sp.status))
      ? sp.status
      : "all"
  ) as RegistrationStatus;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [counts, result] = await Promise.all([
    getRegistrationCounts(),
    getRegistrations({ status, q, page }),
  ]);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, q, page, ...overrides };
    if (merged.status && merged.status !== "all") params.set("status", String(merged.status));
    if (merged.q) params.set("q", String(merged.q));
    if (merged.page && Number(merged.page) > 1) params.set("page", String(merged.page));
    const s = params.toString();
    return `/admin/registrations${s ? `?${s}` : ""}`;
  };

  const countFor = (key: RegistrationStatus) =>
    key === "all" ? counts.all : counts[key];

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
          Registrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Review players, open their profiles, and assign a grade before the
          auction.
        </p>
      </div>

      {/* Status tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = tab.key === status;
            return (
              <Link
                key={tab.key}
                href={buildHref({ status: tab.key, page: 1 })}
                className={
                  "inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground/80 hover:border-primary/40")
                }
              >
                {tab.label}
                <span className="font-mono text-xs text-muted-foreground">
                  {countFor(tab.key)}
                </span>
              </Link>
            );
          })}
        </div>
        <RegistrationsSearch />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left">
              {["Player", "Contact", "Email", "Age", "Submitted", "Status", "Grade", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                  No registrations match this view.
                </td>
              </tr>
            ) : (
              result.rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/60 last:border-0 hover:bg-card/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{p.full_name}</span>
                    {p.cricheroes_url && (
                      <a
                        href={p.cricheroes_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase hover:text-primary"
                      >
                        CH <ExternalLink className="size-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.age}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {fmtDate(p.submitted_at)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.assigned_category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/registrations/${p.id}`}
                      className="inline-flex items-center rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-muted-foreground">
          {rangeStart}–{rangeEnd} of {result.total}
        </p>
        <div className="flex items-center gap-2">
          <PagerLink
            href={buildHref({ page: result.page - 1 })}
            disabled={result.page <= 1}
            dir="prev"
          />
          <span className="font-mono text-xs text-muted-foreground">
            Page {result.page} / {result.pageCount}
          </span>
          <PagerLink
            href={buildHref({ page: result.page + 1 })}
            disabled={result.page >= result.pageCount}
            dir="next"
          />
        </div>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  dir,
}: {
  href: string;
  disabled: boolean;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  if (disabled) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground/40">
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Icon className="size-4" />
    </Link>
  );
}
