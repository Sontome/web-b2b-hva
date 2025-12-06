import { useCallback, useRef } from 'react';

export const useHoverSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playClickSound = useCallback(() => {
    // Debounce to prevent rapid repeated sounds
    const now = Date.now();
    if (now - lastPlayedRef.current < 80) return;
    lastPlayedRef.current = now;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const currentTime = ctx.currentTime;
      
      // Create a warm, soft "pop" sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      // Warm sine wave for soft sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(520, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(280, currentTime + 0.08);
      
      // Low-pass filter for warmth
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, currentTime);
      filter.Q.setValueAtTime(1, currentTime);
      
      // Smooth envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.125, currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.005, currentTime + 0.12);
      
      // Connect nodes
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.12);
    } catch (e) {
      // Silently fail if audio context not supported
    }
  }, []);

  return { playClickSound };
};
