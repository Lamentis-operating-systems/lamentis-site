export const supportedLocales = ["en", "de"] as const;

export type Locale = (typeof supportedLocales)[number];

export type FooterSectionLink = {
  label: string;
  href?: string;
  disabled?: boolean;
  action?: boolean;
  external?: boolean;
  product?: "nox" | "noma";
  productName?: string;
  productSuffix?: string;
  icon?: "github" | "about";
  iconSrc?: string;
};

export type FooterSection = {
  title: string;
  links: FooterSectionLink[];
};

export type FooterCopy = {
  brand: string;
  platform: FooterSection;
  account: FooterSection;
  legal: FooterSection;
  social: FooterSection;
  languageLabel: string;
  languageOptions: { code: Locale; label: string }[];
  copyright: string;
  productionCredit: string;
};

export type HomepageCopy = {
  metaTitle: string;
  metaDescription: string;
  statusLabel: string;
  footer: FooterCopy;
};

const languageOptions = [{ code: "en", label: "English" }, { code: "de", label: "Deutsch" }] satisfies FooterCopy["languageOptions"];

const platformLinks = [
  { product: "noma", productName: "Noma", productSuffix: "Tasks" },
  { product: "nox", productName: "Nox", productSuffix: "- Social Events" },
] as const;

export const externalProfileUrls = {
  github: "https://github.com/Lamentis-O",
} as const;

const sharedExternalLinks: FooterSectionLink[] = [
  {
    label: "GitHub",
    href: externalProfileUrls.github,
    external: true,
    icon: "github",
  },
];

function localizedPlatformLinks(locale: Locale): FooterSectionLink[] {
  return platformLinks.map(({ product, productName, productSuffix }) => ({
    product,
    productName,
    productSuffix,
    label: `${productName} ${productSuffix}`,
    href: `/${locale}/${product}`,
  }));
}

function socialLinks(locale: Locale, aboutLabel: string): FooterSectionLink[] {
  return [
    {
      label: aboutLabel,
      href: `/${locale}/about/elias-papavlassopoulos`,
      icon: "about",
      iconSrc: "/assets/images/elias-portrait.JPG",
    },
    ...sharedExternalLinks,
  ];
}

type LocalizedCopy = readonly [
  metaTitle: string,
  metaDescription: string,
  statusLabel: string,
  platformTitle: string,
  accountTitle: string,
  accountLinks: FooterSectionLink[],
  legalTitle: string,
  legalLinks: FooterSectionLink[],
  aboutLabel: string,
  languageLabel: string,
  copyright: string,
  productionCredit: string,
];

const localizedCopy = {
  en: [
    "Projects by Elias Papavlassopoulos",
    "Lamentis landing page: plan, coordinate, and host private and public events with your social circle.",
    "Coming soon",
    "Platform",
    "Account",
    [{ label: "Log in", disabled: true }, { label: "Sign up", disabled: true }, { label: "Safety", disabled: true }, { label: "View roadmap", disabled: true }],
    "Legal",
    [{ label: "Privacy Policy", disabled: true }, { label: "Terms of Service", disabled: true }, { label: "Legal Notice", href: "/en/legal-notice" }],
    "About Me",
    "Language",
    "© 2026 Lamentis.",
    "An Elias Papavlassopoulos production.",
  ],
  de: [
    "Projekte von Elias Papavlassopoulos",
    "Lamentis-Startseite: Plane, koordiniere und organisiere private und öffentliche Events.",
    "Demnächst",
    "Plattform",
    "Konto",
    [{ label: "Einloggen", disabled: true }, { label: "Registrieren", disabled: true }, { label: "Sicherheit", disabled: true }, { label: "Roadmap ansehen", disabled: true }],
    "Rechtliches",
    [{ label: "Datenschutzerklärung", disabled: true }, { label: "Nutzungsbedingungen", disabled: true }, { label: "Impressum", href: "/de/legal-notice" }],
    "Über mich",
    "Sprache",
    "© 2026 Lamentis.",
    "Eine Elias Papavlassopoulos Produktion.",
  ],
} satisfies Record<Locale, LocalizedCopy>;

function footerCopy(locale: Locale, copy: LocalizedCopy): FooterCopy {
  const [, , , platformTitle, accountTitle, accountLinks, legalTitle, legalLinks, aboutLabel, languageLabel, copyright, productionCredit] = copy;

  return {
    brand: "Lamentis",
    platform: { title: platformTitle, links: localizedPlatformLinks(locale) },
    account: { title: accountTitle, links: accountLinks },
    legal: { title: legalTitle, links: legalLinks },
    social: { title: "Links", links: socialLinks(locale, aboutLabel) },
    languageLabel,
    languageOptions,
    copyright,
    productionCredit,
  };
}

export const contentByLocale = Object.fromEntries(
  supportedLocales.map((locale) => {
    const copy = localizedCopy[locale];
    const [metaTitle, metaDescription, statusLabel] = copy;

    return [locale, {
      metaTitle,
      metaDescription,
      statusLabel,
      footer: footerCopy(locale, copy),
    }];
  }),
) as Record<Locale, HomepageCopy>;

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  if (!value) {
    return false;
  }

  return (supportedLocales as readonly string[]).includes(value);
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguage: string | null,
): Locale {
  if (!acceptLanguage) {
    return "en";
  }

  const requested = acceptLanguage
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .map((entry) => entry.split(";")[0]);

  for (const raw of requested) {
    if (raw.startsWith("de")) {
      return "de";
    }
    if (raw.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}
