// src/lib/code/SimulatorProxy.ts
import * as Comlink from "comlink";
import type { MicrobitEvent } from "../mock/types";
import { Simulator } from "@/python_code_editor/lib/Simulator";
import { AudioPlayer } from "./AudioPlayer";


type SupportedLanguage = "python";
type SupportedController = "microbit" | "microbitWithBreakout";

export interface SimulatorOptions {
  language: SupportedLanguage;
  controller: SupportedController;
  onOutput?: (line: string) => void;
  onEvent?: (event: MicrobitEvent) => void;
}

type State = {
  pins: Record<string, { digital: number; analog: number }>;
  leds: number[][];
  buttons: { A: boolean; B: boolean; AB: boolean }; // AB present in snapshot
  logo: boolean; // <- NEW: logo touch state
};

type ButtonEvent = "A" | "B" | "AB";
type LogoEvent = { type: "logo"; state: "pressed" | "released" };
type ButtonObject = { type: "button"; button: ButtonEvent; state: "pressed" };

export class SimulatorProxy {
  private worker: Worker;
  private simulatorRemoteInstance: Comlink.Remote<any> | null = null;
  private options: SimulatorOptions;
  private audio: AudioPlayer | null = null;


  constructor(opts: SimulatorOptions) {
    this.options = {
      ...opts,
      onOutput: opts.onOutput ? Comlink.proxy(opts.onOutput) : undefined,
      onEvent: opts.onEvent ? Comlink.proxy(opts.onEvent) : undefined,
    };
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    return new Worker(
      new URL("../workers/simulator.worker.ts", import.meta.url),
      { type: "module" }
    );
  }

  async initialize() {
    const SimulatorConstructor = Comlink.wrap<typeof Simulator>(this.worker);

    const { language, controller } = this.options;
    this.simulatorRemoteInstance = await new SimulatorConstructor({
      language,
      controller,
    });

    if (!this.simulatorRemoteInstance) {
      throw new Error("SimulatorProxy not initialized after creation.");
    }

    await this.simulatorRemoteInstance.initialize(
      this.options.onOutput,
      this.options.onEvent
    );

    // ✅ Initialize Audio Player
    this.audio = new AudioPlayer();
  }

  async run(code: string): Promise<string> {
  if (!this.simulatorRemoteInstance) throw new Error("Not initialized at run.");

  // Initialize Audio if needed
  if (!this.audio) this.audio = new AudioPlayer();

  // 🎵 1. play_tone(frequency, duration)
  const toneMatch = code.match(/music\.play_tone\((\d+),\s*(\d+)\)/);
  if (toneMatch) {
    const freq = parseFloat(toneMatch[1]);
    const duration = parseFloat(toneMatch[2]);
    await this.audio.playTone(freq, duration);
    return "Played tone";
  }

  // 🎵 2. ring_tone(frequency)
  const ringMatch = code.match(/music\.ring_tone\((\d+)\)/);
  if (ringMatch) {
    const freq = parseFloat(ringMatch[1]);
    this.audio.ringTone(freq);
    return "Ringing tone";
  }

  // 🎵 3. rest(duration)
  const restMatch = code.match(/music\.rest\((\d+)\)/);
  if (restMatch) {
    const duration = parseFloat(restMatch[1]);
    await this.audio.rest(duration);
    return "Rest complete";
  }

  // 🎵 4. stop()
  if (code.includes("music.stop()")) {
    this.audio.stopTone();
    return "Stopped tone";
  }

  // Default: pass to simulator
  return this.simulatorRemoteInstance.run(code);
}


  async getStates(): Promise<State> {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at get states.");
    return this.simulatorRemoteInstance.getStates();
  }

  async reset() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at reset.");
    return this.simulatorRemoteInstance.reset();
  }

  async disposeAndReload() {
    // Stop any tone before resetting
    this.audio?.stopTone(); //stops music when resetting
    this.simulatorRemoteInstance?.reset();
    this.worker.terminate();
    this.worker = this.createWorker();
    this.simulatorRemoteInstance = null;
    await this.initialize();
  }

  // --- INPUT API ---

  async simulateInput(event: ButtonEvent | LogoEvent | ButtonObject) {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized.");

    if (typeof event === "string") {
      // Button A/B/AB
      return this.simulatorRemoteInstance.simulateInput(event);
    }

    // Button object event
    if ((event as ButtonObject).type === "button") {
      const be = event as ButtonObject;
      if (be.state === "pressed") return this.simulatorRemoteInstance.simulateInput(be);
      return this.simulatorRemoteInstance.simulateInput(be);
    }

    // Logo event
    if (event.type === "logo") {
      if (event.state === "pressed") {
        return this.simulatorRemoteInstance.pressLogo();
      } else {
        return this.simulatorRemoteInstance.releaseLogo();
      }
    }

    throw new Error("Unsupported input event");
  }

  // Convenience methods (optional)
  async pressLogo() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at press logo.");
    return this.simulatorRemoteInstance.pressLogo();
  }

  async releaseLogo() {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at release logo.");
    return this.simulatorRemoteInstance.releaseLogo();
  }

  // Convenience: press / release a button programmatically
  async pressButton(button: ButtonEvent) {
    if (!this.simulatorRemoteInstance) throw new Error("Not initialized at press button.");
    return this.simulatorRemoteInstance.simulateInput(button);
  }

  dispose() {
    this.audio?.dispose();
    this.worker.terminate();
  }
}
