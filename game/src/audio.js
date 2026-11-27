// Gobble Run — all sound, made live with WebAudio, no audio files.
// One job: bleeps, gobbles and a plucky tune, with a mute switch.

export class AudioEngine {
  constructor() {
    this.context = null;
    this.muted = false;
    this._musicTimer = null;
    this._melodyStep = 0;
  }

  // Browsers only let sound start after a gesture; call this on one.
  unlock() {
    if (!this.context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setMuted(muted) {
    this.muted = muted;
  }

  _tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  _noise(seconds, volume, when = 0, lowpass = 1200) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(start);
  }

  click() {
    this._tone(660, 0.07, 'triangle', 0.12);
  }

  jump() {
    this._tone(280, 0.16, 'sine', 0.18, 0, 620);
  }

  corn() {
    this._tone(880, 0.08, 'triangle', 0.16);
    this._tone(1318, 0.1, 'triangle', 0.14, 0.07);
  }

  feather() {
    this._tone(523, 0.1, 'triangle', 0.16);
    this._tone(659, 0.1, 'triangle', 0.16, 0.09);
    this._tone(784, 0.16, 'triangle', 0.16, 0.18);
  }

  knifeWhoosh() {
    this._noise(0.22, 0.2, 0, 2600);
  }

  knifeThud() {
    this._noise(0.12, 0.3, 0, 500);
    this._tone(140, 0.12, 'sine', 0.22, 0, 70);
  }

  stumble() {
    this._tone(220, 0.18, 'sawtooth', 0.14, 0, 110);
    this._noise(0.15, 0.18, 0, 900);
  }

  hurt() {
    this._tone(392, 0.14, 'square', 0.12, 0, 196);
    this._tone(311, 0.2, 'square', 0.12, 0.12, 155);
  }

  gobble() {
    // A turkey's gobble: four quick falling blips.
    for (let i = 0; i < 4; i++) {
      this._tone(420 - i * 40, 0.09, 'sawtooth', 0.1, i * 0.09, 240 - i * 30);
    }
  }

  farmerYell() {
    this._tone(180, 0.3, 'sawtooth', 0.16, 0, 320);
    this._tone(240, 0.25, 'sawtooth', 0.12, 0.1, 360);
  }

  caught() {
    const notes = [392, 370, 349, 311];
    notes.forEach((freq, i) => this._tone(freq, 0.28, 'triangle', 0.16, i * 0.22));
  }

  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((freq, i) => this._tone(freq, 0.22, 'triangle', 0.18, i * 0.14));
  }

  startMusic() {
    if (this._musicTimer || !this.context) return;
    // A light plucky loop in C major pentatonic; the step table is the tune.
    const melody = [523, 0, 659, 784, 0, 659, 587, 0, 523, 0, 587, 659, 0, 0, 784, 0];
    const bass = [131, 0, 0, 0, 175, 0, 0, 0, 196, 0, 0, 0, 175, 0, 131, 0];
    this._musicTimer = window.setInterval(() => {
      if (this.muted || !this.context) return;
      const step = this._melodyStep % 16;
      const note = melody[step];
      if (note) this._tone(note, 0.22, 'triangle', 0.05);
      const low = bass[step];
      if (low) this._tone(low, 0.3, 'sine', 0.07);
      this._melodyStep++;
    }, 230);
  }

  stopMusic() {
    if (this._musicTimer) {
      window.clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
