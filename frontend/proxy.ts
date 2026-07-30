import { NextResponse, type NextRequest } from "next/server";
import { resolveLocaleFromAcceptLanguage } from "@/domain/site/locale-server";
import { routePath } from "@/domain/site/routes";

export function proxy(request: NextRequest) {
  const locale = resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const destination = request.nextUrl.clone();
  destination.pathname = routePath({
    scope: "localized",
    locale,
    routeId: "home",
  });
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: "/",
};
