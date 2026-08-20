import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FranchiseManager } from "@/components/admin/franchise-manager";

export const metadata: Metadata = {
  title: "Franchises",
  robots: { index: false, follow: false },
};

export type FranchiseRow = {
  id: string;
  name: string;
  short_code: string | null;
  owner_name: string | null;
  purse_total: number;
  purse_remaining: number;
  ownerEmail: string | null;
  hasOwner: boolean;
};

export default async function AdminFranchisesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: franchises } = await supabase
    .from("franchises")
    .select("id, name, short_code, owner_name, purse_total, purse_remaining")
    .order("created_at", { ascending: true });

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, franchise_id")
    .eq("role", "franchise_owner");

  const ownerUserByFranchise = new Map<string, string>();
  for (const o of owners ?? []) {
    if (o.franchise_id) ownerUserByFranchise.set(o.franchise_id, o.id);
  }

  // Try to resolve owner login emails (needs the service-role key).
  const emailByUser = new Map<string, string>();
  let serviceKeyMissing = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) {
        if (u.email) emailByUser.set(u.id, u.email);
      }
    } catch (e) {
      console.error("listUsers:", e);
    }
  } else {
    serviceKeyMissing = true;
  }

  const rows: FranchiseRow[] = (franchises ?? []).map((f) => {
    const ownerUserId = ownerUserByFranchise.get(f.id);
    return {
      ...f,
      hasOwner: !!ownerUserId,
      ownerEmail: ownerUserId ? emailByUser.get(ownerUserId) ?? null : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
          Franchises
        </h1>
        <p className="text-sm text-muted-foreground">
          Name each franchise, set its owner, and create the login they&apos;ll
          use for the franchise dashboard.
        </p>
      </div>

      {serviceKeyMissing && (
        <p className="rounded-sm border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
          To create owner logins, add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          to your environment (Supabase → Project Settings → API → service_role
          key), then restart. Franchise names/owners can still be edited without
          it.
        </p>
      )}

      <FranchiseManager rows={rows} />
    </div>
  );
}
