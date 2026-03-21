import { useCallback, useRef } from 'react';

// Using Web Audio API to synthesize sounds directly without external asset files
export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playSynth = useCallback((type: 'sine' | 'square' | 'sawtooth' | 'triangle', freq: number, duration: number, vol = 0.1) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playClick = useCallback(() => {
    playSynth('sine', 600, 0.1, 0.2);
  }, [playSynth]);

  const playCorrect = useCallback(() => {
    playSynth('sine', 523.25, 0.1, 0.2); // C5
    setTimeout(() => playSynth('sine', 659.25, 0.1, 0.2), 100); // E5
    setTimeout(() => playSynth('sine', 783.99, 0.3, 0.2), 200); // G5
  }, [playSynth]);

  const playWrong = useCallback(() => {
    playSynth('sawtooth', 150, 0.4, 0.1);
    setTimeout(() => playSynth('sawtooth', 100, 0.5, 0.1), 150);
  }, [playSynth]);

  const playWin = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => playSynth('sine', freq, 0.5, 0.2), i * 150);
    });
  }, [playSynth]);

  const playRed = useCallback(() => {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
    const audio = new Audio(`${baseUrl}sounds/red.m4a`);
    audio.play().catch(e => console.error("Audio play failed:", e));
  }, []);

  const playGreen = useCallback(() => {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
    const audio = new Audio(`${baseUrl}sounds/Green.m4a`);
    audio.play().catch(e => console.error("Audio play failed:", e));
  }, []);

  return { playClick, playCorrect, playWrong, playWin, playRed, playGreen };
};
