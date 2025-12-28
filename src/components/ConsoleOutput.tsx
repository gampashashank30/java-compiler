import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Terminal, AlertTriangle } from "lucide-react";

interface ConsoleOutputProps {
  output: string;
  type: "success" | "error" | "info" | "warning";
  exitCode?: number;
}

const ConsoleOutput = ({ output, type, exitCode }: ConsoleOutputProps) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = () => {
    switch (type) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="h-full overflow-hidden border-border/50 bg-card">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        {getIcon()}
        <span className="text-sm font-medium text-foreground">Console Output</span>
        {exitCode !== undefined && (
          <Badge variant={getBadgeVariant()} className="ml-auto text-xs">
            Exit Code: {exitCode}
          </Badge>
        )}
      </div>
      <div className="h-[calc(100%-44px)] overflow-auto">
        <pre className="p-4 text-sm font-mono text-foreground/90 whitespace-pre-wrap">
          {output || "No output yet. Click 'Run Code' to compile and execute."}
        </pre>
      </div>
    </Card>
  );
};

export default ConsoleOutput;
