import { NextResponse } from "next/server";
import { runDigitalTwinSimulation } from "../../../../services/digitalTwinEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cityId, rainfallAmount, simulationHours } = body;

    if (!cityId) {
      return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    }

    const rain = rainfallAmount !== undefined ? parseFloat(rainfallAmount) : 35;
    const hours = simulationHours !== undefined ? parseFloat(simulationHours) : 6;

    const result = await runDigitalTwinSimulation(cityId, rain, hours);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("POST simulation error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute simulation model" }, { status: 500 });
  }
}
