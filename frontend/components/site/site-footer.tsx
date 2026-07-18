"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type {
  FooterCopy,
  FooterSection,
  FooterSectionLink,
  Locale,
} from "@/domain/site/content";

type SiteFooterProps = {
  locale: Locale;
  content: FooterCopy;
};

const footerProfileBlurDataUrl =
  "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoQABAABABsJaQAAoQgAADFN6hO6EIDuIAAAA==";

function FooterLinkIcon({ link }: { link: FooterSectionLink }) {
  if (link.iconSrc) {
    return (
      <Image
        src={link.iconSrc}
        alt={`${link.label} profile`}
        className="ds-site-footer__link-avatar"
        width={20}
        height={20}
        placeholder="blur"
        blurDataURL={footerProfileBlurDataUrl}
      />
    );
  }

  const pathByIcon = {
    github:
      "M12 0C5.372 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.016-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.335-1.756-1.335-1.756-1.091-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.81 1.305 3.495.998.108-.774.418-1.306.76-1.605-2.665-.304-5.467-1.332-5.467-5.931 0-1.31.467-2.381 1.236-3.22-.125-.304-.535-1.527.117-3.184 0 0 1.008-.322 3.3 1.23a11.37 11.37 0 0 1 3.003-.404c1.02.005 2.046.137 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.657.244 2.88.12 3.184.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.922.43.372.823 1.103.823 2.222 0 1.605-.014 2.898-.014 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.3 24 12 24 5.373 18.627 0 12 0z",
    about:
      "M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-10 1.657-10 5v3h20v-3c0-3.343-6.686-5-10-5z",
  } satisfies Record<NonNullable<FooterSectionLink["icon"]>, string>;

  if (!link.icon) {
    return null;
  }

  return (
    <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="none">
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={pathByIcon[link.icon]} />
    </svg>
  );
}

function FooterLinkLabel({ link }: { link: FooterSectionLink }) {
  if (!link.product || !link.productName || !link.productSuffix) {
    return link.label;
  }

  return (
    <>
      <span>{link.productName}</span>
      {" "}
      <span>{link.productSuffix}</span>
    </>
  );
}

function renderFooterLink(link: FooterSectionLink, index: number, className: string) {
  const icon = <FooterLinkIcon link={link} />;
  const label = <FooterLinkLabel link={link} />;

  if (link.action) {
    return (
      <button
        key={`${className}-${index}-${link.label}`}
        type="button"
        className="ds-site-footer__link-button"
      >
        {label}
      </button>
    );
  }

  if (link.disabled || !link.href) {
    return (
      <span
        key={`${className}-${index}-${link.label}`}
        className="ds-site-footer__disabled-link"
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }

  return (
    <a
      key={`${className}-${index}-${link.label}`}
      href={link.href}
      className={className}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
    >
      {icon ? (
        <span className="ds-site-footer__link-content">
          {icon}
          <span>{label}</span>
        </span>
      ) : (
        label
      )}
    </a>
  );
}

function FooterSectionBlock({ section }: { section: FooterSection }) {
  return (
    <section className="ds-site-footer__col" aria-label={section.title}>
      <h2>{section.title}</h2>
      {section.links.map((link, index) =>
        renderFooterLink(link, index, "ds-site-footer__link"),
      )}
    </section>
  );
}

function LanguageButton({
  currentLanguage,
  content,
}: {
  currentLanguage: string;
  content: SiteFooterProps["content"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const [openDirection, setOpenDirection] = useState<"up" | "down">("up");
  const pathname = usePathname();

  const current = useMemo(
    () =>
      content.languageOptions.find((option) => option.code === currentLanguage)
        ?.label ?? "English",
    [content.languageOptions, currentLanguage],
  );

  const toggleDropdown = () => {
    if (!isOpen) {
      const element = selectRef.current;
      if (element) {
        const bounds = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const dropdownHeight = content.languageOptions.length * 44 + 16;
        const spaceBelow = viewportHeight - bounds.bottom;
        const spaceAbove = bounds.top;
        setOpenDirection(spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? "down" : "up");
      }
    }

    setIsOpen((open) => !open);
  };

  const localizedHrefFor = (language: Locale) => {
    const segments = (pathname ?? `/${currentLanguage}`).split("/").filter(Boolean);
    const hasLocalePrefix = content.languageOptions.some(
      (option) => option.code === segments[0],
    );
    const localizedSegments = hasLocalePrefix ? segments.slice(1) : segments;

    return `/${[language, ...localizedSegments].join("/")}`;
  };

  return (
    <div
      ref={selectRef}
      className={`ds-site-footer__language-select ${isOpen ? "is-open" : ""} opens-${openDirection}`}
    >
      <button
        type="button"
        className="ds-site-footer__language-trigger"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={content.languageLabel}
      >
        <span className="ds-site-footer__language-trigger-label">{current}</span>
        <span className="ds-site-footer__language-chevron" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      <div className="ds-site-footer__language-dropdown" role="listbox">
        <div className="ds-site-footer__language-dropdown-inner">
          {content.languageOptions.map((language) => (
            <a
              key={language.code}
              href={localizedHrefFor(language.code)}
              className="ds-site-footer__language-option"
              role="option"
              aria-selected={language.code === currentLanguage}
              onClick={() => setIsOpen(false)}
            >
              {language.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteFooter({ locale, content }: SiteFooterProps) {
  return (
    <footer className="ds-site-footer">
      <div className="ds-page-boundary ds-site-footer__grid">
        <FooterSectionBlock section={content.platform} />
        <FooterSectionBlock section={content.account} />
        <FooterSectionBlock section={content.legal} />
        <FooterSectionBlock section={content.social} />
      </div>

      <div className="ds-site-footer__bottom">
        <div className="ds-page-boundary ds-site-footer__bottom-inner">
          <span className="ds-site-footer__copyright">
            <span>{content.copyright}</span>
            {" "}
            <span className="ds-site-footer__disabled-link">
              {content.productionCredit}
            </span>
          </span>
          <label className="ds-site-footer__language-shell">
            <span className="sr-only">{content.languageLabel}</span>
            <LanguageButton currentLanguage={locale} content={content} />
          </label>
        </div>
      </div>
    </footer>
  );
}
