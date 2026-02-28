import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").trim().replace(/\/$/, "");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") ?? "NC";
    const category = searchParams.get("category") ?? "General";

    const response = await fetch(
      `${BACKEND_URL}/api/resources?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}`,
    );

    let body: { resources?: unknown[] };
    try {
      body = await response.json();
    } catch {
      body = { resources: [] };
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ resources: [] }, { status: 200 });
  }
}
