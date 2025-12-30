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
    const { problemText, level, provideFullSolution, codeSize } = await req.json();

    console.log("Generating study plan for level:", level);
    console.log("Problem text length:", problemText?.length);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const solutionInstruction = provideFullSolution
      ? `\n\nIMPORTANT: The user requested a FULL CODE SOLUTION. You MUST include a complete, runnable C implementation in the response. Add a "solution" object with this schema:
{
  "code": string,  // Complete, working C code
  "language": "c",
  "explanation": string  // Brief explanation of the solution approach
}

Code Requirements:
1. **Input Echoing**: Immediately after reading values (e.g. with scanf), print them back (e.g., 'printf("Received inputs: %d and %d\\n", a, b);').
2. **Type Validation**: Check the return value of scanf. If it fails (e.g., 'scanf("%d", &x) != 1'), print an error message to stderr and exit(1) gracefully.
3. **Input Buffering**: Clear the input buffer after reading to prevent issues (e.g., 'while(getchar() != '\\n');').
4. **Modern Style**: Use standard 'int main(void)' signature (or 'int main(int argc, char *argv[])'). Return 0 at the end. Use comments.
5. **Safety**: Avoid unsafe functions like 'gets'. Use 'fgets' or safe 'scanf' usage.

Code size preference: ${codeSize || 'medium'}
- If "big": Include detailed comments, error handling, and test cases
- If "medium": Include essential comments and a clean solution
- If "small": Minimal, concise solution with minimal comments`
      : '\n\nIMPORTANT: Do NOT provide a full code solution. Focus on study path, hints, and learning resources only.';

    const systemPrompt = `You are an educational curriculum designer and computer science tutor. Given a programming problem statement, return a prioritized list of prerequisite topics and a short study plan targeted to the learner's level. Output JSON only with schema:

{
 "problem_summary": string,   // 1-2 lines summarizing the problem
 "prerequisite_topics": [ { "topic": string, "priority": "high"|"medium"|"low", "why": string } ],
 "study_plan": [ { "step": string, "activity": string, "est_time_minutes": int } ],
 "practice_exercises": [ { "title": string, "difficulty": "easy"|"medium"|"hard", "description": string } ],
 "resources": [ { "title": string, "type": "article"|"video"|"doc"|"practice", "url": string } ]${provideFullSolution ? ',\n "solution": { "code": string, "language": "c", "explanation": string }' : ''}
}

Rules:

For coding problems, prioritize core CS fundamentals (data structures, algorithms, complexity), language-specific knowledge (C pointers, arrays), and common pitfalls (integer overflow, off-by-one).

Estimate time conservatively; be realistic for a ${level} level learner.

Provide at least 3 concrete resource links (articles, tutorial videos, or example problems) with real, working URLs.

If the problem is ambiguous, list clarifying questions in the study_plan as the first step.

Create a curriculum appropriate for a ${level} level programmer. For beginners, focus on fundamentals. For advanced, include optimization and edge cases.${solutionInstruction}`;

    const userMessage = JSON.stringify({
      problemText,
      level,
      provideFullSolution: provideFullSolution || false,
      codeSize: codeSize || 'medium',
    });

    console.log("Calling Lovable AI for study plan...");

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
    console.log("AI study plan response received");

    let studyPlan;
    try {
      const content = aiData.choices[0].message.content;
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      studyPlan = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a fallback study plan
      studyPlan = {
        problem_summary: "Unable to generate a complete study plan. Please try again.",
        prerequisite_topics: [
          {
            topic: "C Programming Basics",
            priority: "high",
            why: "Foundation for solving programming problems in C",
          },
        ],
        study_plan: [
          {
            step: "1. Review the problem",
            activity: "Read the problem statement carefully and identify what is being asked",
            est_time_minutes: 10,
          },
        ],
        practice_exercises: [
          {
            title: "Basic C Programs",
            difficulty: "easy",
            description: "Start with simple C programs to build confidence",
          },
        ],
        resources: [
          {
            title: "Learn C Programming",
            type: "article",
            url: "https://www.programiz.com/c-programming",
          },
        ],
      };
    }

    return new Response(JSON.stringify(studyPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-study-plan function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        problem_summary: "An error occurred while generating the study plan"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
