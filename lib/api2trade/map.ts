import type { Mt5Trade, TradeDirection } from "@/lib/journal/types";
import type { HistoryOrder } from "./client";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unixSeconds(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    if (/^\d+$/.test(value.trim())) return unixSeconds(Number(value));
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  return null;
}

function dateOnly(unix: number | null, fallback: unknown): string {
  if (unix) {
    return new Date(unix * 1000).toISOString().slice(0, 10);
  }
  const raw = str(fallback);
  if (raw && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function directionOf(order: HistoryOrder): TradeDirection | null {
  const raw = [
    order.orderType,
    order.dealType,
    order.type,
    order.cmd,
    order.operation,
    asRecord(order.dealInternalIn)?.type,
  ]
    .map((v) => (v == null ? "" : String(v).toLowerCase()))
    .join(" ");

  if (
    /\bbuy\b/.test(raw) ||
    raw.includes("dealbuy") ||
    raw === "0" ||
    raw.includes(" 0")
  ) {
    return "Long";
  }
  if (
    /\bsell\b/.test(raw) ||
    raw.includes("dealsell") ||
    raw === "1" ||
    raw.includes(" 1")
  ) {
    return "Short";
  }
  if (num(order.cmd) === 0 || num(order.operation) === 0) return "Long";
  if (num(order.cmd) === 1 || num(order.operation) === 1) return "Short";
  return null;
}

function isBalanceOp(order: HistoryOrder) {
  const symbol = (str(order.symbol) || "").toUpperCase();
  const comment = (str(order.comment) || str(order.closeComment) || "").toLowerCase();
  const type = `${order.orderType || ""} ${order.dealType || ""} ${order.type || ""}`.toLowerCase();
  if (!symbol || symbol === "BALANCE" || symbol === "CREDIT") return true;
  if (type.includes("balance") || type.includes("credit")) return true;
  if (comment.includes("deposit") || comment.includes("withdraw")) return true;
  return false;
}

function pickId(order: HistoryOrder, login: string) {
  const innerIn = asRecord(order.dealInternalIn);
  const innerOut = asRecord(order.dealInternalOut);
  const pos =
    num(innerIn?.positionTicket) ??
    num(innerOut?.positionTicket) ??
    num(order.positionTicket) ??
    num(order.positionId) ??
    num(order.ticket) ??
    num(order.order);
  if (pos != null) return `mt5-${login}-${pos}`;
  const fallback = str(order.id) || str(order.ticket);
  return fallback ? `mt5-${login}-${fallback}` : null;
}

export function mapHistoryToTrades(
  orders: HistoryOrder[],
  login: string,
): Mt5Trade[] {
  const out: Mt5Trade[] = [];
  for (const order of orders) {
    if (isBalanceOp(order)) continue;
    const direction = directionOf(order);
    if (!direction) continue;
    const closeTime = unixSeconds(
      order.closeTimestampUTC ??
        order.closeTime ??
        asRecord(order.dealInternalOut)?.openTimeAsDateTime ??
        asRecord(order.dealInternalOut)?.openTime,
    );
    const openTime = unixSeconds(
      order.openTimestampUTC ??
        order.openTime ??
        asRecord(order.dealInternalIn)?.openTimeAsDateTime,
    );
    const exit = num(order.closePrice ?? order.close_price);
    const entry = num(order.openPrice ?? order.open_price ?? order.price);
    if (exit == null && closeTime == null) continue;

    const id = pickId(order, login);
    if (!id) continue;

    const sl = num(order.stopLoss ?? order.sl);
    const profit = num(order.profit) ?? 0;
    const swap = num(order.swap) ?? 0;
    const commission = num(order.commission) ?? 0;
    const fee = num(order.fee) ?? 0;

    out.push({
      id,
      date: dateOnly(closeTime || openTime, order.closeTime ?? order.openTime),
      instrument: str(order.symbol) || "Overig",
      direction,
      entry,
      exit,
      sl: sl && sl > 0 ? sl : null,
      volume: num(order.closeLots ?? order.lots ?? order.volume),
      profitEur: profit + swap + commission + fee,
      entryTime: openTime,
      exitTime: closeTime,
      commission,
      swap,
      login,
    });
  }
  return out;
}

export function mapOpenedToTrades(
  orders: HistoryOrder[],
  login: string,
): Mt5Trade[] {
  const out: Mt5Trade[] = [];
  for (const order of orders) {
    if (isBalanceOp(order)) continue;
    const direction = directionOf(order);
    if (!direction) continue;
    const openTime = unixSeconds(
      order.openTimestampUTC ??
        order.openTime ??
        order.time ??
        asRecord(order.dealInternalIn)?.openTimeAsDateTime,
    );
    const entry = num(
      order.openPrice ?? order.open_price ?? order.price ?? order.priceOpen,
    );
    if (entry == null && openTime == null) continue;
    const id = pickId(order, login);
    if (!id) continue;
    const sl = num(order.stopLoss ?? order.sl);
    const profit = num(order.profit) ?? 0;
    const swap = num(order.swap) ?? 0;
    const commission = num(order.commission) ?? 0;
    const fee = num(order.fee) ?? 0;
    out.push({
      id,
      date: dateOnly(openTime, order.openTime),
      instrument: str(order.symbol) || "Overig",
      direction,
      entry,
      exit: null,
      sl: sl && sl > 0 ? sl : null,
      volume: num(order.lots ?? order.volume ?? order.openLots),
      profitEur: profit + swap + commission + fee,
      entryTime: openTime,
      exitTime: null,
      commission,
      swap,
      login,
    });
  }
  return out;
}
