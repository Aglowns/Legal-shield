import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").trim().replace(/\/$/, "");

const isProduction = process.env.VERCEL === "1";

function backendUnavailableMessage(): string {
  if (isProduction && (!BACKEND_URL || BACKEND_URL.includes("localhost"))) {
    return (
      "Analysis backend is not configured. " +
      "Deploy the backend (e.g. Railway, Render) and set BACKEND_URL in Vercel Environment Variables to your backend URL."
    );
  }
  return (
    "Analysis service is unavailable. " +
    "If you deployed this app, set BACKEND_URL in Vercel to your backend URL. " +
    "Otherwise ensure the backend is running at " +
    BACKEND_URL
  );
}

export async function POST(request: Request) {
  try {
    if (isProduction && (!BACKEND_URL || BACKEND_URL.includes("localhost"))) {
      return NextResponse.json(
        { detail: backendUnavailableMessage() },
        { status: 503 },
      );
    }

    const incoming = await request.formData();
    const formData = new FormData();
    const file = incoming.get("file");
    if (file instanceof Blob && file.size > 0) {
      const name = (file as File).name ?? "image.png";
      formData.set("file", file, name);
    }
    const text = incoming.get("text");
    if (typeof text === "string" && text.trim()) formData.set("text", text.trim());

    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      body: formData,
    });

    let body: { detail?: string; [k: string]: unknown };
    try {
      body = await response.json();
    } catch {
      body = { detail: "Invalid response from analysis service." };
    }

    if (!response.ok) {
      return NextResponse.json(
        { detail: body.detail ?? "Analysis failed." },
        { status: response.status },
      );
    }

    return NextResponse.json(body);
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError &&
      (error.message === "fetch failed" || error.message.includes("ECONNREFUSED"));
    const message = isNetworkError
      ? backendUnavailableMessage()
      : error instanceof Error
        ? error.message
        : "Unexpected analysis error.";
    return NextResponse.json(
      { detail: message },
      { status: isNetworkError ? 503 : 500 },
    );
  }
}
