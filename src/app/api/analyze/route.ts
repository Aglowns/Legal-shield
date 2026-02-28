import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    // Rebuild FormData so the backend receives file and text correctly (forwarding can drop files in Node)
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

    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { detail: body.detail ?? "Analysis failed." },
        { status: response.status },
      );
    }

    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
