/**
 * Plain (non-"use server") module for the Legends & Reels actions' shared types
 * and constants. A "use server" file may only export async functions, so these
 * live here and are imported by both the actions and the client manager.
 *
 * ShowcaseState is structurally identical to the ground manager's GroundState,
 * so the shared admin helpers (ActionButton, useGroundAction) accept these
 * actions unchanged.
 */

export type ShowcaseState = { error?: string; ok?: boolean; message?: string };

/** Max reels that may be VISIBLE at once (the public rail is capped to match). */
export const MAX_VISIBLE_REELS = 12;

/** Legend portrait + quote limits (mirrors the DB CHECK constraints). */
export const LEGEND_QUOTE_MAX = 140;
export const REEL_QUOTE_MAX = 90;

export type ReelPreview =
  | { ok: true; youtubeId: string; title: string; format: "video" | "short"; poster: string }
  | { ok: false; error: string };

export type UploadResult = { key?: string; url?: string; error?: string };
