"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> is used throughout: every image is sized by height in container-
// query units (cqh) from the CSS module, which next/image's fill/intrinsic
// sizing can't express cleanly. These are a fixed set of small, local assets.

import { useAuction } from "@/lib/auction/use-auction";
import {
  formatMoney,
  type AuctionSnapshot,
  type SaleResult,
  type CurrentBid,
} from "@/lib/auction/snapshot";
import { FRANCHISE_META } from "@/lib/franchises";
import { deriveStyleFromRoles } from "@/lib/registration";
import { SoldCelebration } from "@/components/auction/sold-celebration";
import { site } from "@/lib/site";
import styles from "./auction-display.module.css";

export type DisplaySponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  tier: string | null;
};

/** Franchise crest artwork path for a short code (e.g. "HB" → /franchises/hb.png). */
function crestFor(code: string | null): string | null {
  if (!code) return null;
  return FRANCHISE_META[code.toUpperCase()]?.logo ?? null;
}

/**
 * Read-only big-screen view for the venue projector. No login. A 16:9 stage
 * scales to fill the screen (container-query units), so it never scrolls:
 * branded top bar (USCL · LIVE AUCTION · title sponsor), a full-width player
 * profile with the portrait photo inside, a right-aligned current-bid strip, a
 * recently-sold feed, the live 14-team purse board, and the associate + media
 * partner strip. Everything updates live via `useAuction`.
 */
export function AuctionDisplay({
  initial,
  sponsors = [],
}: {
  initial: AuctionSnapshot;
  sponsors?: DisplaySponsor[];
}) {
  const { data } = useAuction(initial);
  const { currentPlayer, state, result, currentBid, franchises, recentSales, settings } =
    data;
  const paused = state.status === "paused";
  // Denominator is the squad MAX — the most players a team can buy.
  const squadMax = settings.squadMax;

  const titleSponsor = sponsors.find((s) => s.tier === "Title" && s.logo_url);
  // Bottom strip: just the logos (no tier labels), in display order.
  const STRIP_TIERS = [
    "Associate",
    "Statistics Partner",
    "Healthcare Partner",
    "Media Partner",
  ];
  const stripSponsors = STRIP_TIERS.flatMap((tier) =>
    sponsors.filter((s) => s.tier === tier && s.logo_url),
  );

  // The team to highlight on the purse board: the winner if sold, else the
  // current highest bidder.
  const highlightId = result.franchise_id ?? currentBid.franchise_id;

  // Batting/bowling style + skill: the dedicated columns are empty (the v2 form
  // only collects grouped roles), so derive them from `roles`, preferring the DB
  // columns if a player ever has them set.
  const derived = deriveStyleFromRoles(currentPlayer?.roles);
  const skill = currentPlayer?.role || derived.skill || "—";
  const battingStyle = currentPlayer?.batting_style || derived.batting || "—";
  const bowlingStyle = currentPlayer?.bowling_style || derived.bowling || "—";

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <img className={styles.bgimg} src="/auction-bg.jpg" alt="" aria-hidden />

        <div className={styles.frame}>
          {/* ---- Top bar ---- */}
          <header className={styles.topbar}>
            <div className={styles.brand}>
              <img className={styles.brandLogo} src="/uscl-logo.png" alt="USCL" />
              <div className={styles.brandTxt}>
                <span className={styles.brandName}>{site.shortName}</span>
                <span className={styles.brandSub}>
                  {site.season} · Live Player Auction
                </span>
              </div>
            </div>

            <div className={styles.title}>
              <span className={styles.titleMain}>Live Auction</span>
              <div className={styles.titleMeta}>
                <span className={styles.livedot}>
                  <i />
                  Live
                </span>
                <span className={styles.titleVenue}>
                  {site.venue.name} · {site.venue.area}, {site.venue.city}
                </span>
              </div>
            </div>

            {titleSponsor ? (
              <div className={styles.titlespon}>
                <span className={styles.titlesponLbl}>Title Sponsor</span>
                <img
                  className={styles.titlesponImg}
                  src={titleSponsor.logo_url!}
                  alt={titleSponsor.name}
                />
              </div>
            ) : (
              <div />
            )}
          </header>

          {/* ---- Player profile (full width) or waiting placeholder ---- */}
          {currentPlayer ? (
            <section className={styles.profile}>
              <div className={styles.profilePhoto}>
                {currentPlayer.jersey_number && (
                  <span className={styles.photoJersey}>#{currentPlayer.jersey_number}</span>
                )}
                <span className={styles.photoBlock}>On the block</span>
                {currentPlayer.photo_url ? (
                  <img
                    className={styles.photoImg}
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.full_name}
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 120"
                    preserveAspectRatio="xMidYMax meet"
                    className={styles.silh}
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="uscl-silh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="34" r="20" fill="url(#uscl-silh)" />
                    <path
                      d="M15 120 C15 86 30 66 50 66 C70 66 85 86 85 120 Z"
                      fill="url(#uscl-silh)"
                    />
                  </svg>
                )}
              </div>

              <div className={styles.profileBody}>
                <span className={styles.profileEy}>Player Profile</span>
                <h1 className={styles.profileName}>{currentPlayer.full_name}</h1>

                <div className={styles.chips}>
                  {currentPlayer.assigned_category && (
                    <span className={`${styles.chip} ${styles.chipCat}`}>
                      {currentPlayer.assigned_category}
                    </span>
                  )}
                  {(currentPlayer.roles.length > 0
                    ? currentPlayer.roles
                    : currentPlayer.role
                      ? [currentPlayer.role]
                      : []
                  ).map((r) => (
                    <span key={r} className={styles.chip}>
                      {r}
                    </span>
                  ))}
                </div>

                <div className={styles.attrs}>
                  <div className={styles.attr}>
                    <span>Age</span>
                    <b>{currentPlayer.age ?? "—"}</b>
                  </div>
                  <div className={styles.attr}>
                    <span>Skill</span>
                    <b>{skill}</b>
                  </div>
                  <div className={styles.attr}>
                    <span>Batting Style</span>
                    <b>{battingStyle}</b>
                  </div>
                  <div className={styles.attr}>
                    <span>Bowling Style</span>
                    <b>{bowlingStyle}</b>
                  </div>
                </div>

                {currentPlayer.stats.length > 0 && (
                  <div className={styles.stats}>
                    {currentPlayer.stats.map((s) => (
                      <div key={s.label} className={styles.stat}>
                        <span>{s.label}</span>
                        <b>{s.value}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className={styles.waiting}>
              <span className={styles.waitingTitle}>
                {state.status === "completed"
                  ? "Auction Complete"
                  : state.status === "setup"
                    ? "Auction Not Started"
                    : "Waiting for Next Player"}
              </span>
              {state.status !== "completed" && (
                <span className={styles.waitingSub}>
                  The auctioneer will bring the next player up shortly.
                </span>
              )}
            </section>
          )}

          {/* ---- Current bid / result strip (right-aligned) ---- */}
          {currentPlayer && <BidStrip result={result} bid={currentBid} />}

          {/* ---- Bottom: recently sold + purse board ---- */}
          <div className={styles.bottom}>
            <section className={styles.soldstrip}>
              <span className={styles.soldstripLbl}>
                Recently
                <br />
                Sold
              </span>
              <div className={styles.soldstripFeed}>
                {recentSales.length === 0 ? (
                  <span className={styles.soldEmpty}>No sales yet</span>
                ) : (
                  recentSales.map((s, i) => {
                    const crest = crestFor(s.franchise_short_code);
                    return (
                      <div key={`${s.player_name}-${i}`} className={styles.sold}>
                        {crest && <img src={crest} alt="" aria-hidden />}
                        <div className={styles.soldTxt}>
                          <span className={styles.soldPlayer}>{s.player_name}</span>
                          <span className={styles.soldMeta}>
                            {(s.franchise_short_code ?? s.franchise_name) + " · ₹" + formatMoney(s.price)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className={styles.purse}>
              <div className={styles.purseHead}>
                <span className={styles.purseTitle}>Purse Board</span>
                <span className={styles.purseMeta}>
                  {franchises.length} Teams · Remaining Purse · Squad to Max {squadMax}
                </span>
              </div>
              <div className={styles.pgrid}>
                {franchises.map((f) => {
                  const crest = crestFor(f.short_code);
                  const lead = f.id === highlightId;
                  return (
                    <div
                      key={f.id}
                      className={`${styles.pcard} ${lead ? styles.pcardLead : ""}`}
                    >
                      <div className={styles.pcardTop}>
                        {crest && <img className={styles.pcardCrest} src={crest} alt="" aria-hidden />}
                        <span className={styles.pcardName}>{f.name}</span>
                      </div>
                      <div className={styles.pcardRow}>
                        <span className={styles.pcardPurse}>
                          ₹{formatMoney(f.purse_remaining)}
                        </span>
                        <span className={styles.pcardSq}>
                          Squad {f.squadCount}/{squadMax}
                        </span>
                      </div>
                      <div className={styles.pcardDots}>
                        {Array.from({ length: squadMax }).map((_, i) => (
                          <i key={i} className={i < f.squadCount ? styles.on : undefined} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ---- Sponsor strip: logos only, no tier labels ---- */}
            {stripSponsors.length > 0 && (
              <section className={styles.sponsors}>
                <div className={styles.sponsorsRow}>
                  {stripSponsors.map((s) => {
                    // CricVideos' logo is dark-on-transparent — give it a white
                    // plate so it reads against the dark strip.
                    const light = /cricvideos/i.test(s.logo_url ?? "");
                    return (
                      <span
                        key={s.id}
                        className={`${styles.sponPill} ${styles.sponPillMedia}${
                          light ? ` ${styles.sponPillLight}` : ""
                        }`}
                      >
                        <img src={s.logo_url!} alt={s.name} />
                      </span>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Confetti + "SOLD!" celebration whenever a player is sold. */}
        <SoldCelebration result={result} />
      </div>

      {/* PAUSED overlay */}
      {paused && (
        <div className={styles.paused}>
          <span className={styles.pausedTitle}>Paused</span>
          <span className={styles.pausedSub}>The auction will resume shortly</span>
        </div>
      )}
    </div>
  );
}

/** Right-aligned strip showing the live bid, or the SOLD/UNSOLD result. */
function BidStrip({ result, bid }: { result: SaleResult; bid: CurrentBid }) {
  if (result.status === "sold") {
    const crest = crestFor(result.franchise_short_code ?? null);
    return (
      <section className={`${styles.bidbar} ${styles.bidbarSold}`}>
        <div className={styles.bidbarAmt}>
          <span className={styles.bidbarLbl}>{result.via_rtm ? "Sold · RTM" : "Sold"}</span>
          <span className={`${styles.bidbarVal} ${styles.bidbarValSold}`}>
            ₹{formatMoney(result.amount)}
          </span>
        </div>
        <div className={styles.bidbarTeam}>
          {crest && <img src={crest} alt="" aria-hidden />}
          <span className={styles.bidbarName}>{result.franchise_name ?? "—"}</span>
          {result.via_rtm && <span className={styles.rtmTag}>RTM</span>}
        </div>
      </section>
    );
  }

  if (result.status === "unsold") {
    return (
      <section className={`${styles.bidbar} ${styles.bidbarUnsold}`}>
        <span className={`${styles.bidbarStatus} ${styles.statusUnsold}`}>Unsold</span>
      </section>
    );
  }

  if (bid.amount != null) {
    const crest = crestFor(bid.franchise_short_code ?? null);
    return (
      <section className={styles.bidbar}>
        <div className={styles.bidbarAmt}>
          <span className={styles.bidbarLbl}>Current Bid</span>
          <span className={styles.bidbarVal}>₹{formatMoney(bid.amount)}</span>
        </div>
        <div className={styles.bidbarTeam}>
          {crest && <img src={crest} alt="" aria-hidden />}
          <span className={styles.bidbarName}>{bid.franchise_name ?? "—"}</span>
        </div>
      </section>
    );
  }

  // Player on the block, no bids yet.
  return (
    <section className={styles.bidbar}>
      <span className={styles.bidbarStatus}>Awaiting Bids</span>
    </section>
  );
}
