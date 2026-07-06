import { NextResponse } from "next/server";
import { runCopilotAgent } from "../../../../services/copilot/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cityId, query } = body;

    if (!cityId || !query) {
      return NextResponse.json({ error: "Missing cityId or query in request body" }, { status: 400 });
    }

    const result = await runCopilotAgent(cityId, query);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/copilot/chat error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute copilot query" }, { status: 500 });
  }
}
