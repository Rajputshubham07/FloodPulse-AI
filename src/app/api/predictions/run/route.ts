import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";
import { generateForecastsForCity } from "../../../../services/floodPredictionEngine";

export async function POST(request: Request) {
  try {
    let cityId: string | null = null;
    try {
      const body = await request.json();
      cityId = body?.cityId || null;
    } catch (e) {
      // Body might be empty, that's fine
    }

    if (cityId) {
      const cityExists = await prisma.city.findUnique({ where: { id: cityId } });
      const targetCityId = cityExists ? cityId : (await prisma.city.findFirst())?.id;
      if (!targetCityId) {
        return NextResponse.json({ error: "No cities found in database" }, { status: 400 });
      }
      const results = await generateForecastsForCity(targetCityId);
      return NextResponse.json({ success: true, count: results.length, data: results });
    } else {
      // Run for all cities in the DB
      const cities = await prisma.city.findMany();
      let totalSaved = 0;
      const allResults = [];
      for (const city of cities) {
        const results = await generateForecastsForCity(city.id);
        totalSaved += results.length;
        allResults.push({ city: city.name, count: results.length });
      }
      return NextResponse.json({ success: true, total: totalSaved, cities: allResults });
    }
  } catch (error: any) {
    console.error("POST /api/predictions/run error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute prediction run" }, { status: 500 });
  }
}
