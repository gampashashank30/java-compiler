import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BookOpen, Sparkles, Clock, ExternalLink, ArrowLeft, Code } from "lucide-react";
import { type AIAskResponse } from "@/utils/mockAI";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CodeSizeSelector from "@/components/CodeSizeSelector";

interface AIAskResponseWithSolution extends AIAskResponse {
  solution?: {
    code: string;
    language: string;
    explanation: string;
  };
}

const AIAsk = () => {
  const [problemText, setProblemText] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [response, setResponse] = useState<AIAskResponseWithSolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [provideFullSolution, setProvideFullSolution] = useState(false);
  const [explicitCodeSize, setExplicitCodeSize] = useState<"small" | "medium" | "big" | null>(null);

  // Auto-map code size based on level if not explicitly set
  const codeSize = explicitCodeSize || (
    level === "beginner" ? "big" :
      level === "intermediate" ? "medium" :
        "small"
  );

  const handleSubmit = async () => {
    if (!problemText.trim()) {
      toast.error("Please enter a problem statement");
      return;
    }

    setLoading(true);
    toast.loading("Generating personalized study plan...");

    try {
      const { callGroqAPI } = await import("@/utils/groqClient");

      const prompt = `
      You are an expert Computer Science study planner specializing in Java.
      
      REQUEST PARAMETERS:
      - Topic: "${problemText}"
      - User Expertise Level: "${level}"
      - Include Full Solution: ${provideFullSolution}
      - Preferred Code Solution Size: "${codeSize}"
      
      INSTRUCTIONS ON PARAMETERS:
      1. **Expertise Level**:
         - "beginner": Use simple language, explain every concept, avoid complex syntax/concepts like Generics/Streams unless necessary.
         - "intermediate": Assume basic knowledge, focus on logic, OOP principles, and standard library usage.
         - "advanced": Use optimized explanations, discuss memory management (GC), time complexity, and advanced Java features (Streams, Concurrency).
      
      2. **Code Size** (If solution is provided):
         - "small": Provide ONLY the critical function or a minimal snippet (10-15 lines).
         - "medium": Provide a complete standard implementation (20-40 lines).
         - "big": Provide a robust, production-ready solution with error handling, comments, and edge case checks (50+ lines).

      Generate a comprehensive JSON response matching this structure:
      {
        "problem_summary": "Concise summary of what needs to be learned/solved",
        "prerequisite_topics": [
            { "topic": "Name", "priority": "high/medium/low", "why": "Reason" }
        ],
        "study_plan": [
            { "step": "Step Title", "activity": "What to do", "est_time_minutes": number }
        ],
        "practice_exercises": [
            { "title": "Exercise Name", "difficulty": "easy/medium/hard", "description": "Brief desc" }
        ],
        "resources": [
            { "title": "Resource Name", "type": "article/video/doc", "url": "valid_url_placeholder" }
        ],
        "solution": {
             "code": "The Java code solution adhering to the Code Size preference",
             "language": "java",
             "explanation": "Brief explanation of the solution"
        } (INCLUDE THIS FIELD ONLY IF Provide Full Solution is true)
      }
      `;

      const studyPlan = await callGroqAPI([
        { role: "system", content: "You are a helpful study planner. Always return valid JSON." },
        { role: "user", content: prompt }
      ]);

      setResponse(studyPlan);

      toast.dismiss();
      toast.success("Study plan generated!", {
        description: "Scroll down to see your personalized learning path",
      });
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      toast.dismiss();
      toast.error("An error occurred", {
        description: (error as Error).message || "Please try again",
      });
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "destructive";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-semibold">Back to Editor</span>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">AI Study Assistant</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          <Card className="p-6 border-border/50">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Paste Your Programming Problem
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter any programming problem or challenge, and get a personalized study plan with
                  prerequisite topics, learning resources, and practice exercises.
                </p>
                <Textarea
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="Example: Given N and an array of N integers, find number of pairs (i,j) with i<j and arr[i]+arr[j] == K"
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Experience Level
                </label>
                <div className="flex gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                    <Button
                      key={lvl}
                      variant={level === lvl ? "default" : "outline"}
                      onClick={() => setLevel(lvl)}
                      className="capitalize"
                    >
                      {lvl}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 flex-1">
                  <Switch
                    id="full-solution"
                    checked={provideFullSolution}
                    onCheckedChange={setProvideFullSolution}
                  />
                  <Label htmlFor="full-solution" className="cursor-pointer">
                    <span className="font-medium">Provide full code solution</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get a complete, working implementation (not recommended for homework)
                    </p>
                  </Label>
                </div>

                {provideFullSolution && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:block">Size:</span>
                    <CodeSizeSelector codeSize={codeSize} onChange={setExplicitCodeSize} />
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Generating Study Plan...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Generate Study Plan
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Response Section */}
          {response && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Problem Summary */}
              <Card className="p-6 border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
                <h3 className="text-lg font-semibold text-foreground mb-2">Problem Summary</h3>
                <p className="text-foreground/80">{response.problem_summary}</p>
              </Card>

              {/* Prerequisite Topics */}
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Prerequisite Topics
                </h3>
                <div className="space-y-3">
                  {response.prerequisite_topics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/50 rounded-lg border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{topic.topic}</h4>
                        <Badge variant={getPriorityColor(topic.priority)} className="capitalize">
                          {topic.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{topic.why}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Study Plan */}
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary" />
                  Recommended Study Path
                </h3>
                <div className="space-y-3">
                  {response.study_plan.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1">{step.step}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{step.activity}</p>
                        <Badge variant="secondary" className="text-xs">
                          ~{step.est_time_minutes} min
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Practice Exercises */}
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4">Practice Exercises</h3>
                <div className="space-y-3">
                  {response.practice_exercises.map((exercise, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/50 rounded-lg border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{exercise.title}</h4>
                        <Badge variant={getDifficultyColor(exercise.difficulty)} className="capitalize">
                          {exercise.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Learning Resources */}
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4">Learning Resources</h3>
                <div className="grid gap-3">
                  {response.resources.map((resource, idx) => (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors group"
                    >
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{resource.type}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </Card>

              {/* Full Code Solution (if provided) */}
              {response.solution && (
                <Card className="p-6 border-border/50 bg-gradient-to-br from-success/5 to-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="h-5 w-5 text-success" />
                    <h3 className="text-lg font-semibold text-foreground">Complete Solution</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          if (response.solution?.code) {
                            navigator.clipboard.writeText(response.solution.code);
                            toast.success("Code copied to clipboard");
                          }
                        }}
                      >
                        <Code className="h-3 w-3" />
                        Copy Code
                      </Button>
                      <Badge variant="secondary" className="capitalize">{codeSize}</Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                      <pre className="text-sm overflow-x-auto">
                        <code className="language-java">{response.solution.code}</code>
                      </pre>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">Explanation:</h4>
                      <p className="text-sm text-muted-foreground">{response.solution.explanation}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AIAsk;
