"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const COLORS = ["#f5c542", "#163a8a", "#0f6b3a", "#d62839", "#ffffff"];

/**
 * One-shot confetti burst (fixed, pointer-events-none overlay). Fires once on
 * mount. Respects prefers-reduced-motion (renders nothing).
 */
export function Confetti({ pieces = 120 }: { pieces?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const host = ref.current;
      if (!host) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const W = window.innerWidth;
      const nodes: HTMLSpanElement[] = [];
      for (let i = 0; i < pieces; i++) {
        const s = document.createElement("span");
        const size = 6 + Math.round((i % 4) * 2);
        s.style.cssText = `position:absolute;top:-16px;left:${(i / pieces) * 100}%;width:${size}px;height:${size * 1.6}px;background:${COLORS[i % COLORS.length]};border-radius:1px;opacity:0;will-change:transform;`;
        host.appendChild(s);
        nodes.push(s);
      }
      gsap.to(nodes, {
        y: () => window.innerHeight + 40,
        x: () => (Math.sin(Math.random() * 6) * W) / 6,
        rotation: () => 180 + Math.round(Math.random() * 540),
        opacity: 1,
        duration: () => 1.8 + Math.random() * 1.4,
        ease: "power1.in",
        stagger: { each: 0.004, from: "random" },
        onComplete: () => nodes.forEach((n) => n.remove()),
      });
      return () => nodes.forEach((n) => n.remove());
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    />
  );
}
