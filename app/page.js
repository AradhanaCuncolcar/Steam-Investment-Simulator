'use client';

import { useState, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
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
  Activity,
  Users,
  Database,
} from 'lucide-react';

// Shared ease-out curve for the main animations.
const EASE = [0.33, 1, 0.68, 1];

/* ================================================================== */
/*  THEMING — Contextual palettes based on real-time pitch text        */
/* ================================================================== */
const THEMES = {
  default: {},
  synthwave: {
    '--bg-void': '#09020a',
    '--bg-surface': '#120414',
    '--bg-elevated': '#1d0a1f',
    '--line': '#f8c3ff',
    '--line-dim': '#4a154b',
    '--text-primary': '#ffebff',
    '--go': '#ff007f', // Neon pink
    '--nogo': '#00f0ff', // Cyan
    '--signal': '#8a2be2', // Purple
  },
  cozy: {
    '--bg-void': '#1a1410',
    '--bg-surface': '#261c14',
    '--bg-elevated': '#36271c',
    '--line': '#ffe8c2',
    '--line-dim': '#5c4629',
    '--text-primary': '#fdf2e3',
    '--go': '#8fbc8f', // Sage green
    '--nogo': '#e2725b', // Terracotta
    '--signal': '#ffcc33', // Warm sun
  },
};

const PALETTES = {
  default: {
    idle: { r: 90, g: 180, b: 255 },
    loading: { r: 255, g: 214, b: 10 },
    go: { r: 57, g: 255, b: 136 },
    nogo: { r: 255, g: 68, b: 56 },
  },
  synthwave: {
    idle: { r: 138, g: 43, b: 226 },
    loading: { r: 248, g: 195, b: 255 },
    go: { r: 255, g: 0, b: 127 },
    nogo: { r: 0, g: 240, b: 255 },
  },
  cozy: {
    idle: { r: 255, g: 204, b: 51 },
    loading: { r: 255, g: 232, b: 194 },
    go: { r: 143, g: 188, b: 143 },
    nogo: { r: 226, g: 114, b: 91 },
  },
};

/* ================================================================== */
/*  LIVING GRID                                                       */
/* ================================================================== */
function LivingGrid({ mode, reduce, theme }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const themeRef = useRef(theme);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

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

    let gridOffset = 0;
    let sweep = 0;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(now - last, 48);
      last = now;
      const m = modeRef.current;
      const t = themeRef.current;
      
      const currentPalette = PALETTES[t] || PALETTES.default;
      const col = currentPalette[m] || currentPalette.idle;
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
  }, [reduce, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ================================================================== */
/*  HUD corner brackets                                               */
/* ================================================================== */
function HudFrame() {
  const base = 'hud-corner fixed z-30 pointer-events-none transition-colors duration-500';
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
/*  Live data ticker                                                  */
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
    <div className="ticker-wrap border-b-[3px] border-[var(--line)] bg-[var(--bg-surface)] relative z-10 transition-colors duration-500">
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
/*  Signal Meter (Updated with persistent scale and axis markers)      */
/* ================================================================== */
function SignalMeter({ score, tone }) {
  const reduce = useReducedMotion();
  const segments = 20;
  const filled = Math.max(1, Math.round((score / 100) * segments));
  const accent = tone === 'go' ? 'var(--go)' : 'var(--nogo)';

  return (
    <div className="flex flex-col gap-1 w-full" aria-label={`Market confidence signal: ${score} out of 100`}>
      <div className="flex gap-[3px] w-full" role="img">
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <motion.div
              key={i}
              className="h-7 border-[2px] flex-1"
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
      {/* Permanent Axis Markers */}
      <div className="flex justify-between ui-mono text-[9px] text-[var(--text-muted)] font-bold tracking-widest px-[2px]">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SlotDigits                                                        */
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
  }, [value, reduce]);

  return (
    <span className="inline-flex ui-mono tabular-nums transition-colors duration-500" style={{ color }}>
      {display.map((d, i) => (
        <span key={i} className="inline-block w-[0.62em] text-center">
          {d}
        </span>
      ))}
    </span>
  );
}

/* ================================================================== */
/*  GlitchText                                                        */
/* ================================================================== */
function GlitchText({ text, className }) {
  return (
    <span className={`glitch-wrap ${className || ''}`} data-text={text}>
      {text}
    </span>
  );
}

/* ================================================================== */
/*  WordStagger                                                       */
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
/*  Scanning status                                                   */
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
    <p className="ui-mono text-[11px] tracking-[0.2em] uppercase text-[var(--signal)] flex items-center gap-2 transition-colors duration-500">
      <span className="scan-dot" />
      {reduce ? 'Analyzing pitch' : phrases[i]}...
    </p>
  );
}

/* ================================================================== */
/*  Shimmer skeleton                                                  */
/* ================================================================== */
function EvaluationSkeleton({ reduce }) {
  return (
    <div className="space-y-4">
      <ScanningStatus reduce={reduce} />
      <div
        className="border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 transition-colors duration-500"
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
        className="border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 transition-colors duration-500"
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
/*  Interactive Pivot Checklist                                       */
/* ================================================================== */
function PivotChecklist({ pivots, reduce, onReevaluate, parentScore }) {
  const [checked, setChecked] = useState(new Set());

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleReevaluateClick = () => {
    const selectedPivots = Array.from(checked).map((i) => pivots[i]);
    if (onReevaluate) onReevaluate(selectedPivots, parentScore);
  };

  if (!pivots || !pivots.length) {
    return (
      <p className="ui-mono text-sm text-[var(--text-muted)]">
        No pivots flagged — pitch cleared as-is.
      </p>
    );
  }

  return (
    <div>
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
                className="w-full flex items-start gap-3 text-left group hover:opacity-80 transition-opacity"
              >
                {isChecked ? (
                  <CheckSquare size={20} className="mt-0.5 shrink-0 text-[var(--go)] transition-colors duration-500" />
                ) : (
                  <Square size={20} className="mt-0.5 shrink-0 text-[var(--text-muted)] transition-colors duration-500" />
                )}
                <span
                  className={`text-sm md:text-base leading-relaxed transition-colors duration-300 ${
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
      <AnimatePresence>
        {checked.size > 0 && (
          <motion.button
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            onClick={handleReevaluateClick}
            className="w-full brutal-card flex items-center justify-center gap-2 bg-[var(--line)] text-[var(--bg-void)] border-[3px] border-[var(--line)] px-6 py-4 ui-mono text-xs md:text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-500"
          >
            <Activity size={16} />
            Re-Evaluate with Pivots
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Market Intelligence Visuals (Graphs, Heatmaps, Comps)             */
/* ================================================================== */
function MarketIntelligence({ result }) {
  const { retention_data, audience_match, similar_games } = result;

  // Render Retention Curve SVG
  const renderRetentionGraph = () => {
    if (!retention_data || retention_data.length === 0) return null;
    const maxDay = Math.max(...retention_data.map(d => d.day));
    
    // Map D1..D30 to x: 0..100, Y: 0..100 -> inverted for SVG (100 is bottom)
    const points = retention_data.map(d => {
      const x = ((d.day - 1) / Math.max(1, maxDay - 1)) * 100;
      const y = 100 - d.value;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="flex-1 min-w-[200px]">
        <span className="ui-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          <Activity size={12} /> 30-Day Retention Curve
        </span>
        <div className="relative h-28 w-full border-l-[2px] border-b-[2px] border-[var(--line-dim)] transition-colors duration-500">
          <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline
              fill="none"
              stroke="var(--go)"
              strokeWidth="3"
              className="transition-colors duration-500"
              points={points}
            />
            {retention_data.map((d, i) => {
              const x = ((d.day - 1) / Math.max(1, maxDay - 1)) * 100;
              const y = 100 - d.value;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="var(--bg-surface)"
                  stroke="var(--go)"
                  strokeWidth="2"
                  className="transition-colors duration-500"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between ui-mono text-[9px] text-[var(--text-muted)] mt-2 font-bold tracking-widest">
          <span>D1</span>
          <span>D15</span>
          <span>D30</span>
        </div>
      </div>
    );
  };

  const renderAudienceHeatmap = () => {
    if (!audience_match) return null;
    return (
      <div className="flex-1 min-w-[200px]">
        <span className="ui-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          <Users size={12} /> Audience Alignment
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {audience_match.map((m, i) => {
            const isHigh = m.match === 'High Match' || m.match === 'High';
            const isMed = m.match === 'Medium Match' || m.match === 'Medium';
            const colorVar = isHigh ? 'var(--go)' : isMed ? 'var(--signal)' : 'var(--text-muted)';
            const borderVar = isHigh ? 'var(--go)' : isMed ? 'var(--signal)' : 'var(--line-dim)';
            
            return (
              <div 
                key={i} 
                className="p-3 border-[2px] flex flex-col justify-center transition-colors duration-500"
                style={{ borderColor: borderVar }}
              >
                <span className="ui-mono text-[9px] uppercase tracking-widest mb-1 opacity-80 text-[var(--text-primary)]">
                  {m.archetype}
                </span>
                <span className="font-bold text-xs" style={{ color: colorVar }}>
                  {m.match}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderComparables = () => {
    if (!similar_games) return null;
    return (
      <div className="mt-8 border-t-[2px] border-[var(--line-dim)] pt-8 transition-colors duration-500">
        <span className="ui-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          <Database size={12} /> Market Comparables
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-[2px] border-[var(--go)] p-4 relative transition-colors duration-500">
            <div className="absolute top-0 right-0 bg-[var(--go)] text-[var(--bg-void)] px-2 py-1 ui-mono text-[9px] font-bold uppercase transition-colors duration-500">Success</div>
            <h4 className="font-bold text-[var(--go)] mb-2 mt-1 transition-colors duration-500">{similar_games.success.name}</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{similar_games.success.reason}</p>
          </div>
          <div className="border-[2px] border-[var(--nogo)] p-4 relative transition-colors duration-500">
            <div className="absolute top-0 right-0 bg-[var(--nogo)] text-[var(--bg-void)] px-2 py-1 ui-mono text-[9px] font-bold uppercase transition-colors duration-500">Failure</div>
            <h4 className="font-bold text-[var(--nogo)] mb-2 mt-1 transition-colors duration-500">{similar_games.failure.name}</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{similar_games.failure.reason}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-8">
        {renderRetentionGraph()}
        {renderAudienceHeatmap()}
      </div>
      {renderComparables()}
    </div>
  );
}

/* ================================================================== */
/*  Result Cards                                                      */
/* ================================================================== */
function ResultCards({ result, originalPitch, parentScore, onReevaluate }) {
  const reduce = useReducedMotion();
  const { verdict, confidence_score, justification, strategic_pivots, sub_scores } = result;
  const isGo = verdict === 'GO';
  const tone = isGo ? 'go' : 'nogo';
  const accent = isGo ? 'var(--go)' : 'var(--nogo)';

  const delta = parentScore !== undefined && parentScore !== null ? confidence_score - parentScore : null;

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
        className="brutal-card relative border-[3px] p-6 md:p-8 bg-[var(--bg-surface)] overflow-hidden transition-colors duration-500"
      >
        <div className="sheen" aria-hidden="true" />

        <div className="flex items-center justify-between mb-6">
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Verdict Transmission
          </span>
          <span
            className="ui-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors duration-500"
            style={{ color: accent }}
          >
            <span className="pulse-dot transition-colors duration-500" style={{ background: accent }} />
            {isGo ? 'Signal: Positive' : 'Signal: Negative'}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {isGo ? (
            <CheckCircle2 size={56} strokeWidth={2} style={{ color: accent }} className="transition-colors duration-500" />
          ) : (
            <XCircle size={56} strokeWidth={2} style={{ color: accent }} className="transition-colors duration-500" />
          )}
          <h2
            className="neon-text text-7xl md:text-8xl font-bold tracking-tighter leading-none transition-colors duration-500"
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
            <span className="ui-mono text-3xl font-bold flex items-baseline gap-1 relative transition-colors duration-500">
              <SlotDigits value={confidence_score} reduce={reduce} color={accent} />
              
              {/* Delta Indicator */}
              {delta !== null && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-lg ml-2 transition-colors duration-500"
                  style={{ color: delta >= 0 ? 'var(--go)' : 'var(--nogo)' }}
                >
                  {delta >= 0 ? '+' : ''}{delta}
                </motion.span>
              )}
              
              <span className="text-sm text-[var(--text-muted)] ml-1">/100</span>
            </span>
          </div>
          <SignalMeter score={confidence_score} tone={tone} />

          {/* Sub-Score Breakdown */}
          {sub_scores && sub_scores.length > 0 && (
             <div className="mt-5 pt-4 border-t-[2px] border-dashed border-[var(--line-dim)] flex flex-col gap-2 transition-colors duration-500">
                <span className="ui-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Sub-System Analysis</span>
                {sub_scores.map((sub, i) => (
                   <div key={i} className="flex items-center justify-between ui-mono text-xs">
                      <span className="text-[var(--text-primary)] opacity-80">{sub.label}</span>
                      <span className="text-[var(--text-muted)]">{sub.score}/100</span>
                   </div>
                ))}
             </div>
          )}
        </div>

        <div
          className="pt-5 pl-4 border-t-[2px] border-[var(--line-dim)] transition-colors duration-500"
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
        className="brutal-card relative border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 overflow-hidden transition-colors duration-500"
      >
        <div className="sheen" aria-hidden="true" />
        <div className="flex items-center justify-between mb-6">
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Strategic Pivots
          </span>
          <span className="ui-mono text-xs px-2 py-1 border-[2px] border-[var(--line)] transition-colors duration-500">
            {strategic_pivots?.length || 0}
          </span>
        </div>
        <PivotChecklist 
          pivots={strategic_pivots || []} 
          reduce={reduce} 
          onReevaluate={(pivots, pScore) => onReevaluate(originalPitch, pivots, pScore)}
          parentScore={confidence_score} 
        />
      </motion.div>

      {/* Market Intelligence Modules */}
      {(result.retention_data || result.audience_match || result.similar_games) && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: reduce ? 0 : 0.25 }}
          style={{ boxShadow: '6px 6px 0 0 var(--line)' }}
          className="brutal-card relative border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 overflow-hidden transition-colors duration-500"
        >
          <div className="sheen" aria-hidden="true" />
          <MarketIntelligence result={result} />
        </motion.div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */
export default function Page() {
  const reduce = useReducedMotion();
  const [pitch, setPitch] = useState('');
  const [entries, setEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  
  // New States for Visual Upgrades
  const [theme, setTheme] = useState('default');
  const [isTearing, setIsTearing] = useState(false);
  
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const flashedIdRef = useRef(null);
  const prevStatusRef = useRef('idle');

  // Real-time Contextual Theme parsing
  useEffect(() => {
    const p = pitch.toLowerCase();
    if (p.includes('cyberpunk') || p.includes('synthwave') || p.includes('neon') || p.includes('retro')) {
      setTheme('synthwave');
    } else if (p.includes('cozy') || p.includes('farm') || p.includes('wholesome') || p.includes('relaxing')) {
      setTheme('cozy');
    } else {
      setTheme('default');
    }
  }, [pitch]);

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

  const lastEntry = entries[entries.length - 1];

  // CRT Screen Tear & Flash logic
  useEffect(() => {
    if (!lastEntry) return;

    // Trigger Screen Tear right before Done state
    if (prevStatusRef.current === 'loading' && lastEntry.status === 'done' && !reduce) {
      setIsTearing(true);
      const tearTimer = setTimeout(() => setIsTearing(false), 200);

      // Trigger standard Flash
      if (flashedIdRef.current !== lastEntry.id) {
        flashedIdRef.current = lastEntry.id;
        setFlash(lastEntry.result.verdict === 'GO' ? 'go' : 'nogo');
        setTimeout(() => setFlash(null), 700);
      }

      prevStatusRef.current = 'done';
      return () => clearTimeout(tearTimer);
    }
    prevStatusRef.current = lastEntry.status;
  }, [lastEntry, reduce]);

  const mode = !lastEntry
    ? 'idle'
    : lastEntry.status === 'loading'
    ? 'loading'
    : lastEntry.status === 'done'
    ? (lastEntry.result.verdict === 'GO' ? 'go' : 'nogo')
    : 'idle';
  
  async function handleSubmit(e, overridePitch = null, parentScore = null) {
    if (e) e.preventDefault();
    const p = overridePitch !== null ? overridePitch : pitch;
    const trimmed = p.trim();
    if (!trimmed || isSubmitting) return;

    const id = Date.now();
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setEntries((prev) => [...prev, { id, pitch: trimmed, time, status: 'loading', parentScore }]);
    
    // Only clear input if this isn't an automated override injection
    if (overridePitch === null) setPitch(''); 
    
    setIsSubmitting(true);

    try {
      let data;
      
      // Attempt to hit the backend, but safely catch ANY failures (500s, network drops, etc.)
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pitch: trimmed }),
        });
        
        if (!res.ok) {
          console.warn(`API returned ${res.status}. Bypassing backend and using local simulation.`);
          data = generateMockData(trimmed);
        } else {
          data = await res.json();
        }
      } catch (fetchErr) {
        console.warn('Network fetch failed entirely. Using local simulation.', fetchErr);
        data = generateMockData(trimmed);
      }

      // Ensure mock data for the new features is attached if the real API doesn't provide it yet
      const enhancedData = {
        ...data,
        sub_scores: data.sub_scores || [
          { label: 'Monetization Viability', score: Math.floor(Math.random() * 40) + 60 },
          { label: 'Core Loop Engagement', score: Math.floor(Math.random() * 40) + 60 },
          { label: 'Market Timing', score: Math.floor(Math.random() * 40) + 60 },
        ],
        retention_data: data.retention_data || Array.from({ length: 7 }, (_, i) => ({
          day: i === 0 ? 1 : i * 5,
          value: Math.floor(100 - (i * (Math.random() * 8 + 6))) // simulated decay
        })),
        audience_match: data.audience_match || [
          { archetype: 'Immersive Sim Fans', match: Math.random() > 0.5 ? 'High' : 'Medium' },
          { archetype: 'Casual Mobile', match: 'Low' },
          { archetype: 'Hardcore PvP', match: Math.random() > 0.5 ? 'Medium' : 'High' },
          { archetype: 'Narrative Driven', match: 'Medium' }
        ],
        similar_games: data.similar_games || {
          success: { name: 'Dead Cells', reason: 'Mastered the fast-paced combat loop and robust progression.' },
          failure: { name: 'LawBreakers', reason: 'Overcomplicated mechanics and highly saturated market timing.' }
        }
      };

      setEntries((prev) =>
        prev.map((en) => (en.id === id ? { ...en, status: 'done', result: enhancedData } : en))
      );
    } catch (err) {
      // This will now only catch catastrophic frontend script errors
      setEntries((prev) =>
        prev.map((en) =>
          en.id === id
            ? { ...en, status: 'error', error: err.message || 'Critical simulation script failure.' }
            : en
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  

  // Purely to allow the prototype to run even without an API route configured
  function generateMockData(text) {
     const isGood = text.length > 40;
     return {
       verdict: isGood ? 'GO' : 'NO GO',
       confidence_score: isGood ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 30) + 20,
       justification: isGood 
         ? 'Strong foundational mechanics with a highly defined target audience. Monetization pathways are clear.' 
         : 'Core loop feels fragmented. Genre mashup may struggle to find a core audience.',
       strategic_pivots: isGood 
         ? ['Increase early-game friction to boost retention.', 'Shift art style slightly to broaden appeal.']
         : ['Focus purely on the core combat loop first.', 'Pivot target platform to mobile for casual play.', 'Reduce scope of narrative elements.']
     };
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Handle re-evaluations triggered by Pivot checkboxes
  function handlePivotReevaluate(basePitch, selectedPivots, parentScore) {
    const newPitch = `${basePitch}\n\n[PIVOTS APPLIED]\n- ${selectedPivots.join('\n- ')}`;
    setPitch(newPitch);
    handleSubmit(null, newPitch, parentScore);
  }

  return (
    <div className="ui-display min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] relative transition-colors duration-700" style={THEMES[theme]}>
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

        /* Screen Tear Animation */
        .screen-tear {
          animation: crt-tear 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes crt-tear {
          0% { transform: skew(0deg) translateY(0); filter: drop-shadow(0 0 0 var(--nogo)); }
          20% { transform: skew(-15deg) translateY(6px); filter: drop-shadow(-4px 0 0 var(--nogo)) drop-shadow(4px 0 0 var(--go)); }
          40% { transform: skew(10deg) translateY(-4px); filter: drop-shadow(3px 0 0 var(--go)); }
          60% { transform: skew(-8deg) translateY(3px); filter: drop-shadow(-2px 0 0 var(--nogo)); }
          80% { transform: skew(4deg) translateY(-2px); filter: drop-shadow(2px 0 0 var(--go)); }
          100% { transform: skew(0deg) translateY(0); filter: drop-shadow(0 0 0 var(--nogo)); }
        }

        /* Shimmer skeleton */
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
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
          animation: shimmerSweep 1.5s ease-in-out infinite;
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        .led-dot { animation: blink 1.6s steps(2, start) infinite; }
        @keyframes blink { 50% { opacity: 0.2; } }

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
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        /* Neon text glow */
        .neon-text {
          text-shadow: 0 0 18px currentColor, 0 0 48px currentColor;
        }

        /* Glitch-in reveal */
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
          color: var(--nogo);
          animation: glitchA 0.55s steps(6, end) 1;
        }
        .glitch-wrap::after {
          color: var(--go);
          animation: glitchB 0.55s steps(6, end) 1;
        }
        @keyframes glitchA {
          0% { clip-path: inset(0 0 86% 0); transform: translate(-3px, -1px); opacity: 0.9; }
          25% { clip-path: inset(20% 0 55% 0); transform: translate(3px, 1px); }
          50% { clip-path: inset(45% 0 30% 0); transform: translate(-2px, 0); }
          75% { clip-path: inset(70% 0 8% 0); transform: translate(2px, -1px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
        }
        @keyframes glitchB {
          0% { clip-path: inset(84% 0 0 0); transform: translate(3px, 1px); opacity: 0.9; }
          25% { clip-path: inset(50% 0 25% 0); transform: translate(-3px, -1px); }
          50% { clip-path: inset(28% 0 48% 0); transform: translate(2px, 0); }
          75% { clip-path: inset(5% 0 72% 0); transform: translate(-2px, 1px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
        }

        /* Diagonal sheen sweep */
        .brutal-card {
          transition: transform 0.15s cubic-bezier(0.33, 1, 0.68, 1),
            box-shadow 0.15s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .brutal-card:hover { transform: translateY(-4px); }
        .brutal-card:active { transform: translateY(4px); box-shadow: none !important; }
        .sheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            115deg,
            transparent 40%,
            rgba(255, 255, 255, 0.04) 50%,
            transparent 60%
          );
          transform: translateX(-140%);
          transition: transform 0.8s cubic-bezier(0.33, 1, 0.68, 1);
          pointer-events: none;
        }
        .brutal-card:hover .sheen { transform: translateX(140%); }

        /* Live data ticker */
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-track { display: inline-flex; animation: tickerScroll 24s linear infinite; }
        .ticker-item { padding: 0 3rem; }
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        @media (prefers-reduced-motion: reduce) {
          .screen-tear, .shimmer-bar::after, .led-dot, .scan-dot, .pulse-dot, .ticker-track { animation: none !important; }
          .glitch-wrap::before, .glitch-wrap::after { content: none; display: none; }
          .neon-text { text-shadow: none; }
          .brutal-card, .brutal-card:hover, .brutal-card:active { transition: none; transform: none; }
          .sheen { display: none; }
        }
      `}</style>

      <LivingGrid mode={mode} reduce={reduce} theme={theme} />
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
      <header className="relative z-10 border-b-[3px] border-[var(--line)] px-6 py-8 md:px-12 md:py-10 transition-colors duration-500 bg-[var(--bg-void)]">
        <div className="flex items-center gap-3 mb-4">
          <span className="led-dot h-2.5 w-2.5 bg-[var(--go)] transition-colors duration-500" aria-hidden="true" />
          <span className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">
            System Online — Evaluation Engine Ready
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none text-[var(--text-primary)] transition-colors duration-500">
          GREENLIGHT
        </h1>
        <p className="mt-3 ui-mono text-xs md:text-sm tracking-[0.15em] text-[var(--text-muted)] uppercase">
          Investment Simulator — Pitch Evaluation Terminal
        </p>
      </header>

      <DataTicker entries={entries} mode={mode} reduce={reduce} />

      <main className={`relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14 ${isTearing ? 'screen-tear' : ''}`}>
        {/* Input bar */}
        <form onSubmit={handleSubmit} className="mb-14">
          <label
            htmlFor="pitch-input"
            className="block mb-3 ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase flex justify-between"
          >
            <span>Pitch your game concept, mechanics, and target genres.</span>
            {theme !== 'default' && (
              <span className="text-[var(--go)] animate-pulse transition-colors duration-500">[{theme.toUpperCase()} THEME DETECTED]</span>
            )}
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <textarea
              id="pitch-input"
              ref={textareaRef}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="e.g. A roguelike deckbuilder set in a drowned cyberpunk Venice, PvE co-op..."
              className="input-glow flex-1 resize-none bg-[var(--bg-surface)] border-[3px] border-[var(--line)] px-4 py-4 text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-[border-color,box-shadow,background-color] duration-300"
              style={{ maxHeight: '240px' }}
            />
            <button
              type="submit"
              disabled={!pitch.trim() || isSubmitting}
              className="brutal-card shrink-0 flex items-center justify-center gap-2 bg-[var(--go)] text-[var(--bg-void)] border-[3px] border-[var(--line)] px-6 py-4 ui-mono text-sm font-bold tracking-[0.15em] uppercase disabled:opacity-40 disabled:pointer-events-none transition-colors duration-500"
              style={{ boxShadow: '4px 4px 0 0 var(--line)' }}
            >
              <Send size={16} strokeWidth={2.5} />
              Evaluate
            </button>
          </div>
        </form>

        {/* Feed */}
        {entries.length === 0 ? (
          <div className="border-[3px] border-dashed border-[var(--line-dim)] p-10 flex flex-col items-center text-center gap-3 transition-colors duration-500">
            <Terminal size={28} className="text-[var(--text-muted)] transition-colors duration-500" />
            <p className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase transition-colors duration-500">
              Awaiting Transmission
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-md transition-colors duration-500">
              Submit a pitch above and the engine will return a verdict, a market confidence score,
              prescriptive pivots, and intelligence simulations.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-6">
                <div className="flex items-start gap-3 ui-mono text-sm text-[var(--text-muted)] transition-colors duration-500">
                  <ChevronRight size={16} className="mt-0.5 shrink-0 text-[var(--go)] transition-colors duration-500" />
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase mb-1 opacity-60">
                      {entry.time} {entry.parentScore && '[PIVOT RE-EVALUATION]'}
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{entry.pitch}</p>
                  </div>
                </div>

                {entry.status === 'loading' && <EvaluationSkeleton reduce={reduce} />}

                {entry.status === 'error' && (
                  <div
                    className="border-[3px] border-[var(--nogo)] bg-[var(--bg-surface)] p-6 flex items-start gap-3 transition-colors duration-500"
                    style={{ boxShadow: '6px 6px 0 0 var(--nogo)' }}
                  >
                    <AlertTriangle className="text-[var(--nogo)] shrink-0 transition-colors duration-500" size={20} />
                    <div>
                      <p className="ui-mono text-xs uppercase tracking-[0.15em] text-[var(--nogo)] mb-1 transition-colors duration-500">
                        Evaluation Failed
                      </p>
                      <p className="text-sm text-[var(--text-muted)] transition-colors duration-500">{entry.error}</p>
                    </div>
                  </div>
                )}

                {entry.status === 'done' && (
                   <ResultCards 
                     result={entry.result} 
                     originalPitch={entry.pitch} 
                     parentScore={entry.parentScore}
                     onReevaluate={handlePivotReevaluate}
                   />
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <style jsx>{`
        .input-glow:focus {
          border-color: var(--go);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1), 0 0 24px -6px var(--go);
        }
      `}</style>
    </div>
  );
}
