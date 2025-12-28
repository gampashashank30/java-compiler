
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
        console.error("AI API Call Failed:", error);
        throw error;
    }
};
