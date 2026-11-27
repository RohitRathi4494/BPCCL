import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { RegistrationForm } from "@/components/site/registration-form";
import { RegistrationGate } from "@/components/site/registration-gate";
import { CountdownChip } from "@/components/site/countdown-chip";
import { WhatsAppIcon } from "@/components/site/social-icons";
import { getLeagueSettings } from "@/lib/queries/settings";
import { MIN_AGE, DEFAULT_REGISTRATION_FEE, DEFAULT_UPI_ID, DEFAULT_UPI_QR_URL } from "@/lib/registration";
import { site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Registration",
  description: `Register to play in ${site.name} ${site.season}. Open to players aged ${MIN_AGE}+.`,
};

const checklist = [
  "A clear photo of yourself",
  "Masked Aadhaar (last 4 digits visible)",
  "UPI payment screenshot",
  "Your CricHeroes profile link",
];

export default async function RegisterPage() {
  const settings = await getLeagueSettings();
  const fee = settings?.registration_fee ?? DEFAULT_REGISTRATION_FEE;
  const feeText = new Intl.NumberFormat("en-IN").format(fee);
  const registrationOpen = settings?.registration_open !== false;
  const closesAt = settings?.registration_closes_at ?? null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[23rem_1fr]">
      {/* ---- Left brand panel ---- */}
      <aside className="flex flex-col gap-8 bg-navy-950 px-6 py-8 text-white sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-xs font-medium tracking-wide text-white/70 uppercase transition-colors hover:text-gold-400">
          <ArrowUpRight className="size-3.5" /> League site
        </Link>

        <div className="flex items-center gap-3">
          <Image src={leagueConfig.logos.main} alt={`${site.name} crest`} width={72} height={76} className="h-16 w-auto" priority />
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">{site.shortName}<span className="text-gold-400">.</span></p>
            <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">{site.season}</p>
          </div>
        </div>

        <div>
          <h1 className="editorial-heading text-3xl text-white sm:text-4xl">Season 01 Player Registration</h1>
          <p className="mt-3 text-sm text-white/65">
            Corporate professionals, a real player auction, real teams. No account
            needed — register in a few steps.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between rounded-xl border border-white/12 bg-white/5 p-4">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Registration fee</span>
              <p className="font-display text-2xl font-extrabold text-white">₹{feeText}</p>
            </div>
            <span className="text-[11px] text-white/45">payable by UPI</span>
          </div>
          <p className="rounded-xl border border-gold-400/25 bg-gold-400/10 p-4 text-[13px] leading-relaxed text-white/80">
            <span className="font-semibold text-gold-400">Note:</span> If you are picked
            by a franchise in the auction, a further selection fee of{" "}
            <span className="font-semibold text-white">₹3,000</span> is payable.
          </p>
          {registrationOpen && closesAt && (
            <CountdownChip target={closesAt} label="Closes in" className="self-start" />
          )}
        </div>

        <div>
          <span className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Keep these ready</span>
          <ul className="mt-3 flex flex-col gap-2.5">
            {checklist.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-400">
                  <Check className="size-3" />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {leagueConfig.supportWhatsApp && (
          <a href={leagueConfig.supportWhatsApp} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-gold-400 hover:text-gold-400">
            <WhatsAppIcon className="size-4" /> Need help? Chat with us
          </a>
        )}
      </aside>

      {/* ---- Right form area ---- */}
      <main className="bg-cream-100 px-5 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          {registrationOpen ? (
            <RegistrationGate>
              <RegistrationForm registrationFee={fee} upiId={settings?.upi_id ?? DEFAULT_UPI_ID} upiQrUrl={settings?.upi_qr_url ?? DEFAULT_UPI_QR_URL} />
            </RegistrationGate>
          ) : (
            <div className="flex flex-col items-start gap-5 rounded-2xl border border-navy-900/10 bg-white p-8 sm:p-12">
              <h2 className="editorial-heading text-3xl text-navy-900">Registrations are closed</h2>
              <p className="text-muted-ink">
                Registration and the player auction are complete. Head over to the
                franchises to see every team&apos;s line-up for {site.season}.
              </p>
              <Link href="/franchises" className="inline-flex items-center gap-1.5 rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                View Teams <ArrowUpRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
