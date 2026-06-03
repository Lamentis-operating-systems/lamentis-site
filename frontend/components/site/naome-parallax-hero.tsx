"use client";

import { useEffect, useRef } from "react";

type NaomeParallaxHeroProps = {
  children: React.ReactNode;
  titleId: string;
};

export function NaomeParallaxHero({
  children,
  titleId,
}: NaomeParallaxHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!hero || reduceMotion.matches) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = Math.min(
        1,
        Math.max(0, (viewport * 0.18 - rect.top) / (rect.height * 0.82)),
      );

      hero.style.setProperty("--ds-naome-field-y", `${-(progress * 72).toFixed(2)}px`);
      hero.style.setProperty("--ds-naome-copy-y", `${-(progress * 18).toFixed(2)}px`);
      hero.style.setProperty("--ds-naome-title-y", `${(46 + progress * 16).toFixed(2)}%`);
    };

    const scheduleUpdate = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="ds-page-boundary ds-naome-hero"
      aria-labelledby={titleId}
    >
      {children}
    </section>
  );
}
