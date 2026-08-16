"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scroll-reveal wrapper (from the UI-UX-Pro-Max motion guidance).
 * Fades + lifts its direct children into view with a small stagger. Respects
 * `prefers-reduced-motion` (renders final state immediately). Scoped per
 * container so ScrollTrigger doesn't rescan the whole page.
 *
 * - `stagger` (default) animates direct children in sequence.
 * - `as` lets you pick the wrapper element.
 */
export function Reveal({
  children,
  className,
  stagger = true,
  y = 24,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  y?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !ref.current) return;

      const targets = stagger ? Array.from(ref.current.children) : ref.current;
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.5,
        stagger: stagger ? 0.08 : 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
