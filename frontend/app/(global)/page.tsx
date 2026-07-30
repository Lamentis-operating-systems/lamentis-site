import { redirect } from "next/navigation";
import { defaultLocale, routePath } from "@/domain/site/routes";

export default function RootPage() {
  redirect(
    routePath({
      scope: "localized",
      locale: defaultLocale,
      routeId: "home",
    }),
  );
}
