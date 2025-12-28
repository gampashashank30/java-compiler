
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

import { executeJavaCode } from './pistonClient';

export const runJavaCompilerSimulation = async (code: string, userInputs: string[] = []): Promise<CompilerResult> => {
    try {
        // Prepare InputStream from userInputs (join with newlines)
        const stdin = userInputs.join('\n');

        // Execute via Piston
        const result = await executeJavaCode(code, stdin);

        let output = "";
        let exitCode = 0;
        let outputType: "success" | "error" | "info" | "warning" = "success";

        // Check for Compilation Error
        if (result.compile && result.compile.code !== 0) {
            output = result.compile.stderr || result.compile.stdout || "Compilation Failed";
            exitCode = result.compile.code;
            outputType = "error";
        } else {
            // Compilation Success, check Run result
            output = result.run.output; // Piston combines stdout and stderr here usually, or we can use run.stdout + run.stderr
            exitCode = result.run.code;
            outputType = exitCode === 0 ? "success" : "error";
        }

        // Parse Logical Errors if needed (from stderr or output)
        // Note: Piston returns raw output. We can try to regex match some runtime exceptions for metadata.
        const logicalErrors: LogicalError[] = [];

        // Simple Runtime Exception Detection for metadata
        if (output.includes("Exception in thread")) {
            logicalErrors.push({
                line: 0, // Hard to parse line from stack trace reliably without complex regex, defaults to 0
                message: "Runtime Exception Detected",
                severity: "error",
                errorType: "OTHER_LOGICAL"
            });
        }

        return {
            output: output,
            exitCode: exitCode,
            outputType: outputType,
            logicalErrors: logicalErrors
        };

    } catch (e: any) {
        console.error("Execution Engine Failed:", e);
        return {
            output: "Error connecting to Execution Engine: " + e.message,
            exitCode: 1,
            outputType: "error",
            logicalErrors: []
        };
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
