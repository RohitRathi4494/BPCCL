"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Rows-per-page selector for the registrations list. Updates the `size` URL
 * param (resetting to page 1), preserving the status tab, search, and filters.
 */
export function PageSizeSelect({ options }: { options: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("size") ?? String(options[0]);

  const onChange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== String(options[0])) next.set("size", value);
    else next.delete("size");
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <span className="uppercase tracking-wider">Per page</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Rows per page"
        className="rounded-sm border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
