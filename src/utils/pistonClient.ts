export interface PistonResult {
    run: {
        stdout: string;
        stderr: string;
        output: string;
        code: number;
        signal: string | null;
    };
    language?: string;
    version?: string;
    compile?: {
        stdout: string;
        stderr: string;
        output: string;
        code: number;
    };
}

export const executeJavaCode = async (code: string, inputs: string = ""): Promise<PistonResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language: "java",
                version: "15.0.2",
                files: [
                    {
                        name: "Main.java",
                        content: code,
                    },
                ],
                stdin: inputs,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Execution Service Error (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("Execution timed out (limit: 5 seconds). Infinite loop detected?");
        }
        console.error("Piston Execution Failed:", error);
        throw error;
    }
};
