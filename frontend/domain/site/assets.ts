export type PublicAssetPath = `/assets/${string}`;

type ImageAssetDefinition = {
  path: PublicAssetPath;
  type: "image/png";
  width: number;
  height: number;
};

const assetFiles = {
  brandMark: {
    path: "/assets/images/app-logo-20260424.png",
    type: "image/png",
    width: 1024,
    height: 1024,
  },
  siteFavicon32: {
    path: "/assets/images/favicon-32-20260424.png",
    type: "image/png",
    width: 32,
    height: 32,
  },
  siteFavicon16: {
    path: "/assets/images/favicon-16-20260424.png",
    type: "image/png",
    width: 16,
    height: 16,
  },
  siteAppleTouch: {
    path: "/assets/images/apple-touch-icon-20260424.png",
    type: "image/png",
    width: 180,
    height: 180,
  },
  profilePortrait: {
    path: "/assets/images/about-favicon-elias-20260523-32.png",
    type: "image/png",
    width: 32,
    height: 32,
  },
  aboutFavicon64: {
    path: "/assets/images/about-favicon-elias-20260523-64.png",
    type: "image/png",
    width: 64,
    height: 64,
  },
  aboutAppleTouch: {
    path: "/assets/images/about-apple-touch-elias-20260523.png",
    type: "image/png",
    width: 180,
    height: 180,
  },
} as const satisfies Record<string, ImageAssetDefinition>;

export type AssetFileId = keyof typeof assetFiles;

type IconAssetReference = {
  assetId: AssetFileId;
  media?: "(prefers-color-scheme: light)" | "(prefers-color-scheme: dark)";
};

type IconSetDefinition = {
  icon: readonly IconAssetReference[];
  apple: { assetId: AssetFileId };
};

type SocialImageDefinition = {
  assetId: AssetFileId;
};

export const assetManifest = {
  files: assetFiles,
  iconSets: {
    site: {
      icon: [
        {
          assetId: "siteFavicon32",
          media: "(prefers-color-scheme: light)",
        },
        {
          assetId: "siteFavicon16",
          media: "(prefers-color-scheme: light)",
        },
        {
          assetId: "brandMark",
          media: "(prefers-color-scheme: dark)",
        },
      ],
      apple: { assetId: "siteAppleTouch" },
    },
    about: {
      icon: [
        { assetId: "profilePortrait" },
        { assetId: "aboutFavicon64" },
      ],
      apple: { assetId: "aboutAppleTouch" },
    },
  },
  socialImages: {
    site: {
      assetId: "brandMark",
    },
  },
} as const satisfies {
  files: Record<string, ImageAssetDefinition>;
  iconSets: Record<string, IconSetDefinition>;
  socialImages: Record<string, SocialImageDefinition>;
};

export type IconSetId = keyof typeof assetManifest.iconSets;
export type SocialImageId = keyof typeof assetManifest.socialImages;

export const assetPaths = Object.freeze(
  Object.values(assetManifest.files).map((asset) => asset.path),
);

export function assetPath(assetId: AssetFileId): PublicAssetPath {
  return assetManifest.files[assetId].path;
}
