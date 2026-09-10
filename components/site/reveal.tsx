"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Scroll-reveal wrapper (from the UI-UX-Pro-Max motion guidance).
 * Fades + lifts its direct children into view with a small stagger. Respects
 * `prefers-reduced-motion` (renders final state immediately).
 *
 * Uses an IntersectionObserver rather than ScrollTrigger: ScrollTrigger caches
 * start positions on creation, and when web fonts/images settle a beat later
 * the layout shifts — leaving elements that are already in view stuck hidden
 * because their onEnter never re-fires. The observer (plus a safety pass for
 * content already on-screen at mount) always reveals reliably.
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
      const el = ref.current;
      if (!el) return;

      const targets = stagger ? Array.from(el.children) : [el];
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y });

      let played = false;
      const play = () => {
        if (played) return;
        played = true;
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: stagger ? 0.08 : 0,
          ease: "power2.out",
        });
      };

      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            play();
            io.disconnect();
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
      );
      io.observe(el);

      // Safety: reveal anything already on-screen at mount (the observer may not
      // fire for elements that start in view, depending on timing).
      const t = window.setTimeout(() => {
        if (el.getBoundingClientRect().top < window.innerHeight) play();
      }, 200);

      return () => {
        io.disconnect();
        window.clearTimeout(t);
      };
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
