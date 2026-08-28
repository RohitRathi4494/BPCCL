import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { AadhaarAttachForm } from "@/components/site/aadhaar-attach-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Add Your Aadhaar Card",
  description: `Already registered for ${site.name} ${site.season}? Add your Aadhaar card to complete your registration.`,
  robots: { index: false, follow: false },
};

export default function AttachAadhaarPage() {
  return (
    <section className="lamp-glow">
      <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
        <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.28em] text-primary uppercase">
          <ShieldCheck className="size-4" /> Existing Registrations
        </span>
        <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-5xl">
          Add your Aadhaar card
        </h1>
        <p className="mt-4 text-foreground/85">
          Registered before the Aadhaar card became required? Add it here to
          complete your registration. Verify it&apos;s you with your{" "}
          <span className="font-semibold text-foreground">Registration ID</span>{" "}
          and the phone number you registered with.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
          <SectionHeading kicker="Identity Check" title="Your Details" />
          <div className="mt-6">
            <AadhaarAttachForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your Aadhaar is used only to verify your identity for the league,
          stored securely, and visible only to league admins.
        </p>
      </div>
    </section>
  );
}
