/**
 * AI Chat Service for the assistant.
 */

export const chatWithAI = async (messages: any[], canvasState: any = null): Promise<any> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, canvasState })
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (data.chatResponse) return data;
      throw new Error(data.error || 'Chat failed');
    }
    
    return data;
  } catch (error) {
    console.error("Chat AI Error:", error);
    return { 
      chatResponse: "AI is temporarily unavailable. Please try again.",
      action: "none"
    };
  }
};
