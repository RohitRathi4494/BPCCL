import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getRegistrations,
  getRegistrationCounts,
  type RegistrationStatus,
} from "@/lib/queries/players";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { ROLE_GROUPS } from "@/lib/registration";
import { RegistrationsSearch } from "@/components/admin/registrations-search";
import { RegistrationsFilters } from "@/components/admin/registrations-filters";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { AutoAssignButton } from "@/components/admin/auto-assign-button";
import { AadhaarReminderButton } from "@/components/admin/aadhaar-reminder-button";
import { PageSizeSelect } from "@/components/admin/page-size-select";

const PAGE_SIZES = [25, 50, 100];

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
  const category = typeof sp.category === "string" ? sp.category : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const stats = typeof sp.stats === "string" ? sp.stats : "";
  const aadhaar = typeof sp.aadhaar === "string" ? sp.aadhaar : "";
  const age = typeof sp.age === "string" ? sp.age : "";
  const pageSize = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 25;
  const page = Math.max(1, Number(sp.page) || 1);

  const [counts, result, settings] = await Promise.all([
    getRegistrationCounts(),
    getRegistrations({ status, q, category, role, stats, aadhaar, age, page, pageSize }),
    getLeagueSettings(),
  ]);
  const categories = settingsCategories(settings);
  const roleLabels = ROLE_GROUPS.map((g) => g.label);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, q, category, role, stats, aadhaar, age, size: pageSize, page, ...overrides };
    if (merged.status && merged.status !== "all") params.set("status", String(merged.status));
    if (merged.q) params.set("q", String(merged.q));
    if (merged.category) params.set("category", String(merged.category));
    if (merged.role) params.set("role", String(merged.role));
    if (merged.stats) params.set("stats", String(merged.stats));
    if (merged.aadhaar) params.set("aadhaar", String(merged.aadhaar));
    if (merged.age) params.set("age", String(merged.age));
    if (merged.size && Number(merged.size) !== 25) params.set("size", String(merged.size));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
            Registrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Review players, open their profiles, and assign a category before the
            auction.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AadhaarReminderButton />
          <AutoAssignButton />
        </div>
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

      {/* Category + role filters */}
      <div className="flex flex-wrap items-center gap-3">
        <RegistrationsFilters categories={categories} roles={roleLabels} />
        <span className="font-mono text-xs text-muted-foreground">
          {result.total} match{result.total === 1 ? "" : "es"}
        </span>
      </div>

      {/* Table with multi-select + bulk approve */}
      <RegistrationsTable rows={result.rows} />

      {/* Pagination */}
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs text-muted-foreground">
            {rangeStart}–{rangeEnd} of {result.total}
          </p>
          <PageSizeSelect options={PAGE_SIZES} />
        </div>
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
