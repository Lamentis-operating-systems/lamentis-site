import {
  isApiContractMetadata,
  type ApiContractMetadata,
} from "./api-contract-metadata";
import { defineLocalStorageItem } from "./local-storage";

export const apiContractMetadataStorage =
  defineLocalStorageItem<ApiContractMetadata>({
    createDefault: () => ({}),
    isValid: isApiContractMetadata,
    name: "api-creator-contract-metadata",
    version: 1,
  });
