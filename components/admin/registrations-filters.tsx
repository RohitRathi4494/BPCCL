"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AGE_BUCKETS } from "@/lib/registration";

const selectClass =
  "rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

/**
 * Category + role dropdown filters for the registrations list. Each updates its
 * URL param (resetting to page 1) while preserving the status tab + search, so
 * the server component re-queries.
 */
export function RegistrationsFilters({
  categories,
  roles,
}: {
  categories: string[];
  roles: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter by category"
        value={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className={selectClass}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by role"
        value={params.get("role") ?? ""}
        onChange={(e) => setParam("role", e.target.value)}
        className={selectClass}
      >
        <option value="">All roles</option>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by stats"
        value={params.get("stats") ?? ""}
        onChange={(e) => setParam("stats", e.target.value)}
        className={selectClass}
      >
        <option value="">All stats</option>
        <option value="na">Has NA stats</option>
        <option value="complete">All stats filled</option>
      </select>

      <select
        aria-label="Filter by Aadhaar"
        value={params.get("aadhaar") ?? ""}
        onChange={(e) => setParam("aadhaar", e.target.value)}
        className={selectClass}
      >
        <option value="">Aadhaar: any</option>
        <option value="missing">Aadhaar missing</option>
        <option value="uploaded">Aadhaar uploaded</option>
      </select>

      <select
        aria-label="Filter by age"
        value={params.get("age") ?? ""}
        onChange={(e) => setParam("age", e.target.value)}
        className={selectClass}
      >
        <option value="">All ages</option>
        {AGE_BUCKETS.map((b) => (
          <option key={b.key} value={b.key}>
            {b.label}
          </option>
        ))}
      </select>
    </div>
  );
}
