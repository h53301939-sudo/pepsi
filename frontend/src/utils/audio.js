// Web Audio API Sound Generator for POS Cart Actions
// 100% Offline, Zero Network Latency, Crisp Supermarket / POS Barcode Scanner Beep

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
};

/**
 * Plays a pleasant, crisp retail POS scanner beep when an item is added to the cart
 */
export const playCartBeep = () => {
  try {
    // Optional haptic vibration for mobile phones (20ms)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Standard high-pitch clean retail beep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6 note)

    // Fast Attack & Decay envelope to avoid audio clicks
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (err) {
    // Fail gracefully if audio autoplay policy blocks before first interaction
    console.debug('Audio feedback error:', err);
  }
};

export default playCartBeep;
