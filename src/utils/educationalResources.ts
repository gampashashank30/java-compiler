import { ErrorType } from './logicalErrors';

export interface EducationalContent {
    title: string;
    whatsWrong: string;
    whyItMatters: string;
    concept: string;
    prevention: string;
    relatedTopics: string[];
}

export const EDUCATION_DATABASE: Record<ErrorType, EducationalContent> = {
    "INTEGER_OVERFLOW": {
        title: "Integer Overflow Error",
        whatsWrong: "A calculation result exceeded the maximum value that this variable type can hold, causing it to 'wrap around' to a potentially negative number.",
        whyItMatters: "This leads to incorrect mathematical results and can be a severe security vulnerability (buffer underflows).",
        concept: "Fixed-Width Integer Limits",
        prevention: "Check boundaries before arithmetic operations or use larger types (like 'long long').",
        relatedTopics: ["Binary Representation", "Two's Complement", "Data Types"]
    },
    "DOUBLE_FREE": {
        title: "Double Free - Heap Corruption",
        whatsWrong: "You attempted to free the same memory address twice. The first 'free' released it; the second corrupts the memory manager's internal structures.",
        whyItMatters: "This crashes the program immediately and opens the door to arbitrary code execution attacks.",
        concept: "Heap Memory Management",
        prevention: "Set pointers to NULL immediately after freeing them. 'free(ptr); ptr = NULL;'",
        relatedTopics: ["Dynamic Memory", "Heap vs Stack", "Memory Safety"]
    },
    "USE_AFTER_FREE": {
        title: "Use-After-Free Access",
        whatsWrong: "You are trying to read or write to a memory pointer after it has arguably been passed to 'free()'.",
        whyItMatters: "The memory might now belong to another part of your program. Modifying it causes unpredictable data corruption.",
        concept: "Dangling Pointers",
        prevention: "Always treat freed pointers as invalid. Nullify them after freeing.",
        relatedTopics: ["Memory Lifecycle", "Pointers"]
    },
    "DANGLING_POINTER": {
        title: "Dangling Pointer Detected",
        whatsWrong: "A pointer is referencing a memory location that is no longer valid (e.g., returning address of a local stack variable).",
        whyItMatters: "Accessing this pointer will read garbage data or crash when that stack frame is overwritten.",
        concept: "Variable Scope & Stack Frames",
        prevention: "Never return pointers to local variables; use 'malloc' for persistent memory.",
        relatedTopics: ["Stack Memory", "Scope & Lifetime"]
    },
    "POINTER_OUT_OF_BOUNDS": {
        title: "Pointer Out-of-Bounds",
        whatsWrong: "You are accessing an array or memory block outside its allocated size.",
        whyItMatters: "This is a Buffer Overflow. It corrupts neighboring variables and causes segmentation faults.",
        concept: "Memory Boundaries",
        prevention: "Ensure loop conditions < size, not <= size for 0-indexed arrays.",
        relatedTopics: ["Arrays", "Pointer Arithmetic", "Buffer Overflow"]
    },
    "INFINITE_RECURSION": {
        title: "Infinite Recursion - Stack Overflow",
        whatsWrong: "A recursive function calls itself without ever hitting a base case to stop.",
        whyItMatters: "This fills up the program stack until it runs out of memory (Stack Overflow), crashing the program.",
        concept: "Recursion Base Case",
        prevention: "Always define a base case (e.g., 'if (n == 0) return;') at the start of recursive functions.",
        relatedTopics: ["Recursion", "Stack Frames"]
    },
    "OFF_BY_ONE": {
        title: "Off-by-One Error",
        whatsWrong: "A loop runs one time too many or too few (e.g., iterating 0 to N inclusive for an array of size N).",
        whyItMatters: "Usually leads to accessing unallocated memory (index N) or missing the last element.",
        concept: "0-based Indexing",
        prevention: "standard C loops: 'for(int i=0; i < N; i++)'.",
        relatedTopics: ["Loop Invariants", "Arrays"]
    },
    "MEMORY_LEAK": {
        title: "Memory Leak Detected",
        whatsWrong: "Memory was allocated with 'malloc' but never released with 'free' before the pointer was lost.",
        whyItMatters: "Long-running programs will eventually consume all available RAM and crash the system.",
        concept: "Resource Management",
        prevention: "Pair every 'malloc' with a 'free' on all execution paths.",
        relatedTopics: ["Dynamic Memory", "Valgrind"]
    },
    "DIVISION_BY_ZERO": {
        title: "Division by Zero",
        whatsWrong: "A number is being divided by zero, which is mathematically undefined.",
        whyItMatters: "In C, this causes a hardware exception and immediately crashes the program.",
        concept: "Arithmetic Exceptions",
        prevention: "Check 'if (divisor != 0)' before dividing.",
        relatedTopics: ["Arithmetic Operations"]
    },
    "OTHER_LOGICAL": {
        title: "Logical Warning",
        whatsWrong: "The code compiles but performs actions that are likely incorrect or dangerous.",
        whyItMatters: "May lead to unexpected behavior or wrong results.",
        concept: "Program Logic",
        prevention: "Review the logic flow.",
        relatedTopics: ["Debugging", "Code Review"]
    }
};
