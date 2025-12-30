import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, compilerOutput, runtimeOutput, userId } = await req.json();

    console.log("Explaining error for code length:", code?.length);
    console.log("Compiler output:", compilerOutput);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Act as a patient, high-level technical thought partner for a 1st-year engineering student. Your goal is to analyze C code and provide fixes that match the learner's complexity level.

Output valid JSON only. Schema:

{
 "fix_summary": string,          // Short list of all errors found (or "Code is correct")
 "corrected_code": string,       // COMPLETE corrected source code. MUST INCLUDE INPUT ECHOING logic.
 "summary": string,              // 1-2 sentence plain-language summary
 "root_cause_lines": [int],      // Line numbers causing problems
 "detailed_explanation": string, // Formatted as specific Topic, Why, Fix.
 "minimal_fix_patch": { "type": "replace", "line_start": int, "line_end": int, "replacement": string } | null,
 "hints": [string],
 "learning_resources": [ { "title": string, "type": string, "url": string } ],
 "topic_detected": string        // e.g. "Basic Arithmetic", "Recursion", "Conditional Logic"
}

Core Directives:
1. **Maintain Simplicity**: If the code uses basic concepts, do NOT suggest complex solutions. Keep corrections simple.
2. **Input Echoing**: ALWAYS ensure corrected code prints scanf values back (e.g., 'printf("\\nYou entered: %d", var);'). This is CRITICAL for the web UI.
3. **Context-Aware Explanations**:
   - **Recursion**: Discuss base cases and stack overflow.
   - **Functions**: Discuss scope and return types.
   - **Basic Procedural**: Focus on syntax, logic, and format specifiers (%d).
4. **Logical Warning Logic**: Flag logical issues (e.g., missing printf placeholder) even if it runs.
5. **Output Formatting**:
   - **Topic Detected**: Identify the concept.
   - **Why it didn't show in Console**: Explain scanf is silent; printf is needed.
   - **Fix Summary**: Use bullet points.
6. **Constraints**: Avoid advanced headers like <limits.h> unless already present. Use standard <stdio.h>.

CRITICAL: Return valid JSON.`;

    const userMessage = JSON.stringify({
      code,
      compiler_output: compilerOutput,
      runtime_output: runtimeOutput || "",
      language: "c",
      context: "student requested a beginner-friendly explanation and not full solution",
    });

    console.log("Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    let explanation;
    try {
      const content = aiData.choices[0].message.content;
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      explanation = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a fallback explanation
      explanation = {
        summary: "Failed to parse AI explanation",
        root_cause_lines: [],
        detailed_explanation: "The AI returned an invalid response. Please try again.",
        minimal_fix_patch: { type: "replace", line_start: 1, line_end: 1, replacement: "" },
        hints: ["Try running the code again"],
        learning_resources: [],
        confidence: 0.1,
      };
    }

    // Calculate mistake counts
    const mistakeCounts: Record<string, number> = {};

    // Count missing semicolons
    const semicolonErrors = (compilerOutput.match(/expected ';'/g) || []).length +
      (compilerOutput.match(/missing ';'/g) || []).length;
    if (semicolonErrors > 0) mistakeCounts[';'] = semicolonErrors;

    // Count missing ampersands (scanf issues)
    const ampErrors = (compilerOutput.match(/scanf.*expected.*&/g) || []).length;
    if (ampErrors > 0) mistakeCounts['&'] = ampErrors;

    // Heuristic: check for scanf without & in code
    const scanfRegex = /scanf\s*\(\s*"[^"]*"\s*,\s*([^)]+)\)/g;
    let match;
    while ((match = scanfRegex.exec(code)) !== null) {
      const args = match[1].split(',').map(x => x.trim());
      for (const arg of args) {
        if (!arg.startsWith('&') && !/\[/.test(arg)) {
          mistakeCounts['&'] = (mistakeCounts['&'] || 0) + 1;
        }
      }
    }

    explanation.mistake_counts = mistakeCounts;

    return new Response(JSON.stringify(explanation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in explain-error function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        summary: "An error occurred while processing your request",
        confidence: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
