import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, ChevronDown } from "lucide-react";

interface CodeSizeSelectorProps {
  codeSize: "small" | "medium" | "big";
  onChange: (size: "small" | "medium" | "big") => void;
}

const CodeSizeSelector = ({ codeSize, onChange }: CodeSizeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizes = [
    {
      value: "small" as const,
      label: "Small",
      description: "Minimal, concise solution",
      icon: "📝",
    },
    {
      value: "medium" as const,
      label: "Medium",
      description: "Balanced with essential comments",
      icon: "📄",
    },
    {
      value: "big" as const,
      label: "Big",
      description: "Detailed with comments & tests",
      icon: "📚",
    },
  ];

  const currentSize = sizes.find(s => s.value === codeSize) || sizes[1];

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        title="Choose code solution size"
      >
        <Code2 className="h-4 w-4" />
        <span className="hidden sm:inline">{currentSize.label}</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <Card className="absolute right-0 mt-2 w-72 z-50 p-2 shadow-lg">
            <div className="space-y-1">
              {sizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    onChange(size.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    codeSize === size.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{size.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{size.label}</span>
                        {codeSize === size.value && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <p className="text-xs opacity-80">
                        {size.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CodeSizeSelector;
