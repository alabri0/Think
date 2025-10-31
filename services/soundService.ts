let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

/**
 * Initializes the Web Audio API context. Must be called after a user gesture.
 */
const init = () => {
  if (audioContext || typeof window === 'undefined') return;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.4, audioContext.currentTime); // Master volume
    masterGain.connect(audioContext.destination);
  } catch (e) {
    console.error("Web Audio API is not supported in this browser");
  }
};

/**
 * Plays a simple sound tone.
 * @param freq - The frequency of the tone in Hz.
 * @param duration - The duration of the tone in seconds.
 * @param type - The oscillator wave type.
 * @param volume - The volume of the tone (0 to 1).
 */
const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 1) => {
  if (!audioContext || !masterGain) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
};

// --- Specific Game Sounds ---

const playRoundStart = () => playTone(880, 0.2, 'triangle', 0.8);
const playLetterSelect = () => playTone(1200, 0.15, 'sine', 1);
const playRoundEnd = () => playTone(523, 0.3, 'sawtooth', 0.6);

const playScoreTally = () => {
    if (!audioContext) return;
    playTone(600, 0.05, 'square', 0.7);
    setTimeout(() => playTone(750, 0.05, 'square', 0.7), 70);
    setTimeout(() => playTone(900, 0.05, 'square', 0.7), 140);
};

const playWinner = () => {
    if (!audioContext) return;
    playTone(523, 0.1, 'sine');
    setTimeout(() => playTone(659, 0.1, 'sine'), 120);
    setTimeout(() => playTone(784, 0.1, 'sine'), 240);
    setTimeout(() => playTone(1046, 0.3, 'sine', 1.2), 360);
};


// --- Spinner Sounds (Stateful) ---
let spinInterval: number | null = null;

const playSpinStart = () => {
  if (!audioContext || spinInterval) return;
  
  const tick = () => {
    playTone(1500 + Math.random() * 200, 0.05, 'triangle', 0.3);
  };
  
  tick(); // immediate tick
  spinInterval = window.setInterval(tick, 110);
};

const playSpinStop = () => {
    if (spinInterval) {
        clearInterval(spinInterval);
        spinInterval = null;
    }
};

export const soundService = {
    init,
    playRoundStart,
    playLetterSelect,
    playRoundEnd,
    playScoreTally,
    playWinner,
    playSpinStart,
    playSpinStop,
};
