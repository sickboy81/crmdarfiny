import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // During static generation (build time), requestLocale is undefined.
  // Fall back to the default locale so pages can be prerendered.
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    timeZone: "America/Sao_Paulo",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
