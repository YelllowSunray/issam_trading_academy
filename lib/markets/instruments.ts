export type MarketInstrument = {
  id: string;
  label: string;
  tvSymbol: string;
  kind: "mt5" | "crypto";
};

export const MARKET_INSTRUMENTS: MarketInstrument[] = [
  { id: "xauusd", label: "XAUUSD", tvSymbol: "OANDA:XAUUSD", kind: "mt5" },
  { id: "wti", label: "WTI / Oil", tvSymbol: "TVC:USOIL", kind: "mt5" },
  { id: "us500", label: "US500", tvSymbol: "TVC:SPX", kind: "mt5" },
  { id: "btcusd", label: "BTCUSD", tvSymbol: "BINANCE:BTCUSDT", kind: "crypto" },
  { id: "ethusd", label: "ETHUSD", tvSymbol: "BINANCE:ETHUSDT", kind: "crypto" },
  { id: "solusd", label: "SOLUSD", tvSymbol: "BINANCE:SOLUSDT", kind: "crypto" },
];

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
