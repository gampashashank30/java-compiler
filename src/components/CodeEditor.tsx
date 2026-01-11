import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Card } from "@/components/ui/card";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  errorLines?: number[];
  fixedLines?: number[];
}

const CodeEditor = ({ value, onChange, errorLines = [], fixedLines = [] }: CodeEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const updateDecorations = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    if (!editor) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Red Error Lines
    errorLines.forEach((line) => {
      newDecorations.push({
        range: new monacoInstance.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "dsq-error-line",
          overviewRuler: {
            position: monacoInstance.editor.OverviewRulerLane.Full,
            color: "rgba(255, 0, 0, 0.4)"
          }
        },
      });
    });

    // Green Fixed Lines
    fixedLines.forEach((line) => {
      newDecorations.push({
        range: new monacoInstance.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "dsq-success-line",
          overviewRuler: {
            position: monacoInstance.editor.OverviewRulerLane.Full,
            color: "rgba(0, 255, 0, 0.4)"
          }
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Define a more vibrant theme
    monacoInstance.editor.defineTheme('vibrant-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' }, // Pink
        { token: 'type.identifier', foreground: '8be9fd' }, // Cyan
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' }, // Grey-Blue
        { token: 'string', foreground: 'f1fa8c' }, // Yellow
        { token: 'number', foreground: 'bd93f9' }, // Purple
        { token: 'delimiter', foreground: 'f8f8f2' }, // White
        { token: 'operator', foreground: 'ff79c6' } // Pink
      ],
      colors: {
        'editor.background': '#000000', // Pure black background
        'editor.foreground': '#f8f8f2',
      }
    });

    monacoInstance.editor.setTheme('vibrant-dark');
    updateDecorations(editor, monacoInstance);
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorRef.current, monacoRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorLines, fixedLines]); // We want to update decorations when these change. editorRef and monacoRef are refs.

  return (
    <Card className="h-full overflow-hidden border-border/50 bg-black">
      <Editor
        height="100%"
        defaultLanguage="java"
        theme="vibrant-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          folding: true,
          padding: { top: 16, bottom: 16 },
          mouseWheelZoom: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </Card>
  );
};

export default CodeEditor;
