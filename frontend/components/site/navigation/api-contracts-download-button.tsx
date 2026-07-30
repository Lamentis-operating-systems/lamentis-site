"use client";

import { useRef, useState } from "react";
import { useLocalStorageState } from "@/components/site/use-local-storage-state";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";
import { downloadTextFile } from "@/domain/site/browser-download";
import { DownloadIcon } from "../icons/download-icon";

type ApiContractsDownloadButtonProps = {
  className: string;
  errorLabel: string;
  label: string;
  loadSkillModule?: ApiContractsSkillModuleLoader;
  onDownload?: () => void;
};

type ApiContractsSkillModule =
  typeof import("@/domain/site/api-contract-skill");

type ApiContractsSkillModuleLoader =
  () => Promise<ApiContractsSkillModule>;

const loadApiContractsSkillModule: ApiContractsSkillModuleLoader =
  () => import("@/domain/site/api-contract-skill");

export function ApiContractsDownloadButton({
  className,
  errorLabel,
  label,
  loadSkillModule = loadApiContractsSkillModule,
  onDownload,
}: ApiContractsDownloadButtonProps) {
  const [routes, , storageStatus] = useLocalStorageState(apiRoutesStorage);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadInFlight = useRef(false);
  const downloadUnavailable = (
    storageStatus === "invalid"
    || storageStatus === "unavailable"
  );

  async function downloadApiContracts() {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true;
    setIsDownloading(true);

    try {
      const {
        apiContractsAgentSkillFileName,
        generateApiContractsAgentSkill,
      } = await loadSkillModule();

      const result = downloadTextFile({
        contents: generateApiContractsAgentSkill(routes),
        fileName: apiContractsAgentSkillFileName,
        mimeType: "text/markdown;charset=utf-8",
      });
      if (result === "failed") {
        setDownloadFailed(true);
        return;
      }

      setDownloadFailed(false);
      onDownload?.();
    } catch {
      setDownloadFailed(true);
    } finally {
      downloadInFlight.current = false;
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      aria-busy={isDownloading}
      disabled={downloadUnavailable || isDownloading}
      onClick={() => {
        void downloadApiContracts();
      }}
    >
      <DownloadIcon />
      <span aria-live="polite">
        {downloadFailed ? errorLabel : label}
      </span>
    </button>
  );
}
