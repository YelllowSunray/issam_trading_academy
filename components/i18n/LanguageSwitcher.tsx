"use client";

import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./LocaleProvider";

export function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`lang-switch${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={t("lang.label")}
    >
      {LOCALES.map((id) => (
        <button
          key={id}
          type="button"
          className={locale === id ? "active" : ""}
          onClick={() => setLocale(id)}
        >
          {t(`lang.${id}`)}
        </button>
      ))}
    </div>
  );
}
