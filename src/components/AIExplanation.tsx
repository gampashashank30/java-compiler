import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface AIExplanationData {
  fix_summary?: string;
  corrected_code?: string;
  summary: string;
  root_cause_lines?: number[];
  detailed_explanation: string;
  minimal_fix_patch?: {
    type: string;
    line_start: number;
    line_end: number;
    replacement: string;
  } | null;
  hints?: string[];
  learning_resources?: Array<{
    title: string;
    type: string;
    url: string;
  }>;
  confidence?: number;
  mistake_counts?: Record<string, number>;
}

interface AIExplanationProps {
  explanation: AIExplanationData;
  onApplyPatch?: () => void;
}

const AIExplanation = ({ explanation, onApplyPatch }: AIExplanationProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPatch = () => {
    const textToCopy = explanation.corrected_code || explanation.minimal_fix_patch?.replacement || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confidenceColor =
    (explanation.confidence ?? 1) >= 0.8 ? "text-success" :
      (explanation.confidence ?? 1) >= 0.5 ? "text-accent" : "text-destructive";

  return (
    <Card className="h-full overflow-hidden border-border/50 bg-card">
      <div className="flex items-center gap-2 border-b border-border/50 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2.5">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">AI Analysis</span>
        {explanation.confidence !== undefined && (
          <Badge variant="secondary" className="ml-auto text-xs">
            <span className={confidenceColor}>
              {Math.round(explanation.confidence * 100)}% confident
            </span>
          </Badge>
        )}
      </div>

      <div className="h-[calc(100%-44px)] overflow-auto p-4 space-y-4">
        {/* Fix Summary */}
        {explanation.fix_summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-2">Fix Summary</h3>
            <p className="text-sm text-foreground/90">{explanation.fix_summary}</p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary mb-2">Summary</h3>
          <p className="text-sm text-foreground/90">{explanation.summary}</p>
        </div>

        {/* Root Cause */}
        {explanation.root_cause_lines && explanation.root_cause_lines.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Root Cause</h3>
            <div className="flex gap-2 flex-wrap">
              {explanation.root_cause_lines.map((line) => (
                <Badge key={line} variant="destructive" className="text-xs">
                  Line {line}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Corrected Code or Suggested Fix */}
        {(explanation.corrected_code || explanation.minimal_fix_patch) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {explanation.corrected_code ? "Corrected Code" : "Suggested Fix"}
              </h3>
              <Button
                size="sm"
                onClick={onApplyPatch}
                className="gap-1 bg-gradient-to-r from-success to-success/80 hover:opacity-90"
              >
                <Check className="h-3 w-3" />
                Apply Fix
              </Button>
            </div>
            <div className="bg-muted rounded-lg p-3 relative">
              <div className="flex items-center justify-between mb-2">
                {explanation.minimal_fix_patch && !explanation.corrected_code && (
                  <span className="text-xs text-muted-foreground">
                    Lines {explanation.minimal_fix_patch.line_start}-{explanation.minimal_fix_patch.line_end}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPatch}
                  className="h-7 text-xs gap-1 ml-auto"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-xs font-mono text-foreground/90 overflow-x-auto max-h-64 whitespace-pre-wrap">
                {explanation.corrected_code || explanation.minimal_fix_patch?.replacement}
              </pre>
            </div>
          </div>
        )}

        {/* Hints */}
        {explanation.hints && explanation.hints.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Learning Hints</h3>
            <ul className="space-y-2">
              {explanation.hints.map((hint, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-foreground/80">
                  <span className="text-primary">•</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Explanation (Expandable) */}
        {!showDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(true)}
            className="w-full"
          >
            Show Detailed Explanation
          </Button>
        )}

        {showDetails && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Detailed Explanation</h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {explanation.detailed_explanation}
            </p>
          </div>
        )}

        {/* Learning Resources */}
        {explanation.learning_resources && explanation.learning_resources.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Learning Resources</h3>
            <div className="space-y-2">
              {explanation.learning_resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{resource.type}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AIExplanation;
