
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
    // Helper to get raw code for multi-line regex
    const rawCode = code.replace(/\n/g, '');

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
        if (/"/.test(line) && /==/.test(line) && (!/int|boolean|char|double|float|long|short|byte/.test(line))) {
            if (/String\s+\w+/.test(code) || /"\s*==\s*"/.test(line) || /\w+\s*==\s*"/.test(line)) {
                errors.push({
                    line: lineNum,
                    message: "String comparison using '=='. In Java, '==' compares object references. Use '.equals()' to compare string content.",
                    severity: "warning",
                    errorType: "STRING_EQUALITY"
                });
            }
        }

        // 4. Integer Division check
        if (/\([^)]+\)\s*\/\s*\d+/.test(line)) {
            if (/double|float/.test(line) || /=\s*[^;]+(a \+ b)\s*\/\s*2/.test(line)) {
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

        // 6. Array bounds check + Loop Start Check
        const arrayDecl = line.match(/new\s+\w+\[(\d+)\]/) || line.match(/{\s*(\d+(,\s*\d+)*)\s*}/);

        // Check for Array Start Index 1
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

        // 7. Reverse Number while(n > 9)
        if (/while\s*\(\s*\w+\s*>\s*9\s*\)/.test(line) && /%\s*10/.test(code)) {
            errors.push({
                line: lineNum,
                message: "Logical Error in Loop detected. 'while(n > 9)' will skip the last digit processing. Use 'while(n > 0)' or 'while(n != 0)'.",
                severity: "warning",
                errorType: "OFF_BY_ONE"
            });
        }

        // 8. Fibonacci Logic: a = b; b = a + b;
        if (/a\s*=\s*b\s*;/.test(line)) {
            const nextLine = lines[i + 1] || "";
            if (/b\s*=\s*a\s*\+\s*b/.test(nextLine)) {
                errors.push({
                    line: lineNum + 1,
                    message: "Fibonacci Logic Error. You updated 'a' before calculating 'b', so 'b' is using the WRONG 'a'. Use a temporary variable.",
                    severity: "error",
                    errorType: "OTHER_LOGICAL"
                });
            }
        }

        // 9. Binary Search Logic
        if (/while\s*\(\s*(\w+)\s*<\s*(\w+)\s*\)/.test(line)) {
            if (code.includes(`${RegExp.$1} = 0`) && code.includes(`${RegExp.$2} =`) && code.includes("/ 2")) {
                errors.push({
                    line: lineNum,
                    message: "Binary Search Logic: 'while(low < high)' determines the loop. Usually 'low <= high' is required to check the last element.",
                    severity: "warning",
                    errorType: "OFF_BY_ONE"
                });
            }
        }

        // 10. Matrix Addition Index Swap
        const matrixMatch = line.match(/(\w+)\[i\]\[j\]\s*=\s*(\w+)\[i\]\[j\]\s*\+\s*(\w+)\[j\]\[i\]/);
        if (matrixMatch) {
            errors.push({
                line: lineNum,
                message: `Matrix Addition Logic Error. You are adding 'a[i][j]' with 'b[j][i]'. This adds the Transpose of b, not b itself. Use 'b[i][j]'.`,
                severity: "error",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 11. Sum of Natural Numbers + 1
        if (/\*\s*\(\s*\w+\s*\+\s*1\s*\)\s*\/\s*2\s*\+\s*1/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Formula Error. Sum of natural numbers is n*(n+1)/2. You added an extra '+ 1' at the end.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 12. Binary to Decimal (Base 8 error)
        if (/base\s*=\s*base\s*\*\s*8/.test(line) && /bin|binary/i.test(code)) {
            errors.push({
                line: lineNum,
                message: "Binary Conversion Error. Input is Binary (Base 2) but you are multiplying base by 8 (Octal). Use 'base * 2'.",
                severity: "error",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 13. Count Digits (int count = 1)
        if (/int\s+count\s*=\s*1\s*;/.test(line) && code.includes("/ 10")) {
            errors.push({
                line: lineNum,
                message: "Initialization Error. 'count' starts at 1. If the loop counts digits, it might result in an extra count. Usually start from 0.",
                severity: "warning",
                errorType: "OFF_BY_ONE"
            });
        }


        // Reused Loops for Array Bounds
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

    // Heuristics outside loop (Code wide)

    // Factorial Loop Check
    if (/fact\s*=\s*fact\s*\*\s*i/.test(code) && /for\s*\([^;]+;\s*i\s*<\s*n/.test(code)) {
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

    // Armstrong Sum Check: sum + d*d
    if (/sum\s*=\s*sum\s*\+\s*d\s*\*\s*d\s*;/.test(code)) {
        // Find line
        const warningLine = lines.findIndex(l => /sum\s*=\s*sum\s*\+\s*d\s*\*\s*d\s*;/.test(l));
        if (warningLine !== -1) {
            errors.push({
                line: warningLine + 1,
                message: "Logic Error: Armstrong number check usually requires cubing digits (d*d*d) for 3-digit numbers, or Math.pow().",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }
    }

    // 14. Shallow Copy of Array
    // int[] b = a; -> Warning: Modification affects original.
    if (/int\[\]\s+(\w+)\s*=\s*(\w+)\s*;/.test(line)) {
        errors.push({
            line: lineNum,
            message: "Shallow Copy Detected. Array assignment copies the reference, not the values. Modifying one will modify the other. Use 'val.clone()' or 'System.arraycopy'.",
            severity: "warning",
            errorType: "OTHER_LOGICAL"
        });
    }

    // 15. Check Sorted Logic (Early Exit / Overwrite)
    // if(a[i] < a[i+1]) sorted = true; else sorted = false; -- Overwrites previous
    if (/if\s*\(.*\)\s*(\w+)\s*=\s*true\s*;\s*else\s*\1\s*=\s*false\s*;/.test(rawCode) ||
        (/if\s*\(.*\)\s*(\w+)\s*=\s*true/.test(line) && lines[i + 2]?.includes("= false"))) {
        errors.push({
            line: lineNum,
            message: "Flawed 'Is Sorted' Logic. Setting flag to true/false inside loop overwrites previous mismatch. Once 'false' is found, you should break or return.",
            severity: "warning",
            errorType: "OTHER_LOGICAL"
        });
    }

    // 16. Multithreading Race Condition
    // class ... extends Thread ... count++
    if ((/class\s+\w+\s+extends\s+Thread/.test(code) || /implements\s+Runnable/.test(code)) && /\+\+/.test(line)) {
        if (/static\s+int/.test(code) && !line.includes("synchronized") && !code.includes("AtomicInteger")) {
            // Heuristic: static int modified in Thread without sync
            errors.push({
                line: lineNum,
                message: "Potential Race Condition. Modifying shared static variable in a Thread without 'synchronized' or 'AtomicInteger' leads to unpredictable results.",
                severity: "example", // Use 'example' or 'warning'
                errorType: "OTHER_LOGICAL"
            });
        }
    }

    // 17. Mutable Map Key
    // Map<StringBuilder, ...> or Map<int[], ...>
    if (/Map\s*<\s*(StringBuilder|StringBuffer|int\[\]|ArrayList)/.test(line)) {
        errors.push({
            line: lineNum,
            message: "Mutable Map Key Detected. Using mutable objects (StringBuilder, Arrays) as Map keys is dangerous. If the object changes, the hash code changes, making retrieval impossible.",
            severity: "error",
            errorType: "OTHER_LOGICAL"
        });
    }

    // 18. Recursive variable reuse (e.g. Binary Search mid vs mid+1)
    // search(..., mid, ...) -> infinite recursion if mid doesn't change
    if (/return\s+\w+\s*\(.*,\s*mid\s*,.*\)/.test(line) && !line.includes("mid + 1") && !line.includes("mid - 1")) {
        errors.push({
            line: lineNum,
            message: "Potential Infinite Recursion. Recursive call uses 'mid' directly. Usually Binary Search requires 'mid + 1' or 'mid - 1' to reduce the range.",
            severity: "error",
            errorType: "INFINITE_RECURSION"
        });
    }

    // 19. Mean/Average Precision inside Loop
    // mean += a[i] / length
    if (/\+=\s*\w+\[\w+\]\s*\/\s*\w+\.length/.test(line) && !/double/.test(line)) {
        errors.push({
            line: lineNum,
            message: "Precision Loss in Loop. Integer division 'a[i] / length' often results in 0. Sum all elements first, then divide the total sum by length.",
            severity: "warning",
            errorType: "OTHER_LOGICAL"
        });
    }

    // 20. Merge Loops Count (Heuristic)
    // Merge usually needs 3 while loops. If we see fewer, might be incomplete.
    // (This is hard to pinpoint per line, so we skip specific line error or attach to main)

    return errors;
};
