import { NextResponse } from "next/server";
import { runSatelliteFloodAnalysis } from "../../../../services/satelliteFloodService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cityId, source } = body;

    if (!cityId || !source) {
      return NextResponse.json({ error: "Missing cityId or source in request body" }, { status: 400 });
    }

    if (source !== "Sentinel-1 SAR" && source !== "Sentinel-2 NDWI") {
      return NextResponse.json({ error: "Invalid sensor source type" }, { status: 400 });
    }

    const result = await runSatelliteFloodAnalysis(cityId, source);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("POST satellite analyze error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute satellite analysis" }, { status: 500 });
  }
}
