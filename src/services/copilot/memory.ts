import { prisma } from "../db";

export async function getConversationHistory(cityId: string, limit = 6) {
  try {
    const history = await prisma.copilotConversation.findMany({
      where: { cityId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    
    // Reverse to chronological order (asc)
    const sorted = [...history].reverse();
    
    const messages: any[] = [];
    sorted.forEach((h) => {
      messages.push({ role: "user", content: h.userQuery });
      
      // Attempt to wrap response in standard assistant format
      let formattedResponse = h.aiResponse;
      try {
        const parsed = JSON.parse(h.aiResponse);
        formattedResponse = parsed.summary || h.aiResponse;
      } catch (e) {
        // Not JSON
      }
      
      messages.push({ role: "assistant", content: formattedResponse });
    });
    
    return messages;
  } catch (error) {
    console.error("[Memory Service] Error fetching conversation history:", error);
    return [];
  }
}
