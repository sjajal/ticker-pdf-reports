import { sendEmail } from "./email";
import { buildTickerReport } from "./report-data";

function parseConfiguredTickers() {
  return (process.env.REPORT_TICKERS || "")
    .split(/[\s,]+/)
    .map((ticker) => ticker.trim().replace(/^\$/, "").toUpperCase())
    .filter((ticker) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendScheduledReports() {
  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM || "Ticker PDF Reports <onboarding@resend.dev>";
  const tickers = parseConfiguredTickers();

  if (!to) {
    throw new Error("REPORT_EMAIL_TO is not configured.");
  }

  if (!tickers.length) {
    throw new Error("REPORT_TICKERS is not configured.");
  }

  const reports = await Promise.all(tickers.map((ticker) => buildTickerReport(ticker)));
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const rows = reports
    .map(
      (report) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700;">$${escapeHtml(
            report.ticker,
          )}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            report.companyName,
          )}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            report.rating,
          )}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            report.priceLine,
          )}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:28px;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;padding:24px;">
        <p style="margin:0 0 8px;color:#0284c7;font-size:12px;font-weight:700;text-transform:uppercase;">Ticker PDF Reports</p>
        <h1 style="margin:0 0 12px;font-size:26px;">Daily Stock Briefs - ${escapeHtml(today)}</h1>
        <p style="margin:0 0 20px;color:#475569;line-height:1.5;">
          Your scheduled reports are attached as PDFs. These summaries are informational only and are not investment advice.
        </p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-size:14px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;">
              <th style="padding:12px;">Ticker</th>
              <th style="padding:12px;">Company</th>
              <th style="padding:12px;">Read</th>
              <th style="padding:12px;">Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  const attachments = reports.map((report) => ({
    filename: report.filename,
    content: report.pdfBase64,
  }));

  const result = await sendEmail({
    to,
    from,
    subject: `Daily stock briefs: ${tickers.join(", ")}`,
    html,
    attachments,
  });

  return {
    id: result.id,
    to,
    tickers,
    sent: reports.length,
  };
}
