"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/site/primitives";

export type AccordionItem = {
  id: string;
  title: string;
  /** Small superscript number/step shown after the title (e.g. "01"). */
  tag?: string;
  chips?: string[];
  body?: string;
};

/**
 * Accessible single-open accordion with big editorial titles. Expands to show
 * optional chips + one line of copy. Height animates via a grid-rows trick (no
 * JS measuring); respects reduced motion through the CSS transition only.
 *
 * `tone="dark"` (default) for navy sections, `tone="light"` for white/cream.
 */
export function Accordion({
  items,
  tone = "dark",
  defaultOpen = 0,
  className,
}: {
  items: AccordionItem[];
  tone?: "dark" | "light";
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(
    defaultOpen != null ? (items[defaultOpen]?.id ?? null) : null,
  );
  const baseId = useId();
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "divide-y",
        dark ? "divide-white/12" : "divide-navy-900/12",
        className,
      )}
    >
      {items.map((it) => {
        const isOpen = open === it.id;
        const btnId = `${baseId}-${it.id}-btn`;
        const regionId = `${baseId}-${it.id}-region`;
        return (
          <div key={it.id}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className={cn(
                  "group flex w-full items-center gap-4 py-5 text-left transition-colors",
                  dark ? "text-white" : "text-navy-900",
                )}
              >
                <span
                  className={cn(
                    "editorial-heading flex-1 text-3xl sm:text-4xl",
                    isOpen
                      ? dark
                        ? "text-white"
                        : "text-navy-900"
                      : dark
                        ? "text-white/70 group-hover:text-white"
                        : "text-navy-900/60 group-hover:text-navy-900",
                  )}
                >
                  {it.title}
                  {it.tag && (
                    <sup className="ml-2 align-super font-sans text-xs font-semibold text-gold-600">
                      {it.tag}
                    </sup>
                  )}
                </span>
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border transition-transform",
                    dark ? "border-white/25" : "border-navy-900/20",
                    isOpen && "rotate-45",
                  )}
                >
                  <Plus className={cn("size-4", dark ? "text-white" : "text-navy-900")} />
                </span>
              </button>
            </h3>
            <div
              id={regionId}
              role="region"
              aria-labelledby={btnId}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-3 pb-6">
                  {it.chips && it.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {it.chips.map((c) => (
                        <Chip
                          key={c}
                          className={
                            dark
                              ? "border-white/20 text-white/90"
                              : "border-navy-900/20 text-navy-900"
                          }
                        >
                          {c}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {it.body && (
                    <p
                      className={cn(
                        "max-w-xl text-sm leading-relaxed",
                        dark ? "text-white/70" : "text-muted-ink",
                      )}
                    >
                      {it.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
