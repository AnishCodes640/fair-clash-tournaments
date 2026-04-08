// Centralized sound manager using Web Audio API
const audioCtx = typeof AudioContext !== "undefined" ? new AudioContext() : null;

type SoundName = 
  | "jump" | "crash" | "diceRoll" | "tokenMove" | "cashout" 
  | "win" | "lose" | "flip" | "click" | "countdown"
  | "engine" | "kill" | "bet";

interface SoundConfig {
  freq: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  ramp?: number;
}

const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  jump: { freq: 440, duration: 0.15, type: "sine", volume: 0.1 },
  crash: { freq: 100, duration: 0.5, type: "square", volume: 0.12 },
  diceRoll: { freq: 300, duration: 0.15, type: "square", volume: 0.08 },
  tokenMove: { freq: 600, duration: 0.1, type: "sine", volume: 0.08 },
  cashout: { freq: 880, duration: 0.3, type: "sine", volume: 0.12 },
  win: { freq: 880, duration: 0.5, type: "sine", volume: 0.15 },
  lose: { freq: 200, duration: 0.4, type: "sawtooth", volume: 0.1 },
  flip: { freq: 520, duration: 0.1, type: "sine", volume: 0.06 },
  click: { freq: 600, duration: 0.05, type: "sine", volume: 0.05 },
  countdown: { freq: 440, duration: 0.1, type: "sine", volume: 0.08 },
  engine: { freq: 220, duration: 0.3, type: "sawtooth", volume: 0.08 },
  kill: { freq: 200, duration: 0.3, type: "sawtooth", volume: 0.1 },
  bet: { freq: 440, duration: 0.15, type: "sine", volume: 0.1 },
};

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function playSound(name: SoundName) {
  if (!soundEnabled || !audioCtx) return;
  const config = SOUND_CONFIGS[name];
  if (!config) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = config.type;
    osc.frequency.value = config.freq;
    gain.gain.value = config.volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + config.duration);
    osc.stop(audioCtx.currentTime + config.duration);
  } catch {}
}

// Legacy compat for pages that use raw freq-based playSound
export function playSoundRaw(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}
