import type { PyodideInterface } from "pyodide";
import { LEDModule } from "./ledModule";
import { CHARACTER_PATTERNS } from "../characterPatterns";

export class BasicModule {
    private foreverCallbacks: Set<any> = new Set();

    constructor(
        private pyodide: PyodideInterface,
        private ledModule: LEDModule
    ) { }

    async showString(text: string, interval: number = 150): Promise<void> {
        // If a single valid character was passed, render it statically (no scrolling)
        if (typeof text === "string" && text.length === 1 && CHARACTER_PATTERNS[text]) {
            const pattern = CHARACTER_PATTERNS[text];
            this.ledModule.clearDisplay();
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const on = !!(pattern[row] && pattern[row][col]);
                    if (on) this.ledModule.plot(col, row);
                    else this.ledModule.unplot(col, row);
                }
            }
            // Add a small delay so single characters are visible before next operation
            await new Promise((resolve) => setTimeout(resolve, 400));
            return;
        }

        // Existing scrolling implementation for strings (unchanged)
        const validChars = text
            .split("")
            .filter((char) => CHARACTER_PATTERNS[char]);

        if (validChars.length === 0) {
            this.ledModule.clearDisplay();
            return;
        }

        const scrollPattern: boolean[][] = [];

        validChars.forEach((char, index) => {
            const pattern = CHARACTER_PATTERNS[char];
            pattern.forEach((row, rowIndex) => {
                if (!scrollPattern[rowIndex]) {
                    scrollPattern[rowIndex] = [];
                }
                scrollPattern[rowIndex].push(...row.map((v) => Boolean(v)));
                if (index < validChars.length - 1) {
                    scrollPattern[rowIndex].push(false);
                }
            });
        });

        for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            for (let i = 0; i < 5; i++) {
                scrollPattern[rowIndex].push(false);
            }
        }

        let currentOffset = 0;
        const maxOffset = scrollPattern[0].length;

        while (currentOffset < maxOffset) {
            this.ledModule.clearDisplay();

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const patternCol = currentOffset + col;
                    if (
                        patternCol < scrollPattern[row].length &&
                        scrollPattern[row][patternCol]
                    ) {
                        this.ledModule.plot(col, row);
                    }
                }
            }

            currentOffset++;
            if (currentOffset < maxOffset) {
                await new Promise((resolve) => setTimeout(resolve, interval));
            }
        }

        this.ledModule.clearDisplay();
    }

    /**
     * Show a number (integer or decimal). If the input string contains any alphabetic
     * characters the value is treated as 0. The numeric value is converted to string
     * and displayed using showString (single digit renders statically; longer values scroll).
     */
    showNumber(value: string | number): void {
        let num: number;
        if (typeof value === "string") {
            // If any alphabetic characters are present, treat as 0
            if (/[A-Za-z]/.test(value)) {
                num = 0;
            } else {
                const cleaned = value.replace(/,/g, "").trim();
                num = Number(cleaned);
                if (!Number.isFinite(num)) num = 0;
            }
        } else if (typeof value === "number") {
            num = value;
            if (!Number.isFinite(num)) num = 0;
        } else {
            num = 0;
        }

        // Format number string: keep decimal for non-integers
        const str = Number.isInteger(num) ? num.toString() : num.toString();
        // Fire-and-forget to avoid requiring 'await' in Python code paths
        void this.showString(str);
    }

    /**
     * Show a 5x5 LED pattern from a triple-quoted string using '#' for on and '.' (or space) for off.
     * Compatible with MakeCode's Python form:
     *   basic.show_leds("""
     *   . # . . .
     *   . . # . .
     *   . . . # .
     *   . . . . #
     *   # . . . .
     *   """)
     */
    showLeds(pattern: string): void {
        if (typeof pattern !== "string") return;
        // Normalize line endings and extract only '#' and '.' markers
        const markers = pattern
            .replace(/\r/g, "")
            // Remove anything that's not a marker or newline
            .replace(/[^#.\n]/g, "")
            .split("")
            .filter((c) => c === "#" || c === ".");

        // If we didn't get 25 markers, try a line-based approach (take first 5 lines with 5 markers each)
        let cells: ("#" | ".")[] = [];
        if (markers.length >= 25) {
            cells = markers.slice(0, 25) as ("#" | ".")[];
        } else {
            const lines = pattern.replace(/\r/g, "").split(/\n/).filter(Boolean);
            for (const line of lines.slice(0, 5)) {
                const row = (line.match(/[#.]/g) || []).slice(0, 5) as ("#" | ".")[];
                while (row.length < 5) row.push(".");
                cells.push(...row);
                if (cells.length >= 25) break;
            }
            while (cells.length < 25) cells.push(".");
        }

        // Apply to LED matrix, row-major order
        this.ledModule.clearDisplay();
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const idx = y * 5 + x;
                if (cells[idx] === "#") this.ledModule.plot(x, y);
                else this.ledModule.unplot(x, y);
            }
        }
    }

    forever(callback: () => void) {
        const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
        this.foreverCallbacks.add(proxy);
        this.startIndividualForeverLoop(proxy);
    }

    private startIndividualForeverLoop(callback: any) {
        const runCallback = async () => {
            try {
                await callback();
            } catch (error) {
                console.error("Error in forever loop:", error);
            }
            setTimeout(runCallback, 20);
        };
        // Start after a delay to allow on_start() to complete
        setTimeout(runCallback, 100);
    }

    async pause(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }

    reset() {
        this.foreverCallbacks.forEach((callback) => {
            if (callback.destroy) {
                callback.destroy();
            }
        });
        this.foreverCallbacks.clear();
    }

    getAPI() {
        return {
            show_string: this.showString.bind(this),
            show_number: this.showNumber.bind(this),
            show_leds: this.showLeds.bind(this),
            forever: this.forever.bind(this),
            pause: this.pause.bind(this),
        };
    }
}