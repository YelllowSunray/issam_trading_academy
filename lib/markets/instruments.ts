export type MarketInstrument = {
  id: string;
  label: string;
  tvSymbol: string;
  kind: "mt5" | "crypto";
  tickerId?: string;
};

export const MARKET_INSTRUMENTS: MarketInstrument[] = [
  { id: "xauusd", label: "XAUUSD", tvSymbol: "OANDA:XAUUSD", kind: "mt5", tickerId: "pax-gold" },
  { id: "wti", label: "WTI / Oil", tvSymbol: "TVC:USOIL", kind: "mt5" },
  { id: "us500", label: "US500", tvSymbol: "TVC:SPX", kind: "mt5" },
  { id: "btcusd", label: "BTCUSD", tvSymbol: "BINANCE:BTCUSDT", kind: "crypto", tickerId: "bitcoin" },
  { id: "ethusd", label: "ETHUSD", tvSymbol: "BINANCE:ETHUSDT", kind: "crypto", tickerId: "ethereum" },
  { id: "solusd", label: "SOLUSD", tvSymbol: "BINANCE:SOLUSDT", kind: "crypto", tickerId: "solana" },
];

export function instrumentForTicker(tickerId: string) {
  return MARKET_INSTRUMENTS.find((item) => item.tickerId === tickerId) || null;
}

export const COINGECKO_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "binancecoin",
  "dogecoin",
  "cardano",
  "hyperliquid",
];
