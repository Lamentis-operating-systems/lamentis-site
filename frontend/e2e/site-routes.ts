export const localizedRoutes = [
  { id: "home-en", path: "/en", locale: "en", indexable: true },
  { id: "home-de", path: "/de", locale: "de", indexable: true },
  { id: "today-en", path: "/en/today", locale: "en", indexable: false },
  { id: "today-de", path: "/de/today", locale: "de", indexable: false },
  { id: "trending-en", path: "/en/trending", locale: "en", indexable: false },
  { id: "trending-de", path: "/de/trending", locale: "de", indexable: false },
  { id: "search-en", path: "/en/search", locale: "en", indexable: false },
  { id: "search-de", path: "/de/search", locale: "de", indexable: false },
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

export const globalRoutes = [
  { id: "add-site", path: "/add-site", locale: "en", indexable: false },
] as const;

export const publicRoutes = [...localizedRoutes, ...globalRoutes] as const;
