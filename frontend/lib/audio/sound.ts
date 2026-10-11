/**
 * Efeitos sonoros e trilha sintetizados em tempo real com a Web Audio API.
 * Nenhum arquivo de áudio de terceiros é usado: tudo é gerado por osciladores e ruído,
 * o que mantém o som 100% original e o carregamento leve.
 *
 * Navegadores só liberam áudio depois de uma interação do usuário; chame `unlock()` no
 * primeiro clique (o GameProvider já faz isso).
 */

export type Sfx =
  | "click"
  | "type"
  | "clue"
  | "nothing"
  | "travel"
  | "land"
  | "success"
  | "fail"
  | "error"
  | "siren"
  | "stamp"
  | "page"
  | "alert";

type Wave = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;

  enabled = true;
  musicEnabled = true;
  volume = 0.7;

  private get ready() {
    return this.ctx !== null && this.ctx.state === "running";
  }

  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.applyVolume();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.musicEnabled && this.enabled) this.startMusic();
  }

  configure(opts: { enabled: boolean; musicEnabled: boolean; volume: number }) {
    this.enabled = opts.enabled;
    this.musicEnabled = opts.musicEnabled;
    this.volume = Math.max(0, Math.min(1, opts.volume));
    this.applyVolume();
    if (this.enabled && this.musicEnabled && this.ctx) this.startMusic();
    else this.stopMusic();
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.02);
    this.musicGain?.gain.setTargetAtTime(this.musicEnabled ? 0.16 : 0, this.ctx.currentTime, 0.1);
  }

  private tone(freq: number, start: number, duration: number, wave: Wave = "sine", gain = 0.2, endFreq?: number, out?: AudioNode) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(out ?? this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(start: number, duration: number, gain: number, filter: { type: BiquadFilterType; from: number; to?: number; q?: number }) {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.Q.value = filter.q ?? 1;
    f.frequency.setValueAtTime(filter.from, start);
    if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, start + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.3, duration / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(f).connect(g).connect(this.master!);
    src.start(start);
    src.stop(start + duration + 0.05);
  }

  play(name: Sfx) {
    if (!this.enabled || !this.ready) return;
    const t = this.ctx!.currentTime;
    switch (name) {
      case "click":
        this.tone(1400, t, 0.04, "square", 0.04);
        break;
      case "type":
        this.noise(t, 0.025, 0.05, { type: "highpass", from: 3000 });
        break;
      case "page":
        this.noise(t, 0.25, 0.06, { type: "bandpass", from: 1200, to: 3500, q: 0.8 });
        break;
      case "clue":
        this.tone(880, t, 0.18, "triangle", 0.15);
        this.tone(1318.5, t + 0.12, 0.3, "triangle", 0.15);
        break;
      case "nothing":
        this.tone(330, t, 0.18, "triangle", 0.12);
        this.tone(262, t + 0.15, 0.3, "triangle", 0.12);
        break;
      case "alert":
        this.tone(988, t, 0.12, "square", 0.08);
        this.tone(988, t + 0.18, 0.12, "square", 0.08);
        break;
      case "travel":
        this.noise(t, 2.2, 0.22, { type: "bandpass", from: 300, to: 1800, q: 1.2 });
        this.tone(90, t, 2.2, "sawtooth", 0.05, 140);
        break;
      case "land":
        this.tone(523.25, t, 0.15, "sine", 0.12);
        this.tone(659.25, t + 0.1, 0.25, "sine", 0.12);
        break;
      case "stamp":
        this.noise(t, 0.12, 0.5, { type: "lowpass", from: 600 });
        this.tone(110, t, 0.15, "sine", 0.4, 60);
        break;
      case "siren":
        for (let i = 0; i < 4; i++) {
          this.tone(700, t + i * 0.5, 0.25, "sawtooth", 0.07, 1050);
          this.tone(1050, t + i * 0.5 + 0.25, 0.25, "sawtooth", 0.07, 700);
        }
        break;
      case "success":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.12, 0.35, "triangle", 0.18));
        this.tone(1046.5, t + 0.5, 0.8, "sine", 0.12);
        break;
      case "fail":
        [392, 349.23, 293.66, 233.08].forEach((f, i) => this.tone(f, t + i * 0.2, 0.4, "sawtooth", 0.08));
        break;
      case "error":
        this.tone(150, t, 0.12, "square", 0.1);
        this.tone(130, t + 0.14, 0.18, "square", 0.1);
        break;
    }
  }

  // ---------------------------------------------------------------- trilha
  // Tema original em lá menor: baixo pulsante + arpejo de "espionagem".
  private static BASS = [110, 110, 87.31, 87.31, 98, 98, 82.41, 82.41];
  private static ARP = [
    [440, 523.25, 659.25, 523.25],
    [349.23, 440, 523.25, 440],
    [392, 493.88, 587.33, 493.88],
    [329.63, 392, 493.88, 392],
  ];

  startMusic() {
    if (!this.ctx || this.musicTimer || !this.musicEnabled || !this.enabled) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic() {
    if (!this.ctx || !this.musicGain) return;
    const sixteenth = 60 / 104 / 4;
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
      const bar = Math.floor(this.step / 16) % 8;
      const pos = this.step % 16;
      if (pos % 4 === 0) this.tone(SoundEngine.BASS[bar]!, this.nextNoteTime, sixteenth * 3, "triangle", 0.5, undefined, this.musicGain);
      if (pos % 2 === 0 && bar >= 2) {
        const chord = SoundEngine.ARP[Math.floor(bar / 2) % 4]!;
        this.tone(chord[(pos / 2) % 4]! * 2, this.nextNoteTime, sixteenth * 1.5, "sine", 0.18, undefined, this.musicGain);
      }
      this.nextNoteTime += sixteenth;
      this.step = (this.step + 1) % (16 * 8);
    }
  }
}

export const sound = new SoundEngine();
