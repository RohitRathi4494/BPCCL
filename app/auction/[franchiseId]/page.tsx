import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { FranchiseConsole } from "@/components/auction/franchise-console";

export const metadata: Metadata = {
  title: "Bidding Console",
  robots: { index: false, follow: false },
};

export default async function FranchiseAuctionPage({
  params,
}: PageProps<"/auction/[franchiseId]">) {
  const { franchiseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?error=forbidden");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, franchise_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/admin/login?error=forbidden");

  const isOwner =
    profile.role === "franchise_owner" && profile.franchise_id === franchiseId;
  const isStaff = profile.role === "admin" || profile.role === "auctioneer";
  if (!isOwner && !isStaff) redirect("/admin/login?error=forbidden");

  const initial = await fetchAuctionSnapshot(supabase);
  if (!initial.franchises.some((f) => f.id === franchiseId)) notFound();

  return (
    <FranchiseConsole initial={initial} franchiseId={franchiseId} canBid={isOwner} />
  );
}
