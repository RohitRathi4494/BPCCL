import type { Metadata } from "next";
import Image from "next/image";
import { ClipboardList, Gavel, Search } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { RegistrationForm } from "@/components/site/registration-form";
import { getLeagueSettings } from "@/lib/queries/settings";
import { MIN_AGE, DEFAULT_REGISTRATION_FEE } from "@/lib/registration";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Player Registration",
  description: `Register to play in ${site.name} ${site.season} at ${site.venue.full}. Open to players aged ${MIN_AGE}+.`,
};

const steps = [
  { icon: ClipboardList, title: "Register", body: "Fill this form and share your CricHeroes profile." },
  { icon: Search, title: "Review", body: "Reviewers assess your profile ahead of the auction." },
  { icon: Gavel, title: "Auction", body: "Franchises bid to draft you into a squad." },
];

export default async function RegisterPage() {
  const settings = await getLeagueSettings();
  const fee = settings?.registration_fee ?? DEFAULT_REGISTRATION_FEE;
  const feeText = new Intl.NumberFormat("en-IN").format(fee);

  return (
    <>
      {/* Hero */}
      <section className="lamp-glow">
        <div className="mx-auto max-w-4xl px-5 pt-12 pb-8 sm:pt-16">
          <Image
            src="/uscl-logo.png"
            alt="USCL — Urban Sports Champions Den, Season 2"
            width={480}
            height={600}
            priority
            className="mb-8 h-44 w-auto drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] sm:h-56"
          />
          <span className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
            Player Registration · {site.season}
          </span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-6xl">
            Enter the pool
          </h1>
          <p className="mt-5 text-lg text-foreground/85">
            Register to be part of{" "}
            <span className="font-bold text-foreground">
              {site.name} {site.season}
            </span>{" "}
            at{" "}
            <span className="font-bold text-foreground">{site.venue.full}</span>.
            No account needed — just fill the form below. Open to players aged{" "}
            <span className="text-primary">{MIN_AGE} and above</span>.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <s.icon className="size-4 text-primary" />
                  <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                    Step 0{i + 1}
                  </span>
                </div>
                <p className="font-heading text-lg font-bold tracking-tight text-foreground uppercase">
                  {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <SectionHeading kicker="Your Details" title="Registration Form" />
          <div className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
            <RegistrationForm registrationFee={fee} />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            A mandatory registration fee of ₹{feeText} applies only if you are
            selected during the auction. Registering does not guarantee selection.
          </p>
        </div>
      </section>
    </>
  );
}
