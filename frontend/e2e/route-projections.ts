import {
  routeVariants,
  siteRouteIds,
} from "../domain/site/routes";

export const publicRouteVariants = Object.freeze(
  siteRouteIds.flatMap((routeId) => routeVariants(routeId)),
);
