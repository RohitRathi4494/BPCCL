import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Datasets the admin can export. `all` bundles every sheet into one workbook. */
export type ExportDataset =
  | "registrations"
  | "franchises"
  | "auction-setup"
  | "auction-results"
  | "all";

type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  /** Excel number format, e.g. "#,##0" for money. */
  numFmt?: string;
};

const MONEY = "₹#,##0";

/** Add a styled worksheet: bold frozen header row, sensible widths. */
function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0E2A2E" },
  };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  rows.forEach((r) => ws.addRow(r));
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  return ws;
}

const asText = (v: unknown) =>
  v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

type AnyClient = SupabaseClient;

async function fetchPlayers(supabase: AnyClient) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type FranchiseRow = {
  id: string;
  name: string;
  short_code: string | null;
  purse_total: number;
  purse_remaining: number;
  topup_1_used: boolean;
  topup_2_used: boolean;
};

async function fetchFranchises(supabase: AnyClient): Promise<FranchiseRow[]> {
  const { data, error } = await supabase
    .from("franchises")
    .select(
      "id, name, short_code, purse_total, purse_remaining, topup_1_used, topup_2_used",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FranchiseRow[];
}

type SquadMemberRow = {
  acquisition_type: string;
  category_at_acquisition: string | null;
  price: number;
  created_at: string;
  franchises: { name: string; short_code: string | null } | null;
  players: {
    full_name: string;
    registration_code: string | null;
    assigned_category: string | null;
    phone: string | null;
  } | null;
};

async function fetchSquadMembers(supabase: AnyClient): Promise<SquadMemberRow[]> {
  const { data, error } = await supabase
    .from("squad_members")
    .select(
      "acquisition_type, category_at_acquisition, price, created_at, " +
        "franchises(name, short_code), " +
        "players(full_name, registration_code, assigned_category, phone)",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SquadMemberRow[];
}

/** Best-effort map of franchise_id -> owner login email (needs service key). */
async function fetchOwnerEmails(
  supabase: AnyClient,
): Promise<Map<string, string>> {
  const byFranchise = new Map<string, string>();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return byFranchise;
  try {
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, franchise_id")
      .eq("role", "franchise_owner");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailByUser = new Map<string, string>();
    for (const u of data?.users ?? []) if (u.email) emailByUser.set(u.id, u.email);
    for (const o of owners ?? []) {
      if (o.franchise_id && emailByUser.has(o.id)) {
        byFranchise.set(o.franchise_id, emailByUser.get(o.id)!);
      }
    }
  } catch (e) {
    console.error("fetchOwnerEmails:", e);
  }
  return byFranchise;
}

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

async function addRegistrationsSheet(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const players = await fetchPlayers(supabase);
  const rows = players.map((p) => ({
    registration_code: asText(p.registration_code),
    full_name: asText(p.full_name),
    status: asText(p.status),
    assigned_category: asText(p.assigned_category),
    preferred_category: asText(p.preferred_category),
    age: p.age ?? "",
    dob: asText(p.dob),
    phone: asText(p.phone),
    email: asText(p.email),
    roles: asText(p.roles),
    batting_style: asText(p.batting_style),
    bowling_style: asText(p.bowling_style),
    cricheroes_url: asText(p.cricheroes_url),
    linkedin_url: asText(p.linkedin_url),
    jersey_number: asText(p.jersey_number),
    jersey_name: asText(p.jersey_name),
    tshirt_size: asText(p.tshirt_size),
    lower_size: asText(p.lower_size),
    locality: asText(p.locality),
    fee_agreed: p.registration_fee_agreed ? "Yes" : "No",
    submitted_at: asText(p.submitted_at),
    reviewed_at: asText(p.reviewed_at),
    rejection_reason: asText(p.rejection_reason),
  }));
  addSheet(
    wb,
    "Registrations",
    [
      { header: "Reg ID", key: "registration_code", width: 16 },
      { header: "Full Name", key: "full_name", width: 24 },
      { header: "Status", key: "status", width: 12 },
      { header: "Assigned Category", key: "assigned_category", width: 18 },
      { header: "Preferred Category", key: "preferred_category", width: 18 },
      { header: "Age", key: "age", width: 6 },
      { header: "DOB", key: "dob", width: 14 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Roles", key: "roles", width: 24 },
      { header: "Batting Style", key: "batting_style", width: 16 },
      { header: "Bowling Style", key: "bowling_style", width: 18 },
      { header: "CricHeroes", key: "cricheroes_url", width: 30 },
      { header: "LinkedIn", key: "linkedin_url", width: 30 },
      { header: "Jersey No.", key: "jersey_number", width: 10 },
      { header: "Jersey Name", key: "jersey_name", width: 18 },
      { header: "T-Shirt", key: "tshirt_size", width: 10 },
      { header: "Lower", key: "lower_size", width: 10 },
      { header: "Locality", key: "locality", width: 18 },
      { header: "Fee Agreed", key: "fee_agreed", width: 12 },
      { header: "Submitted At", key: "submitted_at", width: 22 },
      { header: "Reviewed At", key: "reviewed_at", width: 22 },
      { header: "Rejection Reason", key: "rejection_reason", width: 28 },
    ],
    rows,
  );
}

async function addFranchisesSheet(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const [franchises, squad, ownerEmails] = await Promise.all([
    fetchFranchises(supabase),
    fetchSquadMembers(supabase),
    fetchOwnerEmails(supabase),
  ]);

  // Aggregate squad counts per franchise short_code (join gives us the label).
  const counts = new Map<
    string,
    { total: number; owners: number; retentions: number; auction: number }
  >();
  for (const m of squad) {
    const label = m.franchises?.name ?? "—";
    const c =
      counts.get(label) ?? { total: 0, owners: 0, retentions: 0, auction: 0 };
    c.total += 1;
    if (m.acquisition_type === "owner") c.owners += 1;
    else if (m.acquisition_type === "retention") c.retentions += 1;
    else c.auction += 1;
    counts.set(label, c);
  }

  const rows = franchises.map((f) => {
    const c = counts.get(f.name) ?? {
      total: 0,
      owners: 0,
      retentions: 0,
      auction: 0,
    };
    return {
      short_code: asText(f.short_code),
      name: asText(f.name),
      owner_email: ownerEmails.get(f.id) ?? "",
      squad_count: c.total,
      owners: c.owners,
      retentions: c.retentions,
      auction_buys: c.auction,
      purse_total: f.purse_total,
      purse_spent: f.purse_total - f.purse_remaining,
      purse_remaining: f.purse_remaining,
      topup_1_used: f.topup_1_used ? "Yes" : "No",
      topup_2_used: f.topup_2_used ? "Yes" : "No",
    };
  });

  addSheet(
    wb,
    "Franchises",
    [
      { header: "Code", key: "short_code", width: 10 },
      { header: "Franchise", key: "name", width: 26 },
      { header: "Owner Login", key: "owner_email", width: 26 },
      { header: "Squad", key: "squad_count", width: 8 },
      { header: "Owners", key: "owners", width: 9 },
      { header: "Retentions", key: "retentions", width: 11 },
      { header: "Auction Buys", key: "auction_buys", width: 13 },
      { header: "Purse Total", key: "purse_total", width: 14, numFmt: MONEY },
      { header: "Purse Spent", key: "purse_spent", width: 14, numFmt: MONEY },
      {
        header: "Purse Remaining",
        key: "purse_remaining",
        width: 16,
        numFmt: MONEY,
      },
      { header: "Top-up 1", key: "topup_1_used", width: 10 },
      { header: "Top-up 2", key: "topup_2_used", width: 10 },
    ],
    rows,
  );
}

function squadRows(members: SquadMemberRow[]) {
  return members.map((m) => ({
    franchise_code: asText(m.franchises?.short_code),
    franchise: asText(m.franchises?.name),
    player: asText(m.players?.full_name),
    reg_id: asText(m.players?.registration_code),
    category: asText(m.category_at_acquisition ?? m.players?.assigned_category),
    acquisition_type: asText(m.acquisition_type),
    price: m.price,
    phone: asText(m.players?.phone),
    locked_at: asText(m.created_at),
  }));
}

const SQUAD_COLUMNS: ColumnDef[] = [
  { header: "Code", key: "franchise_code", width: 10 },
  { header: "Franchise", key: "franchise", width: 26 },
  { header: "Player", key: "player", width: 24 },
  { header: "Reg ID", key: "reg_id", width: 16 },
  { header: "Category", key: "category", width: 16 },
  { header: "Type", key: "acquisition_type", width: 12 },
  { header: "Price", key: "price", width: 14, numFmt: MONEY },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Locked/Sold At", key: "locked_at", width: 22 },
];

async function addAuctionSetupSheet(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const members = await fetchSquadMembers(supabase);
  const setup = members.filter(
    (m) => m.acquisition_type === "owner" || m.acquisition_type === "retention",
  );
  addSheet(wb, "Auction Setup", SQUAD_COLUMNS, squadRows(setup));
}

async function addAuctionResultsSheet(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const members = await fetchSquadMembers(supabase);
  addSheet(wb, "Auction Results", SQUAD_COLUMNS, squadRows(members));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const LABELS: Record<ExportDataset, string> = {
  registrations: "Registrations",
  franchises: "Franchises",
  "auction-setup": "Auction-Setup",
  "auction-results": "Auction-Results",
  all: "Full-Export",
};

/** Build the requested workbook and return it as an xlsx buffer + filename. */
export async function buildExport(
  supabase: AnyClient,
  dataset: ExportDataset,
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "USCL Season 2 Admin";

  if (dataset === "registrations" || dataset === "all") {
    await addRegistrationsSheet(wb, supabase);
  }
  if (dataset === "franchises" || dataset === "all") {
    await addFranchisesSheet(wb, supabase);
  }
  if (dataset === "auction-setup" || dataset === "all") {
    await addAuctionSetupSheet(wb, supabase);
  }
  if (dataset === "auction-results" || dataset === "all") {
    await addAuctionResultsSheet(wb, supabase);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `USCL2-${LABELS[dataset]}.xlsx`;
  return { buffer, filename };
}
