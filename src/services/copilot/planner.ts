import { ToolDefinition } from "./tools";

export interface AgentPlan {
  toolsRequired: string[];
  systemInstruction: string;
}

/**
 * Parses user query to formulate a plan (pre-allocating tools for optimal latency,
 * or dynamically advising the OpenAI API which functions are available).
 */
export function formulateAgentPlan(userQuery: string): AgentPlan {
  const queryLower = userQuery.toLowerCase();
  const toolsRequired: string[] = [];

  if (queryLower.includes("incident") || queryLower.includes("report") || queryLower.includes("waterlogging") || queryLower.includes("blockage")) {
    toolsRequired.push("getIncidents");
  }
  if (queryLower.includes("predict") || queryLower.includes("forecast") || queryLower.includes("probabilit") || queryLower.includes("next") || queryLower.includes("hour")) {
    toolsRequired.push("getPredictions");
    toolsRequired.push("getWeatherForecast");
  }
  if (queryLower.includes("satellite") || queryLower.includes("sar") || queryLower.includes("ndwi") || queryLower.includes("radar") || queryLower.includes("detected") || queryLower.includes("verif")) {
    toolsRequired.push("getFloodDetections");
    toolsRequired.push("getIncidents"); // for ground truth comparisons
  }
  if (queryLower.includes("weather") || queryLower.includes("rain") || queryLower.includes("storm") || queryLower.includes("precip")) {
    toolsRequired.push("getWeatherForecast");
  }
  if (queryLower.includes("alert") || queryLower.includes("warning") || queryLower.includes("banner")) {
    toolsRequired.push("getAlerts");
  }
  if (queryLower.includes("ward") || queryLower.includes("risk") || queryLower.includes("readiness") || queryLower.includes("ranking") || queryLower.includes("most")) {
    toolsRequired.push("getWardData");
    toolsRequired.push("getPredictions"); // risk is predictions-linked
  }

  // Fallback: request all if query is generic
  if (toolsRequired.length === 0 || queryLower.includes("summarize") || queryLower.includes("city") || queryLower.includes("status")) {
    toolsRequired.push("getIncidents", "getPredictions", "getFloodDetections", "getWeatherForecast", "getAlerts", "getWardData");
  }

  // Deduplicate
  const uniqueTools = Array.from(new Set(toolsRequired));

  return {
    toolsRequired: uniqueTools,
    systemInstruction: `You are evaluating a query related to flood operations: "${userQuery}". You should focus on executing the pre-selected tools: ${uniqueTools.join(", ")} to satisfy the request.`
  };
}
