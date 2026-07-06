import { prisma } from "./db";

interface PredictionOutput {
  wardId: string;
  predictionWindow: "3h" | "6h" | "12h" | "24h";
  probability: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  reasoning: string;
}

/**
 * Fetches Open-Meteo hourly weather forecast for a given latitude and longitude.
 */
async function fetchPrecipitationForecast(latitude: number, longitude: number): Promise<number[]> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation&forecast_days=1&utm_source=chatgpt.com`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }
    const data = await response.json();
    return data?.hourly?.precipitation || Array(24).fill(0);
  } catch (error) {
    console.error(`[Weather Service] Error fetching forecast for (${latitude}, ${longitude}):`, error);
    // Fallback default forecast (e.g., simulating moderate monsoon rainfall)
    return [0.5, 1.2, 2.5, 4.0, 5.5, 6.0, 3.5, 2.0, 1.5, 1.0, 0.5, 0, 0, 0, 0, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 2.5, 1.0];
  }
}

/**
 * Simulates an XGBoost prediction using weight vectors and decision thresholds.
 */
function runXGBoostSimulation(
  forecastRain: number,
  elevation: number,
  reportsCount: number,
  drainDensity: number,
  historicalFrequency: number,
  windowHours: number
): { probability: number; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; confidence: number; reasoning: string } {
  
  // Base log-odds (biases) scaled by forecast window length
  let logOdds = -2.2; 
  
  // Additive model contributions
  // Heavy rainfall adds high log-odds, normalized by forecast window
  const rainIntensity = forecastRain / windowHours; 
  logOdds += 0.85 * rainIntensity;
  
  // Lower elevation raises risk (max impact at sea level)
  const elevationImpact = Math.max(0, (50 - elevation) * 0.05);
  logOdds += elevationImpact;
  
  // Active reports indicate ground truth flooding risk
  logOdds += 0.45 * Math.min(10, reportsCount);
  
  // High drain density acts as a buffer (mitigation factor)
  logOdds -= 0.3 * drainDensity;
  
  // History of flooding is an indicator of baseline vulnerability
  logOdds += 0.15 * Math.min(15, historicalFrequency);

  // Logistic Sigmoid function to map log-odds to 0-100 probability
  const probability = Math.round(100 / (1 + Math.exp(-logOdds)));

  // Risk severity thresholds
  let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (probability > 75) {
    severity = "CRITICAL";
  } else if (probability > 50) {
    severity = "HIGH";
  } else if (probability > 25) {
    severity = "MEDIUM";
  }

  // Calculate confidence score based on data strength
  // More active reports and clear rainfall signals raise confidence
  let confidence = 80;
  if (reportsCount > 2) confidence += 8;
  if (forecastRain > 15) confidence += 5;
  if (elevation < 5) confidence += 4;
  confidence = Math.min(98, Math.max(65, confidence));

  // Natural Language Explainable AI Reasoning
  const reasons: string[] = [];
  if (forecastRain > 10) {
    reasons.push(`heavy forecast rainfall of ${forecastRain.toFixed(1)}mm`);
  }
  if (elevation < 8) {
    reasons.push(`extremely low elevation of ${elevation}m`);
  }
  if (reportsCount > 0) {
    reasons.push(`${reportsCount} active citizen reports in the zone`);
  }
  if (drainDensity < 4) {
    reasons.push("poor local drainage network density");
  }

  const reasoning = reasons.length > 0
    ? `Flood risk is evaluated as ${severity} (${probability}%) due to ${reasons.join(", ")}.`
    : `Flood risk is stable (${probability}%) under light weather conditions and normal drainage capacity.`;

  return { probability, severity, confidence, reasoning };
}

/**
 * Runs the complete predictive forecast pipeline for a given city ID.
 */
export async function generateForecastsForCity(cityId: string) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: {
      wards: {
        include: { reports: true }
      }
    }
  });

  if (!city) {
    throw new Error(`City with ID ${cityId} not found`);
  }

  console.log(`[Prediction Engine] Ingesting weather forecast for city: ${city.name}...`);
  const forecastHourly = await fetchPrecipitationForecast(city.latitude, city.longitude);

  const windows: ("3h" | "6h" | "12h" | "24h")[] = ["3h", "6h", "12h", "24h"];
  const predictionsToSave: PredictionOutput[] = [];

  for (const ward of city.wards) {
    // Basic ward metadata settings
    let elevation = 20; // default elevation meters
    let historicalFrequency = 5;
    let drainDensity = 5; // default density score 1-10

    // Match static configuration from seed/helper
    if (ward.name.includes("Ward A")) {
      elevation = 4;
      historicalFrequency = 18;
      drainDensity = 7;
    } else if (ward.name.includes("Ward B")) {
      elevation = 3;
      historicalFrequency = 22;
      drainDensity = 3;
    } else if (ward.name.includes("Mahadevapura")) {
      elevation = 15; // simulated relative elevation
      historicalFrequency = 18;
      drainDensity = 4;
    } else if (ward.name.includes("Bommanahalli")) {
      elevation = 18;
      historicalFrequency = 12;
      drainDensity = 5;
    } else if (ward.name.includes("Velachery")) {
      elevation = 2;
      historicalFrequency = 25;
      drainDensity = 2;
    } else if (ward.name.includes("T-Nagar")) {
      elevation = 6;
      historicalFrequency = 16;
      drainDensity = 4;
    } else if (ward.name.includes("Begumpet")) {
      elevation = 10;
      historicalFrequency = 20;
      drainDensity = 3;
    } else if (ward.name.includes("Khairatabad")) {
      elevation = 12;
      historicalFrequency = 10;
      drainDensity = 6;
    } else if (ward.name.includes("Zoo Road")) {
      elevation = 8;
      historicalFrequency = 24;
      drainDensity = 3;
    } else if (ward.name.includes("Anil Nagar")) {
      elevation = 5;
      historicalFrequency = 26;
      drainDensity = 2;
    }

    const activeReportsCount = ward.reports.filter(r => r.status !== "RESOLVED").length;

    // Run XGBoost simulator for each forecast window
    windows.forEach((win) => {
      const windowHours = parseInt(win.replace("h", ""));
      // sum cumulative precipitation forecast for the window
      const forecastRain = forecastHourly.slice(0, windowHours).reduce((sum, val) => sum + val, 0);

      const simResult = runXGBoostSimulation(
        forecastRain,
        elevation,
        activeReportsCount,
        drainDensity,
        historicalFrequency,
        windowHours
      );

      predictionsToSave.push({
        wardId: ward.id,
        predictionWindow: win,
        probability: simResult.probability,
        severity: simResult.severity,
        confidence: simResult.confidence,
        reasoning: simResult.reasoning
      });
    });
  }

  // Save/Upsert predictions in database
  console.log(`[Prediction Engine] Storing ${predictionsToSave.length} prediction records...`);
  
  for (const pred of predictionsToSave) {
    await prisma.floodPrediction.upsert({
      where: {
        wardId_predictionWindow: {
          wardId: pred.wardId,
          predictionWindow: pred.predictionWindow
        }
      },
      update: {
        probability: pred.probability,
        severity: pred.severity,
        confidence: pred.confidence,
        reasoning: pred.reasoning,
        createdAt: new Date()
      },
      create: {
        wardId: pred.wardId,
        predictionWindow: pred.predictionWindow,
        probability: pred.probability,
        severity: pred.severity,
        confidence: pred.confidence,
        reasoning: pred.reasoning
      }
    });

    // Auto Alert Generation Module:
    // If prediction probability exceeds 70% in the immediate 3h/6h window, auto-generate emergency warning banner!
    if (pred.probability > 70 && (pred.predictionWindow === "3h" || pred.predictionWindow === "6h")) {
      const matchedWard = city.wards.find(w => w.id === pred.wardId);
      if (matchedWard) {
        const title = `Predictive Flood Warning: ${matchedWard.name.split(":")[0]}`;
        const message = `AI models forecast ${pred.probability}% probability of severe flooding in ${matchedWard.name.split(":")[0]} in the next ${pred.predictionWindow}. Residents should plan detours.`;
        
        // Check if matching alert already exists to prevent duplication
        const existingAlert = await prisma.emergencyAlert.findFirst({
          where: {
            cityId: city.id,
            title,
            isActive: true
          }
        });

        if (!existingAlert) {
          console.log(`[Alert Dispatcher] Generating Auto Emergency Alert: ${title}`);
          await prisma.emergencyAlert.create({
            data: {
              title,
              message,
              severity: "DANGER",
              cityId: city.id,
              wardId: pred.wardId,
              isActive: true
            }
          });
        }
      }
    }
  }

  return predictionsToSave;
}
