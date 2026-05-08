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

## Scheduled email reports

The app includes a single-user scheduled report MVP:

- Vercel Cron calls `/api/cron/daily-reports`
- The cron runs at `0 12 * * 1-5`, which is 12:00 UTC on weekdays
- Reports are generated from the tickers in `REPORT_TICKERS`
- PDFs are attached to an email sent through Resend

Set these environment variables in Vercel:

```bash
RESEND_API_KEY=re_...
REPORT_EMAIL_TO=you@example.com
REPORT_EMAIL_FROM="Ticker PDF Reports <onboarding@resend.dev>"
REPORT_TICKERS=RKLB,NVDA,TSLA
CRON_SECRET=replace-with-a-long-random-secret
```

For testing, keep `REPORT_EMAIL_FROM` as `onboarding@resend.dev` until you verify a custom domain in Resend.

## Notes

Generated reports are informational only and are not investment advice. Public finance/news endpoints can change or rate limit; production use should eventually add a dedicated market/news provider.
