import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";
import { classifyIncidentDescription } from "../../../services/aiService";
import { findWardForCoordinate, updateWardRiskScore } from "../../../services/wardHelper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const cityId = searchParams.get("cityId");

    const where: any = {};
    if (cityId) where.cityId = cityId;
    if (wardId) where.wardId = wardId;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const incidents = await prisma.incidentReport.findMany({
      where,
      include: { ward: true, city: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(incidents);
  } catch (error: any) {
    console.error("GET incidents error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch incidents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, description, imageUrl, reporterName, reporterPhone, cityId } = body;

    if (!latitude || !longitude || !description) {
      return NextResponse.json({ error: "Latitude, longitude, and description are required" }, { status: 400 });
    }

    const latVal = parseFloat(latitude);
    const lngVal = parseFloat(longitude);

    // 1. Process description through Zero-Shot Classification AI Pipeline
    const { label, confidence } = await classifyIncidentDescription(description);

    // 2. Map severity depending on classification label
    let severity = "LOW";
    if (label === "FLOODED_ROAD") severity = "CRITICAL";
    else if (label === "MAJOR_WATERLOGGING") severity = "HIGH";
    else if (label === "BLOCKED_DRAIN") severity = "MEDIUM";
    else if (label === "MINOR_WATERLOGGING") severity = "LOW";

    // 3. Find Ward via GeoJSON Bounding boundaries
    const wardId = await findWardForCoordinate(latVal, lngVal);

    // 4. Resolve City ID
    let resolvedCityId = cityId;
    if (resolvedCityId) {
      const cityExists = await prisma.city.findUnique({ where: { id: resolvedCityId } });
      if (!cityExists) {
        resolvedCityId = null;
      }
    }

    let finalCityId = resolvedCityId;
    if (!finalCityId) {
      if (wardId) {
        const ward = await prisma.ward.findUnique({
          where: { id: wardId },
          select: { cityId: true }
        });
        if (ward) finalCityId = ward.cityId;
      }
      if (!finalCityId) {
        // Fallback: find nearest city center coordinates
        const cities = await prisma.city.findMany();
        if (cities.length > 0) {
          let closestCity = cities[0];
          let minDistance = Infinity;
          for (const city of cities) {
            const dist = Math.pow(city.latitude - latVal, 2) + Math.pow(city.longitude - lngVal, 2);
            if (dist < minDistance) {
              minDistance = dist;
              closestCity = city;
            }
          }
          finalCityId = closestCity.id;
        } else {
          return NextResponse.json({ error: "No cities found in database. Seed needed." }, { status: 500 });
        }
      }
    }

    // 5. Create database entry
    const newIncident = await prisma.incidentReport.create({
      data: {
        latitude: latVal,
        longitude: lngVal,
        description,
        imageUrl: imageUrl || "/demo-flood.jpg",
        aiLabel: label,
        aiConfidence: confidence,
        severity,
        status: "REPORTED",
        reporterName: reporterName || "Anonymous Citizen",
        reporterPhone: reporterPhone || null,
        cityId: finalCityId,
        wardId
      },
      include: { ward: true }
    });

    // 6. Update Ward dynamic risk metrics
    if (wardId) {
      await updateWardRiskScore(wardId);
    }

    return NextResponse.json(newIncident, { status: 201 });
  } catch (error: any) {
    console.error("POST incidents error:", error);
    return NextResponse.json({ error: error.message || "Failed to create incident report" }, { status: 500 });
  }
}
