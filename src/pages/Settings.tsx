import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RotateCcw, Code2, History, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MistakeCount {
  char_text: string;
  count: number;
  last_seen: string;
}

interface CompileJob {
  id: string;
  created_at: string;
  status: string;
  raw_compiler_output: string | null;
  run_output: string | null;
  code: string;
}

const Settings = () => {
  const [mistakeCounts, setMistakeCounts] = useState<MistakeCount[]>([]);
  const [compileHistory, setCompileHistory] = useState<CompileJob[]>([]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('user_id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', id);
    }
    return id;
  });

  const fetchMistakeCounts = async () => {
    try {
      const { getMistakes } = await import("@/utils/mistakeTracker");
      setMistakeCounts(getMistakes());
    } catch (e) {
      console.error("Error loading mistakes", e);
      toast.error("Failed to load local tracking data");
    }
  };

  const fetchCompileHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('compile_history') || '[]');
      setCompileHistory(history);
    } catch (e) {
      console.error("Error loading history", e);
      toast.error("Failed to load local history");
    }
  };

  useEffect(() => {
    fetchMistakeCounts();
    fetchCompileHistory();

    // Listen for storage events (if tabs change)
    const handleStorageChange = () => {
      fetchMistakeCounts();
      fetchCompileHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId]);

  const handleReset = async (charText: string) => {
    try {
      const { resetMistake } = await import("@/utils/mistakeTracker");
      resetMistake(charText);
      toast.success(`Reset count for "${charText}"`);
      await fetchMistakeCounts();
    } catch (e) {
      toast.error("Failed to reset");
    }
  };

  const handleResetAll = async () => {
    try {
      const { resetAllMistakes } = await import("@/utils/mistakeTracker");
      resetAllMistakes();
      toast.success('Reset all mistake counts');
      await fetchMistakeCounts();
    } catch (e) {
      toast.error("Failed to reset");
    }
  };

  const getCharIcon = (char: string) => {
    switch (char) {
      case ';': return '⚡';
      case '&': return '🔗';
      case '*': return '⭐';
      case '|': return '│';
      case ')': return '❯';
      case '}': return '❭';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-semibold">Back to Editor</span>
            </Link>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="mistakes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="mistakes" className="gap-2">
                <Code2 className="h-4 w-4" />
                Mistakes Tracker
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Compile History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mistakes">
              <Card className="p-6 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Typing Mistakes Tracker</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track common special-character mistakes in your Java code
                    </p>
                  </div>
                  {mistakeCounts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAll}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset All
                    </Button>
                  )}
                </div>

                {mistakeCounts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-muted-foreground mb-2">No mistakes tracked yet!</p>
                    <p className="text-sm text-muted-foreground">
                      Start coding and the system will automatically track common errors.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mistakeCounts.map((mistake) => (
                      <div
                        key={mistake.char_text}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-3xl">{getCharIcon(mistake.char_text)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                                {mistake.char_text}
                              </Badge>
                              <span className="text-sm text-muted-foreground">×</span>
                              <span className="text-lg font-bold text-destructive">
                                {mistake.count}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last seen: {new Date(mistake.last_seen).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(mistake.char_text)}
                          className="gap-2"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="p-6 border-border/50">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Compile History</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your last 20 compilations stored permanently
                  </p>
                </div>

                {compileHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-muted-foreground mb-2">No compile history yet!</p>
                    <p className="text-sm text-muted-foreground">
                      Run your code to see compilation results here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {compileHistory.map((job) => (
                      <div key={job.id} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {job.status === 'done' ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Badge variant={job.status === 'done' ? 'default' : 'destructive'}>
                              {job.status === 'done' ? 'Success' : 'Error'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(job.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-1">Code:</h4>
                            <pre className="text-xs font-mono bg-background p-2 rounded border border-border overflow-x-auto max-h-32">
                              {job.code}
                            </pre>
                          </div>

                          {job.status === 'done' && job.run_output && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1">Output:</h4>
                              <pre className="text-xs font-mono bg-background p-2 rounded border border-success/50 overflow-x-auto text-success">
                                {job.run_output}
                              </pre>
                            </div>
                          )}

                          {job.status === 'error' && job.raw_compiler_output && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1">Error:</h4>
                              <pre className="text-xs font-mono bg-background p-2 rounded border border-destructive/50 overflow-x-auto text-destructive">
                                {job.raw_compiler_output}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
