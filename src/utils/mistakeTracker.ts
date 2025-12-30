
export interface MistakeRecord {
    char_text: string;
    count: number;
    last_seen: string;
}

const STORAGE_KEY_COUNTS = 'mistake_counts';
const STORAGE_KEY_LAST_SEEN = 'mistake_last_seen';

// Robust regex patterns for detecting mistakes in compiler output
const ERROR_PATTERNS = [
    { char: ';', regex: /(expected|missing)\s*(';'|semicolon)/i },
    { char: '}', regex: /(expected|missing)\s*('}'|brace|curly)/i },
    { char: '{', regex: /(expected|missing)\s*('{')/i },
    { char: ')', regex: /(expected|missing)\s*('\)'|parenthesis)/i },
    { char: '(', regex: /(expected|missing)\s*('\(')/i },
    { char: '"', regex: /(missing terminating|expected|unclosed)\s*(string|literal|quote|")|not a statement/i },
    { char: '[', regex: /(expected|missing)\s*('\['|bracket)/i },
    { char: ']', regex: /(expected|missing)\s*('\]'|bracket)/i },
    { char: '#', regex: /Preprocessor directive missing '#'/i },
];

/**
 * loads mistake counts from local storage safely
 */
const loadCounts = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_COUNTS);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (error) {
        console.warn("Mistake Tracker: Corrupted storage detected, resetting.", error);
        localStorage.removeItem(STORAGE_KEY_COUNTS);
        return {};
    }
};

/**
 * Analyzes compiler output and updates mistake counts
 * Returns true if new mistakes were found
 */
export const trackMistakes = (output: string): boolean => {
    if (!output) return false;

    try {
        const counts = loadCounts();
        let found = false;

        ERROR_PATTERNS.forEach(p => {
            if (p.regex.test(output)) {
                counts[p.char] = (counts[p.char] || 0) + 1;
                found = true;
            }
        });

        if (found) {
            localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(counts));
            localStorage.setItem(STORAGE_KEY_LAST_SEEN, new Date().toISOString());
            // Dispatch event so other tabs/components update immediately
            window.dispatchEvent(new Event('storage'));
            return true;
        }
    } catch (error) {
        console.error("Mistake Tracker: Failed to track mistakes", error);
    }
    return false;
};

/**
 * Returns list of mistakes sorted by count (descending)
 */
export const getMistakes = (): MistakeRecord[] => {
    const counts = loadCounts();
    const lastSeen = localStorage.getItem(STORAGE_KEY_LAST_SEEN) || new Date().toISOString();

    return Object.keys(counts)
        .map(char => ({
            char_text: char,
            count: counts[char],
            last_seen: lastSeen
        }))
        .sort((a, b) => b.count - a.count);
};

export const resetMistake = (char: string) => {
    const counts = loadCounts();
    if (counts[char]) {
        delete counts[char];
        localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(counts));
        window.dispatchEvent(new Event('storage'));
    }
};

export const resetAllMistakes = () => {
    localStorage.removeItem(STORAGE_KEY_COUNTS);
    localStorage.removeItem(STORAGE_KEY_LAST_SEEN);
    window.dispatchEvent(new Event('storage'));
};
