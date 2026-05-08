"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Mail,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type GeneratedReport = {
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

type QueueItem = {
  id: string;
  ticker: string;
  status: "queued" | "working" | "ready" | "error";
  message: string;
  report?: GeneratedReport;
};

function parseTickers(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((ticker) => ticker.trim().replace(/^\$/, "").toUpperCase())
        .filter((ticker) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)),
    ),
  );
}

function downloadReport(report: GeneratedReport) {
  const byteCharacters = atob(report.pdfBase64);
  const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportDashboard() {
  const [input, setInput] = useState("RKLB, NVDA, TSLA");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const tickers = useMemo(() => parseTickers(input), [input]);
  const completed = queue.filter((item) => item.status === "ready").length;

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!tickers.length || isGenerating) return;

    const initialQueue = tickers.map((ticker) => ({
      id: `${ticker}-${Date.now()}`,
      ticker,
      status: "queued" as const,
      message: "Waiting to start",
    }));

    setQueue(initialQueue);
    setIsGenerating(true);

    for (const item of initialQueue) {
      setQueue((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, status: "working", message: "Collecting market context" }
            : row,
        ),
      );

      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: item.ticker }),
        });

        if (!response.ok) {
          throw new Error("Report generation failed");
        }

        const report = (await response.json()) as GeneratedReport;
        setQueue((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  status: "ready",
                  message: "PDF ready",
                  report,
                }
              : row,
          ),
        );
      } catch {
        setQueue((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  status: "error",
                  message: "Could not generate report",
                }
              : row,
          ),
        );
      }
    }

    setIsGenerating(false);
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <div className="eyebrow">
            <Sparkles size={15} />
            Research cockpit
          </div>
          <h1>Ticker PDF Reports</h1>
        </div>
        <div className="market-strip" aria-label="Report stats">
          <span>{tickers.length} tickers parsed</span>
          <span>{completed} PDFs ready</span>
          <span>Vercel-ready</span>
        </div>
      </section>

      <section className="workspace">
        <div className="primary-panel">
          <form className="command" onSubmit={handleGenerate}>
            <div className="field">
              <Search size={18} />
              <input
                aria-label="Stock tickers"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Enter tickers: RKLB, TSLA, NVDA"
              />
            </div>
            <button className="generate" disabled={!tickers.length || isGenerating}>
              {isGenerating ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Generate PDFs
            </button>
          </form>

          <div className="ticker-preview">
            {tickers.map((ticker) => (
              <span key={ticker}>${ticker}</span>
            ))}
          </div>

          <div className="queue-header">
            <div>
              <h2>Generation Queue</h2>
              <p>One source-backed PDF brief per ticker.</p>
            </div>
            <button className="ghost" onClick={() => setQueue([])} disabled={!queue.length}>
              <Trash2 size={16} />
              Clear
            </button>
          </div>

          <div className="queue">
            {queue.length === 0 ? (
              <div className="empty-state">
                <FileText size={34} />
                <h3>No reports yet</h3>
                <p>Enter tickers and generate polished PDF briefs with market context, themes, risks, and sources.</p>
              </div>
            ) : (
              queue.map((item) => <QueueRow key={item.id} item={item} />)
            )}
          </div>
        </div>

        <aside className="side-panel">
          <div className="side-card accent">
            <div className="side-icon">
              <BarChart3 size={20} />
            </div>
            <h2>Report Format</h2>
            <p>Quick read, market snapshot, discussion themes, bull case, bear case, caveats, and linked sources.</p>
          </div>

          <div className="side-card">
            <h2>Ready PDFs</h2>
            <div className="history-list">
              {queue.filter((item) => item.report).length === 0 ? (
                <p className="muted">Generated reports will appear here.</p>
              ) : (
                queue
                  .filter((item) => item.report)
                  .map((item) => (
                    <button
                      className="history-item"
                      key={item.id}
                      onClick={() => item.report && downloadReport(item.report)}
                    >
                      <span>
                        <strong>${item.ticker}</strong>
                        <small>{item.report?.companyName}</small>
                      </span>
                      <ArrowDownToLine size={16} />
                    </button>
                  ))
              )}
            </div>
          </div>

          <div className="side-card schedule-card">
            <div className="schedule-title">
              <Clock3 size={18} />
              <h2>Scheduled Reports</h2>
            </div>
            <div className="schedule-grid">
              <span>
                <Mail size={15} />
                Email delivery
              </span>
              <span>
                <Settings2 size={15} />
                Env configured
              </span>
            </div>
            <p>
              Weekday morning cron is ready. Set `REPORT_EMAIL_TO`, `REPORT_TICKERS`, `RESEND_API_KEY`, and
              `CRON_SECRET` in Vercel to activate it.
            </p>
          </div>

          <div className="side-card warning">
            <AlertTriangle size={18} />
            <p>Reports are informational only. Social chatter and news sentiment are not investment advice.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const report = item.report;

  return (
    <article className="queue-row">
      <div className={`status ${item.status}`}>
        {item.status === "working" ? (
          <Loader2 className="spin" size={17} />
        ) : item.status === "ready" ? (
          <CheckCircle2 size={17} />
        ) : item.status === "error" ? (
          <AlertTriangle size={17} />
        ) : (
          <Activity size={17} />
        )}
      </div>
      <div className="row-main">
        <div className="row-title">
          <strong>${item.ticker}</strong>
          {report ? <span className={`badge ${report.rating}`}>{report.rating}</span> : null}
        </div>
        <p>{report?.quickRead ?? item.message}</p>
        {report ? <small>{report.priceLine}</small> : null}
      </div>
      {report ? (
        <button className="download" onClick={() => downloadReport(report)}>
          <ArrowDownToLine size={17} />
          PDF
        </button>
      ) : null}
    </article>
  );
}
