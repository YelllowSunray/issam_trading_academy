import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./locale";
import { translate, type Vars } from "./translate";

export async function getRequestLocale(): Promise<Locale> {
  const headerList = await headers();
  const fromHeader = headerList.get("x-tradechain-locale");
  if (fromHeader === "en" || fromHeader === "nl") return fromHeader;
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function tRequest(key: string, vars?: Vars) {
  return translate(await getRequestLocale(), key, vars);
}
