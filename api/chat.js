export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, jsonMode } = req.body;

    // READ API KEY FROM SERVER ENVIRONMENT
    // Try multiple naming conventions to be safe (Vercel vs Vite vs Standard)
    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.REACT_APP_GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Context: GROQ_API_KEY not set' });
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
                max_tokens: 8192,
                response_format: jsonMode ? { type: "json_object" } : { type: "text" },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: errorData.error?.message || 'External API Error' });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
