import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Datasets the admin can export. `all` bundles every sheet into one workbook. */
export type ExportDataset =
  | "registrations"
  | "franchises"
  | "auction-setup"
  | "auction-results"
  | "wishlists"
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
  display_as_owner: boolean | null;
  category_at_acquisition: string | null;
  price: number;
  created_at: string;
  franchises: { name: string; short_code: string | null } | null;
  players: {
    full_name: string;
    registration_code: string | null;
    assigned_category: string | null;
    phone: string | null;
    jersey_number: string | null;
    jersey_name: string | null;
    tshirt_size: string | null;
    lower_size: string | null;
  } | null;
};

async function fetchSquadMembers(supabase: AnyClient): Promise<SquadMemberRow[]> {
  const { data, error } = await supabase
    .from("squad_members")
    .select(
      "acquisition_type, display_as_owner, category_at_acquisition, price, created_at, " +
        "franchises(name, short_code), " +
        "players(full_name, registration_code, assigned_category, phone, " +
        "jersey_number, jersey_name, tshirt_size, lower_size)",
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
    // Self-reported career stats (as filled on the registration form).
    matches_played: asText(p.matches_played),
    runs_scored: asText(p.runs_scored),
    batting_average: asText(p.batting_average),
    batting_strike_rate: asText(p.batting_strike_rate),
    wickets_taken: asText(p.wickets_taken),
    economy: asText(p.economy),
    bowling_strike_rate: asText(p.bowling_strike_rate),
    cricheroes_url: asText(p.cricheroes_url),
    linkedin_url: asText(p.linkedin_url),
    jersey_number: asText(p.jersey_number),
    jersey_name: asText(p.jersey_name),
    tshirt_size: asText(p.tshirt_size),
    lower_size: asText(p.lower_size),
    locality: asText(p.locality),
    company: asText(p.company),
    work_email: asText(p.work_email),
    previous_team: asText(p.previous_team),
    achievements: asText(p.achievements),
    medical_injury: asText(p.medical_injury),
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
      { header: "Matches Played", key: "matches_played", width: 14 },
      { header: "Runs Scored", key: "runs_scored", width: 12 },
      { header: "Batting Avg", key: "batting_average", width: 12 },
      { header: "Batting SR", key: "batting_strike_rate", width: 12 },
      { header: "Wickets", key: "wickets_taken", width: 10 },
      { header: "Economy", key: "economy", width: 10 },
      { header: "Bowling SR", key: "bowling_strike_rate", width: 12 },
      { header: "CricHeroes", key: "cricheroes_url", width: 30 },
      { header: "LinkedIn", key: "linkedin_url", width: 30 },
      { header: "Jersey No.", key: "jersey_number", width: 10 },
      { header: "Jersey Name", key: "jersey_name", width: 18 },
      { header: "T-Shirt", key: "tshirt_size", width: 10 },
      { header: "Lower", key: "lower_size", width: 10 },
      { header: "Locality", key: "locality", width: 18 },
      { header: "Company", key: "company", width: 20 },
      { header: "Work Email", key: "work_email", width: 26 },
      { header: "Previous Team", key: "previous_team", width: 20 },
      { header: "Achievements", key: "achievements", width: 30 },
      { header: "Medical/Injury", key: "medical_injury", width: 24 },
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
    if (m.display_as_owner || m.acquisition_type === "owner") c.owners += 1;
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
    category: asText(m.players?.assigned_category ?? m.category_at_acquisition),
    // A member flagged "display as owner" (e.g. an owner locked in the Legend
    // slot) is reported as an owner here too.
    acquisition_type: asText(m.display_as_owner ? "owner" : m.acquisition_type),
    price: m.price,
    phone: asText(m.players?.phone),
    // Jersey/kit details the player entered at registration.
    jersey_number: asText(m.players?.jersey_number),
    jersey_name: asText(m.players?.jersey_name),
    tshirt_size: asText(m.players?.tshirt_size),
    lower_size: asText(m.players?.lower_size),
    locked_at: asText(m.created_at),
  }));
}

/** Jersey/kit columns the player entered at registration (appended to results). */
const JERSEY_COLUMNS: ColumnDef[] = [
  { header: "Jersey No.", key: "jersey_number", width: 10 },
  { header: "Jersey Name", key: "jersey_name", width: 18 },
  { header: "T-Shirt", key: "tshirt_size", width: 10 },
  { header: "Lower", key: "lower_size", width: 10 },
];

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
    (m) =>
      m.acquisition_type === "owner" ||
      m.acquisition_type === "retention" ||
      m.acquisition_type === "legend",
  );
  addSheet(wb, "Auction Setup", SQUAD_COLUMNS, squadRows(setup));
}

async function addAuctionResultsSheet(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const members = await fetchSquadMembers(supabase);
  // Auction Results carries the jersey/kit details (for kit ordering) on top of
  // the shared squad columns; Auction Setup keeps the leaner column set.
  const columns = [...SQUAD_COLUMNS, ...JERSEY_COLUMNS];
  addSheet(wb, "Auction Results", columns, squadRows(members));
}

// ---------------------------------------------------------------------------
// Admin: every franchise's wishlist
// ---------------------------------------------------------------------------

type AdminWishlistRow = {
  target_amount: number | null;
  remarks: string | null;
  created_at: string;
  franchises: { name: string; short_code: string | null } | null;
  players: {
    full_name: string | null;
    registration_code: string | null;
    assigned_category: string | null;
    age: number | null;
    roles: string[] | null;
    phone: string | null;
    matches_played: string | null;
    runs_scored: string | null;
    batting_average: string | null;
    batting_strike_rate: string | null;
    wickets_taken: string | null;
    bowling_strike_rate: string | null;
    economy: string | null;
    cricheroes_url: string | null;
  } | null;
};

/**
 * Every franchise's wishlist rows (admin-only — relies on the "wishlists admin
 * read" RLS policy). Ordered by franchise then most-recent first.
 */
async function fetchAllWishlists(supabase: AnyClient): Promise<AdminWishlistRow[]> {
  const { data, error } = await supabase
    .from("wishlists")
    .select(
      "target_amount, remarks, created_at, " +
        "franchises(name, short_code), " +
        "players(full_name, registration_code, assigned_category, age, roles, phone, " +
        "matches_played, runs_scored, batting_average, batting_strike_rate, " +
        "wickets_taken, bowling_strike_rate, economy, cricheroes_url)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminWishlistRow[];
}

const WISHLIST_COLUMNS: ColumnDef[] = [
  { header: "Code", key: "franchise_code", width: 10 },
  { header: "Franchise", key: "franchise", width: 26 },
  { header: "Player", key: "player", width: 24 },
  { header: "Reg ID", key: "reg_id", width: 16 },
  { header: "Category", key: "category", width: 16 },
  { header: "Age", key: "age", width: 6 },
  { header: "Roles", key: "roles", width: 26 },
  { header: "Target Amount", key: "target_amount", width: 16, numFmt: MONEY },
  { header: "Remarks", key: "remarks", width: 30 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Matches Played", key: "matches_played", width: 14 },
  { header: "Runs Scored", key: "runs_scored", width: 12 },
  { header: "Batting Avg", key: "batting_average", width: 12 },
  { header: "Batting SR", key: "batting_strike_rate", width: 12 },
  { header: "Wickets", key: "wickets_taken", width: 10 },
  { header: "Bowling SR", key: "bowling_strike_rate", width: 12 },
  { header: "Economy", key: "economy", width: 10 },
  { header: "CricHeroes", key: "cricheroes_url", width: 30 },
  { header: "Added At", key: "created_at", width: 22 },
];

function adminWishlistRow(w: AdminWishlistRow) {
  return {
    franchise_code: asText(w.franchises?.short_code),
    franchise: asText(w.franchises?.name),
    player: asText(w.players?.full_name),
    reg_id: asText(w.players?.registration_code),
    category: asText(w.players?.assigned_category),
    age: w.players?.age ?? "",
    roles: asText(w.players?.roles),
    target_amount: w.target_amount ?? "",
    remarks: asText(w.remarks),
    phone: asText(w.players?.phone),
    matches_played: asText(w.players?.matches_played),
    runs_scored: asText(w.players?.runs_scored),
    batting_average: asText(w.players?.batting_average),
    batting_strike_rate: asText(w.players?.batting_strike_rate),
    wickets_taken: asText(w.players?.wickets_taken),
    bowling_strike_rate: asText(w.players?.bowling_strike_rate),
    economy: asText(w.players?.economy),
    cricheroes_url: asText(w.players?.cricheroes_url),
    created_at: asText(w.created_at),
  };
}

/** Make a <=31-char, Excel-safe, unique worksheet name. */
function safeSheetName(label: string, used: Set<string>): string {
  const base =
    label.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

/**
 * Adds a combined "All Wishlists" sheet plus one sheet per franchise (in
 * franchise order), so the admin can see every team's shortlist at a glance or
 * drill into a single team.
 */
async function addWishlistsSheets(wb: ExcelJS.Workbook, supabase: AnyClient) {
  const [wishlists, franchises] = await Promise.all([
    fetchAllWishlists(supabase),
    fetchFranchises(supabase),
  ]);

  // Tally per franchise so the summary + empty-team detection are exact.
  const byFranchise = new Map<string, AdminWishlistRow[]>();
  for (const w of wishlists) {
    const name = w.franchises?.name ?? "—";
    (byFranchise.get(name) ?? byFranchise.set(name, []).get(name)!).push(w);
  }

  // Summary sheet FIRST: every one of the 14 teams with its wishlist count, so
  // it's obvious which teams have shortlisted nobody (count 0) rather than them
  // looking "missing" because they don't appear on the combined sheet.
  addSheet(
    wb,
    "Summary",
    [
      { header: "Code", key: "code", width: 10 },
      { header: "Franchise", key: "franchise", width: 28 },
      { header: "Wishlisted Players", key: "count", width: 18 },
      { header: "Status", key: "status", width: 16 },
    ],
    franchises.map((f) => {
      const n = (byFranchise.get(f.name) ?? []).length;
      return {
        code: asText(f.short_code),
        franchise: asText(f.name),
        count: n,
        status: n === 0 ? "No wishlist yet" : "OK",
      };
    }),
  );

  // Combined sheet: every row, grouped by franchise order for readability.
  const order = new Map(franchises.map((f, i) => [f.name, i]));
  const sorted = [...wishlists].sort((a, b) => {
    const ai = order.get(a.franchises?.name ?? "") ?? 999;
    const bi = order.get(b.franchises?.name ?? "") ?? 999;
    if (ai !== bi) return ai - bi;
    return (a.franchises?.name ?? "").localeCompare(b.franchises?.name ?? "");
  });
  addSheet(wb, "All Wishlists", WISHLIST_COLUMNS, sorted.map(adminWishlistRow));
  const used = new Set<string>(["summary", "all wishlists"]);
  for (const f of franchises) {
    const rows = (byFranchise.get(f.name) ?? []).map(adminWishlistRow);
    const label = f.short_code ? `${f.short_code} — ${f.name}` : f.name;
    // Drop the redundant franchise columns on a single-team sheet.
    const cols = WISHLIST_COLUMNS.filter(
      (c) => c.key !== "franchise_code" && c.key !== "franchise",
    );
    addSheet(wb, safeSheetName(label, used), cols, rows);
  }
}

// ---------------------------------------------------------------------------
// Franchise-owner wishlist export
// ---------------------------------------------------------------------------

/** A wishlist row joined to its pool player, as the franchise dashboard holds it. */
export type WishlistExportEntry = {
  target_amount: number | null;
  remarks: string | null;
  player: {
    full_name: string | null;
    assigned_category: string | null;
    age: number | null;
    roles: string[] | null;
    matches_played: string | null;
    runs_scored: string | null;
    batting_average: string | null;
    batting_strike_rate: string | null;
    wickets_taken: string | null;
    bowling_strike_rate: string | null;
    economy: string | null;
    cricheroes_url: string | null;
  } | null;
};

/** Build a single-sheet workbook of a franchise's own wishlist. */
export async function buildWishlistExport(
  franchiseName: string,
  entries: WishlistExportEntry[],
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "USCL Season 2";

  const rows = entries.map((e) => ({
    player: asText(e.player?.full_name),
    category: asText(e.player?.assigned_category),
    age: e.player?.age ?? "",
    roles: asText(e.player?.roles),
    target_amount: e.target_amount ?? "",
    remarks: asText(e.remarks),
    matches_played: asText(e.player?.matches_played),
    runs_scored: asText(e.player?.runs_scored),
    batting_average: asText(e.player?.batting_average),
    batting_strike_rate: asText(e.player?.batting_strike_rate),
    wickets_taken: asText(e.player?.wickets_taken),
    bowling_strike_rate: asText(e.player?.bowling_strike_rate),
    economy: asText(e.player?.economy),
    cricheroes_url: asText(e.player?.cricheroes_url),
  }));

  addSheet(
    wb,
    "Wishlist",
    [
      { header: "Player", key: "player", width: 24 },
      { header: "Category", key: "category", width: 16 },
      { header: "Age", key: "age", width: 6 },
      { header: "Roles", key: "roles", width: 26 },
      { header: "Target Amount", key: "target_amount", width: 16, numFmt: MONEY },
      { header: "Remarks", key: "remarks", width: 30 },
      { header: "Matches Played", key: "matches_played", width: 14 },
      { header: "Runs Scored", key: "runs_scored", width: 12 },
      { header: "Batting Avg", key: "batting_average", width: 12 },
      { header: "Batting SR", key: "batting_strike_rate", width: 12 },
      { header: "Wickets", key: "wickets_taken", width: 10 },
      { header: "Bowling SR", key: "bowling_strike_rate", width: 12 },
      { header: "Economy", key: "economy", width: 10 },
      { header: "CricHeroes", key: "cricheroes_url", width: 30 },
    ],
    rows,
  );

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // Sanitise the franchise name into a safe filename token.
  const slug =
    franchiseName
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "Franchise";
  return { buffer, filename: `USCL2-Wishlist-${slug}.xlsx` };
}

// ---------------------------------------------------------------------------
// Franchise-owner available-pool export
// ---------------------------------------------------------------------------

/** A player available in the pool, as the franchise dashboard holds it. */
export type PoolExportPlayer = {
  full_name: string | null;
  assigned_category: string | null;
  age: number | null;
  roles: string[] | null;
  matches_played: string | null;
  runs_scored: string | null;
  batting_average: string | null;
  batting_strike_rate: string | null;
  wickets_taken: string | null;
  bowling_strike_rate: string | null;
  economy: string | null;
  cricheroes_url: string | null;
};

/** Build a single-sheet workbook of the available (unsold) player pool. */
export async function buildPoolExport(
  players: PoolExportPlayer[],
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "USCL Season 2";

  const rows = players.map((p) => ({
    player: asText(p.full_name),
    category: asText(p.assigned_category),
    age: p.age ?? "",
    roles: asText(p.roles),
    matches_played: asText(p.matches_played),
    runs_scored: asText(p.runs_scored),
    batting_average: asText(p.batting_average),
    batting_strike_rate: asText(p.batting_strike_rate),
    wickets_taken: asText(p.wickets_taken),
    bowling_strike_rate: asText(p.bowling_strike_rate),
    economy: asText(p.economy),
    cricheroes_url: asText(p.cricheroes_url),
  }));

  addSheet(
    wb,
    "Player Pool",
    [
      { header: "Player", key: "player", width: 24 },
      { header: "Category", key: "category", width: 16 },
      { header: "Age", key: "age", width: 6 },
      { header: "Roles", key: "roles", width: 26 },
      { header: "Matches Played", key: "matches_played", width: 14 },
      { header: "Runs Scored", key: "runs_scored", width: 12 },
      { header: "Batting Avg", key: "batting_average", width: 12 },
      { header: "Batting SR", key: "batting_strike_rate", width: 12 },
      { header: "Wickets", key: "wickets_taken", width: 10 },
      { header: "Bowling SR", key: "bowling_strike_rate", width: 12 },
      { header: "Economy", key: "economy", width: 10 },
      { header: "CricHeroes", key: "cricheroes_url", width: 30 },
    ],
    rows,
  );

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, filename: "USCL2-Player-Pool.xlsx" };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const LABELS: Record<ExportDataset, string> = {
  registrations: "Registrations",
  franchises: "Franchises",
  "auction-setup": "Auction-Setup",
  "auction-results": "Auction-Results",
  wishlists: "Wishlists",
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
  // Wishlists are a standalone export (a combined sheet + one per franchise) and
  // are deliberately NOT folded into "all" to keep the full workbook compact.
  if (dataset === "wishlists") {
    await addWishlistsSheets(wb, supabase);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `USCL2-${LABELS[dataset]}.xlsx`;
  return { buffer, filename };
}
