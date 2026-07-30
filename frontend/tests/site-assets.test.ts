import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assetManifest,
  assetPath,
  assetPaths,
} from "@/domain/site/assets";

const publicDirectory = resolve(process.cwd(), "public");
const imageDirectory = resolve(publicDirectory, "assets/images");

describe("site asset authority", () => {
  it("registers every delivered image and resolves every manifest reference", () => {
    const deliveredPaths = readdirSync(imageDirectory)
      .map((fileName) => `/assets/images/${fileName}`)
      .sort();

    expect([...assetPaths].sort()).toEqual(deliveredPaths);
    expect(new Set(assetPaths).size).toBe(assetPaths.length);

    for (const [assetId, asset] of Object.entries(assetManifest.files)) {
      expect(assetPath(assetId as keyof typeof assetManifest.files)).toBe(asset.path);
      expect(asset.path).not.toContain("?");
      expect(statSync(resolve(publicDirectory, asset.path.slice(1))).size)
        .toBeGreaterThan(0);
    }

    const registeredAssetIds = new Set(Object.keys(assetManifest.files));
    for (const iconSet of Object.values(assetManifest.iconSets)) {
      for (const icon of iconSet.icon) {
        expect(registeredAssetIds.has(icon.assetId)).toBe(true);
      }
      expect(registeredAssetIds.has(iconSet.apple.assetId)).toBe(true);
    }
    for (const socialImage of Object.values(assetManifest.socialImages)) {
      expect(registeredAssetIds.has(socialImage.assetId)).toBe(true);
    }
  });
});
