/**
 * Hard navigation for auth redirects.
 * Soft `router.replace` can throw "Router action dispatched before initialization"
 * during Next.js env reload / HMR before the App Router action queue exists.
 */
export function hardReplace(href: string) {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === href) return;
  window.location.replace(href);
}
