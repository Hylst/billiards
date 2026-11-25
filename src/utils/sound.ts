// Sound Manager - Procedural audio generation using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  init() {
    if (this.audioContext) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('Audio not supported', e);
    }
  }

  // Ball collision sound - short percussive "click"
  playBallCollision(intensity: number = 0.5) {
    if (!this.audioContext || !this.sfxGain || !this.sfxEnabled) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Impact oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + intensity * 200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    oscGain.gain.setValueAtTime(0.3 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);

    // Click noise
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.2 * intensity;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // Cushion bounce sound
  playCushionBounce(intensity: number = 0.3) {
    if (!this.audioContext || !this.sfxGain || !this.sfxEnabled) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    oscGain.gain.setValueAtTime(0.25 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Pocket drop sound - descending "whoosh"
  playPocketDrop() {
    if (!this.audioContext || !this.sfxGain || !this.sfxEnabled) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);

    // Whoosh noise
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.15;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // Cue shot sound - sharp "thwack"
  playCueShot(power: number = 0.5) {
    if (!this.audioContext || !this.sfxGain || !this.sfxEnabled) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Thwack oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + power * 100, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    oscGain.gain.setValueAtTime(0.5 * power, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Sharp click
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.3 * power;
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // Success/jingle sound when ball is pocketed
  playSuccess() {
    if (!this.audioContext || !this.sfxGain || !this.sfxEnabled) return;
    const ctx = this.audioContext;
    const sfxGain = this.sfxGain;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C E G

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = now + i * 0.08;
      oscGain.gain.setValueAtTime(0, startTime);
      oscGain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.connect(oscGain);
      oscGain.connect(sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Background ambient music - jazz/lounge chords
  startBackgroundMusic() {
    if (!this.audioContext || !this.musicGain || !this.musicEnabled) return;
    if (this.musicInterval !== null) return;

    // Chord progression - dreamy jazz progression
    const chordProgressions = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 415.30], // Amaj-ish
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 369.99], // Gmaj
    ];

    const playChord = () => {
      if (!this.audioContext || !this.musicGain || !this.musicEnabled) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const chord = chordProgressions[this.musicStep % chordProgressions.length];

      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
        oscGain.gain.linearRampToValueAtTime(0.05, now + 3);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 4);

        osc.connect(oscGain);
        oscGain.connect(this.musicGain as GainNode);
        osc.start(now);
        osc.stop(now + 4);
      });

      // Add a soft bass note
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = chord[0] / 2;
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
      bassGain.gain.linearRampToValueAtTime(0.08, now + 3);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
      bass.connect(bassGain);
      bassGain.connect(this.musicGain as GainNode);
      bass.start(now);
      bass.stop(now + 4);

      this.musicStep++;
    };

    playChord();
    this.musicInterval = window.setInterval(playChord, 4000);
  }

  stopBackgroundMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  toggleSfx(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  setMasterVolume(value: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }
}

export const soundManager = new SoundManager();
