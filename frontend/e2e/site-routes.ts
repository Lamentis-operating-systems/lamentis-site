export const localizedRoutes = [
  { id: "home-en", path: "/en", locale: "en", indexable: true },
  { id: "home-de", path: "/de", locale: "de", indexable: true },
  { id: "noma-en", path: "/en/noma", locale: "en", indexable: false },
  { id: "noma-de", path: "/de/noma", locale: "de", indexable: false },
  { id: "nox-en", path: "/en/nox", locale: "en", indexable: false },
  { id: "nox-de", path: "/de/nox", locale: "de", indexable: false },
  { id: "legal-en", path: "/en/legal-notice", locale: "en", indexable: false },
  { id: "legal-de", path: "/de/legal-notice", locale: "de", indexable: false },
  {
    id: "about-en",
    path: "/en/about/elias-papavlassopoulos",
    locale: "en",
    indexable: false,
  },
  {
    id: "about-de",
    path: "/de/about/elias-papavlassopoulos",
    locale: "de",
    indexable: false,
  },
] as const;
