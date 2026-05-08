# Ticker PDF Reports

A Vercel-ready research dashboard for generating concise stock-ticker PDF briefs.

## What it does

- Accepts one or more tickers, such as `RKLB, TSLA, NVDA`
- Fetches public market and news context
- Produces one PDF per ticker
- Shows a polished local report queue with downloadable PDFs
- Keeps the data/report pipeline modular so X/Chrome social scanning can be added later

## Local setup

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy later

This is a standard Next.js App Router project. Once it is on GitHub, Vercel can import it directly.

## Notes

Generated reports are informational only and are not investment advice. Public finance/news endpoints can change or rate limit; production use should eventually add a dedicated market/news provider.
