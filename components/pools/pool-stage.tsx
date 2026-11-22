"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img>: crests are sized in container-query units from the CSS module,
// which next/image can't express cleanly, and they're a fixed set of local PNGs.

import { useState } from "react";
import {
  SLOTS_A,
  SLOTS_B,
  type Pools,
  type PoolTeam,
} from "@/lib/pools/shared";
import { leagueConfig } from "@/lib/league.config";
import styles from "./pool-stage.module.css";

export type DragPayload = { code: string; from: "tray" | "A" | "B"; index: number };

export function serializeDrag(p: DragPayload): string {
  return `${p.code}|${p.from}|${p.index}`;
}
export function parseDrag(s: string): DragPayload | null {
  const [code, from, idx] = s.split("|");
  if (!code || (from !== "tray" && from !== "A" && from !== "B")) return null;
  return { code, from, index: Number(idx) || 0 };
}

/**
 * Renders the designed Pool Creation backdrop with 14 shield slots. Used both
 * for the admin editor (interactive drag/drop) and the public display
 * (read-only). All geometry is percentage-based over a 16:9 stage.
 */
export function PoolStage({
  teams,
  pools,
  interactive = false,
  onDropTeam,
  onRemove,
}: {
  teams: Map<string, PoolTeam>;
  pools: Pools;
  interactive?: boolean;
  onDropTeam?: (payload: DragPayload, to: "A" | "B", index: number) => void;
  onRemove?: (pool: "A" | "B", index: number) => void;
}) {
  const [over, setOver] = useState<string | null>(null);

  const renderSlot = (pool: "A" | "B", index: number, x: number, y: number) => {
    const code = pools[pool][index];
    const team = code ? teams.get(code) : undefined;
    const key = `${pool}-${index}`;
    const isOver = over === key;

    const classes = [styles.slot];
    if (interactive) {
      classes.push(styles.slotInteractive);
      if (!team) classes.push(styles.slotEmptyEdit);
      if (isOver) classes.push(styles.slotOver);
      if (team) classes.push(styles.filledDraggable);
    }

    return (
      <div
        key={key}
        className={classes.join(" ")}
        style={{ left: `${x}%`, top: `${y}%` }}
        draggable={interactive && !!team}
        onDragStart={
          interactive && team
            ? (e) => {
                e.dataTransfer.setData(
                  "text/plain",
                  serializeDrag({ code: team.code, from: pool, index }),
                );
                e.dataTransfer.effectAllowed = "move";
              }
            : undefined
        }
        onDragOver={
          interactive
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(key);
              }
            : undefined
        }
        onDragLeave={interactive ? () => setOver((o) => (o === key ? null : o)) : undefined}
        onDrop={
          interactive
            ? (e) => {
                e.preventDefault();
                setOver(null);
                const payload = parseDrag(e.dataTransfer.getData("text/plain"));
                if (payload) onDropTeam?.(payload, pool, index);
              }
            : undefined
        }
      >
        {team && (
          <>
            <span className={styles.disc} />
            <img className={styles.logo} src={team.logo} alt={team.name} />
            {interactive && (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${team.name}`}
                onClick={() => onRemove?.(pool, index)}
                onDragStart={(e) => e.preventDefault()}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div
        className={styles.stage}
        style={{ backgroundImage: `url(${leagueConfig.logos.poolsBackground})` }}
      >
        {SLOTS_A.map((s, i) => renderSlot("A", i, s.x, s.y))}
        {SLOTS_B.map((s, i) => renderSlot("B", i, s.x, s.y))}
      </div>
    </div>
  );
}
