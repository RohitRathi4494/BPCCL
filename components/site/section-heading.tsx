import { cn } from "@/lib/utils";

/**
 * Section heading with a mono "kicker" label above a condensed display title,
 * underscored by the chalk crease-rule motif.
 */
export function SectionHeading({
  kicker,
  title,
  className,
  align = "left",
}: {
  kicker?: string;
  title: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {kicker && (
        <span className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
          {kicker}
        </span>
      )}
      <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase sm:text-4xl">
        {title}
      </h2>
      <hr className={cn("crease-rule w-24", align === "center" && "mx-auto")} />
    </div>
  );
}
