<<<<<<< HEAD
// AudioPlayer.ts
// Simple tone player using Web Audio API

=======
// Simple tone player using Web Audio API


>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  constructor() {
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (err) {
      console.warn("Web Audio API not supported", err);
    }
  }

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  async playTone(frequency: number, durationSeconds: number = 1) {
    if (!this.audioCtx) return;
    if (this.isPlaying) {
      this.stopTone();
    }

<<<<<<< HEAD
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator.type = "sine"; // could be 'square', 'triangle', 'sawtooth'
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime); // soft volume
    this.oscillator.start();

    this.isPlaying = true;

    await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

    this.stopTone();
  }

=======

    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();


    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);


    this.oscillator.type = "sine"; // could be 'square', 'triangle', 'sawtooth'
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);


    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime); // soft volume
    this.oscillator.start();


    this.isPlaying = true;


    await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));


    this.stopTone();
  }


>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  ringTone(frequency: number) {
    if (!this.audioCtx) return;
    this.stopTone(); // stop existing tone
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
    this.oscillator.start();
    this.isPlaying = true;
  }

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  rest(durationSeconds: number = 1) {
    // Silence pause
    return new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
  }

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  stopTone() {
    try {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
      this.gainNode?.disconnect();
    } catch (_) {}
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

<<<<<<< HEAD
=======

>>>>>>> eb637bcf33d647903e60fb892462a0fc53dcbe28
  dispose() {
    this.stopTone();
    this.audioCtx?.close();
  }
}
