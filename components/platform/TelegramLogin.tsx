"use client";

import { useEffect, useRef } from "react";
import { loginTelegram } from "@/lib/journal/api-client";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramLogin({
  botUsername,
  onLinked,
  onError,
}: {
  botUsername: string;
  onLinked: () => void;
  onError?: (msg: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botUsername || !host.current) return;
    window.onTelegramAuth = (user) => {
      void loginTelegram(user)
        .then(() => onLinked())
        .catch((e) =>
          onError?.(e instanceof Error ? e.message : "Telegram-koppeling mislukt"),
        );
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername.replace(/^@/, ""));
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    host.current.innerHTML = "";
    host.current.appendChild(script);
    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, onError, onLinked]);

  if (!botUsername) {
    return (
      <p className="pl-sub2">
        Telegram Login is nog niet geconfigureerd (bot-username ontbreekt).
      </p>
    );
  }

  return <div ref={host} className="tg-login" />;
}
