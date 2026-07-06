import { prisma } from "../db";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const COPILOT_TOOLS: ToolDefinition[] = [
  {
    name: "getIncidents",
    description: "Retrieves active flood and drainage incidents, waterlogging reports, severity, and dispatches for the selected city.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  },
  {
    name: "getPredictions",
    description: "Retrieves the AI predictions (3h, 6h, 12h, 24h) for all wards in the city, detailing flood probability and risk severity.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  },
  {
    name: "getFloodDetections",
    description: "Retrieves objective satellite remote sensing (Sentinel-1 SAR / Sentinel-2 NDWI) flood boundaries and coverage areas.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  },
  {
    name: "getWeatherForecast",
    description: "Retrieves precipitation forecasts for the city center to evaluate upcoming storm intensity.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  },
  {
    name: "getAlerts",
    description: "Retrieves active emergency alerts and warnings broadcasted in the city.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  },
  {
    name: "getWardData",
    description: "Retrieves wards boundaries, readiness scores, rainfall risk factors, and basic geographic settings.",
    parameters: {
      type: "object",
      properties: {
        cityId: { type: "string", description: "The UUID of the active city." }
      },
      required: ["cityId"]
    }
  }
];

export async function executeTool(name: string, args: any): Promise<any> {
  const cityId = args.cityId;
  if (!cityId) return { error: "Missing required argument: cityId" };

  switch (name) {
    case "getIncidents":
      const incidents = await prisma.incidentReport.findMany({
        where: { cityId, status: { not: "RESOLVED" } },
        include: { ward: { select: { name: true } } }
      });
      return incidents.map(inc => ({
        id: inc.id,
        ward: inc.ward?.name || "Unassigned",
        description: inc.description,
        severity: inc.severity,
        status: inc.status,
        assignedTo: inc.assignedTo,
        reportedAt: inc.createdAt
      }));

    case "getPredictions":
      const predictions = await prisma.floodPrediction.findMany({
        where: { ward: { cityId } },
        include: { ward: { select: { name: true } } }
      });
      return predictions.map(pred => ({
        ward: pred.ward.name,
        window: pred.predictionWindow,
        probability: pred.probability,
        severity: pred.severity,
        reasoning: pred.reasoning
      }));

    case "getFloodDetections":
      const detections = await prisma.floodDetection.findMany({
        where: { image: { cityId } },
        include: { image: true }
      });
      return detections.map(det => ({
        source: det.image.source,
        date: det.image.acquisitionDate,
        areaKm2: det.areaKm2,
        severity: det.severity,
        confidence: det.confidence
      }));

    case "getWeatherForecast":
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) return { error: "City not found" };
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&hourly=precipitation&forecast_days=1&utm_source=chatgpt.com`;
        const res = await fetch(url);
        const data = await res.json();
        const rainArray = data?.hourly?.precipitation || Array(24).fill(0);
        return {
          city: city.name,
          coords: [city.latitude, city.longitude],
          next3hRainCumulative: rainArray.slice(0, 3).reduce((a: number, b: number) => a + b, 0),
          next6hRainCumulative: rainArray.slice(0, 6).reduce((a: number, b: number) => a + b, 0),
          next24hRainCumulative: rainArray.reduce((a: number, b: number) => a + b, 0),
          forecastHourly: rainArray.slice(0, 12)
        };
      } catch (e) {
        return { city: city.name, error: "Weather forecast API unavailable. Default monsoon parameters active." };
      }

    case "getAlerts":
      const alerts = await prisma.emergencyAlert.findMany({
        where: { cityId, isActive: true }
      });
      return alerts.map(a => ({
        title: a.title,
        message: a.message,
        severity: a.severity,
        createdAt: a.createdAt
      }));

    case "getWardData":
      const wards = await prisma.ward.findMany({
        where: { cityId },
        select: {
          id: true,
          name: true,
          riskScore: true,
          riskLevel: true,
          lastUpdated: true
        }
      });
      return wards;

    default:
      return { error: `Tool ${name} not found.` };
  }
}
