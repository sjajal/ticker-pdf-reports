import { NextResponse } from "next/server";
import { sendScheduledReports } from "@/lib/scheduled-reports";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendScheduledReports();
  return NextResponse.json({ ok: true, ...result });
}
