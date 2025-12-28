
import { LogicalError } from "./logicalErrors";


export interface AIAskResponse {
  problem_summary: string;
  prerequisite_topics: { topic: string; priority: string; why: string }[];
  study_plan: { step: string; activity: string; est_time_minutes: number }[];
  practice_exercises: { title: string; difficulty: string; description: string }[];
  resources: { title: string; type: string; url: string }[];
}

import { EDUCATION_DATABASE, EducationalContent } from "./educationalResources";

export const generateMockExplanation = (code: string, compilerOutput: string, logicalErrors: LogicalError[]) => {
  const isCompilationError = compilerOutput.includes("error:");

  if (logicalErrors.length > 0) {
    // Prioritize explaining logical warnings if compilation passed
    const err = logicalErrors[0];
    const errorType = err.errorType || "OTHER_LOGICAL";
    const eduContent = EDUCATION_DATABASE[errorType] || EDUCATION_DATABASE["OTHER_LOGICAL"];

    // Generate patch for common off-by-one / bounds errors in loops
    let patch = undefined;
    if ((errorType === "POINTER_OUT_OF_BOUNDS" || errorType === "OFF_BY_ONE") && err.line > 0) {
      const lines = code.split('\n');
      const lineIdx = err.line - 1;
      if (lines[lineIdx]) {
        const originalLine = lines[lineIdx];
        // Simple fix for for-loops with <= (common off-by-one)
        if (originalLine.includes("<=") && originalLine.includes("for")) {
          patch = {
            line_start: err.line,
            line_end: err.line,
            replacement: originalLine.replace("<=", "<")
          };
        } else if (errorType === "POINTER_OUT_OF_BOUNDS") {
          // If it's a direct array access like arr[5], try to decrement the index by 1
          // Regex to find things like arr[5] or arr[10]
          const accessMatch = originalLine.match(/\[(\d+)\]/);
          if (accessMatch) {
            const index = parseInt(accessMatch[1]);
            if (index > 0) {
              const newIndex = index - 1;
              patch = {
                line_start: err.line,
                line_end: err.line,
                replacement: originalLine.replace(`[${index}]`, `[${newIndex}]`)
              };
            }
          }
        }
      }
    }

    return {
      summary: eduContent.title,
      detailed_explanation: `
**What's Wrong:** ${eduContent.whatsWrong}

**Why It Matters:** ${eduContent.whyItMatters}

**Concept:** ${eduContent.concept}

**Location:** Line ${err.line}
${err.message}
      `.trim(),
      fix_summary: eduContent.prevention,
      root_cause_lines: [err.line],
      hints: [eduContent.concept, ...eduContent.relatedTopics],
      confidence: 0.95,
      minimal_fix_patch: patch
    };
  }

  if (isCompilationError) {
    if (compilerOutput.includes("expected ';'")) {
      // Try to find the line number from GCC output: "program.c:15:5: error: expected ';'"
      const lineMatch = compilerOutput.match(/:(\d+):(?:\d+:)?\s+error:\s+expected\s+';'/);
      let patch = undefined;

      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        const lines = code.split('\n');

        // Strategy 1: Check if previous line is missing semi (common)
        if (lineNum > 1 && lines[lineNum - 2]) {
          const prevLine = lines[lineNum - 2].trim();
          // Don't add semi if it's a block closing, comment, or empty
          if (prevLine && !prevLine.endsWith(";") && !prevLine.endsWith("}") && !prevLine.startsWith("//") && !prevLine.startsWith("/*")) {
            patch = {
              line_start: lineNum - 1,
              line_end: lineNum - 1,
              replacement: lines[lineNum - 2].trimEnd() + ";"
            };
          }
        }

        // Strategy 2: Fallback to current line if Strategy 1 didn't trigger
        if (!patch && lines[lineNum - 1] !== undefined) {
          const currentLine = lines[lineNum - 1].trim();
          if (currentLine && !currentLine.endsWith(";") && !currentLine.endsWith("}") && !currentLine.startsWith("//")) {
            patch = {
              line_start: lineNum,
              line_end: lineNum,
              replacement: lines[lineNum - 1].trimEnd() + ";"
            };
          }
        }
      }

      return {
        summary: "Missing Semicolon",
        detailed_explanation: "In C, every statement must end with a semicolon (;). This is one of the most common errors.",
        fix_summary: "Add a semicolon at the end of the line.",
        hints: ["Look for the line reported in the error", "Check the previous line too"],
        confidence: 0.95,
        minimal_fix_patch: patch
      };
    }
    return {
      summary: "Compilation Failed",
      detailed_explanation: "The code failed to compile. Please check the syntax.",
      fix_summary: "Fix syntax errors",
      confidence: 0.5
    };
  }

  return {
    summary: "Code looks good!",
    detailed_explanation: "No obvious errors were found. Great job!",
    fix_summary: "N/A",
    confidence: 1.0
  };
};
