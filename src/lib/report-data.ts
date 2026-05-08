import { createReportPdf } from "./pdf";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        symbol?: string;
        shortName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
    }>;
  };
};

type YahooSearchResponse = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
  }>;
  news?: Array<{
    title?: string;
    publisher?: string;
    link?: string;
    providerPublishTime?: number;
  }>;
};

export type GeneratedReport = {
  ticker: string;
  companyName: string;
  filename: string;
  generatedAt: string;
  rating: "bullish" | "mixed" | "cautious";
  quickRead: string;
  priceLine: string;
  themes: string[];
  risks: string[];
  sources: string[];
  pdfBase64: string;
};

function safeTicker(value: string) {
  return value.trim().replace(/^\$/, "").toUpperCase();
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TickerPdfReports/0.1",
      },
      next: { revalidate: 180 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function dollars(value?: number, currency = "USD") {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function inferRating(changePercent: number | null, newsCount: number): GeneratedReport["rating"] {
  if (changePercent !== null && changePercent > 4 && newsCount > 0) return "bullish";
  if (changePercent !== null && changePercent < -4) return "cautious";
  return "mixed";
}

export async function buildTickerReport(rawTicker: string): Promise<GeneratedReport> {
  const ticker = safeTicker(rawTicker);
  const generatedAt = new Date().toISOString();
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?range=5d&interval=1d`;
  const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    ticker,
  )}&quotesCount=4&newsCount=6`;

  const [chart, search] = await Promise.all([
    fetchJson<YahooChartResponse>(chartUrl),
    fetchJson<YahooSearchResponse>(searchUrl),
  ]);

  const meta = chart?.chart?.result?.[0]?.meta;
  const quote = search?.quotes?.find((item) => item.symbol?.toUpperCase() === ticker);
  const companyName = quote?.longname || quote?.shortname || meta?.shortName || ticker;
  const currency = meta?.currency || "USD";
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose;
  const changePercent =
    typeof price === "number" && typeof previousClose === "number" && previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;
  const news = (search?.news || []).filter((item) => item.title && item.link).slice(0, 5);
  const rating = inferRating(changePercent, news.length);
  const priceLine = `${dollars(price, currency)} ${
    changePercent === null ? "" : `(${percent(changePercent)} vs previous close)`
  }`.trim();

  const newsThemes = news.map((item) => `- ${item.title} (${item.publisher || "source"})`);
  const themes = [
    changePercent === null
      ? "Market move could not be calculated from the public quote endpoint."
      : `Recent price action is ${changePercent >= 0 ? "positive" : "negative"} at ${percent(
          changePercent,
        )} versus the prior close.`,
    news.length
      ? `Recent coverage is active, with ${news.length} visible public news item${
          news.length === 1 ? "" : "s"
        } found.`
      : "No fresh public news items were returned by the source endpoint.",
    "X/social scanning is planned as an optional Chrome-assisted mode; this MVP report uses public finance and news context.",
  ];
  const risks = [
    "A stock can reprice quickly after news-driven moves, especially when attention is high.",
    "Public endpoints can lag, rate limit, or omit important context; verify before acting.",
    "This generated brief does not model valuation, position sizing, taxes, or personal risk tolerance.",
  ];
  const quickRead =
    rating === "bullish"
      ? `${ticker} is showing strong near-term momentum in the available public data, but the setup still needs valuation and risk checks before any trade.`
      : rating === "cautious"
        ? `${ticker} looks pressured in the available public data, so the report leans cautious until the move and news context are better understood.`
        : `${ticker} has a mixed public-data read: enough context for a brief, but not enough to call the setup one-sided.`;

  const sources = [chartUrl, searchUrl, ...news.map((item) => item.link as string)];
  const pdf = createReportPdf({
    title: `${ticker} Stock Brief`,
    subtitle: `${companyName} | Generated ${new Date(generatedAt).toLocaleString("en-US")}`,
    sections: [
      {
        title: "Quick Read",
        body: [quickRead],
      },
      {
        title: "Market Snapshot",
        body: [
          `Last available price: ${priceLine}. Day range: ${dollars(
            meta?.regularMarketDayLow,
            currency,
          )} to ${dollars(meta?.regularMarketDayHigh, currency)}. 52-week range: ${dollars(
            meta?.fiftyTwoWeekLow,
            currency,
          )} to ${dollars(meta?.fiftyTwoWeekHigh, currency)}.`,
        ],
      },
      {
        title: "Main Themes",
        body: themes.map((theme) => `- ${theme}`),
      },
      {
        title: "Recent Public News",
        body: newsThemes.length ? newsThemes : ["- No recent news returned by the source endpoint."],
      },
      {
        title: "Risks And Caveats",
        body: risks.map((risk) => `- ${risk}`),
      },
      {
        title: "Sources",
        body: sources.slice(0, 8).map((source) => `- ${source}`),
      },
    ],
  });

  return {
    ticker,
    companyName,
    filename: `${ticker.toLowerCase()}-stock-brief-${generatedAt.slice(0, 10)}.pdf`,
    generatedAt,
    rating,
    quickRead,
    priceLine,
    themes,
    risks,
    sources,
    pdfBase64: pdf.toString("base64"),
  };
}
