import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, User } from "lucide-react";
import { getPlayer } from "@/lib/queries/players";
import { computeCategory } from "@/lib/categorization";
import { STAT_FIELDS } from "@/lib/registration";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { RegistrationStatus as StatusBadge } from "@/components/admin/registration-status";
import { ReviewForm } from "@/components/admin/review-form";
import { AadhaarVerification } from "@/components/admin/aadhaar-verification";
import { EditStatsForm } from "@/components/admin/edit-stats-form";
import { EditAgeForm } from "@/components/admin/edit-age-form";
import { ResetStatusButton } from "@/components/admin/reset-status-button";
import { DeletePlayerButton } from "@/components/admin/delete-player-button";

export const metadata: Metadata = {
  title: "Review Registration",
  robots: { index: false, follow: false },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export default async function ReviewPlayerPage({
  params,
  searchParams,
}: PageProps<"/admin/registrations/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const [player, settings] = await Promise.all([
    getPlayer(id),
    getLeagueSettings(),
  ]);
  if (!player) notFound();

  // Preserve the list's filters/search/page so "Back" returns to the same view.
  const backQuery = new URLSearchParams();
  for (const key of ["status", "q", "category", "role", "stats", "aadhaar", "age", "sort", "size", "page"]) {
    const v = sp[key];
    if (typeof v === "string" && v) backQuery.set(key, v);
  }
  const backHref = `/admin/registrations${backQuery.toString() ? `?${backQuery}` : ""}`;

  const categories = settingsCategories(settings);
  const suggestedCategory = computeCategory(player);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 font-mono text-xs tracking-wider text-muted-foreground uppercase transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Back to registrations
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-start gap-5 rounded-lg border border-border bg-card p-6">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background">
              {player.photo_url ? (
                <Image
                  src={player.photo_url}
                  alt={player.full_name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <User className="size-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
                {player.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={player.status} />
                {player.assigned_category && (
                  <span className="rounded-sm border border-primary/40 px-2 py-0.5 font-mono text-[10px] tracking-wider text-primary uppercase">
                    {player.assigned_category}
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Registered {fmtDate(player.submitted_at)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail label="Contact No." value={player.phone} />
              <Detail label="Email" value={player.email} />
              <Detail label="Company" value={player.company} />
              <Detail label="Work Email" value={player.work_email} />
              <Detail label="Date of Birth" value={fmtDate(player.dob)} />
              <EditAgeForm playerId={player.id} age={player.age} />
              <Detail label="T-Shirt Size" value={player.tshirt_size} />
              <Detail label="Lower Size" value={player.lower_size} />
              <Detail label="Jersey Number" value={player.jersey_number} />
              <Detail label="Jersey Name" value={player.jersey_name} />
              <Detail
                label="CricHeroes"
                value={
                  player.cricheroes_url ? (
                    <a
                      href={player.cricheroes_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open profile <ExternalLink className="size-3.5" />
                    </a>
                  ) : null
                }
              />
              <Detail
                label="LinkedIn"
                value={
                  player.linkedin_url ? (
                    <a
                      href={player.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open profile <ExternalLink className="size-3.5" />
                    </a>
                  ) : null
                }
              />
            </div>

            <hr className="crease-rule my-6 w-full" />

            {/* Aadhaar identity verification — the image is never stored. */}
            <AadhaarVerification
              playerId={player.id}
              verified={player.aadhaar_verified}
              last4={player.aadhaar_last4}
            />

            <hr className="crease-rule my-6 w-full" />

            {/* Playing role(s) */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                Playing Role
              </span>
              {player.roles && player.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {player.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-foreground">—</span>
              )}
            </div>

            {/* Self-reported career stats — editable (many players entered "NA"). */}
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  Career Stats
                </span>
                <span className="text-xs text-muted-foreground">
                  Correct any &quot;NA&quot; or wrong values, then save.
                </span>
              </div>
              <EditStatsForm
                playerId={player.id}
                stats={Object.fromEntries(
                  STAT_FIELDS.map((f) => [f.key, player[f.key]]),
                )}
              />
            </div>

            <hr className="crease-rule my-6 w-full" />

            <Detail
              label="Registration Fee"
              value={
                player.registration_fee_agreed
                  ? "Agreed (payable if selected)"
                  : "Not agreed"
              }
            />

            {player.status === "rejected" && player.rejection_reason && (
              <div className="mt-5 rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 p-4">
                <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--closed)] uppercase">
                  Rejection reason (emailed to player)
                </span>
                <p className="mt-1 text-sm text-foreground">
                  {player.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: review action + danger zone stick together as one column */}
        <div className="sticky top-24 flex flex-col gap-4 self-start">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground uppercase">
              Review
            </h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Open the CricHeroes profile, then set a category and decide.
            </p>
            <ReviewForm
              playerId={player.id}
              currentCategory={player.assigned_category}
              suggestedCategory={suggestedCategory}
              categories={categories}
            />
            {player.reviewed_at && (
              <p className="mt-4 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Last reviewed {fmtDate(player.reviewed_at)}
              </p>
            )}

            {player.status !== "pending" && (
              <div className="mt-5 border-t border-border pt-5">
                <p className="mb-3 text-xs text-muted-foreground">
                  Approved or rejected by mistake? Reset this player to pending
                  (neither approved nor rejected).
                </p>
                <ResetStatusButton playerId={player.id} />
              </div>
            )}
          </div>

          {/* Danger zone — permanently remove this registration. */}
          <div className="rounded-lg border border-[var(--closed)]/30 bg-[var(--closed)]/5 p-6">
            <h2 className="font-heading text-sm font-bold tracking-wide text-[var(--closed)] uppercase">
              Delete Registration
            </h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Permanently removes this player from the pool. This can&apos;t be
              undone.
            </p>
            <DeletePlayerButton
              playerId={player.id}
              playerName={player.full_name}
              label="Delete Registration"
              redirectTo="/admin/registrations"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
