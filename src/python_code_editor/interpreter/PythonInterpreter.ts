/// <reference lib="webworker" />
"use client";

import type { PyodideInterface } from "pyodide";

const urls = {
  indexURL: {
    local: "/pyodide/",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  },
  src: {
    local: "/pyodide/pyodide.js",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js",
  },
};

declare global {
  interface ConsoleWriterGlobal {
    writeToConsole?: (msg: string) => void;
  }

  var globalThis: ConsoleWriterGlobal;
}

// Global script loading promise, shared across all instances
let pyodideScriptLoadingPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  if (pyodideScriptLoadingPromise) return pyodideScriptLoadingPromise;
  pyodideScriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
  return pyodideScriptLoadingPromise;
}

export class PythonInterpreter {
  private pyodide: PyodideInterface | null = null;
  private outputCallback: ((line: string) => void) | null = null;
  private hardwareModules: Record<string, any> = {};
  private isReady = false;
  private static scriptLoaded = false; // static flag to track if loaded

  constructor(private useRemote = true) {}

  async initialize(): Promise<void> {
    if (this.pyodide) return;

    const checkUrlAvailable = (url: string): Promise<boolean> =>
      fetch(url, { method: "HEAD" })
        .then((res) => res.ok)
        .catch(() => false);

    const tryUrls = [
      { indexURL: urls.indexURL.local, src: urls.src.local },
      { indexURL: urls.indexURL.remote, src: urls.src.remote },
    ];

    for (const { indexURL, src } of tryUrls) {
      try {
        const available = await checkUrlAvailable(src);
        if (!available) continue;

        importScripts(src);
        const loadPyodide = (globalThis as any).loadPyodide;
        if (typeof loadPyodide !== "function") {
          throw new Error("loadPyodide is not a function after importScripts");
        }

        this.pyodide = await loadPyodide({ indexURL });
        this.isReady = true;
        return;
      } catch (e) {
        console.warn("[Pyodide] Failed to load from:", src, e);
      }
    }

    throw new Error(
      "Failed to load Pyodide from both local and remote sources."
    );
  }

  setOutputCallback(callback: (line: string) => void) {
    this.outputCallback = callback;
    (globalThis as any).writeToConsole = (msg: string) => {
      this.outputCallback?.(msg);
    };
  }

  registerHardwareModule(name: string, module: Record<string, any>) {
    if (!this.pyodide) throw new Error("Interpreter not initialized at register hardware module.");
    this.hardwareModules[name] = module;
    this.pyodide.registerJsModule(name, module);
  }

  async run(code: string): Promise<string> {
    if (!this.pyodide) throw new Error("Interpreter not initialized at run pythoninterpreter.");
    code = this.transformCode(code);
    try {
      await this.injectPrintRedirect();
      await this.pyodide.runPythonAsync(code);
      return "";
    } catch (err: any) {
      return err.toString();
    }
  }

  private transformCode(code: string): string {
    // Only treat explicit blocking calls as awaitable. Let show_string/number run fire-and-forget.
    const awaitFunctions = ["basic.pause"]; // do not auto-await show_string/number to avoid syntax errors inside sync defs

    const lines = code.split("\n");
    const transformedLines = lines.map((line) => {
      const trimmed = line.trim();

      for (const func of awaitFunctions) {
        const pattern = new RegExp(`^(${func}\\s*\\()`);
        if (pattern.test(trimmed) && !trimmed.startsWith("await")) {
          return line.replace(pattern, "await " + func + "(");
        }
      }

      return line;
    });

    return transformedLines.join("\n");
  }

  private async injectPrintRedirect() {
    await this.pyodide!.runPythonAsync(`
      import builtins, sys
      class DualOutput:
          def __init__(self):
              self._buffer = []
          def write(self, text):
              if text.strip():
                  import js
                  js.writeToConsole(text)
              self._buffer.append(text)
          def flush(self): pass

      sys.stdout = DualOutput()
      sys.stderr = sys.stdout
      builtins.print = lambda *args, **kwargs: sys.stdout.write(" ".join(map(str, args)) + "\\n")
      from microbit import *
      `);
  }

  getPyodide(): PyodideInterface | null {
    return this.pyodide;
  }

  isInitialized(): boolean {
    return this.isReady;
  }
}
