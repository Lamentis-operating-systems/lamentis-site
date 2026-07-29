"use client";

import {
  apiContractsAgentSkillFileName,
  generateApiContractsAgentSkill,
} from "@/domain/site/api-contract-skill";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";
import { downloadTextFile } from "@/domain/site/browser-download";
import { readLocalStorageItem } from "@/domain/site/local-storage";
import { DownloadIcon } from "./download-icon";

type ApiContractsDownloadButtonProps = {
  className: string;
  label: string;
  onDownload?: () => void;
};

export function ApiContractsDownloadButton({
  className,
  label,
  onDownload,
}: ApiContractsDownloadButtonProps) {
  function downloadApiContracts() {
    const routes = readLocalStorageItem(apiRoutesStorage).value;
    downloadTextFile({
      contents: generateApiContractsAgentSkill(routes),
      fileName: apiContractsAgentSkillFileName,
      mimeType: "text/markdown;charset=utf-8",
    });
    onDownload?.();
  }

  return (
    <button
      type="button"
      className={className}
      onClick={downloadApiContracts}
    >
      <DownloadIcon />
      <span>{label}</span>
    </button>
  );
}
