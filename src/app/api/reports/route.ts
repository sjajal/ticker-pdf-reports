import { NextResponse } from "next/server";
import { buildTickerReport } from "@/lib/report-data";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ticker?: string } | null;
  const ticker = body?.ticker?.trim();

  if (!ticker || !/^\$?[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(ticker)) {
    return NextResponse.json({ error: "Enter a valid ticker." }, { status: 400 });
  }

  const report = await buildTickerReport(ticker);
  return NextResponse.json(report);
}
