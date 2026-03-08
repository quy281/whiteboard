import { useRef, useCallback } from 'react';

/**
 * Hook that generates realistic pen-on-paper writing sounds
 * using Web Audio API noise synthesis.
 */
export function usePenSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const startSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // Generate noise buffer (pen scratching sound)
    const bufferSize = ctx.sampleRate * 2; // 2 second buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Mix of white noise + filtered for paper scratch texture
    for (let i = 0; i < bufferSize; i++) {
      // Brownian noise for more natural pen feel
      const white = Math.random() * 2 - 1;
      data[i] = (i > 0 ? data[i - 1] * 0.98 + white * 0.02 : white * 0.02);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass filter for paper texture
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3500;
    bandpass.Q.value = 0.8;

    // High-pass to remove rumble
    const hipass = ctx.createBiquadFilter();
    hipass.type = 'highpass';
    hipass.frequency.value = 800;
    hipass.Q.value = 0.3;

    // Gain control - very subtle
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Fade in
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);

    source.connect(bandpass);
    bandpass.connect(hipass);
    hipass.connect(gain);
    gain.connect(ctx.destination);

    source.start(0);
    noiseNodeRef.current = source;
    gainRef.current = gain;
  }, [getCtx]);

  const updateSound = useCallback((speed: number, pressure: number) => {
    if (!gainRef.current || !audioCtxRef.current) return;
    // Volume based on speed and pressure
    const vol = Math.min(0.08, (speed * 0.0003 + pressure * 0.02));
    gainRef.current.gain.linearRampToValueAtTime(
      vol,
      audioCtxRef.current.currentTime + 0.02
    );
  }, []);

  const stopSound = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;

    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(
        0,
        audioCtxRef.current.currentTime + 0.1
      );
    }

    setTimeout(() => {
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch { /* ignore */ }
        noiseNodeRef.current = null;
      }
      gainRef.current = null;
    }, 150);
  }, []);

  return { startSound, updateSound, stopSound };
}
