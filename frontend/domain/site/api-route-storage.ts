import {
  isApiRouteContractList,
  type ApiRouteContract,
} from "./api-route";
import { defineLocalStorageItem } from "./local-storage";

export const apiRoutesStorage = defineLocalStorageItem<ApiRouteContract[]>({
  createDefault: () => [],
  isValid: isApiRouteContractList,
  name: "api-creator-routes",
  version: 1,
});
