import { classifyIncidentImage, AILabel } from "./riskEngine";

/**
 * Real AI Classification pipeline wrapper.
 * Connects to HuggingFace zero-shot classification API if key is present,
 * otherwise falls back to local heuristic classifiers with simulated latency.
 */
export async function classifyIncidentDescription(description: string): Promise<{ label: AILabel; confidence: number; isMocked: boolean }> {
  const hfKey = process.env.HF_API_KEY;

  if (hfKey) {
    try {
      console.log(`[AI Engine] Sending description to HuggingFace Inference API...`);
      const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: description,
          parameters: {
            candidate_labels: [
              "blocked drain clogged sewer grate",
              "flooded road submerged street traffic stall",
              "major waterlogging deep water",
              "minor waterlogging slow drainage puddles",
              "dry clear street normal road"
            ]
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const topLabel = result.labels[0];
        const topScore = result.scores[0];

        let mappedLabel: AILabel = "MINOR_WATERLOGGING";
        if (topLabel.includes("blocked")) mappedLabel = "BLOCKED_DRAIN";
        else if (topLabel.includes("flooded")) mappedLabel = "FLOODED_ROAD";
        else if (topLabel.includes("major")) mappedLabel = "MAJOR_WATERLOGGING";
        else if (topLabel.includes("minor")) mappedLabel = "MINOR_WATERLOGGING";
        else if (topLabel.includes("dry")) mappedLabel = "DRY";

        return {
          label: mappedLabel,
          confidence: Math.round(topScore * 100) / 100,
          isMocked: false
        };
      }
    } catch (err) {
      console.warn("[AI Engine] HuggingFace inference failed. Falling back to local heuristics.", err);
    }
  }

  // Simulated Neural Network Processing Latency (helps show loading states in hackathon demos!)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Fallback to local heuristic classifier
  const localClassification = classifyIncidentImage(description);
  return {
    ...localClassification,
    isMocked: true
  };
}
