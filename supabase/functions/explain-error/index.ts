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

    const systemPrompt = `You are the "C Compiler Assistant". Analyze C code for syntax errors, logical errors, runtime errors, undefined behavior, and correctness.

Output valid JSON only. Schema:

{
 "fix_summary": string,          // Short list of all errors found (or "Code is correct")
 "corrected_code": string,       // COMPLETE corrected source code as a single string. If no errors, return original code.
 "summary": string,              // 1-2 sentence plain-language summary
 "root_cause_lines": [int],      // Line numbers causing problems (1-indexed), empty if no errors
 "detailed_explanation": string, // ALWAYS explain: (a) purpose, (b) issues found, (c) why problems occur, (d) how fixed, (e) test cases
 "minimal_fix_patch": {
     "type": "replace",
     "line_start": int,
     "line_end": int,
     "replacement": string       // ONLY corrected lines, NOT original code
 } | null,
 "hints": [string],              // 2-4 educational hints
 "learning_resources": [ { "title": string, "type": string, "url": string } ],
 "confidence": number            // 0.0-1.0
}

CRITICAL RULES:
1. ALWAYS return "corrected_code" with the FULL corrected program. Do NOT append fixes - REPLACE wrong lines.
2. In "replacement": provide ONLY corrected lines that replace line_start to line_end. No duplicates.
3. Detect uninitialized variables - add initialization (e.g., int a = 0, b = 0;).
4. Check scanf usage - wrap with: if (scanf(...) != expected_count) { fprintf(stderr, "Invalid input\\n"); return 1; }
5. Fix logical errors (e.g., printing wrong variable in conditionals).
6. ALWAYS provide detailed_explanation covering purpose, issues, fixes, and test cases.
7. For correct code, set minimal_fix_patch to null.
8. Keep explanations beginner-friendly with concrete examples.
9. Provide real learning_resources URLs from: cppreference.com, learn-c.org, tutorialspoint.com, geeksforgeeks.org.
10. No garbage values: ensure all variables initialized, inputs validated.`;

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
