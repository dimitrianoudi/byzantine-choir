import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/status";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json(status, {
      status: status.healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        healthy: false,
        services: [
          {
            key: "status",
            name: "Status API",
            ok: false,
            message: err?.message || "Status check failed",
          },
        ],
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
