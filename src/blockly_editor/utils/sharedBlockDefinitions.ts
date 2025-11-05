//TEST
import * as Blockly from "blockly";
import { Order } from "blockly/python";

/**
 * Shared interface for block definitions that enables bidirectional conversion
 *
 * This interface ensures that each block type has all the necessary components for:
 * 1. Defining the block's appearance and behavior in Blockly (blockDefinition)
 * 2. Parsing Python code to create blocks (pythonPattern + pythonExtractor + blockCreator)
 * 3. Generating Python code from blocks (pythonGenerator)
 *
 * By using this shared approach, we eliminate code duplication and ensure consistency
 * between Python-to-Blockly and Blockly-to-Python conversions.
 */
export interface SharedBlockDefinition {
  /** Unique identifier for this block type */
  type: string;

  category?: CategoryName;

  /** Blockly JSON definition describing the block's appearance and connections */
  blockDefinition: any;

  /** Regular expression pattern that matches Python code for this block type */
  pythonPattern: RegExp;

  /** Function that generates Python code from a Blockly block instance */
  pythonGenerator: (block: any, generator?: any) => string | [string, number];

  /** Function that extracts values from matched Python code */
  pythonExtractor: (match: RegExpMatchArray) => Record<string, any>;

  /** Function that creates a Blockly block from extracted values */
  blockCreator: (
    workspace: Blockly.Workspace,
    values: Record<string, any>
  ) => Blockly.Block;
}

// categories with name and color
export interface BlockCategory {
  name: string;
  color: string | number; // color can be a string (hex) or number (hue)
}

type CategoryName = (typeof BLOCK_CATEGORIES)[number]["name"];

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { name: "Basic", color: 220 },
  { name: "Input", color: 290 },
  { name: "Music", color: "#D32F2F" }, //  Music category
  { name: "Led", color: 300 },
  { name: "Logic", color: 180.72 },
  // Place Variables directly after Logic (to match MakeCode ordering)
  { name: "Variables", color: "#A64D79" }, // Purple color matching MakeCode
  { name: "Math", color: "#F06292" }, // Pink color matching MakeCode
  { name: "Music", color: "#D32F2F" }, //  Music category
  { name: "Uncategorized", color: "#999999" }, // Gray for uncategorized
];

// Category icons mapping for toolbox UI enhancement
export const CATEGORY_ICONS: Record<string, string> = {
  "Basic": "⚡", // Lightning bolt for basic functions
  "Input": "🎮", // Game controller for input
  "Music": "🎵", // Play Music
  "Led": "💡", // Light bulb for LED
  "Logic": "🔀", // Flow for logic
  "Variables": "📦", // Box for variables
  "Math": "🔢", // Numbers for math
  "Music": "🎵", // Play Music
  "Uncategorized": "📋", // Clipboard for uncategorized
};

/**
 * Indent a container body by one level if it isn't indented already.
 * - Preserves existing indentation if present.
 * - Ensures a trailing newline.
 * - Returns an IND + 'pass' line when code is empty.
 */
function indentBodyIfNeeded(code: string, IND: string): string {
  if (!code || code.trim().length === 0) return `${IND}pass\n`;
  const normalized = code.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const firstContent = lines.find((l) => l.trim().length > 0) ?? "";
  const startsIndented = /^\s+/.test(firstContent);
  const processed = startsIndented
    ? lines
    : lines.map((l) => (l.trim().length === 0 ? l : IND + l));
  let out = processed.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

/**
 * Helper function to safely create and initialize a block
 * Handles both headless and rendered workspaces properly
 */
function createAndInitializeBlock(
  workspace: Blockly.Workspace,
  blockType: string,
  fieldUpdates?: Record<string, any>
): Blockly.Block {
  const block = workspace.newBlock(blockType);

  // Apply field updates first
  if (fieldUpdates) {
    for (const [fieldName, value] of Object.entries(fieldUpdates)) {
      block.setFieldValue(value, fieldName);
    }
  }

  // Only initialize SVG if workspace supports rendering (not headless)
  if (workspace.rendered && (block as any).initSvg) {
    try {
      (block as any).initSvg();
      (block as any).render();
    } catch (error) {
      console.warn("Could not initialize SVG for block:", error);
    }
  }

  return block;
}

/**
 * Shared block definitions for micro:bit blocks
 * This ensures consistency between Python generation and parsing
 */
export const SHARED_MICROBIT_BLOCKS: SharedBlockDefinition[] = [
  {
    // basic blocks
    type: "show_string",
    category: "Basic",
    blockDefinition: {
      type: "show_string",
      message0: "show string %1",
      args0: [
        {
          type: "input_value",
          name: "TEXT",
          check: "String",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Show a string on the display",
    },
    pythonPattern: /basic\.show_string\((['"])(.+?)\1\)/g,
    pythonGenerator: (block, generator) => {
      const text = generator.valueToCode(block, "TEXT", (generator as any).ORDER_NONE) || '""';
      return `basic.show_string(${text})\n`;
    },
    pythonExtractor: (match) => ({
      TEXT: match[2],
    }),
    blockCreator: (workspace, values) => {
      return createAndInitializeBlock(workspace, "show_string", {
        TEXT: values.TEXT,
      });
    },
  },
  {
    type: "show_number",
    category: "Basic",
    blockDefinition: {
      type: "show_number",
      message0: "show number %1",
      args0: [
        {
          // Switch to an input so users can plug variables/expressions like MakeCode
          type: "input_value",
          name: "NUM",
          check: "Number",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Show a number on the display",
    },
    // Keep a simple numeric pattern; general expressions are handled via blocks
    pythonPattern: /basic\.show_number\((-?\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block, generator?: any) => {
      const gen = generator || ({} as any);
      const numCode = gen.valueToCode
        ? gen.valueToCode(block, "NUM", gen.ORDER_NONE) || "0"
        : "0";
      return `basic.show_number(${numCode})\n`;
    },
    pythonExtractor: (match) => ({
      NUM: parseFloat(match[1]),
    }),
    blockCreator: (workspace, values) => {
      // Create block and plug a number value into the NUM input
      const block = workspace.newBlock("show_number");
      if (workspace.rendered && (block as any).initSvg) (block as any).initSvg();
      // Create shadow number with the parsed value (or 0)
      const num = workspace.newBlock("math_number");
      (num as any).setShadow(true);
      (num as any).setFieldValue(String(Number.isFinite(values.NUM) ? values.NUM : 0), "NUM");
      if ((num as any).initSvg) (num as any).initSvg();
      if ((num as any).render) (num as any).render();
      const input = block.getInput("NUM");
      input?.connection?.connect((num as any).outputConnection);
      if ((block as any).render) (block as any).render();
      return block;
    },
  },
  {
    // Basic: show leds with a 5x5 clickable matrix (MakeCode-style)
    type: "basic_show_leds",
    category: "Basic",
    blockDefinition: {
      type: "basic_show_leds",
      message0: "show leds %1",
      args0: [
        {
          type: "field_led_matrix",
          name: "MATRIX",
          value: ".....\n.....\n.....\n.....\n.....",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Draw a 5×5 image and show it on the LED screen",
    },
    // Matches: basic.show_leds("""\n# . . . .\n. . . . .\n...\n""")
    // Note: Our converter is line-based; this pattern is primarily for documentation and future use.
    pythonPattern: /basic\.show_leds\(\s*(["']){3}([\s\S]*?)\1{3}\s*\)/g,
    pythonGenerator: (block) => {
      // Retrieve matrix value as 5 lines of '#' and '.'
      const raw = (block.getFieldValue("MATRIX") || "") as string;
      // Normalize to 5 lines x 5 cols and format with spaces as MakeCode shows
      const rows = raw
        .toString()
        .replace(/\r/g, "")
        .split("\n")
        .slice(0, 5)
        .map((line: string) => {
          const markers = (line.match(/[#.]/g) || []).slice(0, 5);
          while (markers.length < 5) markers.push(".");
          return markers.join(" ");
        });
      while (rows.length < 5) rows.push(". . . . .");
      const body = rows.join("\n");
      return `basic.show_leds("""\n${body}\n""")\n`;
    },
    pythonExtractor: (match) => {
      // Extract inner triple-quoted content and normalize to 5 lines of '#'/'.'
      const inner = match[2] || "";
      const onlyMarkers = inner
        .replace(/\r/g, "")
        .split("\n");
      const rows: string[] = [];
      for (let y = 0; y < 5; y++) {
        const line = onlyMarkers[y] ?? "";
        const markers = (line.match(/[#.]/g) || []).slice(0, 5);
        while (markers.length < 5) markers.push(".");
        rows.push(markers.join(""));
      }
      return { MATRIX: rows.join("\n") };
    },
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("basic_show_leds");
      block.setFieldValue(values.MATRIX || ".....\n.....\n.....\n.....\n.....", "MATRIX");
      return block;
    },
  },
  {
    type: "pause",
    category: "Basic",
    blockDefinition: {
      type: "pause",
      message0: "pause %1 ms",
      args0: [
        {
          type: "field_number",
          name: "TIME",
          value: 1000,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Pause execution",
    },
    pythonPattern: /basic\.pause\((\d+)\)/g,
    pythonGenerator: (block) => {
      const time = block.getFieldValue("TIME");
      return `basic.pause(${time})\n`;
    },
    pythonExtractor: (match) => ({
      TIME: parseInt(match[1]),
    }),
    blockCreator: (workspace, values) => {
      return createAndInitializeBlock(workspace, "pause", {
        TIME: values.TIME,
      });
    },
  },

  // led blocks
  {
    type: "plot_led",
    category: "Led",
    blockDefinition: {
      type: "plot_led",
      message0: "plot x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn on LED at (x, y)",
    },
    pythonPattern: /led\.plot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.plot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("plot_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "unplot_led",
    category: "Led",
    blockDefinition: {
      type: "unplot_led",
      message0: "unplot x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn off LED at (x, y)",
    },
    pythonPattern: /led\.unplot\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.unplot(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("unplot_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "show_leds",
    category: "Led",
    blockDefinition: {
      type: "show_leds",
      message0: "show leds %1",
      args0: [
        {
          type: "field_multilinetext",
          name: "PATTERN",
          text: "00000\n00000\n00000\n00000\n00000",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Display pattern on LEDs",
    },
    pythonPattern: /display\.show\(Image\((['"'])((?:[01]{5}\n?){5})\1\)\)/g,
    pythonGenerator: (block) => {
      const pattern = block.getFieldValue("PATTERN");
      return `display.show(Image("${pattern}"))\n`;
    },
    pythonExtractor: (match) => ({
      PATTERN: match[2],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_leds");
      block.setFieldValue(values.PATTERN, "PATTERN");
      return block;
    },
  },
  {
    // Basic: show icon (predefined 5x5 patterns)
    // We generate led.unplot for all pixels, then led.plot for the icon pixels
    type: "show_icon",
    category: "Basic",
    blockDefinition: {
      type: "show_icon",
      message0: "show icon %1",
      args0: [
        {
          type: "field_icon",
          name: "ICON",
          value: "HEART",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Show a predefined icon on the LED matrix",
    },
    // Support parsing the MicroPython-like form: display.show(Image.ICON)
    pythonPattern: /display\.show\(Image\.([A-Z_]+)\)/g,
    pythonGenerator: (block) => {
      const icon = (block.getFieldValue("ICON") || "HEART") as string;
      const patterns: Record<string, string[]> = {
        HEART: ["01010", "11111", "11111", "01110", "00100"],
        SMALL_HEART: ["00000", "01010", "01110", "00100", "00000"],
        HAPPY: ["00000", "01010", "00000", "10001", "01110"],
        SAD: ["00000", "01010", "01110", "10001", "00000"],
        YES: ["00001", "00010", "00100", "01000", "10000"],
        NO: ["10001", "01010", "00100", "01010", "10001"],
      };

      const rows = patterns[icon] || patterns.HEART;
      // Generate Python: clear entire 5x5 then plot icon pixels
      const lines: string[] = [];
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          lines.push(`led.unplot(${x}, ${y})`);
        }
      }
      for (let y = 0; y < 5; y++) {
        const row = rows[y];
        for (let x = 0; x < 5; x++) {
          if (row.charAt(x) === "1") {
            lines.push(`led.plot(${x}, ${y})`);
          }
        }
      }
      return lines.join("\n") + "\n";
    },
    pythonExtractor: (match) => ({
      ICON: match[1]?.toUpperCase(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_icon");
      const valid = new Set([
        "HEART",
        "SMALL_HEART",
        "HAPPY",
        "SAD",
        "YES",
        "NO",
      ]);
      const picked = valid.has(values.ICON) ? values.ICON : "HEART";
      block.setFieldValue(picked, "ICON");
      return block;
    },
  },
  {
    // Led: plot with brightness (0..255)
    type: "plot_led_brightness",
    category: "Led",
    blockDefinition: {
      type: "plot_led_brightness",
      message0: "plot x %1 y %2 brightness %3",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
        { type: "field_slider", name: "BRIGHTNESS", value: 255, min: 0, max: 255, precision: 1 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Plot an LED at (x,y) with brightness 0-255",
    },
    // Custom Python mapping for our editor
    pythonPattern: /led\.plot_brightness\((\d+),\s*(\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      const b = block.getFieldValue("BRIGHTNESS");
      return `led.plot_brightness(${x}, ${y}, ${b})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
      BRIGHTNESS: parseInt(match[3]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("plot_led_brightness");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      block.setFieldValue(values.BRIGHTNESS, "BRIGHTNESS");
      return block;
    },
  },
  {
    type: "toggle_led",
    category: "Led",
    blockDefinition: {
      type: "toggle_led",
      message0: "toggle x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Toggle LED at (x, y)",
    },
    pythonPattern: /led\.toggle\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return `led.toggle(${x}, ${y})\n`;
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("toggle_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },
  {
    type: "point_led",
    category: "Led",
    blockDefinition: {
      type: "point_led",
      message0: "point x: %1 y: %2",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
      ],
      output: "Boolean",
      tooltip: "Check if LED at (x, y) is on",
    },
    pythonPattern: /led\.point\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      return [`led.point(${x}, ${y})`, 0];
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("point_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      return block;
    },
  },

  // logic blocks

  // MakeCode-style if/else/else if with dynamic arms (uses Blockly's built-in mutator)
  {
    type: "controls_if",
    category: "Logic",
    blockDefinition: {
      type: "controls_if",
      message0: "if %1 %2",
      args0: [
        { type: "input_value", name: "IF0", check: "Boolean" },
        { type: "input_statement", name: "DO0" },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "If / else if / else",
      mutator: "controls_if_mutator",
    },
    // Note: Parsing full Python if/elif/else into a single block line-by-line is non-trivial.
    // We use a broad pattern so text->blocks can at least place an if block; edits remain block-first.
    pythonPattern: /\bif\b[\s\S]*?:/g,
    pythonGenerator: (block, generator) => {
      let n = 0;
      let code = "";
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const ensureBody = (s: string) => {
        // Use generator-provided indentation; do NOT re-indent existing lines.
        if (s && s.trim().length > 0) return s;
        return IND + "# your code here\n";
      };

      // First arm
      const condition0 =
        generator.valueToCode(block, "IF0", (generator as any).ORDER_NONE) ||
        "True";
      const branch0 = generator.statementToCode(block, "DO0");
      code += `if ${condition0}:\n${ensureBody(branch0)}`;

      // Else-if arms
      for (n = 1; block.getInput("IF" + n); n++) {
        const cond =
          generator.valueToCode(block, "IF" + n, (generator as any).ORDER_NONE) ||
          "False";
        const branch = generator.statementToCode(block, "DO" + n);
        code += `elif ${cond}:\n${ensureBody(branch)}`;
      }

      // Else arm
      if (block.getInput("ELSE")) {
        const elseBranch = generator.statementToCode(block, "ELSE");
        code += `else:\n${ensureBody(elseBranch)}`;
      }
      // Ensure trailing newline for cleaner concatenation
      if (!code.endsWith("\n")) code += "\n";
      return code;
    },
    pythonExtractor: () => ({}),
    blockCreator: (workspace) => {
      return createAndInitializeBlock(workspace, "controls_if");
    },
  },

  // input blocks

  // --- NEW: on_button_pressed event block (A, B, A+B) ---
  {
    type: "on_button_pressed",
    category: "Input",
    blockDefinition: {
      type: "on_button_pressed",
      message0: "on button %1 pressed %2",
      args0: [
        {
          type: "field_dropdown",
          name: "BUTTON",
          options: [
            ["A", "A"],
            ["B", "B"],
            ["A+B", "AB"],
          ],
        },
        { type: "input_statement", name: "DO" },
      ],
      tooltip: "Run when a button is pressed",
      nextStatement: null,
    },
    // Matches a typical generated handler pattern like:
    // def on_button_pressed_a():
    //     ...
    // input.on_button_pressed(Button.A, on_button_pressed_a)
    pythonPattern: /def\s+on_button_pressed_(a|b|ab)\s*\(\s*\)\s*:([\s\S]*?)\n\s*input\.on_button_pressed\(\s*Button\.(A|B|AB)\s*,\s*([A-Za-z_]\w*)\s*\)/gi,
    pythonGenerator: (block, generator) => {
      const btn = block.getFieldValue("BUTTON");
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      const funcName = `on_button_pressed_${btn.toLowerCase()}`;
      // Collect variables used in this handler
      const used = new Set<string>();
      const assigned = new Set<string>();
      try {
        const getName = (ws: any, id: string) => {
          try {
            const m = typeof ws?.getVariableById === "function" ? ws.getVariableById(id) : null;
            return (m && m.name) || (id && !/^[a-f0-9-]{8,}$/i.test(id) ? id : "x");
          } catch { return "x"; }
        };
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (!d || !d.type) continue;
            if (d.type === "variables_get") {
              const id = d.getFieldValue("VAR");
              used.add(getName(block.workspace, id));
            } else if (d.type === "variables_set") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
              assigned.add(name);
            } else if (d.type === "math_change") {
              // change requires a prior value -> treat as usage, not a defining assignment
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
            }
          }
        }
      } catch (_) {}
      const globals = Array.from(used);
      const globalLine = globals.length ? `${IND}global ${globals.join(", ")}\n` : "";
      // Ensure body is indented one level when needed
      const body = indentBodyIfNeeded(statements, IND);
      return `def ${funcName}():\n${globalLine}${body}\ninput.on_button_pressed(Button.${btn}, ${funcName})\n`;
    },
    pythonExtractor: (match) => ({
      BUTTON: (match[3] || match[1]).toUpperCase(),
      STATEMENTS: (match[2] || "").trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_button_pressed");
      // default to A if value missing
      block.setFieldValue(values.BUTTON || "A", "BUTTON");
      return block;
    },
  },
  {
    type: "button_is_pressed",
    category: "Input",
    blockDefinition: {
      type: "button_is_pressed",
      message0: "button %1 is pressed",
      args0: [
        {
          type: "field_dropdown",
          name: "BUTTON",
          options: [
            ["A", "A"],
            ["B", "B"],
            ["A+B", "AB"],
          ],
        },
      ],
      output: "Boolean",
      tooltip: "Check whether a button is currently pressed",
    },
    // Matches calls like: input.button_is_pressed(Button.A)
    pythonPattern: /input\.button_is_pressed\(\s*Button\.(A|B|AB)\s*\)/g,
    pythonGenerator: (block) => {
      const btn = block.getFieldValue("BUTTON") || "A";
      return [`input.button_is_pressed(Button.${btn})`, (Order as any)?.NONE || 0];
    },
    pythonExtractor: (match) => ({
      BUTTON: match[1].toUpperCase(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("button_is_pressed");
      block.setFieldValue(values.BUTTON || "A", "BUTTON");
      return block;
    },
  },

  {
    type: "forever",
    category: "Basic",
    blockDefinition: {
      type: "forever",
      message0: "forever %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Runs code forever",
    },
    // Support recognizing either the classic while True: form or
    // the handler registration style we generate below
    // - def on_forever():\n    ...\n    basic.forever(on_forever)
    pythonPattern: /(def\s+on_forever\(\s*\)\s*:|basic\.forever\(\s*on_forever\s*\)|while\s+True\s*:)/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      // Collect variables used in this container
      const used = new Set<string>();
      const assigned = new Set<string>();
      try {
        const getName = (ws: any, id: string) => {
          try {
            const m = typeof ws?.getVariableById === "function" ? ws.getVariableById(id) : null;
            return (m && m.name) || (id && !/^[a-f0-9-]{8,}$/i.test(id) ? id : "x");
          } catch { return "x"; }
        };
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (!d || !d.type) continue;
            if (d.type === "variables_get") {
              const id = d.getFieldValue("VAR");
              used.add(getName(block.workspace, id));
            } else if (d.type === "variables_set") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
              assigned.add(name);
            } else if (d.type === "math_change") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
            }
          }
        }
      } catch (_) {}
      const globals = Array.from(used);
      const globalLine = globals.length ? `${IND}global ${globals.join(", ")}\n` : "";

      // Ensure body is indented one level when needed
      const body = indentBodyIfNeeded(statements, IND);
      return `def on_forever():\n${globalLine}${body}basic.forever(on_forever)\n`;
    },
    pythonExtractor: (_match) => ({
      STATEMENTS: "",
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("forever");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
  {
    type: "on_start",
    category: "Basic",
    blockDefinition: {
      type: "on_start",
      message0: "on start %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      tooltip: "Runs once at the start",
      nextStatement: null,
    },
    pythonPattern: /def\s+on_start\(\s*\)\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const IND = ((generator as any)?.INDENT ?? "    ") as string;
      const statements = generator.statementToCode(block, "DO");
      // Collect variables used in on_start
      const used = new Set<string>();
      const assigned = new Set<string>();
      try {
        const getName = (ws: any, id: string) => {
          try {
            const m = typeof ws?.getVariableById === "function" ? ws.getVariableById(id) : null;
            return (m && m.name) || (id && !/^[a-f0-9-]{8,}$/i.test(id) ? id : "x");
          } catch { return "x"; }
        };
        const doInput = block.getInputTargetBlock("DO");
        if (doInput) {
          const desc = doInput.getDescendants(false);
          for (const d of desc) {
            if (!d || !d.type) continue;
            if (d.type === "variables_get") {
              const id = d.getFieldValue("VAR");
              used.add(getName(block.workspace, id));
            } else if (d.type === "variables_set") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
              assigned.add(name);
            } else if (d.type === "math_change") {
              const id = d.getFieldValue("VAR");
              const name = getName(block.workspace, id);
              used.add(name);
            }
          }
        }
      } catch (_) {}
      const globals = Array.from(new Set<string>([...used]));
      const globalLine = globals.length ? `${IND}global ${globals.join(", ")}\n` : "";
      // Ensure body is indented one level when needed
      const bodyIndented = indentBodyIfNeeded(statements, IND);
      return `def on_start():\n${globalLine}${bodyIndented}\non_start()\n`;
    },
    pythonExtractor: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_start");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
  {
    type: "microbit_accelerometer",
    blockDefinition: {
      type: "microbit_accelerometer",
      message0: "accelerometer %1",
      args0: [
        {
          type: "field_dropdown",
          name: "AXIS",
          options: [
            ["x", "x"],
            ["y", "y"],
            ["z", "z"],
          ],
        },
      ],
      output: "Number",
      tooltip: "Get accelerometer reading",
    },
    pythonPattern: /accelerometer\.get_([xyz])\(\)/g,
    pythonGenerator: (block, generator) => {
      const axis = block.getFieldValue("AXIS");
      return [
        `accelerometer.get_${axis}()`,
        (generator as any).ORDER_NONE || 0,
      ];
    },
    pythonExtractor: (match) => ({
      AXIS: match[1],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_accelerometer");
      block.setFieldValue(values.AXIS, "AXIS");
      return block;
    },
  },
  {
    type: "microbit_pin_read",
    blockDefinition: {
      type: "microbit_pin_read",
      message0: "read analog pin %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"],
            ["1", "1"],
            ["2", "2"],
          ],
        },
      ],
      output: "Number",
      tooltip: "Read analog value from pin",
    },
    pythonPattern: /pin(\d+)\.read_analog\(\)/g,
    pythonGenerator: (block, generator) => {
      const pin = block.getFieldValue("PIN");
      return [`pin${pin}.read_analog()`, (generator as any).ORDER_NONE || 0];
    },
    pythonExtractor: (match) => ({
      PIN: match[1],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_pin_read");
      block.setFieldValue(values.PIN, "PIN");
      return block;
    },
  },
  {
    type: "microbit_pin_write",
    blockDefinition: {
      type: "microbit_pin_write",
      message0: "write analog pin %1 value %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"],
            ["1", "1"],
            ["2", "2"],
          ],
        },
        {
          type: "field_number",
          name: "VALUE",
          value: 512,
          min: 0,
          max: 1023,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Write analog value to pin",
    },
    pythonPattern: /pin(\d+)\.write_analog\((\d+)\)/g,
    pythonGenerator: (block) => {
      const pin = block.getFieldValue("PIN");
      const value = block.getFieldValue("VALUE");
      return `pin${pin}.write_analog(${value})\n`;
    },
    pythonExtractor: (match) => ({
      PIN: match[1],
      VALUE: parseInt(match[2]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("microbit_pin_write");
      block.setFieldValue(values.PIN, "PIN");
      block.setFieldValue(values.VALUE, "VALUE");
      return block;
    },
  },

  // --- MUSIC BLOCKS ---
<<<<<<< HEAD
{
  type: "music_play_tone",
  category: "Music",
  blockDefinition: {
    type: "music_play_tone",
    message0: "play tone %1 for %2 beat %3",
    args0: [
      {
        type: "field_dropdown",
        name: "NOTE",
        options: [
          ["Middle C", "262"],
          ["Middle D", "294"],
          ["Middle E", "330"],
          ["Middle F", "349"],
          ["Middle G", "392"],
          ["Middle A", "440"],
          ["Middle B", "494"],
        ],
      },
      {
        type: "field_dropdown",
        name: "DURATION",
        options: [
          ["1", "1"],
          ["1/2", "0.5"],
          ["1/4", "0.25"],
          ["1/8", "0.125"],
          ["2", "2"],
          ["4", "4"],
        ],
      },
      {
        type: "field_dropdown",
        name: "MODE",
        options: [
          ["until done", "until_done"],
          ["in background", "background"],
          ["looping in background", "loop"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#D32F2F",
    tooltip: "Play a tone of specific frequency and duration",
  },
  pythonPattern: /music\.play_tone\((\d+),\s*(\d+)\)/g,
  pythonGenerator: (block) => {
    const freq = block.getFieldValue("NOTE");
    const duration = block.getFieldValue("DURATION");
    return `music.play_tone(${freq}, ${duration})\n`;
  },
  pythonExtractor: (match) => ({
    NOTE: match[1],
    DURATION: match[2],
  }),
  blockCreator: (workspace, values) => {
    const block = workspace.newBlock("music_play_tone");
    block.setFieldValue(values.NOTE || "262", "NOTE");
    block.setFieldValue(values.DURATION || "1", "DURATION");
    block.setFieldValue(values.MODE || "until_done", "MODE");
    return block;
  },
},

{
  type: "music_ring_tone",
  category: "Music",
  blockDefinition: {
    type: "music_ring_tone",
    message0: "ring tone (Hz) %1",
    args0: [
      {
        type: "field_number",
        name: "FREQ",
        value: 262,
        min: 100,
        max: 10000,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#D32F2F",
    tooltip: "Continuously play a tone at the given frequency",
  },
  pythonPattern: /music\.ring_tone\((\d+)\)/g,
  pythonGenerator: (block) => {
    const freq = block.getFieldValue("FREQ");
    return `music.ring_tone(${freq})\n`;
  },
  pythonExtractor: (match) => ({
    FREQ: parseInt(match[1]),
  }),
  blockCreator: (workspace, values) => {
    const block = workspace.newBlock("music_ring_tone");
    block.setFieldValue(values.FREQ || 262, "FREQ");
    return block;
  },
},

{
  type: "music_rest",
  category: "Music",
  blockDefinition: {
    type: "music_rest",
    message0: "rest for %1 beat",
    args0: [
      {
        type: "field_dropdown",
        name: "DURATION",
        options: [
          ["1", "1"],
          ["1/2", "0.5"],
          ["1/4", "0.25"],
          ["1/8", "0.125"],
          ["2", "2"],
          ["4", "4"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: "#D32F2F",
    tooltip: "Pause playback for a number of beats",
  },
  pythonPattern: /music\.rest\((\d+)\)/g,
  pythonGenerator: (block) => {
    const duration = block.getFieldValue("DURATION");
    return `music.rest(${duration})\n`;
  },
  pythonExtractor: (match) => ({
    DURATION: match[1],
  }),
  blockCreator: (workspace, values) => {
    const block = workspace.newBlock("music_rest");
    block.setFieldValue(values.DURATION || "1", "DURATION");
    return block;
  },
},
// --- END MUSIC BLOCKS ---
=======
  {
    type: "music_play_tone",
    category: "Music",
    blockDefinition: {
      type: "music_play_tone",
      message0: "play tone %1 for %2 beat %3",
      args0: [
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["Middle C", "262"],
            ["Middle D", "294"],
            ["Middle E", "330"],
            ["Middle F", "349"],
            ["Middle G", "392"],
            ["Middle A", "440"],
            ["Middle B", "494"],
          ],
        },
        {
          type: "field_dropdown",
          name: "DURATION",
          options: [
            ["1", "1"],
            ["1/2", "0.5"],
            ["1/4", "0.25"],
            ["1/8", "0.125"],
            ["2", "2"],
            ["4", "4"],
          ],
        },
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["until done", "until_done"],
            ["in background", "background"],
            ["looping in background", "loop"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Play a tone of specific frequency and duration",
    },
    pythonPattern: /music\.play_tone\((\d+),\s*(\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block, generator) => {
      const freq = block.getFieldValue("NOTE");
      const duration = block.getFieldValue("DURATION");
      const mode = block.getFieldValue("MODE") || "until_done";

      // Looping in background: sustain the tone continuously without blocking
      if (mode === "loop") {
        return `music.ring_tone(${freq})\n`;
      }

      // Until done (blocking) and background (single-shot fallback) both emit a single play call
      return `music.play_tone(${freq}, ${duration})\n`;
    },
    pythonExtractor: (match) => ({
      NOTE: match[1],
      DURATION: match[2],
      MODE: "until_done",
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_play_tone");
      block.setFieldValue(values.NOTE || "262", "NOTE");
      block.setFieldValue(values.DURATION || "1", "DURATION");
      block.setFieldValue(values.MODE || "until_done", "MODE");
      return block;
    },
  },
  {
    type: "music_ring_tone",
    category: "Music",
    blockDefinition: {
      type: "music_ring_tone",
      message0: "ring tone (Hz) %1",
      args0: [
        {
          type: "field_number",
          name: "FREQ",
          value: 262,
          min: 100,
          max: 10000,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Continuously play a tone at the given frequency",
    },
    pythonPattern: /music\.ring_tone\((\d+)\)/g,
    pythonGenerator: (block) => {
      const freq = block.getFieldValue("FREQ");
      return `music.ring_tone(${freq})\n`;
    },
    pythonExtractor: (match) => ({
      FREQ: parseInt(match[1]),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_ring_tone");
      block.setFieldValue(values.FREQ || 262, "FREQ");
      return block;
    },
  },
  {
    type: "music_rest",
    category: "Music",
    blockDefinition: {
      type: "music_rest",
      message0: "rest for %1 beat",
      args0: [
        {
          type: "field_dropdown",
          name: "DURATION",
          options: [
            ["1", "1"],
            ["1/2", "0.5"],
            ["1/4", "0.25"],
            ["1/8", "0.125"],
            ["2", "2"],
            ["4", "4"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      tooltip: "Pause playback for a number of beats",
    },
    pythonPattern: /music\.rest\((\d+(?:\.\d+)?)\)/g,
    pythonGenerator: (block) => {
      const duration = block.getFieldValue("DURATION");
      return `music.rest(${duration})\n`;
    },
    pythonExtractor: (match) => ({
      DURATION: match[1],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("music_rest");
      block.setFieldValue(values.DURATION || "1", "DURATION");
      return block;
    },
  },
  // --- END MUSIC BLOCKS ---

  {
    type: "text",
    category: "Math",
    blockDefinition: {
      type: "text",
      message0: "%1",
      args0: [
        {
          type: "field_input",
          name: "TEXT",
          text: "",
        },
      ],
      output: "String",
      tooltip: "A text value",
      helpUrl: "",
    },
    pythonPattern: /(['"])(.+?)\1/g,
    pythonGenerator: (block, generator) => {
      const text = block.getFieldValue("TEXT");
      const code = JSON.stringify(text);
      return [code, (generator as any).ORDER_ATOMIC || 0];
    },
    pythonExtractor: (match) => ({
      TEXT: match[2],
    }),
    blockCreator: (workspace, values) => {
      return createAndInitializeBlock(workspace, "text", {
        TEXT: values.TEXT || "",
      });
    },
  },

  


>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
];



/**
 * Utility functions for working with shared block definitions
 *
 * This registry manages all block definitions and provides methods for:
 * - Registering blocks with Blockly
 * - Setting up Python code generators
 * - Finding blocks that match Python patterns
 * - Creating blocks from Python code
 */
export class SharedBlockRegistry {
  /**
   * Register all shared block definitions with Blockly
   * This makes the blocks available in the Blockly editor toolbox and workspace
   */
  static registerBlocks(): void {
    // Set block color to match category color before registering

    Blockly.utils.colour.setHsvSaturation(1);
    Blockly.utils.colour.setHsvValue(0.8314);
    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      const category = block.category ?? "Uncategorized";
      const categoryObj = BLOCK_CATEGORIES.find((c) => c.name === category);
      if (categoryObj) {
        block.blockDefinition.colour = categoryObj.color;
      }
    });
    const blockDefinitions = SHARED_MICROBIT_BLOCKS.map(
      (block) => block.blockDefinition
    );
    Blockly.defineBlocksWithJsonArray(blockDefinitions);
  }

  /**
   * Register Python code generators for all block types
   * This enables blocks-to-Python conversion
   * @param pythonGenerator The Blockly Python generator instance
   */
  static registerPythonGenerators(pythonGenerator: any): void {
    const GATED_BLOCKS = new Set<string>([
      // LED
      "plot_led",
      "unplot_led",
      "toggle_led",
      "plot_led_brightness",
      "show_leds",
      // BASIC
      "show_string",
      "show_number",
      "basic_show_leds",
      "pause",
      "show_icon",
      // LOGIC
      "controls_if",
    ]);
    const EVENT_CONTAINER_BLOCKS = new Set<string>([
      "forever",
      "on_start",
      "on_button_pressed",
    ]);

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      const originalGen = block.pythonGenerator;
      // Wrap generators so disabled LED statement blocks emit no code
      pythonGenerator.forBlock[block.type] = (blk: any, gen: any) => {
        try {
          if (GATED_BLOCKS.has(blk?.type)) {
            // Gate by enable state
            const isDisabled = typeof blk.getInheritedDisabled === "function"
              ? blk.getInheritedDisabled()
              : (typeof blk.isEnabled === "function" ? !blk.isEnabled() : false);
            if (isDisabled) return "";

            // Gate by structural context: must be under an event container
            const root = typeof blk.getRootBlock === "function" ? blk.getRootBlock() : null;
            const rootType = root?.type as string | undefined;
            if (!rootType || !EVENT_CONTAINER_BLOCKS.has(rootType)) {
              return "";
            }
          }
        } catch (_) {
          // Fall through to generation on any unexpected error
        }
        return originalGen(blk, gen);
      };
    });

    // --- Built-in Variables blocks (not part of SHARED_MICROBIT_BLOCKS) ---
    const resolveVarName = (workspace: any, varIdOrName: string): string => {
      try {
        const model = typeof workspace?.getVariableById === "function"
          ? workspace.getVariableById(varIdOrName)
          : null;
        if (model && model.name) return model.name;
      } catch (_) {}
      // If varIdOrName already looks like a readable name, use it; else default
      if (varIdOrName && !/^[a-f0-9-]{8,}$/i.test(varIdOrName)) return varIdOrName;
      return "x";
    };

    // variables_set: name = value
    pythonGenerator.forBlock["variables_set"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      const rhs = generator.valueToCode(block, "VALUE", generator.ORDER_NONE) || "0";
      return `${name} = ${rhs}\n`;
    };

    // math_change: name += delta
    pythonGenerator.forBlock["math_change"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      const delta = generator.valueToCode(block, "DELTA", generator.ORDER_NONE) || "1";
      return `${name} += ${delta}\n`;
    };

    // variables_get: expression use
    pythonGenerator.forBlock["variables_get"] = (block: any, generator: any) => {
      const varId = block.getFieldValue("VAR");
      const name = resolveVarName(block.workspace, varId);
      return [name, generator.ORDER_ATOMIC || 0];
    };
  }

  /**
   * Find a block definition by its type name
   * @param type The block type to find
   * @returns The block definition, or undefined if not found
   */
  static getBlockDefinition(type: string): SharedBlockDefinition | undefined {
    return SHARED_MICROBIT_BLOCKS.find((block) => block.type === type);
  }

  /**
   * Get all registered block type names
   * @returns Array of block type strings
   */
  static getBlockTypes(): string[] {
    return SHARED_MICROBIT_BLOCKS.map((block) => block.type);
  }

  /**
   * Find all block definitions that match the given Python code
   * Tests the code against each block's Python pattern
   * @param code The Python code to test
   * @returns Array of matching block definitions
   */
  static matchesPythonPattern(code: string): SharedBlockDefinition[] {
    const matches: SharedBlockDefinition[] = [];

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      // Reset regex state before testing
      block.pythonPattern.lastIndex = 0;
      if (block.pythonPattern.test(code)) {
        matches.push(block);
      }
    });

    return matches;
  }

  /**
   * Create a block from Python code using the appropriate block definition
   * @param workspace The Blockly workspace to create the block in
   * @param pythonCode The Python code line to parse
   * @param blockType The type of block to create
   * @returns The created block, or null if creation failed
   */
  static createBlockFromPython(
    workspace: Blockly.Workspace,
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    const blockDef = this.getBlockDefinition(blockType);
    if (!blockDef) {
      return null;
    }

    // Reset regex state and try to match the Python code
    blockDef.pythonPattern.lastIndex = 0;
    const match = blockDef.pythonPattern.exec(pythonCode);
    if (!match) {
      return null;
    }

    // Extract values from the matched Python code and create the block
    const values = blockDef.pythonExtractor(match);
    return blockDef.blockCreator(workspace, values);
  }
}

/**
 * Enhanced converter that uses shared block definitions for consistent bidirectional conversion
 *
 * This converter processes Python code line by line, matching each line against known patterns
 * and creating corresponding Blockly blocks. It handles block connections automatically.
 */
export class EnhancedPythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  /**
   * Convert Python code to Blockly blocks using shared definitions
   *
   * Process:
   * 1. Split Python code into individual lines
   * 2. For each line, find matching block patterns
   * 3. Create blocks using the shared block definitions
   * 4. Connect sequential blocks together
   *
   * @param pythonCode The complete Python code to convert
   * @returns Array of created Blockly blocks
   */
  convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    const lines = pythonCode.split("\n");
    let currentLine = 0;

    // Process each line of Python code
    while (currentLine < lines.length) {
      const line = lines[currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        currentLine++;
        continue;
      }

      // Find block patterns that match this line
      const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(line);

      if (matchingBlocks.length > 0) {
        // Use the first matching block type (most specific match)
        const blockDef = matchingBlocks[0];
        const block = SharedBlockRegistry.createBlockFromPython(
          this.workspace,
          line,
          blockDef.type
        );

        if (block) {
          blocks.push(block);
        }
      }

      currentLine++;
    }

    // Connect blocks that should be in sequence (e.g., statements in a program)
    this.connectSequentialBlocks(blocks);

    return blocks;
  }

  /**
   * Connect blocks that should be in sequence (statements that execute one after another)
   *
   * This method links blocks together using Blockly's connection system.
   * Only connects blocks that have the appropriate connection points:
   * - Current block must have a 'nextConnection'
   * - Next block must have a 'previousConnection'
   *
   * @param blocks Array of blocks to connect in order
   */
  private connectSequentialBlocks(blocks: Blockly.Block[]): void {
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      // Only connect if both blocks have the right connection types
      if (currentBlock.nextConnection && nextBlock.previousConnection) {
        try {
          currentBlock.nextConnection.connect(nextBlock.previousConnection);
        } catch (error) {
          // Connection failed - blocks might already be connected or incompatible
          console.warn("Failed to connect blocks:", error);
        }
      }
    }
  }

  /**
   * Convert Python code to a specific block type (for targeted conversion)
   * @param pythonCode The Python code to convert
   * @param blockType The specific block type to create
   * @returns The created block, or null if conversion failed
   */
  convertToSpecificBlock(
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    return SharedBlockRegistry.createBlockFromPython(
      this.workspace,
      pythonCode,
      blockType
    );
  }
}

/**
 * Utility function to update existing BlocklyEditor to use shared definitions
 */
export function createUpdatedBlocklyEditor() {
  return {
    initializeSharedBlocks: () => {
      SharedBlockRegistry.registerBlocks();
    },

    setupPythonGenerators: (pythonGenerator: any) => {
      SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
    },

    createConverter: (workspace: Blockly.Workspace) => {
      return new EnhancedPythonToBlocklyConverter(workspace);
    },
  };
}

export function createToolboxXmlFromBlocks(): string {
  // Default category name and color if not specified
  const DEFAULT_CATEGORY = "Uncategorized";
  const DEFAULT_COLOR = "#999999ff";

  // Helper: map category name -> color
  const categoryColorMap: Record<string, string> = {};
  BLOCK_CATEGORIES.forEach(({ name, color }) => {
    categoryColorMap[name] = color.toString(); // Convert to string if number
  });

  // Group blocks by category name
  const blocksByCategory: Record<string, SharedBlockDefinition[]> = {};
  for (const block of SHARED_MICROBIT_BLOCKS) {
    const category = block.category ?? DEFAULT_CATEGORY;
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  }

  // Helper: generate block XML string with default field values from blockDefinition
  function generateBlockXml(block: SharedBlockDefinition): string {
    // Look for fields with default values in blockDefinition.args0
    const args = block.blockDefinition.args0 || [];
    let fieldsXml = "";
    let valuesXml = "";
    for (const arg of args) {
      if ("name" in arg) {
        // Only generate fields for these arg types: field_input, field_number, field_dropdown, field_multilinetext
        if (
          arg.type === "field_input" ||
          arg.type === "field_number" ||
          arg.type === "field_dropdown" ||
          arg.type === "field_multilinetext"
        ) {
          let defaultValue = "";
          if ("text" in arg) defaultValue = arg.text;
          else if ("value" in arg) defaultValue = arg.value;
          else if (
            "options" in arg &&
            Array.isArray(arg.options) &&
            arg.options.length > 0
          ) {
            // For dropdown, use first option's value as default
            defaultValue = arg.options[0][1];
          }
          fieldsXml += `\n      <field name="${arg.name}">${defaultValue}</field>`;
        } else if (arg.type === "input_value") {
          // Provide sensible default shadows in the toolbox for numeric and string inputs
          const wantsNumberShadow =
            (block.type === "show_number" && arg.name === "NUM") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("Number") : arg.check === "Number"));
          const wantsTextShadow =
            (block.type === "show_string" && arg.name === "TEXT") ||
            (arg.check && (Array.isArray(arg.check) ? arg.check.includes("String") : arg.check === "String"));
          
          if (wantsNumberShadow) {
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="math_number">\n          <field name="NUM">0</field>\n        </shadow>\n      </value>`;
          } else if (wantsTextShadow) {
            valuesXml += `\n      <value name="${arg.name}">\n        <shadow type="text">\n          <field name="TEXT">Hello!</field>\n        </shadow>\n      </value>`;
          }
        }
      }
    }
    return `<block type="${block.type}">${fieldsXml}${valuesXml}\n    </block>`;
  }

  // Helper: get category icon
  function getCategoryIcon(categoryName: string): string {
    return CATEGORY_ICONS[categoryName] || "📋";
  }

  // Compose category XML blocks following BLOCK_CATEGORIES order
  let xml = `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox-categories" style="display: none">\n`;

  const emitted: Set<string> = new Set();
  for (const { name: categoryName } of BLOCK_CATEGORIES) {
    const color = categoryColorMap[categoryName] ?? DEFAULT_COLOR;
    const icon = getCategoryIcon(categoryName);
    
    if (categoryName === "Variables") {
      // Use Blockly's dynamic variables category; include icon for visual parity
      // Blocks appear only after the user creates a variable.
      xml += `  <category name="${icon} ${categoryName}" colour="${color}" custom="VARIABLE"></category>\n`;
      emitted.add(categoryName);
      continue;
    }
    
    if (categoryName === "Math") {
      // Add Math category with number and text blocks
      xml += `  <category name="${icon} ${categoryName}" colour="${color}">\n`;
      // Add our custom text block first
      const mathBlocks = blocksByCategory[categoryName];
      if (mathBlocks && mathBlocks.length > 0) {
        for (const block of mathBlocks) {
          xml += `    ${generateBlockXml(block)}\n`;
        }
      }
      // Add built-in math_number block
      xml += `    <block type="math_number">\n`;
      xml += `      <field name="NUM">0</field>\n`;
      xml += `    </block>\n`;
      xml += `  </category>\n`;
      emitted.add(categoryName);
      continue;
    }

    const blocks = blocksByCategory[categoryName];
    if (blocks && blocks.length > 0) {
      xml += `  <category name="${icon} ${categoryName}" colour="${color}">\n`;
      for (const block of blocks) {
        xml += `    ${generateBlockXml(block)}\n`;
      }
      // Include a couple of essential built-in blocks for better usability
      if (categoryName === "Logic") {
        // Comparison block for conditions (e.g., X == 0) with number shadows, like MakeCode
        xml += `    <block type="logic_compare">\n`;
        xml += `      <field name="OP">EQ</field>\n`;
        xml += `      <value name="A">\n`;
        xml += `        <shadow type="math_number">\n`;
        xml += `          <field name="NUM">0</field>\n`;
        xml += `        </shadow>\n`;
        xml += `      </value>\n`;
        xml += `      <value name="B">\n`;
        xml += `        <shadow type="math_number">\n`;
        xml += `          <field name="NUM">0</field>\n`;
        xml += `        </shadow>\n`;
        xml += `      </value>\n`;
        xml += `    </block>\n`;
        
      }
      xml += `  </category>\n`;
      emitted.add(categoryName);
    }
  }

  // Emit any remaining categories (including Uncategorized) that weren't listed explicitly
  for (const categoryName of Object.keys(blocksByCategory)) {
    if (emitted.has(categoryName)) continue;
    const color = categoryColorMap[categoryName] ?? DEFAULT_COLOR;
    const icon = getCategoryIcon(categoryName);
    const blocks = blocksByCategory[categoryName];
    if (!blocks || blocks.length === 0) continue;
    xml += `  <category name="${icon} ${categoryName}" colour="${color}">\n`;
    for (const block of blocks) {
      xml += `    ${generateBlockXml(block)}\n`;
    }
    xml += `  </category>\n`;
  }

  xml += `</xml>`;
  return xml;
}

