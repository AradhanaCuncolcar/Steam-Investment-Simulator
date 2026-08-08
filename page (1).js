'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Award,
  Skull,
  RefreshCw,
} from 'lucide-react';

// Shared ease-out curve for the main animations.
const EASE = [0.33, 1, 0.68, 1];

/* ================================================================== */
/*  THEME + MOCK-DATA DERIVATION HELPERS                               */
/*  Pure, deterministic functions so re-renders never flicker values.  */
/* ================================================================== */

// Ambient palette per contextual keyword match. Only --go / --nogo /
// --line / --signal + the LivingGrid particle ("grid") color shift.
const THEME_VARS = {
  default: { go: '#39ff88', nogo: '#ff4438', line: '#edebe0', signal: '#ffd60a', grid: '#5ab4ff' },
  synthwave: { go: '#ff2bd6', nogo: '#ff4438', line: '#e7b8ff', signal: '#05d9e8', grid: '#ff6ec7' },
  amber: { go: '#ffb454', nogo: '#ff6b4a', line: '#f0d9b5', signal: '#ffcf7a', grid: '#ffa94d' },
};

function detectThemeVariant(text) {
  const lower = (text || '').toLowerCase();
  if (/(cyberpunk|synthwave|neon|cyber punk)/.test(lower)) return 'synthwave';
  if (/(cozy|cosy|farm|cottage|homestead)/.test(lower)) return 'amber';
  return 'default';
}

function hexToRgb(hex) {
  const clean = (hex || '#5ab4ff').replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// Simple deterministic string hash — used to seed mock-data derivation
// so the same pitch + score always produces the same "random-looking"
// numbers instead of reshuffling on every re-render.
function seedFromString(str) {
  let h = 7;
  for (let i = 0; i < (str || '').length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 9973;
  }
  return h;
}

function deriveSubMetrics(result) {
  if (Array.isArray(result?.sub_metrics) && result.sub_metrics.length) {
    return result.sub_metrics;
  }
  const base = result?.confidence_score ?? 50;
  const seed = seedFromString(result?.justification || result?.verdict || 'seed');
  const jitter = (n) => Math.max(4, Math.min(100, Math.round(base + (((seed * (n + 3)) % 27) - 13))));
  return [
    { label: 'Monetization Viability', score: jitter(1) },
    { label: 'Core Loop Engagement', score: jitter(2) },
    { label: 'Market Differentiation', score: jitter(3) },
  ];
}

function deriveRetentionCurve(result) {
  if (Array.isArray(result?.retention_curve) && result.retention_curve.length) {
    return result.retention_curve;
  }
  const base = Math.max(1, Math.min(100, result?.confidence_score ?? 50)) / 100;
  const decayRate = 0.1 + (1 - base) * 0.16;
  const days = [1, 3, 5, 7, 10, 14, 21, 30];
  return days.map((day) => ({
    day,
    retention: Math.max(
      3,
      Math.round(100 * Math.pow(1 - decayRate, Math.log2(day + 1)) * (0.55 + base * 0.45))
    ),
  }));
}

function deriveAudienceMatch(result) {
  if (Array.isArray(result?.audience_match) && result.audience_match.length) {
    return result.audience_match;
  }
  const base = result?.confidence_score ?? 50;
  const seed = seedFromString(result?.justification || result?.verdict || 'seed');
  const archetypes = [
    'Immersive Sim Fans',
    'Casual Mobile Gamers',
    'Hardcore Roguelike Players',
    'Narrative Adventure Fans',
  ];
  return archetypes.map((label, i) => {
    const score = Math.max(6, Math.min(97, Math.round(base + (((seed * (i + 2)) % 29) - 14))));
    const tier = score >= 70 ? 'High Match' : score >= 42 ? 'Medium Match' : 'Low Match';
    return { label, score, tier };
  });
}

function deriveMarketComparisons(result) {
  if (result?.market_comparisons?.success && result?.market_comparisons?.failure) {
    return result.market_comparisons;
  }
  const isGo = result?.verdict === 'GO';
  return {
    success: {
      name: isGo ? 'Hades' : 'Vampire Survivors',
      note: 'Tight, legible core loop carried a niche premise to mainstream traction.',
    },
    failure: {
      name: isGo ? 'Concord' : "Babylon's Fall",
      note: 'High production values, no differentiated hook — the audience never formed.',
    },
  };
}

/* ================================================================== */
/*  LIVING GRID — animated canvas backdrop (perspective floor +        */
/*  particle network) that reacts to app state and cursor position     */
/* ================================================================== */
function LivingGrid({ mode, reduce, themeVars }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const paletteRef = useRef({
    idle: hexToRgb(themeVars?.grid),
    loading: hexToRgb(themeVars?.signal),
    go: hexToRgb(themeVars?.go),
    nogo: hexToRgb(themeVars?.nogo),
  });
  useEffect(() => {
    paletteRef.current = {
      idle: hexToRgb(themeVars?.grid),
      loading: hexToRgb(themeVars?.signal),
      go: hexToRgb(themeVars?.go),
      nogo: hexToRgb(themeVars?.nogo),
    };
  }, [themeVars]);

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
      const col = paletteRef.current[m] || paletteRef.current.idle;
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
/*  Values + axis markers are always rendered (not hover-dependent).   */
/* ================================================================== */
function SignalMeter({ score, tone }) {
  const reduce = useReducedMotion();
  const segments = 20;
  const filled = Math.max(1, Math.round((score / 100) * segments));
  const accent = tone === 'go' ? 'var(--go)' : 'var(--nogo)';
  const axisMarks = [0, 25, 50, 75, 100];

  return (
    <div>
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
      {/* Static axis markers — always visible, independent of interaction */}
      <div className="flex justify-between mt-[6px] px-[1px]" aria-hidden="true">
        {axisMarks.map((v) => (
          <span key={v} className="ui-mono text-[9px] tracking-[0.05em] text-[var(--text-muted)]">
            {v}
          </span>
        ))}
      </div>
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
/*  DeltaBadge — shows the score change after a pivot re-evaluation    */
/* ================================================================== */
function DeltaBadge({ previousScore, currentScore, reduce }) {
  if (previousScore == null || currentScore == null) return null;
  const delta = Math.round(currentScore) - Math.round(previousScore);
  if (delta === 0) {
    return (
      <span className="ui-mono text-xs px-1.5 py-0.5 border-[2px] border-[var(--line-dim)] text-[var(--text-muted)]">
        ±0
      </span>
    );
  }
  const isUp = delta > 0;
  const color = isUp ? 'var(--go)' : 'var(--nogo)';
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: -6, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE }}
      className="ui-mono text-xs font-bold px-1.5 py-0.5 border-[2px] inline-flex items-center gap-1"
      style={{ color, borderColor: color, boxShadow: `0 0 8px -2px ${color}` }}
    >
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isUp ? '+' : ''}
      {delta}
    </motion.span>
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
function ScanningStatus({ reduce, label }) {
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
      {reduce ? label || 'Analyzing pitch' : phrases[i]}...
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
/*  Score Penalty Breakdown — modular sub-metric bars                  */
/* ================================================================== */
function SubMetricsBreakdown({ metrics, reduce }) {
  if (!Array.isArray(metrics) || !metrics.length) return null;
  return (
    <div className="mt-6 pt-6 border-t-[2px] border-[var(--line-dim)] space-y-4">
      <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] block">
        Score Breakdown
      </span>
      {metrics.map((m, i) => {
        const score = Math.max(0, Math.min(100, Math.round(m.score)));
        const tone = score >= 70 ? 'var(--go)' : score >= 40 ? 'var(--signal)' : 'var(--nogo)';
        return (
          <div key={m.label || i}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="ui-mono text-[11px] tracking-[0.1em] uppercase text-[var(--text-primary)]">
                {m.label}
              </span>
              <span className="ui-mono text-[11px]" style={{ color: tone }}>
                {score}/100
              </span>
            </div>
            <div className="h-2 w-full bg-[var(--bg-elevated)] border-[2px] border-[var(--line-dim)] overflow-hidden">
              <motion.div
                className="h-full"
                style={{ background: tone }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: reduce ? 0.01 : 0.7, ease: EASE, delay: reduce ? 0 : 0.1 * i }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Retention Graph — mock Day 1 → Day 30 retention line chart         */
/* ================================================================== */
function RetentionGraph({ data, tone, reduce }) {
  if (!Array.isArray(data) || !data.length) return null;
  const W = 640;
  const H = 200;
  const padL = 34;
  const padB = 24;
  const padT = 16;
  const padR = 12;
  const maxDay = data[data.length - 1].day;
  const accent = tone === 'go' ? 'var(--go)' : 'var(--nogo)';

  const points = data.map((d) => {
    const x = padL + (d.day / maxDay) * (W - padL - padR);
    const y = padT + (1 - d.retention / 100) * (H - padT - padB);
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${H - padB} L${points[0].x.toFixed(1)},${H - padB} Z`;
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} style={{ color: accent }} />
        <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Simulated Day 1–30 Retention
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Simulated player retention curve from day 1 to day 30">
        {yTicks.map((t) => {
          const y = padT + (1 - t / 100) * (H - padT - padB);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--line-dim)" strokeWidth="1" strokeDasharray="2,4" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace">
                {t}
              </text>
            </g>
          );
        })}
        {points.map((p) => (
          <text key={`x-${p.day}`} x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace">
            D{p.day}
          </text>
        ))}
        <motion.path
          d={areaD}
          fill={accent}
          opacity={0.12}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: reduce ? 0.01 : 0.6, delay: reduce ? 0 : 0.3 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0.01 : 1.1, ease: EASE, delay: reduce ? 0 : 0.15 }}
        />
        {points.map((p) => (
          <circle key={`pt-${p.day}`} cx={p.x} cy={p.y} r="3" fill="var(--bg-surface)" stroke={accent} strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}

/* ================================================================== */
/*  Target Audience Heatmap                                            */
/* ================================================================== */
function AudienceHeatmap({ data, reduce }) {
  if (!Array.isArray(data) || !data.length) return null;
  const tierColor = (tier) =>
    tier === 'High Match' ? 'var(--go)' : tier === 'Medium Match' ? 'var(--signal)' : 'var(--nogo)';

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-[var(--text-muted)]" />
        <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Target Audience Match
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((row, i) => {
          const color = tierColor(row.tier);
          return (
            <motion.div
              key={row.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE, delay: reduce ? 0 : i * 0.08 }}
              className="border-[2px] p-3 flex items-center justify-between gap-2"
              style={{ borderColor: color, background: 'rgba(0,0,0,0.2)' }}
            >
              <span className="text-xs md:text-sm text-[var(--text-primary)] leading-tight">
                {row.label}
              </span>
              <span
                className="ui-mono text-[10px] uppercase tracking-[0.1em] px-2 py-1 shrink-0"
                style={{ color, border: `2px solid ${color}` }}
              >
                {row.tier}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Similar Market Failures / Successes module                         */
/* ================================================================== */
function MarketComparisons({ comparisons, reduce }) {
  if (!comparisons?.success || !comparisons?.failure) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE }}
        className="border-[2px] border-[var(--go)] p-4"
        style={{ background: 'rgba(57,255,136,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Award size={14} className="text-[var(--go)]" />
          <span className="ui-mono text-[10px] uppercase tracking-[0.15em] text-[var(--go)]">
            Comparable Success
          </span>
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{comparisons.success.name}</p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{comparisons.success.note}</p>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE, delay: reduce ? 0 : 0.08 }}
        className="border-[2px] border-[var(--nogo)] p-4"
        style={{ background: 'rgba(255,68,56,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Skull size={14} className="text-[var(--nogo)]" />
          <span className="ui-mono text-[10px] uppercase tracking-[0.15em] text-[var(--nogo)]">
            Comparable Failure
          </span>
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{comparisons.failure.name}</p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{comparisons.failure.note}</p>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Market Intelligence — wraps the three "outpacing the competition"  */
/*  modules in one brutalist card                                      */
/* ================================================================== */
function MarketIntelligence({ result, tone, reduce }) {
  const retention = useMemo(() => deriveRetentionCurve(result), [result]);
  const audience = useMemo(() => deriveAudienceMatch(result), [result]);
  const comparisons = useMemo(() => deriveMarketComparisons(result), [result]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: reduce ? 0 : 0.25 }}
      style={{ boxShadow: '6px 6px 0 0 var(--line)' }}
      className="brutal-card relative border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 overflow-hidden space-y-8"
    >
      <div className="sheen" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Market Intelligence
        </span>
        <span className="ui-mono text-xs px-2 py-1 border-[2px] border-[var(--line)]">MOCK SIM</span>
      </div>

      <RetentionGraph data={retention} tone={tone} reduce={reduce} />
      <div className="pt-6 border-t-[2px] border-[var(--line-dim)]">
        <AudienceHeatmap data={audience} reduce={reduce} />
      </div>
      <div className="pt-6 border-t-[2px] border-[var(--line-dim)]">
        <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] block mb-4">
          Similar Market Precedents
        </span>
        <MarketComparisons comparisons={comparisons} reduce={reduce} />
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Strategic pivot checklist                                         */
/* ================================================================== */
function PivotChecklist({ pivots, reduce, onReEvaluate, reEvaluating, reEvalError, appliedPivots }) {
  const [checked, setChecked] = useState(() => new Set());

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectedPivots = Array.from(checked).map((i) => pivots[i]);

  if (!pivots.length) {
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
                disabled={reEvaluating}
                className="w-full flex items-start gap-3 text-left disabled:opacity-60"
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

      <AnimatePresence>
        {checked.size > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? {} : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onReEvaluate && onReEvaluate(selectedPivots)}
              disabled={reEvaluating || !onReEvaluate}
              className="brutal-card mt-5 w-full flex items-center justify-center gap-2 bg-[var(--signal)] text-[var(--bg-void)] border-[3px] border-[var(--line)] px-5 py-3 ui-mono text-xs font-bold tracking-[0.15em] uppercase disabled:opacity-50 disabled:pointer-events-none"
              style={{ boxShadow: '4px 4px 0 0 var(--line)' }}
            >
              <RefreshCw size={14} className={reEvaluating && !reduce ? 'spin-slow' : ''} strokeWidth={2.5} />
              {reEvaluating ? 'Re-Evaluating…' : `Re-Evaluate with ${checked.size} Pivot${checked.size > 1 ? 's' : ''}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {reEvalError && (
        <p className="ui-mono text-xs text-[var(--nogo)] mt-3 flex items-center gap-2">
          <AlertTriangle size={14} />
          {reEvalError}
        </p>
      )}

      {appliedPivots && appliedPivots.length > 0 && !reEvaluating && (
        <p className="ui-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)] mt-3">
          Last re-evaluation applied {appliedPivots.length} pivot{appliedPivots.length > 1 ? 's' : ''}.
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Result cards — Verdict (with holographic tilt) + Strategic Pivot   */
/*  + Score Breakdown + Delta + Market Intelligence modules            */
/* ================================================================== */
function ResultCards({ result, pitch, onReEvaluate, reEvaluating, previousScore, appliedPivots, reEvalError }) {
  const reduce = useReducedMotion();
  const { verdict, confidence_score, justification, strategic_pivots } = result;
  const isGo = verdict === 'GO';
  const tone = isGo ? 'go' : 'nogo';
  const accent = isGo ? 'var(--go)' : 'var(--nogo)';

  const subMetrics = useMemo(() => deriveSubMetrics(result), [result]);

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

        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-3">
            <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Market Confidence
            </span>
            <span className="ui-mono text-2xl font-bold flex items-baseline gap-2">
              <span className="flex items-baseline gap-1">
                <SlotDigits value={confidence_score} reduce={reduce} color={accent} />
                <span className="text-sm text-[var(--text-muted)]">/100</span>
              </span>
              <DeltaBadge previousScore={previousScore} currentScore={confidence_score} reduce={reduce} />
            </span>
          </div>
          <SignalMeter score={confidence_score} tone={tone} />
        </div>

        <SubMetricsBreakdown metrics={subMetrics} reduce={reduce} />

        <div
          className="pt-5 pl-4 mt-6 border-t-[2px] border-[var(--line-dim)]"
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
        {reEvaluating ? (
          <div className="space-y-3">
            <ScanningStatus reduce={reduce} label="Re-evaluating with pivots" />
            <div className="shimmer-bar h-3 w-full" />
            <div className="shimmer-bar h-3 w-4/5" />
          </div>
        ) : (
          <PivotChecklist
            pivots={strategic_pivots || []}
            reduce={reduce}
            onReEvaluate={onReEvaluate}
            reEvaluating={reEvaluating}
            reEvalError={reEvalError}
            appliedPivots={appliedPivots}
          />
        )}
      </motion.div>

      {/* Market Intelligence Card */}
      <MarketIntelligence result={result} tone={tone} reduce={reduce} />
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
  const [themeVariant, setThemeVariant] = useState('default');
  const [tearing, setTearing] = useState(false);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const flashedIdRef = useRef(null);
  const prevBusyRef = useRef(false);

  const themeVars = THEME_VARS[themeVariant] || THEME_VARS.default;

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

  // Contextual color grading — parse the live pitch text for keywords
  // and smoothly shift the ambient UI palette accordingly.
  useEffect(() => {
    setThemeVariant(detectThemeVariant(pitch));
  }, [pitch]);

  // Suspenseful "screen tear" — fires once whenever the terminal goes
  // from busy (loading a fresh evaluation OR re-evaluating with
  // pivots) back to idle, right before new result cards mount.
  useEffect(() => {
    const anyBusy = entries.some((e) => e.status === 'loading' || e.reEvaluating);
    if (prevBusyRef.current && !anyBusy && !reduce) {
      setTearing(true);
      const t = setTimeout(() => setTearing(false), 220);
      prevBusyRef.current = anyBusy;
      return () => clearTimeout(t);
    }
    prevBusyRef.current = anyBusy;
  }, [entries, reduce]);

  const lastEntry = entries[entries.length - 1];
  const mode = !lastEntry
    ? 'idle'
    : lastEntry.status === 'loading' || lastEntry.reEvaluating
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

  // Re-evaluate a previously scored pitch with selected strategic
  // pivots folded into the request, teaching the user how market
  // tweaks move the score. Keeps the prior result visible as the
  // "previousScore" baseline for the delta indicator.
  async function handleReEvaluate(id, originalPitch, pivots) {
    setEntries((prev) =>
      prev.map((en) => (en.id === id ? { ...en, reEvaluating: true, reEvalError: undefined } : en))
    );

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: originalPitch, pivots }),
      });
      if (!res.ok) throw new Error(`Evaluation engine returned ${res.status}`);
      const data = await res.json();
      setEntries((prev) =>
        prev.map((en) =>
          en.id === id
            ? {
                ...en,
                reEvaluating: false,
                previousScore: en.result?.confidence_score ?? en.previousScore,
                result: data,
                appliedPivots: pivots,
              }
            : en
        )
      );
    } catch (err) {
      setEntries((prev) =>
        prev.map((en) =>
          en.id === id
            ? { ...en, reEvaluating: false, reEvalError: err.message || 'Re-evaluation failed.' }
            : en
        )
      );
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div
      className="ui-display min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] relative"
      style={{
        '--go': themeVars.go,
        '--nogo': themeVars.nogo,
        '--line': themeVars.line,
        '--signal': themeVars.signal,
      }}
    >
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
        .ui-display,
        .ui-display * {
          transition: border-color 0.6s ease, background-color 0.6s ease, color 0.6s ease,
            box-shadow 0.6s ease, fill 0.6s ease, stroke 0.6s ease;
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

        .spin-slow {
          animation: spinSlow 1.1s linear infinite;
        }
        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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

        /* Suspenseful CRT "screen tear" burst right before results mount */
        .screen-tear {
          animation: screenTear 0.2s steps(2, end) 1;
        }
        @keyframes screenTear {
          0% {
            transform: skewX(0deg) translateY(0);
            filter: none;
          }
          20% {
            transform: skewX(-2.5deg) translateY(-3px);
            filter: contrast(1.4) brightness(1.25) saturate(1.3);
          }
          40% {
            transform: skewX(3deg) translateY(2px);
          }
          60% {
            transform: skewX(-1.5deg) translateY(-2px);
            filter: hue-rotate(6deg) contrast(1.2);
          }
          80% {
            transform: skewX(1deg) translateY(1px);
          }
          100% {
            transform: skewX(0deg) translateY(0);
            filter: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer-bar::after,
          .led-dot,
          .scan-dot,
          .pulse-dot,
          .spin-slow,
          .ticker-track,
          .screen-tear {
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
          .ui-display,
          .ui-display * {
            transition: none !important;
          }
        }
      `}</style>

      <LivingGrid mode={mode} reduce={reduce} themeVars={themeVars} />
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

      <main
        className={`relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14 ${tearing ? 'screen-tear' : ''}`}
      >
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

                {entry.status === 'done' && (
                  <ResultCards
                    result={entry.result}
                    pitch={entry.pitch}
                    onReEvaluate={(pivots) => handleReEvaluate(entry.id, entry.pitch, pivots)}
                    reEvaluating={!!entry.reEvaluating}
                    previousScore={entry.previousScore}
                    appliedPivots={entry.appliedPivots}
                    reEvalError={entry.reEvalError}
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
          box-shadow: 0 0 0 3px rgba(57, 255, 136, 0.15), 0 0 24px -6px var(--go);
        }
      `}</style>
    </div>
  );
}
