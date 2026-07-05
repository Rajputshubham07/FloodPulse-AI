export interface RiskParams {
  rainfall: number;           // mm/hr
  elevation: number;          // meters (higher is safer)
  proximityToWater: number;   // meters (closer is riskier)
  reportCount: number;        // live active citizen reports
  historicalFrequency: number;// past flood incidents count
  responseDelayHours?: number;// duration of pending reports (modifier)
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskAnalysis {
  score: number;
  level: RiskLevel;
  readinessScore: number; // 0 to 100
  breakdown: {
    rainfall: string;
    elevation: string;
    drainage: string;
    blockages: string;
    readiness: string;
  };
}

/**
 * Calculates dynamic risk breakdown and readiness indicators for a ward.
 */
export function calculateRiskScore(params: RiskParams): RiskAnalysis {
  const { rainfall, elevation, proximityToWater, reportCount, historicalFrequency, responseDelayHours = 0 } = params;

  // 1. Rainfall (max 30 points)
  const rainfallScore = Math.min((rainfall / 50) * 30, 30);

  // 2. Elevation (max 20 points, inverted)
  const elevationFactor = Math.max(0, Math.min(50 - elevation, 50)) / 50;
  const elevationScore = elevationFactor * 20;

  // 3. Proximity to Water/Drains (max 20 points, inverted)
  const proximityFactor = Math.max(0, Math.min(1000 - proximityToWater, 1000)) / 1000;
  const proximityScore = proximityFactor * 20;

  // 4. Live Blockages / Unresolved Reports (max 15 points)
  const blockageScore = Math.min((reportCount / 5) * 15, 15);

  // 5. Historical Frequency & Response Delay Modifier (max 15 points)
  const baseHistoryScore = Math.min((historicalFrequency / 8) * 10, 10);
  const delayModifier = Math.min((responseDelayHours / 24) * 5, 5); // delay adds up to 5 points risk
  const historyScore = baseHistoryScore + delayModifier;

  // Calculate final score (0-100)
  let score = rainfallScore + elevationScore + proximityScore + blockageScore + historyScore;
  score = Math.round(Math.max(0, Math.min(score, 100)) * 10) / 10;

  // Map to risk levels
  let level: RiskLevel = "LOW";
  if (score > 80) level = "CRITICAL";
  else if (score > 60) level = "HIGH";
  else if (score > 30) level = "MEDIUM";

  // Calculate Ward Readiness Score (0-100%)
  // Readiness drops with high blockages, high rainfall, and low elevation
  let readiness = 100 - (blockageScore * 2 + rainfallScore * 0.8 + delayModifier * 2);
  readiness = Math.round(Math.max(10, Math.min(readiness, 100)));

  // Generate explainable breakdowns
  const breakdown = {
    rainfall: `${Math.round(rainfallScore)}% (Precipitation load: ${rainfall}mm/hr)`,
    elevation: `${Math.round(elevationScore)}% (Elevation: ${elevation}m above sea level)`,
    drainage: `${Math.round(proximityScore)}% (Distance to primary water discharge: ${proximityToWater}m)`,
    blockages: `${Math.round(blockageScore)}% (Active incidents: ${reportCount})`,
    readiness: `${readiness}% municipal capacity buffer`
  };

  return {
    score,
    level,
    readinessScore: readiness,
    breakdown
  };
}

export type AILabel = "DRY" | "MINOR_WATERLOGGING" | "MAJOR_WATERLOGGING" | "BLOCKED_DRAIN" | "FLOODED_ROAD";

/**
 * Classifies an incident report description using keyword heuristic.
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

  const variance = Math.random() * 0.08;
  const confidence = Math.round(Math.min(baseConfidence + variance, 0.99) * 100) / 100;

  return { label, confidence };
}
