/**
 * @fileoverview Web Audio API utility for playing notification sounds.
 * Generates simple synthesized tones without requiring audio file assets.
 */

let audioContext: AudioContext | null = null;

/**
 * Lazily initializes and returns the shared AudioContext.
 * @returns The AudioContext instance
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Predefined sound profiles for different severity levels */
const SOUND_PROFILES = {
  critical: { frequency: 880, duration: 0.3, repeat: 3, gap: 0.15 },
  high: { frequency: 660, duration: 0.25, repeat: 2, gap: 0.15 },
  medium: { frequency: 520, duration: 0.2, repeat: 1, gap: 0 },
  low: { frequency: 440, duration: 0.15, repeat: 1, gap: 0 },
  info: { frequency: 380, duration: 0.1, repeat: 1, gap: 0 },
} as const;

type SoundSeverity = keyof typeof SOUND_PROFILES;

/**
 * Plays a single tone at the given frequency and duration.
 * @param ctx - AudioContext instance
 * @param frequency - Frequency in Hz
 * @param startTime - When to start the tone (AudioContext time)
 * @param duration - Duration in seconds
 * @param volume - Volume level (0-1)
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

/**
 * Plays a notification sound based on the event severity level.
 * Uses the Web Audio API to synthesize tones without requiring audio files.
 * @param severity - The severity level that determines the sound profile
 * @param volume - Volume level between 0 and 1 (defaults to 0.3)
 */
export function playNotificationSound(severity: SoundSeverity = 'info', volume = 0.3): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const profile = SOUND_PROFILES[severity];
    const now = ctx.currentTime;

    for (let i = 0; i < profile.repeat; i++) {
      const offset = i * (profile.duration + profile.gap);
      playTone(ctx, profile.frequency, now + offset, profile.duration, volume);
    }
  } catch {
    // Silently fail if Web Audio API is not available
  }
}

/**
 * Unlocks audio playback within a user-gesture handler.
 * Browsers suspend the AudioContext until a user interacts with the page; call
 * this from a click/tap handler (e.g. a "tap to start" gate) so subsequent
 * alarm sounds can play without interaction — essential for kiosk/TV displays.
 */
export function unlockAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    // Near-silent tone to fully arm the context on stricter browsers.
    playTone(ctx, 440, ctx.currentTime, 0.01, 0.0001);
  } catch {
    // Ignore — Web Audio API not available.
  }
}

/**
 * Disposes the audio context and releases resources.
 * Should be called during application teardown if needed.
 */
export function disposeAudioContext(): void {
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}
