import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";
import { classifyIncidentImage } from "../../../services/riskEngine";
import { findWardForCoordinate, updateWardRiskScore } from "../../../services/wardHelper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    // Build filters
    const where: any = {};
    if (wardId) where.wardId = wardId;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const incidents = await prisma.incidentReport.findMany({
      where,
      include: { ward: true },
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
    const { latitude, longitude, description, imageUrl, reporterName, reporterPhone } = body;

    if (!latitude || !longitude || !description) {
      return NextResponse.json({ error: "Latitude, longitude, and description are required" }, { status: 400 });
    }

    // 1. AI Image/Description Classification
    const { label, confidence } = classifyIncidentImage(description);

    // 2. Severity Mapping based on AI labels
    let severity = "LOW";
    if (label === "FLOODED_ROAD") severity = "CRITICAL";
    else if (label === "MAJOR_WATERLOGGING") severity = "HIGH";
    else if (label === "BLOCKED_DRAIN") severity = "MEDIUM";
    else if (label === "MINOR_WATERLOGGING") severity = "LOW";

    // 3. Find Ward via GeoJSON Point-in-Polygon mapping
    const wardId = await findWardForCoordinate(latitude, longitude);

    // 4. Save Incident Report to SQLite Database
    const newIncident = await prisma.incidentReport.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        imageUrl: imageUrl || "/demo-flood.jpg",
        aiLabel: label,
        aiConfidence: confidence,
        severity,
        status: "REPORTED",
        reporterName: reporterName || "Anonymous Citizen",
        reporterPhone: reporterPhone || null,
        wardId
      },
      include: { ward: true }
    });

    // 5. If linked to a ward, recalculate that ward's risk score
    if (wardId) {
      await updateWardRiskScore(wardId);
    }

    return NextResponse.json(newIncident, { status: 201 });
  } catch (error: any) {
    console.error("POST incidents error:", error);
    return NextResponse.json({ error: error.message || "Failed to create incident report" }, { status: 500 });
  }
}
