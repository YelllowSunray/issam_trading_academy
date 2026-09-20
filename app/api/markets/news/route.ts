import { NextResponse } from "next/server";
import { withApiError } from "@/lib/api/errors";
import { requireAuthUser } from "@/lib/auth/request";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  categories: string;
};

const FEEDS = [
  {
    source: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    categories: "BTC, ETH, CRYPTO",
  },
  {
    source: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    categories: "BTC, ETH, CRYPTO",
  },
  {
    source: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    categories: "MACRO",
  },
];

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  );
  return match ? decodeXml(match[1]) : "";
}

function parseRss(xml: string, source: string, fallbackCategories: string) {
  return xml
    .split(/<item[\s>]/i)
    .slice(1)
    .map((block, index) => {
      const title = tag(block, "title");
      const url = tag(block, "link") || tag(block, "guid");
      const published = tag(block, "pubDate") || tag(block, "dc:date");
      const hay = `${title} ${tag(block, "category")}`.toLowerCase();
      const extra = [
        /gold|xau|silver/i.test(hay) ? "XAU" : "",
        /oil|wti|brent|opec/i.test(hay) ? "OIL" : "",
        /s&p|spx|nasdaq|dow|stock/i.test(hay) ? "SPX" : "",
        /bitcoin|btc/i.test(hay) ? "BTC" : "",
        /ethereum|eth/i.test(hay) ? "ETH" : "",
      ]
        .filter(Boolean)
        .join(", ");
      return {
        id: `${source}-${index}-${url || title}`,
        title,
        url,
        source,
        publishedAt: published ? new Date(published).toISOString() : null,
        categories: extra || fallbackCategories,
      } satisfies NewsItem;
    })
    .filter((item) => item.title && item.url);
}

async function loadFeed(feed: (typeof FEEDS)[number]): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    next: { revalidate: 180 },
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Tradechain/1.0",
    },
  });
  if (!res.ok) return [];
  return parseRss(await res.text(), feed.source, feed.categories);
}

export async function GET(req: Request) {
  return withApiError(async () => {
    await requireAuthUser(req);
    const token = process.env.CRYPTOPANIC_TOKEN;
    if (token) {
      const url = new URL("https://cryptopanic.com/api/free/v1/posts/");
      url.searchParams.set("auth_token", token);
      url.searchParams.set("public", "true");
      url.searchParams.set("kind", "news");
      const res = await fetch(url, { next: { revalidate: 120 } });
      if (res.ok) {
        const body = (await res.json()) as {
          results?: Array<{
            id: number;
            title: string;
            url: string;
            published_at?: string;
            source?: { title?: string };
            currencies?: Array<{ code?: string }>;
          }>;
        };
        const items: NewsItem[] = (body.results || []).slice(0, 24).map((p) => ({
          id: String(p.id),
          title: p.title,
          url: p.url,
          source: p.source?.title || "CryptoPanic",
          publishedAt: p.published_at || null,
          categories: (p.currencies || [])
            .map((c) => c.code)
            .filter(Boolean)
            .join(", "),
        }));
        if (items.length) {
          return NextResponse.json({ items, provider: "cryptopanic" });
        }
      }
    }

    const batches = await Promise.all(FEEDS.map((feed) => loadFeed(feed)));
    const items = batches
      .flat()
      .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
      .slice(0, 30);

    if (!items.length) {
      return NextResponse.json({
        items: [],
        error: "Nieuws tijdelijk onbereikbaar",
      });
    }

    return NextResponse.json({ items, provider: "rss" });
  });
}
