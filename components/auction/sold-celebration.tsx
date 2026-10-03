"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { formatMoney, type SaleResult } from "@/lib/auction/snapshot";

gsap.registerPlugin(useGSAP);

// Festive multi-colour confetti led by the brand neon-green.
const COLORS = ["#31D678", "#7CF0A8", "#FFD54A", "#FF6B6B", "#4FC3F7", "#FFFFFF"];
const PARTICLES = 160;

/**
 * Full-screen celebration overlay for the auction big screen. Whenever a player
 * is SOLD (the sale-result transitions into "sold"), it fires a one-shot GSAP
 * confetti burst plus a "SOLD!" popup with the winning team + price, then
 * auto-dismisses. Purely decorative: pointer-events-none, and it never fires on
 * the initial mount (so reloading mid-sale doesn't re-celebrate). Respects
 * `prefers-reduced-motion` (shows a static popup, no confetti).
 */
export function SoldCelebration({ result }: { result: SaleResult }) {
  const scope = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const prevStatus = useRef<SaleResult["status"] | undefined>(undefined);
  const firstRun = useRef(true);

  useGSAP(
    () => {
      const status = result.status;
      const wasSold = prevStatus.current === "sold";
      prevStatus.current = status;

      // Never celebrate on first mount (e.g. reloading while a sale is showing).
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      // Only on the edge into "sold".
      if (status !== "sold" || wasSold) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // --- "SOLD!" popup -----------------------------------------------------
      const popEl = popup.current;
      if (popEl) {
        gsap.killTweensOf(popEl);
        if (reduce) {
          gsap.set(popEl, { opacity: 1, scale: 1, y: 0 });
          gsap.to(popEl, { opacity: 0, duration: 0.4, delay: 2.4 });
        } else {
          gsap
            .timeline()
            .fromTo(
              popEl,
              { opacity: 0, scale: 0.5, y: 24 },
              { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" },
            )
            .to(popEl, { scale: 1.04, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 })
            .to(popEl, { opacity: 0, scale: 0.92, duration: 0.5, ease: "power2.in" }, "+=1.1");
        }
      }

      if (reduce) return;

      // --- Confetti burst ----------------------------------------------------
      const layerEl = layer.current;
      if (!layerEl) return;
      layerEl.replaceChildren(); // clear any leftover from a previous burst

      const nodes: HTMLDivElement[] = [];
      const frag = document.createDocumentFragment();
      for (let i = 0; i < PARTICLES; i++) {
        const d = document.createElement("div");
        const w = gsap.utils.random(7, 13);
        const h = gsap.utils.random(9, 18);
        const color = COLORS[i % COLORS.length];
        d.style.cssText =
          `position:absolute;left:50%;top:36%;width:${w}px;height:${h}px;` +
          `background:${color};border-radius:2px;will-change:transform,opacity;`;
        frag.appendChild(d);
        nodes.push(d);
      }
      layerEl.appendChild(frag);

      nodes.forEach((d) => {
        const angle = gsap.utils.random(0, Math.PI * 2);
        const dist = gsap.utils.random(140, 560);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - gsap.utils.random(60, 220); // bias the burst upward
        gsap.set(d, { xPercent: -50, yPercent: -50, rotation: gsap.utils.random(0, 360) });
        gsap
          .timeline({ onComplete: () => d.remove() })
          // explode outward
          .to(d, { x: dx, y: dy, duration: gsap.utils.random(0.5, 0.9), ease: "power2.out" })
          // then fall under gravity, tumbling
          .to(
            d,
            {
              y: `+=${gsap.utils.random(360, 760)}`,
              rotation: `+=${gsap.utils.random(180, 620)}`,
              duration: gsap.utils.random(1.6, 2.8),
              ease: "power1.in",
            },
            ">-0.1",
          )
          .to(d, { opacity: 0, duration: 0.5 }, "<+0.7");
      });

      return () => layerEl.replaceChildren();
    },
    { scope, dependencies: [result.status, result.franchise_id, result.amount] },
  );

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Confetti particles are injected here imperatively. */}
      <div ref={layer} className="absolute inset-0" aria-hidden />

      {/* SOLD! popup — starts invisible; GSAP drives it on each sale. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={popup}
          style={{ opacity: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-accent/40 bg-background/85 px-12 py-8 text-center shadow-2xl backdrop-blur-sm"
        >
          <span className="font-heading text-6xl font-extrabold tracking-[0.12em] text-accent uppercase sm:text-8xl">
            Sold!
          </span>
          {result.franchise_name && (
            <span className="font-heading text-3xl font-extrabold tracking-tight text-foreground uppercase sm:text-5xl">
              {result.franchise_name}
            </span>
          )}
          {result.amount != null && (
            <span className="font-heading text-2xl font-bold text-accent sm:text-4xl">
              🪙 {formatMoney(result.amount)}
              {result.via_rtm && (
                <span className="ml-3 rounded-sm border border-primary/50 bg-primary/15 px-2 py-1 align-middle font-heading text-sm font-bold tracking-[0.16em] text-primary">
                  RTM
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
