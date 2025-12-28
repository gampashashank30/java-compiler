
// Simple custom printf implementation for the transpiler
const sprintf = (format: string, ...args: any[]) => {
    let i = 0;
    return format.replace(/%[-+ #0]*(\d+)?(\.\d+)?[diuoxXfFeEgGaAcCsSp]/g, (match) => {
        const val = args[i++];
        if (val === undefined) return match;
        // Basic formatting
        if (match.includes('f')) {
            return Number(val).toFixed(match.includes('.') ? parseInt(match.split('.')[1]) : 6);
        }
        return String(val);
    });
};

export const executeLocalC = (code: string, userInputs: string[] = []): string | null => {
    try {
        let jsCode = code;

        // 1. Remove Headers and Comments
        jsCode = jsCode.replace(/#include\s+<[^>]+>/g, "");
        jsCode = jsCode.replace(/\/\/[^\n]*/g, ""); // Single line
        jsCode = jsCode.replace(/\/\*[\s\S]*?\*\//g, ""); // Multi line

        // 2. Extract main body (simplistic)
        const mainMatch = jsCode.match(/int\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}/);
        if (mainMatch) {
            jsCode = mainMatch[1];
        }

        // 3. Variable Declarations (int a = 5; -> let a = 5;)
        // Match int, float, double, char, long, short, unsigned, const
        jsCode = jsCode.replace(/\b(int|float|double|char|long|short|unsigned|const)\s+/g, "let ");
        // Cleanup multiple let let (e.g. const int -> let let -> let)
        jsCode = jsCode.replace(/let\s+let\s+/g, "let ");

        // 3b. Handle "return ..." to avoid exiting the function early and returning a non-string
        // Replace "return X;" with nothing (or maybe valid string return if we wanted)
        // For now, just silencing it so we capture the buffer at the end
        jsCode = jsCode.replace(/return\s+[^;]+;/g, "");

        // 4. Handle Arrays (int arr[5]; -> let arr = new Array(5).fill(0);)
        // This is tricky with regex. Let's do basic replacement for "let arr[5]" -> "let arr = [...]"
        // First, we already made it "let arr[5]".
        jsCode = jsCode.replace(/let\s+(\w+)\[(\d+)\]\s*;/g, "let $1 = new Array($2).fill(0);");
        // Handle init: let arr[] = {1, 2}; -> let arr = [1, 2];
        jsCode = jsCode.replace(/let\s+(\w+)\[\]\s*=\s*\{([^}]+)\};/g, "let $1 = [$2];");
        // Handle sized init: let arr[5] = {1}; -> let arr = [1, ...]; (simplified to just array)
        jsCode = jsCode.replace(/let\s+(\w+)\[(\d+)\]\s*=\s*\{([^}]+)\};/g, "let $1 = [$3];");

        // 5. printf -> custom log
        // We need to capture the output. We'll prepend a buffer.
        // Transform: printf("fmt", a, b) -> outputBuffer += sprintf("fmt", a, b);
        jsCode = jsCode.replace(/printf\s*\(([^)]+)\);/g, (match, args) => {
            // Split args carefully (this is fragile with strings containing commas, but okay for basic C)
            return `outputBuffer += _sprintf(${args});`;
        });

        // 6. formatting newlines in strings
        // JS strings execute \n correctly, so usually fine.

        // 7. scanf -> input
        // scanf("%d", &a); -> a = Number(userInputs.shift());
        // Remove & from vars in scanf
        jsCode = jsCode.replace(/scanf\s*\("[^"]*"\s*,\s*&?(\w+)\);/g, "$1 = Number(_inputs.shift() || 0);");


        // --- Execution Wrapper ---
        const runFunction = new Function('_inputs', '_sprintf', `
            let outputBuffer = "";
            try {
                ${jsCode}
            } catch (e) {
                return "Runtime Error: " + e.message;
            }
            return outputBuffer;
        `);

        return runFunction([...userInputs], sprintf);

    } catch (e) {
        console.warn("Transpilation failed:", e);
        return null; // Fallback to regex simulation if transpilation crashes
    }
};
