import { describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "@/domain/site/browser-download";

describe("browser text downloads", () => {
  it("downloads the requested content and revokes the object URL", async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return "blob:api-contracts";
    });
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const createDescriptor = Object.getOwnPropertyDescriptor(
      URL,
      "createObjectURL",
    );
    const revokeDescriptor = Object.getOwnPropertyDescriptor(
      URL,
      "revokeObjectURL",
    );

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    try {
      downloadTextFile({
        contents: "# API contracts",
        fileName: "contracts.md",
        mimeType: "text/markdown;charset=utf-8",
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const link = click.mock.instances[0];
      const blob = createObjectURL.mock.calls[0]?.[0];

      expect(link).toBeInstanceOf(HTMLAnchorElement);
      if (!(link instanceof HTMLAnchorElement)) {
        throw new Error("The download must click an anchor element.");
      }
      expect(blob).toBeInstanceOf(Blob);
      expect(blob).toHaveProperty(
        "type",
        "text/markdown;charset=utf-8",
      );
      expect(link).toHaveProperty("download", "contracts.md");
      expect(link).toHaveProperty("href", "blob:api-contracts");
      expect(document.body).not.toContainElement(link);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:api-contracts");
    } finally {
      click.mockRestore();
      if (createDescriptor) {
        Object.defineProperty(URL, "createObjectURL", createDescriptor);
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (revokeDescriptor) {
        Object.defineProperty(URL, "revokeObjectURL", revokeDescriptor);
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }
  });
});
