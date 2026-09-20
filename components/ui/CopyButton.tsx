"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

export function CopyButton({
  value,
  label,
  className = "pl-reset-btn",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const text = label || t("common.copy");

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? t("common.copied") : text}
    </button>
  );
}
