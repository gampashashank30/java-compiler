import { useState, useRef, lazy, Suspense } from "react";
// import CodeEditor from "@/components/CodeEditor"; // Lazy loaded below
import ConsoleOutput from "@/components/ConsoleOutput";
import AIExplanation from "@/components/AIExplanation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Sparkles, BookOpen, Code2, Download, Wand2, Terminal } from "lucide-react";

import { toast } from "sonner";
import { Link } from "react-router-dom";

const CodeEditor = lazy(() => import("@/components/CodeEditor"));

const defaultCode = `public class Main {
    public static void main(String[] args) {
        int[] arr = new int[5];
        // Bug: loop goes beyond array bounds
        for(int i=0; i<=5; i++) {
            arr[i] = i * 2;
        }
        System.out.println("Value: " + arr[5]);
    }
}`;

const Index = () => {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState("");
  const [outputType, setOutputType] = useState<"success" | "error" | "info" | "warning">("info");
  const [exitCode, setExitCode] = useState<number | undefined>(undefined);
  const [showAIExplanation, setShowAIExplanation] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('user_id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', id);
    }
    return id;
  });
  const currentJobRef = useRef<string | null>(null);

  // New state for language detection and visual feedback
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [errorLines, setErrorLines] = useState<number[]>([]);
  const [fixedLines, setFixedLines] = useState<number[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleRunCode = async () => {
    // Clear console immediately when starting a new run
    setOutput("");
    setOutputType("info");
    setExitCode(undefined);
    setShowAIExplanation(false);
    setAiExplanation(null);
    setIsRunning(true);

    toast.loading("Compiling code...");

    try {
      const { runJavaCompilerSimulation } = await import("@/utils/compiler");
      const { trackMistakes } = await import("@/utils/mistakeTracker");

      // Pass userInputs directly to the compiler
      const result = await runJavaCompilerSimulation(code, userInputs);

      // Update Output State
      setOutput(result.output);
      setExitCode(result.exitCode);
      setOutputType(result.outputType);

      // Handle Foreign Language Detection
      if (result.isForeignLanguage && result.detectedLanguage) {
        setDetectedLanguage(result.detectedLanguage);
        toast.error(`Detected ${result.detectedLanguage} code`, {
          description: "Click 'Fix Code' to automatically convert to Java.",
          action: {
            label: "Fix Code",
            onClick: () => handleAutoConvert(result.detectedLanguage!)
          },
          duration: 10000,
        });
        return;
      } else {
        setDetectedLanguage(null);
      }

      // Update Error Highlights (Red)
      if (result.logicalErrors.length > 0) {
        const lines = result.logicalErrors.map(e => e.line).filter(l => l > 0);
        setErrorLines(lines);
      } else if (result.exitCode !== 0) {
        // Try to parse line numbers from standard compiler output
        const errorLineRegex = /:(\d+):\s+error:/g;
        const matches = [...result.output.matchAll(errorLineRegex)];
        const lines = matches.map(m => parseInt(m[1]));
        setErrorLines(lines);
      } else {
        setErrorLines([]);
      }


      // --- LOCAL STORAGE TRACKING ---

      // 1. Compile History
      try {
        const historyItem = {
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          status: result.exitCode === 0 && result.logicalErrors.length === 0 ? "done" : "error",
          code: code,
          run_output: result.exitCode === 0 ? result.output : null,
          raw_compiler_output: result.exitCode !== 0 ? result.output : null,
          logical_errors: result.logicalErrors
        };

        const existingHistory = JSON.parse(localStorage.getItem('compile_history') || '[]');
        const newHistory = [historyItem, ...existingHistory].slice(0, 20);
        localStorage.setItem('compile_history', JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to save history:", e);
      }

      // 2. Mistake Tracker
      trackMistakes(result.output);

      // -------------------------------------------------------

      // AI Analysis Logic
      const shouldAnalyze = result.exitCode !== 0 || result.logicalErrors.length > 0;

      if (shouldAnalyze) {
        toast.dismiss();
        toast.loading("Analyzing with AI (Groq)...");

        try {
          const { callGroqAPI } = await import("@/utils/groqClient");

          const prompt = `
                You are a helpful Java programming tutor. Analyze the following Java code and compiler output.
                
                CODE:
                ${code}
                
                COMPILER/RUNTIME OUTPUT:
                ${result.output}
                
                LOGICAL ERRORS DETECTED:
                ${JSON.stringify(result.logicalErrors)}
                
                Provide a JSON response with the following structure:
                {
                    "summary": "Short summary of the issue(s)",
                    "detailed_explanation": "Detailed explanation of what went wrong and why",
                    "fix_summary": "One sentence on how to fix it",
                    "corrected_code": "The full corrected Java code (formatted naturally)",
                    "minimal_fix_patches": [
                        {
                            "line_start": number,
                            "line_end": number,
                            "replacement": "The replacement lines only"
                        }
                    ], 
                    "root_cause_lines": [line_numbers],
                    "hints": ["hint1", "hint2"],
                    "confidence": number (0.0 to 1.0)
                }
                
                IMPORTANT: 
                - Identify ALL issues (syntax, logical, runtime).
                - 'minimal_fix_patches' should contain fixes for ALL identified issues.
                `;

          const aiData = await callGroqAPI([
            { role: "system", content: "You are a Java programming expert. Always reply in JSON." },
            { role: "user", content: prompt }
          ]);
          setAiExplanation(aiData);
          setShowAIExplanation(true);
        } catch (e) {
          console.error("AI Error", e);
          const { generateMockExplanation } = await import("@/utils/mockAI");
          const mockExp = generateMockExplanation(code, result.output, result.logicalErrors);
          setAiExplanation(mockExp);
          setShowAIExplanation(true);
        }

        if (result.logicalErrors.length > 0) {
          toast.dismiss();
          toast.warning("Logical Warnings Found");
        } else {
          toast.dismiss();
          toast.error("Compilation Failed");
        }
      } else {
        toast.dismiss();

        // Even if Execution is Successful, we run AI to check for semantic/logical errors
        // that static analysis missed (e.g. Prime Check logic, Palindrome logic).
        toast.success("Execution Successful - Running AI Logic Check...");

        try {
          const { callGroqAPI } = await import("@/utils/groqClient");
          // Extract Class Name for Context (e.g. "Largest", "PrimeCheck")
          const classNameMatch = code.match(/class\s+(\w+)/);
          const className = classNameMatch ? classNameMatch[1] : "Unknown";

          // Use the SAME prompt structure as failure, but frame it as a 'Logic Audit'
          const prompt = `
                 The code ran successfully (Exit Code 0), but as a Senior Code Auditor, I need you to Verify the LOGIC.
                 
                 CONTEXT / INTENT:
                 The Class Name is "${className}". 
                 (e.g. If class is "Largest", code MUST find the largest number. If "Prime", it MUST correctly check Primes.)
                 
                 CODE: 
                 ${code}
                 
                 OUTPUT: 
                 ${result.output}
                 
                 YOUR TASK:
                 Analyze if the code *actually* performs the task implied by the Class Name "${className}".
                 Also check for generic logical errors, silent failures, or edge cases.
                 
                 Look for:
                 - Semantic Errors (Does it do what the Class Name says?)
                 - Mathematical errors (formulas, order of operations).
                 - Logic flaws (wrong conditions, unreachable code).
                 - Loop errors (ranges, termination).
                 - State inconsistencies.
                 
                 If the logic is 100% correct and robust, return "minimal_fix_patches": [] and "summary": "Code works perfectly".
                 If there is ANY flaw (even minor), provide the fix.

                 Provide a JSON response:
                 {
                     "summary": "Summary of logical flaw",
                     "detailed_explanation": "Why the logic is wrong",
                     "fix_summary": "Correction",
                     "corrected_code": "Full Corrected Code",
                     "minimal_fix_patches": [ { "line_start": number, "line_end": number, "replacement": "string" } ],
                     "confidence": number (1.0 = definitely wrong, 0.0 = unsure)
                 }
                `;

          const aiData = await callGroqAPI([
            { role: "system", content: "You are a Senior Java Code Auditor. You verify if the code matches the Class Name intent. JSON only." },
            { role: "user", content: prompt }
          ]);

          setAiExplanation(aiData);
          setShowAIExplanation(true); // Always show explanation for audit

          // If AI found patches, treat it as a "Warning" state so user sees Auto Fix
          if (aiData.minimal_fix_patches && aiData.minimal_fix_patches.length > 0) {
            toast.warning("AI Detected Hidden Logical Errors!");
            // Visually indicate something is wrong even if compiler passed
            setOutputType("warning");
          } else {
            toast.success("AI Verification Passed: Code looks good!");
          }

        } catch (e) {
          console.error("AI Audit Logic Failed", e);
        }
      }
    } catch (err) {
      console.error("Runner error:", err);
      toast.dismiss();
      toast.error("System Error: " + (err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyPatch = () => {
    if (!aiExplanation) return;

    // Priority 1: Use corrected_code if available (full file replacement)
    // This is the safest for 'Fix All' as it guarantees consistency
    if (aiExplanation.corrected_code) {
      setCode(aiExplanation.corrected_code);

      const lines = aiExplanation.corrected_code.split('\n');
      const allLines = lines.map((_: any, i: number) => i + 1);
      setFixedLines(allLines);
      setTimeout(() => setFixedLines([]), 3000);

      toast.success("All fixes have been applied!");
      return;
    }

    // Priority 2: Use minimal_fix_patches (Multi-patch)
    // We strictly prefer corrected_code for multiple fixes to avoid index shifting issues,
    // but if the AI returns patches, we try to apply them bottom-up.
    if (aiExplanation.minimal_fix_patches && Array.isArray(aiExplanation.minimal_fix_patches)) {
      let currentCodeLines = code.split('\n');

      // Sort patches by line_start descending to avoid index shifting
      const sortedPatches = [...aiExplanation.minimal_fix_patches].sort((a, b) => b.line_start - a.line_start);
      const fixedIndices: number[] = [];

      for (const patch of sortedPatches) {
        const before = currentCodeLines.slice(0, patch.line_start - 1);
        const after = currentCodeLines.slice(patch.line_end); // line_end is inclusive in prompt usually, so slice from line_end (1-based) which is index line_end.
        const replacementLines = patch.replacement.split('\n');

        currentCodeLines = [...before, ...replacementLines, ...after];

        // visuals
        const len = replacementLines.length;
        for (let k = 0; k < len; k++) fixedIndices.push(patch.line_start + k);
      }

      setCode(currentCodeLines.join('\n'));
      setFixedLines(fixedIndices);
      setTimeout(() => setFixedLines([]), 3000);
      toast.success("Applied fixes!");
      return;
    }

    // Legacy Fallback (singular)
    if (aiExplanation.minimal_fix_patch) {
      const patch = aiExplanation.minimal_fix_patch;
      const lines = code.split('\n');
      const before = lines.slice(0, patch.line_start - 1);
      const after = lines.slice(patch.line_end);
      const replacementLines = patch.replacement.split('\n');
      const newCode = [...before, ...replacementLines, ...after].join('\n');

      setCode(newCode);

      const startLine = patch.line_start;
      const endLine = startLine + replacementLines.length - 1;
      const fixedRange = [];
      for (let i = startLine; i <= endLine; i++) fixedRange.push(i);

      setFixedLines(fixedRange);
      setTimeout(() => setFixedLines([]), 3000);

      toast.success("Code updated with suggested fix!");
    }
  };

  const handleAutoConvert = async (sourceLang: string) => {
    setIsTranslating(true);
    toast.loading(`Converting from ${sourceLang} to Java...`);

    try {
      const { convertToJava } = await import("@/utils/compiler");
      const convertedCode = await convertToJava(code, sourceLang);

      // Calculate Highlighted Lines (Green) - Simple diff: All new lines are "fixed"
      // Ideally we could diff properly, but for conversion entire file changes basically.
      // Let's mark all non-empty lines as fixed for visual feedback.
      const lines = convertedCode.split('\n');
      const nonEmptyLines = lines.map((_, i) => i + 1); // Mark all lines

      setCode(convertedCode);
      setFixedLines(nonEmptyLines);
      setDetectedLanguage(null);
      setErrorLines([]); // Clear errors

      toast.dismiss();
      toast.success("Converted to Java Successfully!", {
        description: "Changed lines are highlighted in green."
      });

      // Remove green highlight after 3 seconds
      setTimeout(() => setFixedLines([]), 3000);

    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Conversion failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/x-java-source" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Main.java";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File downloaded successfully");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Java Compiler Studio
                </h1>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                with AI-powered debugging
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sm:hidden">⚙️</span>
                </Button>
              </Link>
              <Link to="/aiask">
                <Button variant="outline" size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Study Assistant</span>
                  <span className="sm:hidden">AI Ask</span>
                </Button>
              </Link>

              {(aiExplanation?.corrected_code || aiExplanation?.minimal_fix_patch) && (
                <Button
                  onClick={handleApplyPatch}
                  variant="default"
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 text-white"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto Fix</span>
                </Button>
              )}

              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                onClick={handleRunCode}
                disabled={isRunning}
                size="sm"
                className="gap-2 bg-gradient-to-r from-success to-success/80 hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Run Code
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full grid md:grid-cols-2 gap-4 p-4">
          {/* Editor Section */}
          <div className="h-full overflow-hidden relative group">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center bg-black border border-border/50 rounded-lg">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Code2 className="h-8 w-8 animate-pulse opacity-50" />
                  <p className="text-sm">Loading Editor...</p>
                </div>
              </div>
            }>
              <CodeEditor
                value={code}
                onChange={(value) => setCode(value || "")}
                errorLines={errorLines}
                fixedLines={fixedLines}
              />
            </Suspense>

            {detectedLanguage && (
              <div className="absolute bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                <Card className="p-4 border-destructive bg-destructive/10 shadow-lg backdrop-blur-sm flex flex-col gap-2 max-w-xs">
                  <div className="flex items-center gap-2 text-destructive font-semibold">
                    <span className="text-xl">⚠️</span>
                    Detected {detectedLanguage} code
                  </div>
                  <p className="text-xs text-muted-foreground">This compiler only supports Java.</p>
                  <Button
                    onClick={() => handleAutoConvert(detectedLanguage)}
                    disabled={isTranslating}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 text-white w-full shadow-md"
                  >
                    {isTranslating ? (
                      <><Sparkles className="w-3 h-3 mr-2 animate-spin" /> Converting...</>
                    ) : (
                      <><Wand2 className="w-3 h-3 mr-2" /> Auto Fix</>
                    )}
                  </Button>
                </Card>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="h-full overflow-hidden">
            <Tabs defaultValue="console" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-2">
                <TabsTrigger value="console" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="input" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Explanation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="console" className="flex-1 m-0 overflow-hidden">
                <ConsoleOutput output={output} type={outputType} exitCode={exitCode} />
              </TabsContent>

              <TabsContent value="input" className="flex-1 m-0 overflow-hidden">
                <Card className="h-full p-4 border-border/50 bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Provide standard input (stdin) for your program here:</p>
                  <textarea
                    className="w-full h-[calc(100%-2rem)] bg-muted/50 p-4 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter input values here, separated by newlines..."
                    value={userInputs.join("\n")}
                    onChange={(e) => setUserInputs(e.target.value.split("\n"))}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
                {showAIExplanation && aiExplanation ? (
                  <AIExplanation
                    explanation={aiExplanation}
                    onApplyPatch={handleApplyPatch}
                  />
                ) : (
                  <Card className="h-full overflow-hidden border-border/50 bg-card">
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No AI analysis yet</p>
                      <p className="text-sm">Run your code to get AI-powered explanations and insights</p>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      < footer className="flex-shrink-0 border-t border-border/50 bg-card px-4 py-2" >
        <div className="container mx-auto">
          <p className="text-xs text-muted-foreground text-center">
            Educational Java compiler with AI-powered error explanations • Currently in demo mode
          </p>
        </div>
      </footer >
    </div >
  );
};

export default Index;
