import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Card } from "@/components/ui/card";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  errorLines?: number[];
  fixedLines?: number[];
}

const CodeEditor = ({ value, onChange, errorLines = [], fixedLines = [] }: CodeEditorProps) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define a more vibrant theme
    monaco.editor.defineTheme('vibrant-dark', {
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

    monaco.editor.setTheme('vibrant-dark');
    updateDecorations(editor, monaco);
  };

  const updateDecorations = (editor: any, monaco: any) => {
    if (!editor) return;

    const newDecorations: any[] = [];

    // Red Error Lines
    errorLines.forEach((line) => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "dsq-error-line",
          overviewRuler: {
            position: monaco.editor.OverviewRulerLane.Full,
            color: "rgba(255, 0, 0, 0.4)"
          }
        },
      });
    });

    // Green Fixed Lines
    fixedLines.forEach((line) => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "dsq-success-line",
          overviewRuler: {
            position: monaco.editor.OverviewRulerLane.Full,
            color: "rgba(0, 255, 0, 0.4)"
          }
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  // Update decorations when lines change
  useEffect(() => {
    if (editorRef.current) {
      // We need 'monaco' instance, which is available closer to mount. 
      // Ideally we store it or use the one from loader if imported, 
      // but here we can just use window.monaco or pass it from mount.
      // A cleaner way in @monaco-editor/react is using the 'monaco' prop/ref,
      // but let's assume global monaco presence or ref access.
      // Actually, @monaco-editor/react exposes monaco instance via onMount signature.
      // Let's refactor to store monaco instance too.
    }
  }, [errorLines, fixedLines]);

  // Re-implementing with proper monaco ref storage
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorRef.current, monacoRef.current);
    }
  }, [errorLines, fixedLines]);

  return (
    <Card className="h-full overflow-hidden border-border/50 bg-black">
      <Editor
        height="100%"
        defaultLanguage="java"
        theme="vibrant-dark"
        value={value}
        onChange={onChange}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;

          // Define and set the vibrant-dark theme
          monaco.editor.defineTheme('vibrant-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
              { token: 'type.identifier', foreground: '8be9fd' },
              { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
              { token: 'string', foreground: 'f1fa8c' },
              { token: 'number', foreground: 'bd93f9' },
              { token: 'delimiter', foreground: 'f8f8f2' },
              { token: 'operator', foreground: 'ff79c6' }
            ],
            colors: {
              'editor.background': '#000000',
              'editor.foreground': '#f8f8f2',
            }
          });
          monaco.editor.setTheme('vibrant-dark');

          updateDecorations(editor, monaco);
        }}
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
