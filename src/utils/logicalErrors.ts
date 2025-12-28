
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

        // 4. Integer Division in Expressions (e.g., Average)
        // (a + b) / 2 -> Integer division if a and b are ints.
        // Heuristic: Check for ( ... ) / <integer>
        if (/\([^)]+\)\s*\/\s*\d+/.test(line)) {
            // Check if there is a 'double' or 'float' variable assignment on the left
            if (/double|float/.test(line) || /=\s*[^;]+(a \+ b)\s*\/\s*2/.test(line)) {
                // This is a weak check, but matches the user's "Average" case: avg = (a + b) / 2;
                errors.push({
                    line: lineNum,
                    message: "Potential integer division loss. If operands are integers, the decimal part will be truncated before assigning to double/float. Use '2.0' or cast to double.",
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

        // 6. Array bounds check (simple) & Loop Start Check
        const arrayDecl = line.match(/new\s+\w+\[(\d+)\]/) || line.match(/{\s*(\d+(,\s*\d+)*)\s*}/); // Catch {1, 2, 3} too roughly

        // Check for Array Start Index 1
        // for(int i = 1; i < arr.length; i++)
        if (/for\s*\(\s*int\s+\w+\s*=\s*1\s*;/.test(line) && /\.length/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Loop starts at index 1. Arrays in Java are 0-indexed. You might be skipping the first element.",
                severity: "warning",
                errorType: "OFF_BY_ONE"
            });
        }

        // Check for Even/Odd Logic: n / 2 == 0 vs n % 2 == 0
        if (/\/\s*2\s*==\s*0/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Logic Error: Using division '/ 2' checks if half the number is 0. To check for Even/Odd, use modulus '% 2'.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // Manual Regex for the Array Bounds (reused)
        const newArrMatch = line.match(/new\s+\w+\[(\d+)\]/);
        if (newArrMatch) {
            const size = parseInt(newArrMatch[1]);
            const varMatch = line.match(/(\w+)\s*=\s*new/);

            if (varMatch) {
                const arrName = varMatch[1];
                for (let j = i + 1; j < lines.length; j++) {
                    const loopLine = lines[j];

                    const loopMatch = loopLine.match(new RegExp(`for\\s*\\([^;]+;\\s*\\w+\\s*<=\\s*${size}\\s*;`));
                    if (loopMatch) {
                        errors.push({
                            line: j + 1,
                            message: `Potential off-by-one error. Loop runs up to index ${size} (inclusive), but array size is ${size}. Last index is ${size - 1}.`,
                            severity: "warning",
                            errorType: "OFF_BY_ONE"
                        });
                    }
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

    // New: Broad Check for Factorial/Loop Range
    // if we see "fact = fact * i" and loop "i < n"
    if (/fact\s*=\s*fact\s*\*\s*i/.test(code) && /for\s*\([^;]+;\s*i\s*<\s*n/.test(code)) {
        // This is a heuristic, we can't get line number easily without robust parsing,
        // but we can search for the loop line
        const loopLineIndex = lines.findIndex(l => /for\s*\([^;]+;\s*i\s*<\s*n/.test(l));
        if (loopLineIndex !== -1) {
            errors.push({
                line: loopLineIndex + 1,
                message: "Potential loop range error for Factorial. 'i < n' stops before 'n'. Usually Factorial includes 'n' (i <= n).",
                severity: "warning",
                errorType: "OFF_BY_ONE"
            });
        }
    }

    return errors;
};
