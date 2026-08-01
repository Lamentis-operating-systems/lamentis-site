import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiContractsDownloadButton } from "@/components/site/navigation/api-contracts-download-button";
import { useLocalStorageState } from "@/components/site/use-local-storage-state";
import {
  defineLocalStorageItem,
  type LocalStorageItem,
} from "@/domain/site/local-storage";

const apiSkillModuleState = vi.hoisted(() => ({
  generate: vi.fn(() => "# Generated API contracts"),
  moduleLoads: 0,
}));
const browserDownloadState = vi.hoisted(() => ({
  downloadTextFile: vi.fn(() => "downloaded" as const),
}));

vi.mock("@/domain/site/api-contract-skill", () => {
  apiSkillModuleState.moduleLoads += 1;
  return {
    apiContractsAgentSkillFileName: "api-contracts-agent-skill.md",
    generateApiContractsAgentSkill: apiSkillModuleState.generate,
  };
});

vi.mock("@/domain/site/browser-download", () => ({
  downloadTextFile: browserDownloadState.downloadTextFile,
}));

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((entry) => typeof entry === "string");
}

function StorageProbe({
  item,
}: {
  item: LocalStorageItem<string[]>;
}) {
  const [value, , status] = useLocalStorageState(item);

  return (
    <output data-status={status}>
      {value.join(",")}
    </output>
  );
}

function TransactionProbe({
  item,
  onRender,
  onTransaction,
}: {
  item: LocalStorageItem<string[]>;
  onRender: () => void;
  onTransaction: (status: string) => void;
}) {
  const [value, , status, transact] = useLocalStorageState(item);
  onRender();

  return (
    <>
      <output data-status={status}>{value.join(",")}</output>
      <button
        type="button"
        onClick={() => {
          const transaction = transact((currentValue) => ({
            result: "no-op",
            value: currentValue,
          }));
          onTransaction(transaction.writeStatus);
        }}
      >
        Keep value
      </button>
    </>
  );
}

describe("useLocalStorageState hydration", () => {
  it("hydrates from a stable server snapshot before synchronizing browser storage", async () => {
    const item = defineLocalStorageItem<string[]>({
      createDefault: () => ["server-default"],
      isValid: isStringList,
      name: "hydration-probe",
      version: 1,
    });
    window.localStorage.setItem(
      item.key,
      JSON.stringify(["client-stored"]),
    );

    const serverMarkup = renderToString(<StorageProbe item={item} />);
    expect(serverMarkup).toContain('data-status="empty"');
    expect(serverMarkup).toContain("server-default");
    expect(serverMarkup).not.toContain("client-stored");

    const container = document.createElement("div");
    container.innerHTML = serverMarkup;
    document.body.append(container);
    const recoverableErrors: unknown[] = [];
    const consoleErrors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      (...args: unknown[]) => {
        consoleErrors.push(args);
      },
    );
    let root: Root | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(
          container,
          <StorageProbe item={item} />,
          {
            onRecoverableError: (error) => {
              recoverableErrors.push(error);
            },
          },
        );
      });

      await waitFor(() => {
        expect(container.querySelector("output"))
          .toHaveAttribute("data-status", "stored");
        expect(container.querySelector("output"))
          .toHaveTextContent("client-stored");
      });

      expect(recoverableErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      consoleError.mockRestore();
      container.remove();
    }
  });

  it("does not write or emit for a transaction that keeps the current value", () => {
    const item = defineLocalStorageItem<string[]>({
      createDefault: () => ["unchanged"],
      isValid: isStringList,
      name: "transaction-no-op-probe",
      version: 1,
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const onRender = vi.fn();
    const onTransaction = vi.fn();

    render(
      <TransactionProbe
        item={item}
        onRender={onRender}
        onTransaction={onTransaction}
      />,
    );
    setItem.mockClear();
    onRender.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Keep value" }));

    expect(onTransaction).toHaveBeenCalledWith("unchanged");
    expect(setItem).not.toHaveBeenCalled();
    expect(onRender).not.toHaveBeenCalled();
    expect(screen.getByText("unchanged")).toHaveAttribute(
      "data-status",
      "empty",
    );
  });
});

describe("API-contract download loading", () => {
  it("does not generate or download until the user requests it", async () => {
    const onDownload = vi.fn();

    render(
      <ApiContractsDownloadButton
        className="download"
        errorLabel="Download failed"
        label="Download"
        onDownload={onDownload}
      />,
    );

    expect(apiSkillModuleState.moduleLoads).toBe(0);
    expect(apiSkillModuleState.generate).not.toHaveBeenCalled();
    expect(browserDownloadState.downloadTextFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(apiSkillModuleState.moduleLoads).toBe(1);
      expect(apiSkillModuleState.generate).toHaveBeenCalledWith([], {});
      expect(browserDownloadState.downloadTextFile).toHaveBeenCalledWith({
        contents: "# Generated API contracts",
        fileName: "api-contracts-agent-skill.md",
        mimeType: "text/markdown;charset=utf-8",
      });
      expect(onDownload).toHaveBeenCalledTimes(1);
    });
  });

  it("guards one pending download, recovers from loader failure, and retries", async () => {
    type SkillModule = typeof import("@/domain/site/api-contract-skill");
    let rejectPending: ((reason?: unknown) => void) | undefined;
    const pendingModule = new Promise<SkillModule>((_, reject) => {
      rejectPending = reject;
    });
    const generate = vi.fn(() => "# Retried API contracts");
    const loadedModule: SkillModule = {
      apiContractsAgentSkillFileName: "api-contracts-agent-skill.md",
      generateApiContractsAgentSkill: generate,
    };
    const loadSkillModule = vi
      .fn<() => Promise<SkillModule>>()
      .mockReturnValueOnce(pendingModule)
      .mockResolvedValueOnce(loadedModule);
    const onDownload = vi.fn();
    browserDownloadState.downloadTextFile.mockClear();

    render(
      <ApiContractsDownloadButton
        className="download"
        errorLabel="Download failed"
        label="Download"
        loadSkillModule={loadSkillModule}
        onDownload={onDownload}
      />,
    );

    const download = screen.getByRole("button", { name: "Download" });
    await act(async () => {
      download.click();
      download.click();
    });

    expect(loadSkillModule).toHaveBeenCalledTimes(1);
    expect(download).toHaveAttribute("aria-busy", "true");
    expect(download).toBeDisabled();
    expect(browserDownloadState.downloadTextFile).not.toHaveBeenCalled();

    await act(async () => {
      rejectPending?.(new Error("Chunk load failed"));
      await pendingModule.catch(() => undefined);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: "Download failed",
      })).toBeEnabled();
    });
    expect(download).toHaveAttribute("aria-busy", "false");
    expect(onDownload).not.toHaveBeenCalled();

    fireEvent.click(download);

    await waitFor(() => {
      expect(loadSkillModule).toHaveBeenCalledTimes(2);
      expect(generate).toHaveBeenCalledWith([], {});
      expect(browserDownloadState.downloadTextFile).toHaveBeenCalledWith({
        contents: "# Retried API contracts",
        fileName: "api-contracts-agent-skill.md",
        mimeType: "text/markdown;charset=utf-8",
      });
      expect(onDownload).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
    });
    expect(download).toHaveAttribute("aria-busy", "false");
  });
});
