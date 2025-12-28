
import { detectLogicalErrors, LogicalError } from './logicalErrors';
import { callGroqAPI } from './groqClient';

export interface CompilerResult {
    output: string;
    exitCode: number;
    outputType: "success" | "error" | "info" | "warning";
    logicalErrors: LogicalError[];
    isForeignLanguage?: boolean;
    detectedLanguage?: string;
}

const localSimulation = (code: string, userInputs: string[]): CompilerResult => {
    const logicalErrors = detectLogicalErrors(code);

    // 1. Syntax Error Simulation (Heuristics for Java)
    const hasMainClass = /class\s+\w+/.test(code);
    const hasMainMethod = /public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*\w+\s*\)/.test(code);

    if (!hasMainClass) {
        return {
            output: "Error: Could not find or load main class. Ensure you have a 'public class Main'.",
            exitCode: 1,
            outputType: "error",
            logicalErrors
        };
    }

    if (!hasMainMethod) {
        return {
            output: "Error: Main method not found in class. Please define 'public static void main(String[] args)'.",
            exitCode: 1,
            outputType: "error",
            logicalErrors
        };
    }

    const hasMissingSemicolon = /System\.out\.println\([^)]+\)\s*\n/.test(code) && !/System\.out\.println\([^)]+\);/.test(code);
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;

    if (hasMissingSemicolon) {
        return {
            output: "error: ';' expected",
            exitCode: 1,
            outputType: "error",
            logicalErrors
        };
    }

    if (openBraces > closeBraces) {
        return {
            output: "error: reached end of file while parsing",
            exitCode: 1,
            outputType: "error",
            logicalErrors
        };
    }

    // 2. Fallback: Parse System.out.println for basic output simulation
    let runOutput = "";

    // Naive regex to capture System.out.println("Literal")
    // This is just a fallback if AI fails; AI is primary.
    const printMatches = Array.from(code.matchAll(/System\.out\.println\s*\(\s*"([^"]*)"\s*\);/g));

    if (printMatches.length > 0) {
        for (const match of printMatches) {
            runOutput += match[1] + "\n";
        }
    } else {
        // If no print statements found or regex failed, usage default message
        // But if code length is short and looks correct, maybe it just doesn't print.
        if (code.includes("System.out.println")) {
            // regex missed it, maybe variable printing
            runOutput = "(Output simulated: Program ran successfully)";
        } else {
            runOutput = "Program executed. (No output)";
        }
    }

    return {
        output: runOutput.trim(),
        exitCode: 0,
        outputType: "success",
        logicalErrors
    };
};

export const runJavaCompilerSimulation = async (code: string, userInputs: string[] = []): Promise<CompilerResult> => {
    try {
        const inputStr = userInputs.length > 0 ? `User Inputs: ${JSON.stringify(userInputs)}` : "No user inputs provided.";

        // First check: Is this Java code?
        const prompt = `
        You are a standard Java Compiler (javac + java) runner. 
        
        STEP 1: DETECT LANGUAGE
        Analyze if the provided code is valid Java code.
        If it is clearly C, Python, JavaScript, or another language, STOP and return:
        {
            "output": "Detected [Language] code. This compiler only supports Java.",
            "exitCode": 1,
            "logicalErrors": [],
            "isForeignLanguage": true,
            "detectedLanguage": "[Language]"
        }

        STEP 2: IF JAVA CODE, COMPILE AND EXECUTE
        TASK: Compile and Execute the following Java code.
        
        CODE:
        ${code}
        
        ${inputStr}
        
        INSTRUCTIONS:
        1. Simulate the compilation (javac). If there are syntax errors, output them exactly like javac.
        2. If it compiles, simulate the execution (java) strictly. 
        3. Be careful with Integer Division.
        4. Capture standard output (System.out.print/println).
        5. Detect specific logical errors (like null pointer exceptions, array index out of bounds).
        
        RETURN JSON:
        {
            "output": "The exact stdout or compiler error message",
            "exitCode": number (0 for success, 1 for error),
            "logicalErrors": [
                { 
                    "line": number, 
                    "message": "Description", 
                    "severity": "warning"|"error",
                    "errorType": "INTEGER_OVERFLOW" | "NULL_POINTER" | "POINTER_OUT_OF_BOUNDS" | "INFINITE_RECURSION" | "OFF_BY_ONE" | "DIVISION_BY_ZERO" | "OTHER_LOGICAL"
                }
            ]
        }
        `;

        const response = await callGroqAPI([
            { role: "system", content: "You are a precise Java compiler simulator. JSON only." },
            { role: "user", content: prompt }
        ]);

        return {
            output: response.output,
            exitCode: response.exitCode,
            outputType: response.exitCode === 0 ? "success" : "error",
            logicalErrors: response.logicalErrors || [],
            isForeignLanguage: response.isForeignLanguage,
            detectedLanguage: response.detectedLanguage
        };

    } catch (e) {
        console.warn("Groq Simulation failed, falling back to local regex engine", e);
        return localSimulation(code, userInputs);
    }
};

export const convertToJava = async (code: string, sourceLang: string): Promise<string> => {
    try {
        const prompt = `
        Convert the following ${sourceLang} code to valid, standard Java code.
        Ensure to use a 'public class Main' and 'public static void main'.
        Return ONLY the Java code. No markdown, no explanations.

        CODE:
        ${code}
        `;

        const response = await callGroqAPI([
            { role: "system", content: "You are a code translator. Output only Java code." },
            { role: "user", content: prompt }
        ], false); // false = text mode

        return response.trim();
    } catch (error) {
        console.warn("Groq Conversion failed, using fallback", error);

        return `public class Main {
    public static void main(String[] args) {
        // Error: AI Service Unavailable for full translation.
        // Copy your logic here manually.
        System.out.println("Please check API connection.");
    }
}`;
    }
};
