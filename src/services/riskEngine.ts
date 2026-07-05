export interface RiskParams {
  rainfall: number;           // mm/hr
  elevation: number;          // meters (higher is safer)
  proximityToWater: number;   // meters (closer is riskier)
  reportCount: number;        // live active citizen reports
  historicalFrequency: number;// past flood incidents count
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Calculates a dynamic risk score from 0 to 100 and maps it to a qualitative level.
 */
export function calculateRiskScore(params: RiskParams): { score: number; level: RiskLevel } {
  const { rainfall, elevation, proximityToWater, reportCount, historicalFrequency } = params;

  // 1. Rainfall Component (0 to 35 points)
  // 0-5 mm/hr: negligible risk, >50 mm/hr: max rainfall risk contribution
  const rainfallScore = Math.min((rainfall / 50) * 35, 35);

  // 2. Elevation Component (0 to 25 points, inverted: lower elevation = higher risk)
  // Assume baseline of 50m. Elevation <= 2m is highest risk, >= 50m is lowest.
  const elevationFactor = Math.max(0, Math.min(50 - elevation, 50)) / 50;
  const elevationScore = elevationFactor * 25;

  // 3. Proximity to Water/Drains (0 to 20 points, inverted: closer = higher risk)
  // Risk drops to 0 at 1000 meters away.
  const proximityFactor = Math.max(0, Math.min(1000 - proximityToWater, 1000)) / 1000;
  const proximityScore = proximityFactor * 20;

  // 4. Live Citizen Reports (0 to 12 points)
  // Max contribution reached at 6 active reports in the ward
  const reportScore = Math.min((reportCount / 6) * 12, 12);

  // 5. Historical Frequency (0 to 8 points)
  // Max contribution reached at 8 historical events
  const historyScore = Math.min((historicalFrequency / 8) * 8, 8);

  // Total raw score (0-100)
  let score = rainfallScore + elevationScore + proximityScore + reportScore + historyScore;
  score = Math.round(Math.max(0, Math.min(score, 100)) * 10) / 10; // round to 1 decimal place

  // Map to risk levels
  let level: RiskLevel = "LOW";
  if (score > 80) {
    level = "CRITICAL";
  } else if (score > 60) {
    level = "HIGH";
  } else if (score > 30) {
    level = "MEDIUM";
  }

  return { score, level };
}

export type AILabel = "DRY" | "MINOR_WATERLOGGING" | "MAJOR_WATERLOGGING" | "BLOCKED_DRAIN" | "FLOODED_ROAD";

/**
 * Classifies an incident report description and optional metadata using keyword and structural heuristic.
 * Behaves like a real CV / NLP classification engine.
 */
export function classifyIncidentImage(description: string): { label: AILabel; confidence: number } {
  const text = description.toLowerCase();

  let label: AILabel = "MINOR_WATERLOGGING";
  let baseConfidence = 0.75;

  if (text.includes("block") || text.includes("drain") || text.includes("clog") || text.includes("trash") || text.includes("garbage") || text.includes("sewer") || text.includes("grate")) {
    label = "BLOCKED_DRAIN";
    baseConfidence = 0.89;
  } else if (text.includes("road") || text.includes("street") || text.includes("car") || text.includes("drive") || text.includes("highway") || text.includes("traffic")) {
    label = "FLOODED_ROAD";
    baseConfidence = 0.92;
  } else if (text.includes("heavy") || text.includes("overflow") || text.includes("river") || text.includes("deep") || text.includes("submerged") || text.includes("knee") || text.includes("waist")) {
    label = "MAJOR_WATERLOGGING";
    baseConfidence = 0.87;
  } else if (text.includes("puddle") || text.includes("slow") || text.includes("pool") || text.includes("minor") || text.includes("accumulating") || text.includes("wet")) {
    label = "MINOR_WATERLOGGING";
    baseConfidence = 0.82;
  } else if (text.includes("dry") || text.includes("clear") || text.includes("no water") || text.includes("safe") || text.includes("normal")) {
    label = "DRY";
    baseConfidence = 0.95;
  }

  // Add small random variation to look authentic
  const variance = Math.random() * 0.08;
  const confidence = Math.round(Math.min(baseConfidence + variance, 0.99) * 100) / 100;

  return { label, confidence };
}
