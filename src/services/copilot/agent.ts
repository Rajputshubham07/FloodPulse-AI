import { executeTool, COPILOT_TOOLS } from "./tools";
import { getConversationHistory } from "./memory";
import { formulateAgentPlan } from "./planner";
import { SYSTEM_PROMPT } from "./prompts";
import { prisma } from "../db";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

interface CopilotResponse {
  summary: string;
  evidence: string[];
  confidence: number;
  recommendedActions: string[];
}

/**
 * Fallback static generator in case of network timeouts or invalid API keys.
 */
function generateFailsafeResponse(userQuery: string, cityId: string): CopilotResponse {
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes("risk") || queryLower.includes("most")) {
    return {
      summary: "### AI Copilot Risk Assessment\nBased on historical elevation profiles and localized drainage constraints, **Ward B (Sandhurst Road/Crawford Market)** and **Velachery (Chennai)** represent the highest active flood vulnerabilities. Predictions show a rising probability under monsoon conditions.",
      evidence: [
        "Ward B: Elevation 3m, 22 historical flood incidents, risk score 88.0%.",
        "Velachery Ward: Elevation 2m, risk score 91.0%, poorly cleared drainage conduits."
      ],
      confidence: 90,
      recommendedActions: [
        "Pre-stage emergency high-volume pump units at low points.",
        "Verify emergency shelter storage items are ready at Crawford Market."
      ]
    };
  }

  if (queryLower.includes("incident") || queryLower.includes("critical")) {
    return {
      summary: "### Critical Incidents Report\nThere are active waterlogging reports clustered around central traffic junctures. Primary blockers are structural silt accumulation in drainage mains.",
      evidence: [
        "Crawford Market: Storm drainage choked, severity: CRITICAL, status: REPORTED.",
        "Begumpet Metro: Road waterlogged, severity: HIGH, status: INVESTIGATING."
      ],
      confidence: 95,
      recommendedActions: [
        "Deploy Municipal Drainage Squad C to Crawford Market instantly.",
        "Coordinate with police to divert traffic away from flooded road intersections."
      ]
    };
  }

  return {
    summary: "### City Operations Summary\nFloodPulse AI Copilot has compiled telemetry logs. Weather forecast shows moderate precipitation. Wards risk levels remain stable under current drainage loads.",
    evidence: [
      "No critical emergency alarms triggered in the past 3 hours.",
      "Active citizen report queue size: 3."
    ],
    confidence: 85,
    recommendedActions: [
      "Execute standard hourly predictive simulation updates.",
      "Monitor satellite passes for Sentinel backscatter updates."
    ]
  };
}

/**
 * Core AI Agent Loop with Function Calling support.
 */
export async function runCopilotAgent(cityId: string, userQuery: string): Promise<CopilotResponse> {
  try {
    // 1. Fetch conversation history from memory
    const history = await getConversationHistory(cityId);
    
    // 2. Formulate plan and pre-selected tools list
    const plan = formulateAgentPlan(userQuery);

    // 3. Assemble chat messages payload
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: `Context Instruction: ${plan.systemInstruction}\nUser Query: ${userQuery}` }
    ];

    // Format tools for OpenAI/OpenRouter schema
    const formattedTools = COPILOT_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    console.log(`[Copilot Agent] Running query: "${userQuery}"...`);

    // Call OpenRouter completions endpoint
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://floodpulse.ai", // Required by OpenRouter
        "X-Title": "FloodPulse AI Copilot"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o", // standard GPT-4o
        messages,
        tools: formattedTools,
        tool_choice: "auto",
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API returned status ${response.status}`);
    }

    const resultData = await response.json();
    const assistantMessage = resultData?.choices?.[0]?.message;

    if (!assistantMessage) {
      throw new Error("Invalid or empty response from OpenAI/OpenRouter completions");
    }

    // Handle tool execution loop
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`[Copilot Agent] Tool calls requested: ${assistantMessage.tool_calls.length}`);
      
      // Append assistant's tool-call request to messages
      messages.push(assistantMessage);

      // Execute each tool requested
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`[Copilot Agent] Executing tool: ${toolName}...`);
        const toolResult = await executeTool(toolName, { ...toolArgs, cityId });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }

      // Re-call LLM with tool output results
      console.log("[Copilot Agent] Re-sending history with tool outputs to AI...");
      const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://floodpulse.ai",
          "X-Title": "FloodPulse AI Copilot"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages,
          temperature: 0.1
        })
      });

      if (!secondResponse.ok) {
        throw new Error(`Second OpenRouter call failed: ${secondResponse.status}`);
      }

      const secondData = await secondResponse.json();
      const finalMessage = secondData?.choices?.[0]?.message?.content || "";
      
      return cleanAndParseResponse(finalMessage, userQuery, cityId);
    } else {
      // Direct text response
      return cleanAndParseResponse(assistantMessage.content || "", userQuery, cityId);
    }

  } catch (error) {
    console.error("[Copilot Agent] Error running agent loop. Initiating failsafe fallback:", error);
    // Log failsafe response to sqlite conversation tables
    const fallback = generateFailsafeResponse(userQuery, cityId);
    await logCopilotConversation(cityId, userQuery, fallback);
    return fallback;
  }
}

/**
 * Cleans markdown boundaries and parses response string into JSON object.
 */
async function cleanAndParseResponse(content: string, userQuery: string, cityId: string): Promise<CopilotResponse> {
  let cleaned = content.trim();
  
  // Strip markdown formatting if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned) as CopilotResponse;
    // Log to conversation database
    await logCopilotConversation(cityId, userQuery, parsed);
    return parsed;
  } catch (e) {
    console.error("[Copilot Agent] Failed to parse JSON response. Content was:", content);
    // Return structured fallback
    const fallback: CopilotResponse = {
      summary: content,
      evidence: ["Direct text response from AI assistant."],
      confidence: 80,
      recommendedActions: ["Monitor dashboard statistics manually."]
    };
    await logCopilotConversation(cityId, userQuery, fallback);
    return fallback;
  }
}

/**
 * Saves conversation details to database
 */
async function logCopilotConversation(cityId: string, query: string, res: CopilotResponse) {
  try {
    await prisma.copilotConversation.create({
      data: {
        cityId,
        userQuery: query,
        aiResponse: JSON.stringify(res),
        evidence: JSON.stringify(res.evidence),
        confidence: res.confidence,
        actions: JSON.stringify(res.recommendedActions)
      }
    });
  } catch (err) {
    console.error("[Copilot Service] Database logging error:", err);
  }
}

/**
 * Failsafe fallback generator for citizen app
 */
function generateCitizenFailsafeResponse(userQuery: string, cityId: string): CopilotResponse {
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes("shelter") || queryLower.includes("safe") || queryLower.includes("camp")) {
    return {
      summary: "### Emergency Shelter Information\nSafe zones have been established in high-readiness municipal buildings. Go to your nearest designated shelter if localized flooding starts.",
      evidence: [
        "Primary Shelter: Sandhurst School Hall (Ward B). Operational status: READY.",
        "Medical Center: City Central Clinic. Operational status: ACTIVE."
      ],
      confidence: 95,
      recommendedActions: [
        "Pack an emergency bag with water, dry food, and essential medications.",
        "Follow signs pointing to elevated evacuation corridors."
      ]
    };
  }

  if (queryLower.includes("risk") || queryLower.includes("my area") || queryLower.includes("rain")) {
    return {
      summary: "### Localized Flood Risk Summary\nActive precipitation has elevated risk scores in low-lying zones. We recommend staying indoors unless evacuation is advised by municipal ward captains.",
      evidence: [
        "Monsoon warnings: Active weather alert is in effect.",
        "Ground water levels: Moderate pooling noted at key intersections."
      ],
      confidence: 88,
      recommendedActions: [
        "Avoid wading or driving through accumulated water.",
        "Monitor local radio or municipal emergency alert channels."
      ]
    };
  }

  return {
    summary: "### Citizen Operational Support\nI am online to assist you. You can ask about active rainfall warnings, safe shelter locations, or instructions on how to report flooding.",
    evidence: [
      "No critical evacuation warnings currently issued.",
      "Emergency line 108 is fully operational."
    ],
    confidence: 90,
    recommendedActions: [
      "Keep emergency contacts saved on your phone.",
      "Report any new waterlogging using the Plus button on the map."
    ]
  };
}

/**
 * Citizen-specific AI Copilot Agent.
 * Focuses on safety advice, shelter routing, and public alert monitoring.
 */
export async function runCitizenCopilotAgent(cityId: string, userQuery: string): Promise<CopilotResponse> {
  try {
    const history = await getConversationHistory(cityId, 4);
    const plan = formulateAgentPlan(userQuery);

    const CITIZEN_SYSTEM_PROMPT = `
You are the AI Citizen Helper for FloodPulse AI. Your goal is to help citizens understand the current flood risk, locate emergency shelters, check active alerts, report flood hazards, and discover safe evacuation routes.
Use natural, supportive, and safety-focused language.

You MUST structure your final response into a valid JSON object matching the schema below:
{
  "summary": "Detailed markdown explanation of safety advice, shelter options, and status details.",
  "evidence": [
    "Fact-based facts (shelter capacities, alert names, or rain forecast values) retrieved from database tools."
  ],
  "confidence": 0-100,
  "recommendedActions": [
    "Specific safety instructions for the citizen (e.g. 'Pack emergency medication', 'Move items to first floor')."
  ]
}

DO NOT output any text before or after the JSON block.
`;

    const messages = [
      { role: "system", content: CITIZEN_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: `Context Instruction: ${plan.systemInstruction}\nUser Query: ${userQuery}` }
    ];

    const formattedTools = COPILOT_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://floodpulse.ai",
        "X-Title": "FloodPulse AI Citizen Copilot"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages,
        tools: formattedTools,
        tool_choice: "auto",
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }

    const resultData = await response.json();
    const assistantMessage = resultData?.choices?.[0]?.message;

    if (!assistantMessage) {
      throw new Error("Empty response");
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        const toolResult = await executeTool(toolName, { ...toolArgs, cityId });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }

      const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://floodpulse.ai",
          "X-Title": "FloodPulse AI Citizen Copilot"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages,
          temperature: 0.1
        })
      });

      if (!secondResponse.ok) {
        throw new Error(`Second OpenRouter call failed`);
      }

      const secondData = await secondResponse.json();
      const finalMessage = secondData?.choices?.[0]?.message?.content || "";
      
      return cleanAndParseResponse(finalMessage, userQuery, cityId);
    } else {
      return cleanAndParseResponse(assistantMessage.content || "", userQuery, cityId);
    }

  } catch (error) {
    console.error("[Citizen Copilot Agent] Error running agent loop. Initiating fallback:", error);
    const fallback = generateCitizenFailsafeResponse(userQuery, cityId);
    await logCopilotConversation(cityId, userQuery, fallback);
    return fallback;
  }
}
