/**
 * Plain (non-"use server") module for the Ground & Trust actions' shared types
 * and constants. A "use server" file may only export async functions, so these
 * live here and are imported by both the actions and the client manager.
 */

export type GroundState = { error?: string; ok?: boolean; message?: string };

/** Max videos that may be VISIBLE within one section (testimonial / ground). */
export const MAX_VISIBLE_VIDEOS = 10;

export type VideoPreview =
  | { ok: true; youtubeId: string; title: string; format: "video" | "short"; poster: string }
  | { ok: false; error: string };
