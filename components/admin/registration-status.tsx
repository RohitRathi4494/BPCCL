import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "border-primary/40 text-primary bg-primary/10",
  },
  approved: {
    label: "Approved",
    className: "border-[#31d678]/40 text-[#31d678] bg-[#31d678]/10",
  },
  rejected: {
    label: "Rejected",
    className: "border-[var(--closed)]/40 text-[var(--closed)] bg-[var(--closed)]/10",
  },
};

export function RegistrationStatus({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = MAP[status] ?? MAP.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
