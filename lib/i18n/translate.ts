import { en, type Messages } from "./messages/en";
import { nl } from "./messages/nl";
import { DEFAULT_LOCALE, type Locale } from "./locale";

export type { Messages };
export type Vars = Record<string, string | number>;

const catalogs: Record<Locale, Messages> = { en, nl };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] || catalogs[DEFAULT_LOCALE];
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Vars,
): string {
  const parts = key.split(".");
  let cur: unknown = getMessages(locale);
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      cur = undefined;
      break;
    }
  }
  let text = typeof cur === "string" ? cur : null;
  if (text == null && locale !== DEFAULT_LOCALE) {
    return translate(DEFAULT_LOCALE, key, vars);
  }
  if (text == null) return key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name]),
  );
}
