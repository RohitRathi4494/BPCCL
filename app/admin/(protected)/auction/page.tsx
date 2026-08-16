import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { AuctioneerConsole } from "@/components/auction/auctioneer-console";

export const metadata: Metadata = {
  title: "Auctioneer Console",
  robots: { index: false, follow: false },
};

export default async function AuctionAdminPage() {
  const supabase = await createClient();
  const initial = await fetchAuctionSnapshot(supabase);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/auction/display"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
        >
          Open big screen <ExternalLink className="size-3.5" />
        </Link>
      </div>
      <AuctioneerConsole initial={initial} />
    </div>
  );
}
