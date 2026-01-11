
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
        // Loop starts at index 1
        if (/for\s*\(\s*int\s+\w+\s*=\s*1\s*;/.test(line) && /\.length/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Loop starts at index 1. Arrays in Java are 0-indexed. You might be skipping the first element.",
                severity: "warning",
                errorType: "OFF_BY_ONE"
            });
        }

        // Even/Odd Logic: n / 2 == 0 vs n % 2 == 0
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

        // 7. Missing # in Preprocessor Directive (Common C/C++ mistake, but checking here for robustness)
        // Detects 'include <stdio.h>' without '#'
        if (/^\s*include\s*[<"]/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Preprocessor directive missing '#'. Did you mean '#include'?",
                severity: "error",
                errorType: "OTHER_LOGICAL" // Using generic type as specific one isn't defined, but message is clear
            });
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

        // 14. Shallow Copy of Array
        if (/int\[\]\s+(\w+)\s*=\s*(\w+)\s*;/.test(line)) {
            // make sure the RHS is just a variable
            errors.push({
                line: lineNum,
                message: "Shallow Copy Detected. Array assignment copies the reference, not the values. Modifying one will modify the other. Use 'val.clone()' or 'System.arraycopy'.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 15. Check Sorted Logic
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
        if ((/class\s+\w+\s+extends\s+Thread/.test(code) || /implements\s+Runnable/.test(code)) && /\+\+/.test(line)) {
            if (/static\s+int/.test(code) && !line.includes("synchronized") && !code.includes("AtomicInteger")) {
                errors.push({
                    line: lineNum,
                    message: "Potential Race Condition. Modifying shared static variable in a Thread without 'synchronized' or 'AtomicInteger' leads to unpredictable results.",
                    severity: "warning",
                    errorType: "OTHER_LOGICAL"
                });
            }
        }

        // 17. Mutable Map Key
        if (/Map\s*<\s*(StringBuilder|StringBuffer|int\[\]|ArrayList)/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Mutable Map Key Detected. Using mutable objects (StringBuilder, Arrays) as Map keys is dangerous. If the object changes, the hash code changes, making retrieval impossible.",
                severity: "error",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 18. Recursive variable reuse
        if (/return\s+\w+\s*\(.*,\s*mid\s*,.*\)/.test(line) && !line.includes("mid + 1") && !line.includes("mid - 1")) {
            errors.push({
                line: lineNum,
                message: "Potential Infinite Recursion. Recursive call uses 'mid' directly. Usually Binary Search requires 'mid + 1' or 'mid - 1' to reduce the range.",
                severity: "error",
                errorType: "INFINITE_RECURSION"
            });
        }

        // 19. Precision Loss in Loop
        if (/\+=\s*\w+\[\w+\]\s*\/\s*\w+\.length/.test(line) && !/double/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Precision Loss in Loop. Integer division 'a[i] / length' often results in 0. Sum all elements first, then divide the total sum by length.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 20. Unchecked Return Values (Best Practice)
        // Detects 'scanf(...)' or 'scanner.next...()' used as a statement without assignment or check
        if (/^\s*(scanf|fscanf|sscanf|scan\.next\w*|scanner\.next\w*)\s*\(/.test(line) && !line.includes("=") && !/if|while|for|switch/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Unchecked Return Value. The return value of input functions should be checked to handle errors or EOF correctly.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 21. Buffer Safety / Unsafe Functions (Safety)
        if (/\b(strcpy|strcat|sprintf|gets)\b/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Unsafe Function Detected. This function does not check bounds and can cause buffer overflows. Use safe alternatives like 'strncpy', 'strncat', 'snprintf', or 'fgets'.",
                severity: "error",
                errorType: "ARRAY_INDEX_OUT_OF_BOUNDS"
            });
        }

        // 22. Redundant Logic (Optimisation / logic)
        // e.g., 'a + b;' on its own line
        if (/^\s*[\w\d_.]+\s*[+\-*/%]\s*[\w\d_.]+\s*;\s*$/.test(line)) {
            errors.push({
                line: lineNum,
                message: "Redundant Logic. This statement performs a calculation but discards the result. Did you mean to assign it (e.g., 'x = a + b')?",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 23. Input Validation (Safety heuristic)
        // If we see reading an integer, check if the variable is checked against a range in the *next few lines*. 
        // This is hard in a single pass, so we do a simpler separate check or just flag 'Advice'.
        // Let's flag usage of `nextInt` without any validation logic in the file (checked outside loop? no, let's keep it simple here).
        // Check for: int x = scanner.nextInt(); if (x < 0)...
        // Implementation: Just flag if we see nextInt() but NO 'if' statement in the surrounding block (too complex for regex).
        // Simpler: If line has `nextInt` or `scanf`, warn "Input Validation Advice".
        if (/(nextInt|nextDouble|nextFloat|scanf)\s*\(/.test(line)) {
            // Check if there is ANY 'if' in the code? No, that's too broad.
            // Let's just give a general advice warning on the line of input.
            errors.push({
                line: lineNum,
                message: "Input Validation Advice: Ensure that this user input is validated (e.g., check for negative or out-of-range values) before using it.",
                severity: "warning",
                errorType: "OTHER_LOGICAL"
            });
        }

        // 24. Potential Buffer Overflow in Loops
        // for(int i=0; i<=10; i++) arr[i] = ... where arr is size 10. (Already covered partially by OFF_BY_ONE, but explicitly check <= size)
        // This requires parsing size. We have a simple heuristic in #6, let's strengthen it.


    } // END OF FOR LOOP

    // Heuristics outside loop (Code wide checks or those that need robust multi-line parsing)

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

    // Armstrong Sum Check
    if (/sum\s*=\s*sum\s*\+\s*d\s*\*\s*d\s*;/.test(code)) {
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

    return errors;

};
