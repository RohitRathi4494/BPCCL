"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> throughout: every image is sized in container-query units (cqh/cqw)
// from the CSS module, which next/image's fill/intrinsic sizing can't express
// cleanly. These are a fixed set of small, local assets.

import { useEffect, useMemo, useState } from "react";
import { useAuction } from "@/lib/auction/use-auction";
import {
  formatMoney,
  type AuctionSnapshot,
  type FranchiseView,
} from "@/lib/auction/snapshot";
import { FRANCHISE_META } from "@/lib/franchises";
import styles from "./auction-ticker.module.css";

/** Franchise crest artwork path for a short code (e.g. "HB" → /franchises/hb.png). */
function crestFor(code: string | null): string | null {
  if (!code) return null;
  return FRANCHISE_META[code.toUpperCase()]?.logo ?? null;
}

/**
 * A gold coin glyph drawn as inline SVG (not the 🪙 emoji) so it renders
 * reliably inside OBS/vMix browser sources, which often lack colour-emoji fonts.
 * Size is controlled by the surrounding font-size (width/height in em).
 */
function Coin({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.coin}${className ? " " + className : ""}`}
      viewBox="0 0 32 32"
      aria-hidden
      focusable="false"
    >
      <circle cx="16" cy="16" r="15" fill="#f4b400" stroke="#b9780a" strokeWidth="2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#ffe08a" strokeWidth="2" />
    </svg>
  );
}

// How many team rows are visible at once, and how long each page stays up.
const ROWS_VISIBLE = 4;
const ROTATE_MS = 4500;

/**
 * Transparent lower-third overlay for the YouTube stream (OBS browser source).
 * Mirrors the broadcast reference: a CURRENT BID box, the on-block player card,
 * and a live team board (REMAINING + MAX BID) that auto-rotates through all 14
 * franchises. Everything updates live via `useAuction`; the current highest
 * bidder is pinned to the top of the board and its MAX BID shows the live bid.
 */
export function AuctionTicker({ initial }: { initial: AuctionSnapshot }) {
  const { data } = useAuction(initial);
  const { currentPlayer, currentBid, result, franchises, settings } = data;

  const category = currentPlayer?.assigned_category ?? null;
  const baseValue =
    (category && settings.basePrice[category]) || settings.basePrice["Legend"] || 0;

  // The leading franchise (highest live bid) — pinned atop the board.
  const leaderId = currentBid.franchise_id;

  // Rotate the non-leader franchises through the remaining visible slots.
  const others = useMemo(
    () => franchises.filter((f) => f.id !== leaderId),
    [franchises, leaderId],
  );
  const leader = useMemo(
    () => franchises.find((f) => f.id === leaderId) ?? null,
    [franchises, leaderId],
  );

  const otherSlots = leader ? ROWS_VISIBLE - 1 : ROWS_VISIBLE;
  const pageCount = Math.max(1, Math.ceil(others.length / Math.max(1, otherSlots)));

  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), ROTATE_MS);
    return () => clearInterval(t);
  }, [pageCount]);

  // Keep the page index valid when the franchise count / leader changes.
  const safePage = page % pageCount;
  const start = safePage * otherSlots;
  const visibleOthers = others.slice(start, start + otherSlots);
  const rows: FranchiseView[] = leader ? [leader, ...visibleOthers] : visibleOthers;

  // ---- Current bid box content (live bid / sold / unsold / opening base) ----
  let bidBoxClass = styles.bidBox;
  let bidLabel = "Current Bid";
  let bidAmount: number | null = currentBid.amount ?? (currentPlayer ? baseValue : null);
  let bidTeam: string | null = currentBid.franchise_name;

  if (result.status === "sold") {
    bidBoxClass = `${styles.bidBox} ${styles.bidBoxSold}`;
    bidLabel = result.via_rtm ? "Sold · RTM" : "Sold";
    bidAmount = result.amount;
    bidTeam = result.franchise_name;
  } else if (result.status === "unsold") {
    bidBoxClass = `${styles.bidBox} ${styles.bidBoxUnsold}`;
    bidLabel = "Unsold";
    bidAmount = null;
    bidTeam = null;
  }

  const roles = (currentPlayer?.roles ?? []).slice(0, 3);
  const photo = currentPlayer?.photo_url ?? null;
  const showPlayer = Boolean(currentPlayer) || result.status != null;

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <div className={styles.bar}>
          {showPlayer ? (
            <>
              {/* ---- Current bid ---- */}
              <div className={bidBoxClass}>
                <span className={styles.bidLabel}>{bidLabel}</span>
                <span className={styles.bidValue}>
                  {bidAmount != null ? (
                    <>
                      <Coin className={styles.bidCoin} />
                      {formatMoney(bidAmount)}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                {bidTeam && <span className={styles.bidTeam}>{bidTeam}</span>}
              </div>

              {/* ---- Player ---- */}
              <div className={styles.playerWrap}>
                <div className={styles.playerPhoto}>
                  {photo ? (
                    <img src={photo} alt={currentPlayer?.full_name ?? ""} />
                  ) : (
                    <span className={styles.playerPhotoFallback}>USCL</span>
                  )}
                </div>
                <div className={styles.playerPanel}>
                  <span className={styles.playerName}>
                    {currentPlayer?.full_name ?? "—"}
                  </span>
                  <div className={styles.playerMeta}>
                    <span className={styles.baseChip}>
                      Base Value <Coin />
                      <b>{formatMoney(baseValue)}</b>
                    </span>
                    {category && (
                      <span className={`${styles.roleChip} ${styles.catChip}`}>
                        {category}
                      </span>
                    )}
                    {roles.map((r) => (
                      <span key={r} className={styles.roleChip}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.idle}>
              <img className={styles.idleLogo} src="/uscl-logo.png" alt="USCL" />
              <span className={styles.idleText}>USCL Season 2 · Live Auction</span>
              <span className={styles.idleDot}>
                <i />
                Live
              </span>
            </div>
          )}

          {/* ---- Team board ---- */}
          <div className={styles.teamBox}>
            <div className={styles.teamHead}>
              <span>Team</span>
              <span>Remaining</span>
              <span>Max Bid</span>
            </div>
            <div className={styles.teamRows}>
              {rows.map((f) => {
                const isLeader = f.id === leaderId;
                const crest = crestFor(f.short_code);
                return (
                  <div
                    key={f.id}
                    className={`${styles.teamRow} ${isLeader ? styles.teamRowLead : ""}`}
                  >
                    <span className={styles.teamName}>
                      {crest && (
                        <img className={styles.teamCrest} src={crest} alt="" aria-hidden />
                      )}
                      {f.name}
                    </span>
                    <span className={styles.teamRemaining}>
                      <Coin />
                      {formatMoney(f.purse_remaining)}
                    </span>
                    <span
                      className={`${styles.teamMax} ${isLeader && currentBid.amount != null ? "" : styles.teamMaxEmpty}`}
                    >
                      {isLeader && currentBid.amount != null ? (
                        <>
                          <Coin />
                          {formatMoney(currentBid.amount)}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
