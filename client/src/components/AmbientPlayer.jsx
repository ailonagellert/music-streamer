import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Music theory ─────────────────────────────────────────────────────────────
// Lo-fi ambient in A minor — dreamy chord pads
const NOTE = { C:261.63, D:293.66, E:329.63, F:349.23, G:392.00, A:440.00, B:493.88 };

// Each chord = array of [freq multiplier from root, octave offset]
const CHORDS = [
  // Am          F             C             G
  [[1, 0], [1.189, 0], [1.498, 0], [0.749, 0]],   // Am  root triad (A C E)
  [[0.749, 0], [0.944, 0], [1.189, 0], [1.498, 0]], // F   (F A C)
  [[0.595, 0], [0.749, 0], [0.944, 0], [1.189, 0]], // C   (C E G)
  [[0.667, 0], [0.841, 0], [1.059, 0], [1.335, 0]], // G   (G B D)
];

// Freqs (Hz) for each chord voice — A minor pentatonic + seventh
const CHORD_FREQS = [
  [220, 261.63, 329.63, 392.00],   // Am7  — A  C  E  G
  [174.61, 220, 261.63, 329.63],   // Fmaj7 — F  A  C  E
  [130.81, 164.81, 196.00, 261.63],// Cmaj7 — C  E  G  C
  [146.83, 185.00, 220, 293.66],   // G7    — G  B  D  A
];

const BPM          = 68;
const BEATS_PER_CHORD = 8;
const BEAT_MS      = (60 / BPM) * 1000;
const CHORD_MS     = BEATS_PER_CHORD * BEAT_MS; // ~7 seconds per chord

// ─── Synth helpers ────────────────────────────────────────────────────────────

function createPadVoice(ctx, freq, masterGain) {
  // Slightly detuned pair for chorus richness
  const voices = [-4, 0, 4].map(detuneCents => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.detune.value    = detuneCents;

    const lpf = ctx.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 900;
    lpf.Q.value         = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(masterGain);
    osc.start();
    return { osc, gain };
  });

  return {
    fadeIn(t, dur) {
      voices.forEach(v => {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(0, t);
        v.gain.gain.linearRampToValueAtTime(0.06, t + dur);
      });
    },
    fadeOut(t, dur) {
      voices.forEach(v => {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0, t + dur);
      });
    },
    stop(t) {
      voices.forEach(v => v.osc.stop(t + 0.1));
    },
  };
}

function createReverbSend(ctx) {
  // Simple feedback delay to simulate reverb
  const delay  = ctx.createDelay(2.5);
  const fb     = ctx.createGain();
  const wet    = ctx.createGain();
  const lpfRev = ctx.createBiquadFilter();

  delay.delayTime.value = 1.2;
  fb.gain.value         = 0.45;
  wet.gain.value        = 0.38;
  lpfRev.frequency.value = 600;

  delay.connect(lpfRev);
  lpfRev.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(ctx.destination);

  return delay; // connect pad output → delay for reverb
}

function createVinylNoise(ctx, masterGain) {
  // White noise node for lo-fi texture
  const bufSize   = ctx.sampleRate * 2;
  const buffer    = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data      = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.012;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop   = true;

  const hpf = ctx.createBiquadFilter();
  hpf.type            = 'highpass';
  hpf.frequency.value = 8000;

  const ng = ctx.createGain();
  ng.gain.value = 0.18;

  source.connect(hpf);
  hpf.connect(ng);
  ng.connect(masterGain);
  source.start();
  return source;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AmbientPlayer = ({ active }) => {
  const ctxRef        = useRef(null);
  const masterRef     = useRef(null);
  const reverbRef     = useRef(null);
  const voicesRef     = useRef([]);
  const noiseRef      = useRef(null);
  const chordIdxRef   = useRef(0);
  const timerRef      = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [chordName, setChordName] = useState('');

  const CHORD_NAMES = ['Am7', 'Fmaj7', 'Cmaj7', 'G7'];

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    voicesRef.current.forEach(v => { try { v.stop(ctxRef.current?.currentTime || 0); } catch (_) {} });
    voicesRef.current = [];
    if (noiseRef.current) { try { noiseRef.current.stop(); } catch (_) {} noiseRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
  }, []);

  const playChord = useCallback((ctx, master, reverb, idx) => {
    const now    = ctx.currentTime;
    const freqs  = CHORD_FREQS[idx % CHORD_FREQS.length];
    const fadeIn = 2.2;
    const fadeOut= 2.0;
    const dur    = CHORD_MS / 1000;

    // Fade out old voices
    voicesRef.current.forEach(v => {
      v.fadeOut(now, fadeOut);
      v.stop(now + fadeOut + 0.2);
    });
    voicesRef.current = [];

    // Spawn new voices
    const newVoices = freqs.map(freq => {
      const v = createPadVoice(ctx, freq, master);
      v.fadeIn(now, fadeIn);
      // Also send to reverb
      // (voices already connected to master, so tap into reverb separately)
      return v;
    });
    voicesRef.current = newVoices;
    setChordName(CHORD_NAMES[idx % CHORD_NAMES.length]);
  }, []);

  const startAmbient = useCallback(async () => {
    if (ctxRef.current) return;

    const ctx    = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const reverb = createReverbSend(ctx);
    // Tap master into reverb
    master.connect(reverb);

    ctxRef.current   = ctx;
    masterRef.current = master;
    reverbRef.current = reverb;

    // Vinyl noise
    noiseRef.current = createVinylNoise(ctx, master);

    // Play first chord immediately
    chordIdxRef.current = 0;
    playChord(ctx, master, reverb, 0);

    // Advance chords every CHORD_MS
    timerRef.current = setInterval(() => {
      chordIdxRef.current = (chordIdxRef.current + 1) % CHORD_FREQS.length;
      playChord(ctx, master, reverb, chordIdxRef.current);
    }, CHORD_MS);

    setPlaying(true);
  }, [playChord]);

  const stopAmbient = useCallback(() => {
    stopAll();
    setPlaying(false);
    setChordName('');
  }, [stopAll]);

  // Auto-start when active prop flips on, auto-stop when off
  useEffect(() => {
    if (active && !playing) startAmbient();
    if (!active && playing) stopAmbient();
  }, [active]);

  // Cleanup on unmount
  useEffect(() => () => stopAll(), [stopAll]);

  if (!active) return null;

  return (
    <div className="ambient-bar">
      <div className="ambient-left">
        <div className={`ambient-pulse ${playing ? 'pulsing' : ''}`} />
        <div>
          <div className="ambient-title">🎹 Lo-Fi Ambient</div>
          <div className="ambient-sub">Generative music playing while your library loads…</div>
        </div>
      </div>

      <div className="ambient-chord">
        <span className="chord-label">{chordName}</span>
        <div className="chord-bars">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="chord-bar" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>

      <button
        className={`ambient-toggle ${playing ? 'playing' : ''}`}
        onClick={playing ? stopAmbient : startAmbient}
        title={playing ? 'Pause ambient music' : 'Play ambient music'}
      >
        {playing ? '⏸' : '▶'}
      </button>
    </div>
  );
};

export default AmbientPlayer;
