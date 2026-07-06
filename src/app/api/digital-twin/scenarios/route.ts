import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    const where: any = {};
    if (cityId) {
      where.cityId = cityId;
    }

    const scenarios = await prisma.digitalTwinScenario.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: 15
    });

    return NextResponse.json(scenarios);
  } catch (error: any) {
    console.error("GET scenarios error:", error);
    return NextResponse.json({ error: error.message || "Failed to load scenarios" }, { status: 500 });
  }
}
