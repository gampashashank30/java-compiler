
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
    let runOutput = "";
    let exitCode = 0;

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

    // 2. Advanced Local Simulation (Mini-Interpreter)
    try {
        const lines = code.split('\n');
        const variables: Record<string, any> = {};
        
        let inMain = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes("public static void main")) {
                inMain = true;
                continue;
            }
            if (!inMain) continue;
            if (line === "}") {
                // simple block end detection
                continue; 
            }

            // Validations
            if (line.includes("/ by zero") || (line.includes("/") && line.includes("0") && !line.includes('\"'))) {
                 // naive zero check
                 if (/\/ 0[^\d]/.test(line) || /\/ 0$/.test(line)) {
                     throw new Error("Exception in thread \"main\" java.lang.ArithmeticException: / by zero");
                 }
            }

            // Variable Declaration: int x = 10;
            const intMatch = line.match(/int\s+(\w+)\s*=\s*(\d+);/);
            if (intMatch) {
                variables[intMatch[1]] = parseInt(intMatch[2]);
                continue;
            }

             // String Declaration: String s = "hello";
            const strMatch = line.match(/String\s+(\w+)\s*=\s*"([^"]*)";/);
            if (strMatch) {
                variables[strMatch[1]] = strMatch[2];
                continue;
            }

            // Assignment: x = 20;
            const assignMatch = line.match(/^(\w+)\s*=\s*(\d+);/);
            if (assignMatch && variables[assignMatch[1]] !== undefined) {
                 variables[assignMatch[1]] = parseInt(assignMatch[2]);
                 continue;
            }

            // System.out.println analysis
            const printMatch = line.match(/System\.out\.println\s*\((.*)\);/);
            if (printMatch) {
                let content = printMatch[1].trim();
                
                // Handle concatenation: "Text" + x
                const parts = content.split('+');
                let finalStr = "";
                
                for (let part of parts) {
                    part = part.trim();
                    if (part.startsWith('"') && part.endsWith('"')) {
                        finalStr += part.slice(1, -1);
                    } else if (variables[part] !== undefined) {
                        finalStr += variables[part];
                    } else if (!isNaN(Number(part))) {
                        finalStr += part;
                    } else {
                        // Math expression fallback (very basic, e.g. x + y)
                        // This parser is splitting by +, so 5 + 10 becomes "5" and "10"
                        // But if it's strictly x + y in the print, currently it treats as string concat if any string exists
                        // If it's pure math like x + y (int + int), JS + operator handles it if we parse right.
                        // But here we are casting to string for output.
                        // Let's assume naive string concat for now.
                        finalStr += part; 
                    }
                }
                
                // Check if it was purely integers and we did string concat? 
                // In Java "a" + 1 is string. 1 + 1 is 2.
                // Our naive splitter splits by +. 
                // This is a limitation, but better than nothing.
                
                // If the original content didn't have quotes, try to eval math
                if (!content.includes('"')) {
                     // try to resolve variables
                     let evalStr = content;
                     for(const [key, val] of Object.entries(variables)) {
                         // regex replace word boundary
                         evalStr = evalStr.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
                     }
                     try {
                         // simple safe eval for numbers
                         if (/^[\d\s+\-*/()]+$/.test(evalStr)) {
                              // eslint-disable-next-line no-eval
                             finalStr = eval(evalStr);
                         }
                     } catch (e) {
                         // keep formatted string
                     }
                }

                runOutput += finalStr + "\n";
            }
        }
    } catch (e: any) {
        return {
            output: e.message || "Runtime Error",
            exitCode: 1,
            outputType: "error",
            logicalErrors
        };
    }

    if (!runOutput) {
        runOutput = "Program executed. (No output captured or logic too complex for local simulation)";
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
