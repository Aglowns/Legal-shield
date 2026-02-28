import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") ?? "NC";
    const category = searchParams.get("category") ?? "General";

    const response = await fetch(
      `${BACKEND_URL}/api/resources?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}`,
    );

    const body = await response.json();
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ resources: [], error: message }, { status: 500 });
  }
}
