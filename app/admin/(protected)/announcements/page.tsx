import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getLeagueSettings } from "@/lib/queries/settings";
import { getSquadRecipients } from "@/lib/queries/announcements";
import {
  AnnouncementComposer,
  type ComposerRecipient,
} from "@/components/admin/announcement-composer";

export const metadata: Metadata = {
  title: "Notify Players",
  description:
    "Email selected players their franchise, a congratulations, and the registration-fee reminder.",
  robots: { index: false, follow: false },
};

export default async function AdminAnnouncementsPage() {
  await requireAdmin();

  const [settings, recipients] = await Promise.all([
    getLeagueSettings(),
    getSquadRecipients(),
  ]);

  const fee = settings?.registration_fee ?? 3000;
  const smtpConfigured = Boolean(
    process.env.SMTP_USER && process.env.SMTP_PASSWORD,
  );

  const composerRecipients: ComposerRecipient[] = recipients.map((r) => ({
    player_id: r.player_id,
    name: r.name,
    email: r.email,
    category: r.category,
    price: r.price,
    acquisition_type: r.acquisition_type,
    registration_code: r.registration_code,
    franchise_id: r.franchise_id,
    franchise_name: r.franchise_name,
    franchise_code: r.franchise_code,
  }));

  const withEmail = composerRecipients.filter((r) => r.email).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
          Notify Players
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email selected squad members — their franchise, a congratulations, and
          the ₹{new Intl.NumberFormat("en-IN").format(fee)} registration-fee
          reminder. Write your own subject &amp; message using the placeholders;
          each is filled in per player. {composerRecipients.length} players on
          squads · {withEmail} with an email on file.
        </p>
      </div>

      <AnnouncementComposer
        recipients={composerRecipients}
        fee={fee}
        smtpConfigured={smtpConfigured}
      />
    </div>
  );
}
