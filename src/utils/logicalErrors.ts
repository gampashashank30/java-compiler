
export type ErrorType =
    | "INTEGER_OVERFLOW"
    | "NULL_POINTER"
    | "ARRAY_INDEX_OUT_OF_BOUNDS"
    | "INFINITE_RECURSION"
    | "OFF_BY_ONE"
    | "DIVISION_BY_ZERO"
    | "STRING_EQUALITY"
    | "OTHER_LOGICAL";

export interface LogicalError {
    line: number;
    message: string;
    severity: "warning" | "error";
    errorType?: ErrorType;
}

export const detectLogicalErrors = (code: string): LogicalError[] => {
    const lines = code.split('\n');
    const errors: LogicalError[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 1. Infinite Loops
        if (/while\s*\(\s*true\s*\)/.test(line) || /for\s*\(\s*;\s*;\s*\)/.test(line)) {
            if (!line.includes("break") && !code.slice(i).includes("break")) {
                errors.push({
                    line: lineNum,
                    message: "Potential infinite loop detected. 'while(true)' or 'for(;;)' logic with no obvious break.",
                    severity: "warning",
                    errorType: "INFINITE_RECURSION"
                });
            }
        }

        // 2. Division by Zero
        if (/\/\s*0\b/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Division by zero detected.",
                severity: "error",
                errorType: "DIVISION_BY_ZERO"
            });
        }

        // 3. String Equality Check (Java specific)
        // Detects 'str == "value"' or 'str1 == str2' which compares references, not content
        if (/"/.test(line) && /==/.test(line) && (!/int|boolean|char|double|float|long|short|byte/.test(line))) {
            // Check if comparing string literals or likely string variables
            if (/String\s+\w+/.test(code) || /"\s*==\s*"/.test(line) || /\w+\s*==\s*"/.test(line)) {
                // Heuristic: if it looks like a string comparison
                errors.push({
                    line: lineNum,
                    message: "String comparison using '=='. In Java, '==' compares object references. Use '.equals()' to compare string content.",
                    severity: "warning",
                    errorType: "STRING_EQUALITY"
                });
            }
        }

        // 4. "Average" calculation error (Contextual)
        const avgMatch = line.match(/\(([^)]+)\)\s*\/\s*(\d+)/);
        if (avgMatch) {
            const sumPart = avgMatch[1];
            const divisor = parseInt(avgMatch[2]);
            const items = sumPart.split('+').map(s => s.trim()).filter(s => s.length > 0);
            const itemCount = items.length;

            if (itemCount > 1 && itemCount !== divisor) {
                errors.push({
                    line: lineNum,
                    message: `Possible logical error in average calculation. You are summing ${itemCount} numbers but dividing by ${divisor}. Should it be ${itemCount}?`,
                    severity: "warning",
                    errorType: "OTHER_LOGICAL"
                });
            }
        }

        // 5. Semicolon after Loop Header
        if (/(for|while)\s*\([^)]*\)\s*;/.test(line)) {
            if (!line.trim().startsWith("do")) {
                errors.push({
                    line: lineNum,
                    message: `Possible logical error: Semicolon after loop. This makes the loop body empty.`,
                    severity: "warning",
                    errorType: "OTHER_LOGICAL"
                });
            }
        }

        // 6. Array bounds check (simple)
        // int[] arr = new int[5]; -> arr[5] is error
        const arrayDecl = line.match(/new\s+\w+\[(\d+)\]/);
        if (arrayDecl) {
            const size = parseInt(arrayDecl[1]);
            // Attempt to find variable name: int[] arr = ...
            // This is hard via regex single line, but assume simple case
            const varMatch = line.match(/(\w+)\s*=\s*new/);

            if (varMatch) {
                const arrName = varMatch[1];
                for (let j = i + 1; j < lines.length; j++) {
                    const loopLine = lines[j];

                    // Check for loop: i <= 5
                    const loopMatch = loopLine.match(new RegExp(`for\\s*\\([^;]+;\\s*\\w+\\s*<=\\s*${size}\\s*;`));
                    if (loopMatch) {
                        errors.push({
                            line: j + 1,
                            message: `Potential off-by-one error. Loop runs up to index ${size} (inclusive), but array size is ${size}. Last index is ${size - 1}.`,
                            severity: "warning",
                            errorType: "OFF_BY_ONE"
                        });
                    }

                    // Check for direct usage: arr[5]
                    const usage = loopLine.match(new RegExp(`${arrName}\\[(\\d+)\\]`));
                    if (usage) {
                        const index = parseInt(usage[1]);
                        if (index >= size) {
                            errors.push({
                                line: j + 1,
                                message: `Array index out of bounds. Array size ${size}, accessed index ${index}.`,
                                severity: "error",
                                errorType: "ARRAY_INDEX_OUT_OF_BOUNDS"
                            });
                        }
                    }
                }
            }
        }
    }

    return errors;
};
