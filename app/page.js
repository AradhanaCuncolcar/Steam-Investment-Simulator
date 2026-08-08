'use client';

import { useState, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Send,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Square,
  CheckSquare,
  Terminal,
} from 'lucide-react';

// Shared ease-out curve for the main animations.
const EASE = [0.33, 1, 0.68, 1];

/* ================================================================== */
/*  LIVING GRID — animated canvas backdrop (perspective floor +        */
/*  particle network) that reacts to app state and cursor position     */
/* ================================================================== */
function LivingGrid({ mode, reduce }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rafId = null;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 44;
    const particles = Array.from({ length: COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.55,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.6 + 0.6,
    }));

    const pointer = { x: 0, y: 0 };
    function onMove(e) {
      pointer.x = (e.clientX / width - 0.5) * 2;
      pointer.y = (e.clientY / height - 0.5) * 2;
    }
    window.addEventListener('pointermove', onMove);

    const palette = {
      idle: { r: 90, g: 180, b: 255 },
      loading: { r: 255, g: 214, b: 10 },
      go: { r: 57, g: 255, b: 136 },
      nogo: { r: 255, g: 68, b: 56 },
    };

    let gridOffset = 0;
    let sweep = 0;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(now - last, 48);
      last = now;
      const m = modeRef.current;
      const col = palette[m] || palette.idle;
      const speed = m === 'loading' ? 2.3 : m === 'nogo' ? 1.9 : m === 'go' ? 1.5 : 1;

      ctx.clearRect(0, 0, width, height);

      const horizonY = height * 0.6;
      const px = reduce ? 0 : pointer.x * 12;
      const py = reduce ? 0 : pointer.y * 6;

      // perspective floor
      gridOffset += reduce ? 0 : dt * 0.045 * speed;
      const spacing = 34;
      ctx.save();
      ctx.translate(width / 2 + px, 0);
      for (let i = 0; i < 24; i++) {
        const z = i * spacing + (gridOffset % spacing);
        const y = horizonY + z * 1.7;
        if (y > height + 40) continue;
        const spread = (y - horizonY) * 1.35 + 30;
        const fade = Math.max(0, 0.4 - ((y - horizonY) / height) * 0.55);
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${fade.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-spread, y);
        ctx.lineTo(spread, y);
        ctx.stroke();
      }
      for (let i = -7; i <= 7; i++) {
        const alpha = Math.max(0, 0.28 - Math.abs(i) * 0.03);
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(i * 40, horizonY);
        ctx.lineTo(i * 240, height + 40);
        ctx.stroke();
      }
      ctx.restore();

      // particle network
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx * (dt / 16) * speed;
          p.y += p.vy * (dt / 16) * speed;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height * 0.55;
          if (p.y > height * 0.58) p.y = 0;
        }
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 118) {
            const alpha = (1 - dist / 118) * 0.16;
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x + px, a.y + py);
            ctx.lineTo(b.x + px, b.y + py);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.8)`;
        ctx.beginPath();
        ctx.arc(p.x + px, p.y + py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // radar sweep while evaluating
      if (m === 'loading' && !reduce) {
        sweep += dt * 0.0017;
        const cx = width / 2;
        const cy = horizonY;
        const grad = ctx.createLinearGradient(
          cx,
          cy,
          cx + Math.cos(sweep) * 420,
          cy + Math.sin(sweep) * 420 - 220
        );
        grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.2)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 420, sweep - 0.55, sweep);
        ctx.closePath();
        ctx.fill();
      }

      if (!reduce) rafId = requestAnimationFrame(frame);
    }

    if (reduce) {
      frame(performance.now());
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduce]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ================================================================== */
/*  HUD corner brackets — cheap, high-payoff "inside the game" frame   */
/* ================================================================== */
function HudFrame() {
  const base = 'hud-corner fixed z-30 pointer-events-none';
  return (
    <>
      <div className={`${base} top-3 left-3 border-t-2 border-l-2`} style={{ width: 26, height: 26, borderColor: 'var(--line)' }} />
      <div className={`${base} top-3 right-3 border-t-2 border-r-2`} style={{ width: 26, height: 26, borderColor: 'var(--line)' }} />
      <div className={`${base} bottom-3 left-3 border-b-2 border-l-2`} style={{ width: 26, height: 26, borderColor: 'var(--line)' }} />
      <div className={`${base} bottom-3 right-3 border-b-2 border-r-2`} style={{ width: 26, height: 26, borderColor: 'var(--line)' }} />
    </>
  );
}

/* ================================================================== */
/*  Live data ticker — grounded in real session state, always moving   */
/* ================================================================== */
function DataTicker({ entries, mode, reduce }) {
  const doneCount = entries.filter((e) => e.status === 'done').length;
  const lastDone = [...entries].reverse().find((e) => e.status === 'done');
  const items = [
    'GREENLIGHT TERMINAL',
    `PITCHES EVALUATED: ${doneCount}`,
    lastDone
      ? `LAST SIGNAL: ${lastDone.result.verdict} — ${lastDone.result.confidence_score}/100`
      : 'AWAITING FIRST TRANSMISSION',
    mode === 'loading' ? 'STATUS: ANALYZING PITCH' : 'STATUS: STANDING BY',
  ];
  const text = items.join('   ▸   ');

  return (
    <div className="ticker-wrap border-b-[3px] border-[var(--line)] bg-[var(--bg-surface)] relative z-10">
      {reduce ? (
        <div className="ui-mono text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)] px-4 py-2 truncate">
          {text}
        </div>
      ) : (
        <div className="ticker-track ui-mono text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)] py-2">
          <span className="ticker-item">{text}</span>
          <span className="ticker-item">{text}</span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Signal Meter — LED-array readout for the market confidence score   */
/* ================================================================== */
function SignalMeter({ score, tone }) {
  const reduce = useReducedMotion();
  const segments = 20;
  const filled = Math.max(1, Math.round((score / 100) * segments));
  const accent = tone === 'go' ? 'var(--go)' : 'var(--nogo)';

  return (
    <div
      className="flex gap-[3px]"
      role="img"
      aria-label={`Market confidence signal: ${score} out of 100`}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <motion.div
            key={i}
            className="h-7 w-[9px] border-[2px]"
            style={{
              borderColor: isFilled ? accent : 'var(--line-dim)',
              backgroundColor: isFilled ? accent : 'transparent',
              boxShadow: isFilled ? `0 0 8px -1px ${accent}` : 'none',
              transformOrigin: 'bottom',
            }}
            initial={reduce ? false : { scaleY: 0.15, opacity: 0.35 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              duration: reduce ? 0.01 : 0.35,
              ease: EASE,
              delay: reduce ? 0 : i * 0.02,
            }}
          />
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  SlotDigits — odometer / slot-machine reel readout for the score    */
/* ================================================================== */
function SlotDigits({ value, reduce, color }) {
  const target = String(Math.max(0, Math.min(100, Math.round(value)))).padStart(3, '0').split('').map(Number);
  const [display, setDisplay] = useState(reduce ? target : [0, 0, 0]);

  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      return;
    }
    const stopTimes = [500, 780, 1080];
    const start = performance.now();
    let raf = null;

    function tick(now) {
      const elapsed = now - start;
      setDisplay((prev) =>
        prev.map((d, i) => (elapsed >= stopTimes[i] ? target[i] : Math.floor(Math.random() * 10)))
      );
      if (elapsed < stopTimes[stopTimes.length - 1]) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return (
    <span className="inline-flex ui-mono tabular-nums" style={{ color }}>
      {display.map((d, i) => (
        <span key={i} className="inline-block w-[0.62em] text-center">
          {d}
        </span>
      ))}
    </span>
  );
}

/* ================================================================== */
/*  GlitchText — CRT-style RGB-split glitch-in for the verdict word    */
/* ================================================================== */
function GlitchText({ text, className }) {
  return (
    <span className={`glitch-wrap ${className || ''}`} data-text={text}>
      {text}
    </span>
  );
}

/* ================================================================== */
/*  WordStagger — per-word translate-y + opacity reveal                */
/* ================================================================== */
function WordStagger({ text, className, delay = 0 }) {
  const reduce = useReducedMotion();
  const words = (text || '').split(' ');

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.028, delayChildren: delay },
    },
  };
  const word = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0.01 : 0.5, ease: EASE },
    },
  };

  return (
    <motion.p className={className} variants={container} initial="hidden" animate="visible">
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block mr-[0.28em]">
          {w}
        </motion.span>
      ))}
    </motion.p>
  );
}

/* ================================================================== */
/*  Scanning status — cycling analysis phrases while awaiting result   */
/* ================================================================== */
function ScanningStatus({ reduce }) {
  const phrases = [
    'PARSING CORE LOOP',
    'CROSS-REFERENCING GENRE DATA',
    'MODELING RETENTION CURVE',
    'STRESS-TESTING MONETIZATION',
    'WEIGHING MARKET SIGNAL',
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % phrases.length), 650);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <p className="ui-mono text-[11px] tracking-[0.2em] uppercase text-[var(--signal)] flex items-center gap-2">
      <span className="scan-dot" />
      {reduce ? 'Analyzing pitch' : phrases[i]}...
    </p>
  );
}

/* ================================================================== */
/*  Shimmer skeleton — sweeps left over 1.5s while awaiting response   */
/* ================================================================== */
function EvaluationSkeleton({ reduce }) {
  return (
    <div className="space-y-4">
      <ScanningStatus reduce={reduce} />
      <div
        className="border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8"
        style={{ boxShadow: '6px 6px 0 0 var(--line-dim)' }}
        aria-hidden="true"
      >
        <div className="shimmer-bar h-3 w-32 mb-8" />
        <div className="shimmer-bar h-16 w-2/3 mb-8" />
        <div className="shimmer-bar h-7 w-1/3 mb-6" />
        <div className="shimmer-bar h-3 w-full mb-2" />
        <div className="shimmer-bar h-3 w-5/6" />
      </div>
      <div
        className="border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8"
        style={{ boxShadow: '6px 6px 0 0 var(--line-dim)' }}
        aria-hidden="true"
      >
        <div className="shimmer-bar h-3 w-40 mb-8" />
        <div className="shimmer-bar h-3 w-full mb-3" />
        <div className="shimmer-bar h-3 w-full mb-3" />
        <div className="shimmer-bar h-3 w-2/3" />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Strategic pivot checklist                                         */
/* ================================================================== */
function PivotChecklist({ pivots, reduce }) {
  const [checked, setChecked] = useState(() => new Set());

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (!pivots.length) {
    return (
      <p className="ui-mono text-sm text-[var(--text-muted)]">
        No pivots flagged — pitch cleared as-is.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {pivots.map((pivot, i) => {
        const isChecked = checked.has(i);
        return (
          <motion.li
            key={i}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0.01 : 0.4,
              ease: EASE,
              delay: reduce ? 0 : 0.5 + i * 0.08,
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-3 text-left"
            >
              {isChecked ? (
                <CheckSquare size={20} className="mt-0.5 shrink-0 text-[var(--go)]" />
              ) : (
                <Square size={20} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
              )}
              <span
                className={`text-sm md:text-base leading-relaxed ${
                  isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {pivot}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/* ================================================================== */
/*  Result cards — Verdict (with holographic tilt) + Strategic Pivot   */
/* ================================================================== */
function ResultCards({ result }) {
  const reduce = useReducedMotion();
  const { verdict, confidence_score, justification, strategic_pivots } = result;
  const isGo = verdict === 'GO';
  const tone = isGo ? 'go' : 'nogo';
  const accent = isGo ? 'var(--go)' : 'var(--nogo)';

  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rX = useSpring(useTransform(mvY, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 22 });
  const rY = useSpring(useTransform(mvX, [-0.5, 0.5], [-7, 7]), { stiffness: 220, damping: 22 });

  function handleMouseMove(e) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mvX.set((e.clientX - rect.left) / rect.width - 0.5);
    mvY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    mvX.set(0);
    mvY.set(0);
  }

  return (
    <div className="space-y-6" style={{ perspective: 900 }}>
      {/* Verdict Card */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          borderColor: accent,
          boxShadow: `6px 6px 0 0 ${accent}, 0 0 46px -14px ${accent}`,
          rotateX: reduce ? 0 : rX,
          rotateY: reduce ? 0 : rY,
          transformStyle: 'preserve-3d',
        }}
        className="brutal-card relative border-[3px] p-6 md:p-8 bg-[var(--bg-surface)] overflow-hidden"
      >
        <div className="sheen" aria-hidden="true" />

        <div className="flex items-center justify-between mb-6">
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Verdict Transmission
          </span>
          <span
            className="ui-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"
            style={{ color: accent }}
          >
            <span className="pulse-dot" style={{ background: accent }} />
            {isGo ? 'Signal: Positive' : 'Signal: Negative'}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {isGo ? (
            <CheckCircle2 size={56} strokeWidth={2} style={{ color: accent }} />
          ) : (
            <XCircle size={56} strokeWidth={2} style={{ color: accent }} />
          )}
          <h2
            className="neon-text text-7xl md:text-8xl font-bold tracking-tighter leading-none"
            style={{ color: accent }}
          >
            <GlitchText text={verdict} />
          </h2>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Market Confidence
            </span>
            <span className="ui-mono text-2xl font-bold flex items-baseline gap-1">
              <SlotDigits value={confidence_score} reduce={reduce} color={accent} />
              <span className="text-sm text-[var(--text-muted)]">/100</span>
            </span>
          </div>
          <SignalMeter score={confidence_score} tone={tone} />
        </div>

        <div
          className="pt-5 pl-4 border-t-[2px] border-[var(--line-dim)]"
          style={{ borderLeft: `3px solid ${accent}`, background: 'rgba(0,0,0,0.22)' }}
        >
          <WordStagger
            text={justification}
            className="text-base md:text-lg leading-relaxed text-[var(--text-primary)] py-3 pr-2"
            delay={reduce ? 0 : 0.35}
          />
        </div>
      </motion.div>

      {/* Strategic Pivot Card */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: reduce ? 0 : 0.15 }}
        style={{ boxShadow: '6px 6px 0 0 var(--line)' }}
        className="brutal-card relative border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 overflow-hidden"
      >
        <div className="sheen" aria-hidden="true" />
        <div className="flex items-center justify-between mb-6">
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Strategic Pivots
          </span>
          <span className="ui-mono text-xs px-2 py-1 border-[2px] border-[var(--line)]">
            {strategic_pivots?.length || 0}
          </span>
        </div>
        <PivotChecklist pivots={strategic_pivots || []} reduce={reduce} />
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function Page() {
  const reduce = useReducedMotion();
  const [pitch, setPitch] = useState('');
  const [entries, setEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const flashedIdRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [pitch]);

  useEffect(() => {
    if (entries.length) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [entries.length]);

  useEffect(() => {
    const last = entries[entries.length - 1];
    if (last && last.status === 'done' && flashedIdRef.current !== last.id && !reduce) {
      flashedIdRef.current = last.id;
      setFlash(last.result.verdict === 'GO' ? 'go' : 'nogo');
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [entries, reduce]);

  const lastEntry = entries[entries.length - 1];
  const mode = !lastEntry
    ? 'idle'
    : lastEntry.status === 'loading'
    ? 'loading'
    : lastEntry.status === 'done'
    ? (lastEntry.result.verdict === 'GO' ? 'go' : 'nogo')
    : 'idle';

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = pitch.trim();
    if (!trimmed || isSubmitting) return;

    const id = Date.now();
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setEntries((prev) => [...prev, { id, pitch: trimmed, time, status: 'loading' }]);
    setPitch('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: trimmed }),
      });
      if (!res.ok) throw new Error(`Evaluation engine returned ${res.status}`);
      const data = await res.json();
      setEntries((prev) =>
        prev.map((en) => (en.id === id ? { ...en, status: 'done', result: data } : en))
      );
    } catch (err) {
      setEntries((prev) =>
        prev.map((en) =>
          en.id === id
            ? { ...en, status: 'error', error: err.message || 'Connection to evaluation engine failed.' }
            : en
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="ui-display min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        :root {
          --bg-void: #0a0a0b;
          --bg-surface: #131315;
          --bg-elevated: #1a1a1d;
          --line: #edebe0;
          --line-dim: #3a3a38;
          --text-primary: #f2f0e6;
          --text-muted: #a3a29b;
          --go: #39ff88;
          --nogo: #ff4438;
          --signal: #ffd60a;
        }

        .ui-display {
          font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
        }
        .ui-mono {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        /* Shimmer skeleton: sweeps left over 1.5s */
        .shimmer-bar {
          position: relative;
          overflow: hidden;
          background: var(--bg-elevated);
          border: 1px solid var(--line-dim);
        }
        .shimmer-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(242, 240, 230, 0.18) 50%,
            transparent 100%
          );
          animation: shimmerSweep 1.5s ease-in-out infinite;
        }
        @keyframes shimmerSweep {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .led-dot {
          animation: blink 1.6s steps(2, start) infinite;
        }
        @keyframes blink {
          50% {
            opacity: 0.2;
          }
        }

        .scan-dot {
          width: 6px;
          height: 6px;
          background: var(--signal);
          box-shadow: 0 0 8px 1px var(--signal);
          animation: blink 0.9s steps(2, start) infinite;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          display: inline-block;
          animation: pulseDot 1.4s ease-in-out infinite;
        }
        @keyframes pulseDot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.7);
          }
        }

        /* Neon text glow on the big verdict word */
        .neon-text {
          text-shadow: 0 0 18px currentColor, 0 0 48px currentColor;
        }

        /* Glitch-in reveal for the verdict word */
        .glitch-wrap {
          position: relative;
          display: inline-block;
        }
        .glitch-wrap::before,
        .glitch-wrap::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        .glitch-wrap::before {
          color: #ff2b6d;
          animation: glitchA 0.55s steps(6, end) 1;
        }
        .glitch-wrap::after {
          color: #05d9e8;
          animation: glitchB 0.55s steps(6, end) 1;
        }
        @keyframes glitchA {
          0% {
            clip-path: inset(0 0 86% 0);
            transform: translate(-3px, -1px);
            opacity: 0.9;
          }
          25% {
            clip-path: inset(20% 0 55% 0);
            transform: translate(3px, 1px);
          }
          50% {
            clip-path: inset(45% 0 30% 0);
            transform: translate(-2px, 0);
          }
          75% {
            clip-path: inset(70% 0 8% 0);
            transform: translate(2px, -1px);
          }
          100% {
            clip-path: inset(0 0 0 0);
            transform: translate(0, 0);
            opacity: 0;
          }
        }
        @keyframes glitchB {
          0% {
            clip-path: inset(84% 0 0 0);
            transform: translate(3px, 1px);
            opacity: 0.9;
          }
          25% {
            clip-path: inset(50% 0 25% 0);
            transform: translate(-3px, -1px);
          }
          50% {
            clip-path: inset(28% 0 48% 0);
            transform: translate(2px, 0);
          }
          75% {
            clip-path: inset(5% 0 72% 0);
            transform: translate(-2px, 1px);
          }
          100% {
            clip-path: inset(0 0 0 0);
            transform: translate(0, 0);
            opacity: 0;
          }
        }

        /* Diagonal sheen sweep on card hover */
        .brutal-card {
          transition: transform 0.15s cubic-bezier(0.33, 1, 0.68, 1),
            box-shadow 0.15s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .brutal-card:hover {
          transform: translateY(-4px);
        }
        .brutal-card:active {
          transform: translateY(4px);
          box-shadow: none !important;
        }
        .sheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            115deg,
            transparent 40%,
            rgba(242, 240, 230, 0.06) 50%,
            transparent 60%
          );
          transform: translateX(-140%);
          transition: transform 0.8s cubic-bezier(0.33, 1, 0.68, 1);
          pointer-events: none;
        }
        .brutal-card:hover .sheen {
          transform: translateX(140%);
        }

        /* Live data ticker */
        .ticker-wrap {
          overflow: hidden;
          white-space: nowrap;
        }
        .ticker-track {
          display: inline-flex;
          animation: tickerScroll 24s linear infinite;
        }
        .ticker-item {
          padding: 0 3rem;
        }
        @keyframes tickerScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer-bar::after,
          .led-dot,
          .scan-dot,
          .pulse-dot,
          .ticker-track {
            animation: none !important;
          }
          .glitch-wrap::before,
          .glitch-wrap::after {
            content: none;
            display: none;
          }
          .neon-text {
            text-shadow: none;
          }
          .brutal-card,
          .brutal-card:hover,
          .brutal-card:active {
            transition: none;
            transform: none;
          }
          .sheen {
            display: none;
          }
        }
      `}</style>

      <LivingGrid mode={mode} reduce={reduce} />
      <HudFrame />

      {/* Screen flash burst on new verdict */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background:
                flash === 'go'
                  ? 'radial-gradient(circle at 50% 28%, rgba(57,255,136,0.35), transparent 60%)'
                  : 'radial-gradient(circle at 50% 28%, rgba(255,68,56,0.35), transparent 60%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 border-b-[3px] border-[var(--line)] px-6 py-8 md:px-12 md:py-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="led-dot h-2.5 w-2.5 bg-[var(--go)]" aria-hidden="true" />
          <span className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">
            System Online — Evaluation Engine Ready
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">GREENLIGHT</h1>
        <p className="mt-3 ui-mono text-xs md:text-sm tracking-[0.15em] text-[var(--text-muted)] uppercase">
          Investment Simulator — Pitch Evaluation Terminal
        </p>
      </header>

      <DataTicker entries={entries} mode={mode} reduce={reduce} />

      <main className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14">
        {/* Input bar */}
        <form onSubmit={handleSubmit} className="mb-14">
          <label
            htmlFor="pitch-input"
            className="block mb-3 ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase"
          >
            Pitch your game concept, mechanics, and target genres.
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <textarea
              id="pitch-input"
              ref={textareaRef}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="e.g. A roguelike deckbuilder set in a drowned cyberpunk Venice, PvE co-op, targeting the immersive-sim audience..."
              className="input-glow flex-1 resize-none bg-[var(--bg-surface)] border-[3px] border-[var(--line)] px-4 py-4 text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-[border-color,box-shadow] duration-150"
              style={{ maxHeight: '240px' }}
            />
            <button
              type="submit"
              disabled={!pitch.trim() || isSubmitting}
              className="brutal-card shrink-0 flex items-center justify-center gap-2 bg-[var(--go)] text-[var(--bg-void)] border-[3px] border-[var(--line)] px-6 py-4 ui-mono text-sm font-bold tracking-[0.15em] uppercase disabled:opacity-40 disabled:pointer-events-none"
              style={{ boxShadow: '4px 4px 0 0 var(--line)' }}
            >
              <Send size={16} strokeWidth={2.5} />
              Evaluate
            </button>
          </div>
        </form>

        {/* Feed */}
        {entries.length === 0 ? (
          <div className="border-[3px] border-dashed border-[var(--line-dim)] p-10 flex flex-col items-center text-center gap-3">
            <Terminal size={28} className="text-[var(--text-muted)]" />
            <p className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">
              Awaiting Transmission
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Submit a pitch above and the engine will return a verdict, a market confidence score,
              and prescriptive pivots.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-6">
                <div className="flex items-start gap-3 ui-mono text-sm text-[var(--text-muted)]">
                  <ChevronRight size={16} className="mt-0.5 shrink-0 text-[var(--go)]" />
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase mb-1 opacity-60">
                      {entry.time}
                    </p>
                    <p className="leading-relaxed">{entry.pitch}</p>
                  </div>
                </div>

                {entry.status === 'loading' && <EvaluationSkeleton reduce={reduce} />}

                {entry.status === 'error' && (
                  <div
                    className="border-[3px] border-[var(--nogo)] bg-[var(--bg-surface)] p-6 flex items-start gap-3"
                    style={{ boxShadow: '6px 6px 0 0 var(--nogo)' }}
                  >
                    <AlertTriangle className="text-[var(--nogo)] shrink-0" size={20} />
                    <div>
                      <p className="ui-mono text-xs uppercase tracking-[0.15em] text-[var(--nogo)] mb-1">
                        Evaluation Failed
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">{entry.error}</p>
                    </div>
                  </div>
                )}

                {entry.status === 'done' && <ResultCards result={entry.result} />}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <style jsx>{`
        .input-glow:focus {
          border-color: var(--go);
          box-shadow: 0 0 0 3px rgba(57, 255, 136, 0.15), 0 0 24px -6px var(--go);
        }
      `}</style>
    </div>
  );
}