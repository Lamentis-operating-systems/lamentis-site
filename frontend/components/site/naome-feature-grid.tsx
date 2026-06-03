"use client";

import { useEffect, useState } from "react";

type NaomeFeatureGridProps = {
  ariaLabel: string;
  items: readonly {
    id: string;
    label: string;
  }[];
};

export function NaomeFeatureGrid({ ariaLabel, items }: NaomeFeatureGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (!visibleEntry) {
          return;
        }

        const nextIndex = items.findIndex(
          (item) => item.id === visibleEntry.target.id,
        );

        if (nextIndex >= 0) {
          setActiveIndex(nextIndex);
        }
      },
      {
        rootMargin: "-28% 0px -55% 0px",
        threshold: 0,
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (index: number) => {
    setActiveIndex(index);

    document.getElementById(items[index].id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <nav className="ds-naome-section-nav" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const className =
          index === activeIndex
            ? "ds-naome-section-nav__item ds-naome-section-nav__item--active ds-naome-section-nav__item--article"
            : "ds-naome-section-nav__item ds-naome-section-nav__item--article";

        return (
          <button
            key={item.id}
            type="button"
            className={className}
            aria-pressed={index === activeIndex}
            onClick={() => handleClick(index)}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
