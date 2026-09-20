export type Locale = "en" | "nl";

export const LOCALES: Locale[] = ["en", "nl"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "tradechain_locale";

let memoryLocale: Locale | null = null;

export function parseLocale(value?: string | null): Locale {
  return value === "nl" ? "nl" : "en";
}

export function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=(en|nl)`),
  );
  return parseLocale(match?.[1]);
}

export function getClientLocale(): Locale {
  return memoryLocale ?? readCookieLocale();
}

export function persistLocale(locale: Locale) {
  memoryLocale = locale;
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
}

export function dateLocale(locale?: Locale): string {
  return (locale ?? getClientLocale()) === "nl" ? "nl-NL" : "en-GB";
}
