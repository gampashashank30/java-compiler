
export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// Helper to determine if we should use the backend proxy or local key
const getApiUrl = () => {
    // If we are in development and have a local key, use direct Groq API (faster dev loop)
    if (import.meta.env.DEV && GROQ_API_KEY) {
        return "https://api.groq.com/openai/v1/chat/completions";
    }
    // Otherwise (Production or no local key), use our own backend proxy
    return "/api/chat";
};

export const callGroqAPI = async (messages: ChatMessage[], jsonMode: boolean = true) => {
    // 1. Validation for purely local dev without backend
    if (import.meta.env.DEV && (!GROQ_API_KEY || GROQ_API_KEY.length < 10)) {
        console.warn("No local API Key found. Attempting to use backend proxy (requires local server functionality) ...");
    }

    const apiUrl = getApiUrl();
    const isProxy = apiUrl === "/api/chat";

    // Headers differ slightly: Proxy doesn't need our key (it has its own), Direct needs it.
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (!isProxy) {
        headers["Authorization"] = `Bearer ${GROQ_API_KEY}`;
    }

    const bodyPayload = isProxy
        ? { messages, jsonMode } // Proxy expects this simplified payload
        : { // Direct Groq API expects full param set
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 8192,
            response_format: jsonMode ? { type: "json_object" } : { type: "text" },
        };

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`AI Service Error: ${error.error?.message || error.error || response.statusText}`);
        }

        const data = await response.json();

        // Proxy returns the full Groq response object, so access path is same
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content received from AI Service");
        }

        return jsonMode ? JSON.parse(content) : content;

    } catch (error) {
        console.warn("AI API Call Failed (likely invalid/missing key or network issue). Falling back to Mock AI.", error);

        // Dynamic import to avoid circular content if possible, or just standard import usage
        const { generateMockExplanation } = await import("./mockAI");

        // Mock needs code/output context. 
        // Our callGroqAPI signature is generic (messages[]), so we have to infer or pass dummy data for mock.
        // But generateMockExplanation requires specific args (code, output, errors).
        // Since we can't easily reconstruct those from 'messages' generic array here without parsing prompt,
        // we will simple return a Generic Mock Response based on the last user message.

        const lastUserMessage = messages.slice().reverse().find(m => m.role === "user")?.content || "";

        // Simple heuristic to provide somewhat relevant mock response
        if (jsonMode) {
            return {
                summary: "AI Analysis Unavailable (Mock Mode)",
                detailed_explanation: "The AI service could not be reached (missing API Key or Network Error). Detailed analysis is disabled.",
                fix_summary: "Please check your code manually or verify API settings.",
                corrected_code: null,
                minimal_fix_patches: [],
                confidence: 0.0,
                root_cause_lines: [],
                hints: ["Check syntax manually", "Ensure semicolons and braces are correct"]
            };
        } else {
            return "AI Translation Unavailable in Mock Mode.";
        }
    }
};
