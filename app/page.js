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
  Database
} from 'lucide-react';

const EASE = [0.33, 1, 0.68, 1];

/* ================================================================== */
/*  LIVING GRID                                                       */
/* ================================================================== */
function LivingGrid({ mode, reduce, theme }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const themeRef = useRef(theme);
  
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

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

    const palettes = {
      default: {
        idle: { r: 90, g: 180, b: 255 },
        loading: { r: 255, g: 214, b: 10 },
        go: { r: 57, g: 255, b: 136 },
        nogo: { r: 255, g: 68, b: 56 },
      },
      cyberpunk: {
        idle: { r: 184, g: 0, b: 255 },
        loading: { r: 255, g: 214, b: 10 },
        go: { r: 5, g: 217, b: 232 },
        nogo: { r: 255, g: 43, b: 109 },
      },
      cozy: {
        idle: { r: 142, g: 202, b: 230 },
        loading: { r: 255, g: 183, b: 3 },
        go: { r: 255, g: 183, b: 3 },
        nogo: { r: 251, g: 133, b: 0 },
      }
    };

    let gridOffset = 0;
    let sweep = 0;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(now - last, 48);
      last = now;
      const m = modeRef.current;
      const t = themeRef.current;
      const activePalette = palettes[t] || palettes.default;
      const col = activePalette[m] || activePalette.idle;
      const speed = m === 'loading' ? 2.3 : m === 'nogo' ? 1.9 : m === 'go' ? 1.5 : 1;

      ctx.clearRect(0, 0, width, height);

      const horizonY = height * 0.6;
      const px = reduce ? 0 : pointer.x * 12;
      const py = reduce ? 0 : pointer.y * 6;

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

      if (m === 'loading' && !reduce) {
        sweep += dt * 0.0017;
        const cx = width / 2;
        const cy = horizonY;
        const grad = ctx.createLinearGradient(
          cx, cy, cx + Math.cos(sweep) * 420, cy + Math.sin(sweep) * 420 - 220
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

    if (reduce) frame(performance.now());
    else rafId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}

/* ================================================================== */
/*  HUD Corner Brackets                                               */
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
/*  Data Ticker                                                       */
/* ================================================================== */
function DataTicker({ entries, mode, reduce }) {
  const doneCount = entries.filter((e) => e.status === 'done').length;
  const lastDone = [...entries].reverse().find((e) => e.status === 'done');
  const items = [
    'GREENLIGHT TERMINAL',
    `PITCHES EVALUATED: ${doneCount}`,
    lastDone ? `LAST SIGNAL: ${lastDone.result.verdict} — ${lastDone.result.confidence_score}/100` : 'AWAITING FIRST TRANSMISSION',
    mode === 'loading' ? 'STATUS: ANALYZING PITCH' : 'STATUS: STANDING BY',
  ];
  const text = items.join('   ▸   ');

  return (
    <div className="ticker-wrap border-b-[3px] border-[var(--line)] bg-[var(--bg-surface)] relative z-10">
      {reduce ? (
        <div className="ui-mono text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)] px-4 py-2 truncate">{text}</div>
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
/*  Signal Meter w/ Permanent Axis Visualization                      */
/* ================================================================== */
function SignalMeter({ score, tone }) {
  const reduce = useReducedMotion();
  const segments = 20;
  const filled = Math.max(1, Math.round((score / 100) * segments));
  const accent = tone === 'go' ? 'var(--go)' : 'var(--nogo)';

  return (
    <div className="flex flex-col gap-1 w-full max-w-[280px]">
      <div className="flex gap-[3px]" role="img" aria-label={`Market confidence signal: ${score} out of 100`}>
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <motion.div
              key={i}
              className="h-7 flex-1 border-[2px]"
              style={{
                borderColor: isFilled ? accent : 'var(--line-dim)',
                backgroundColor: isFilled ? accent : 'transparent',
                boxShadow: isFilled ? `0 0 8px -1px ${accent}` : 'none',
                transformOrigin: 'bottom',
              }}
              initial={reduce ? false : { scaleY: 0.15, opacity: 0.35 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0.01 : 0.35, ease: EASE, delay: reduce ? 0 : i * 0.02 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between ui-mono text-[10px] text-[var(--text-muted)]">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
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
      if (elapsed < stopTimes[stopTimes.length - 1]) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    }
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, reduce]);

  return (
    <span className="inline-flex ui-mono tabular-nums" style={{ color }}>
      {display.map((d, i) => (
        <span key={i} className="inline-block w-[0.62em] text-center">{d}</span>
      ))}
    </span>
  );
}

/* ================================================================== */
/*  GlitchText                                                        */
/* ================================================================== */
function GlitchText({ text, className }) {
  return <span className={`glitch-wrap ${className || ''}`} data-text={text}>{text}</span>;
}

/* ================================================================== */
/*  WordStagger                                                       */
/* ================================================================== */
function WordStagger({ text, className, delay = 0 }) {
  const reduce = useReducedMotion();
  const words = (text || '').split(' ');
  const container = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.028, delayChildren: delay } } };
  const word = { hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0.01 : 0.5, ease: EASE } } };

  return (
    <motion.p className={className} variants={container} initial="hidden" animate="visible">
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block mr-[0.28em]">{w}</motion.span>
      ))}
    </motion.p>
  );
}

/* ================================================================== */
/*  Interactive Pivot Checklist                                       */
/* ================================================================== */
function PivotChecklist({ pivots, reduce, onReEvaluate }) {
  const [checked, setChecked] = useState(() => new Set());
  const [isInjecting, setIsInjecting] = useState(false);

  const toggle = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleInject = () => {
    setIsInjecting(true);
    const selectedPivots = Array.from(checked).map(i => pivots[i]);
    onReEvaluate(selectedPivots);
  };

  if (!pivots || !pivots.length) {
    return <p className="ui-mono text-sm text-[var(--text-muted)]">No pivots flagged — pitch cleared as-is.</p>;
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {pivots.map((pivot, i) => {
          const isChecked = checked.has(i);
          return (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE, delay: reduce ? 0 : 0.5 + i * 0.08 }}
            >
              <button type="button" onClick={() => toggle(i)} className="w-full flex items-start gap-3 text-left hover:opacity-80 transition-opacity">
                {isChecked ? (
                  <CheckSquare size={20} className="mt-0.5 shrink-0 text-[var(--go)]" />
                ) : (
                  <Square size={20} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                )}
                <span className={`text-sm md:text-base leading-relaxed ${isChecked ? 'text-[var(--go)]' : 'text-[var(--text-primary)]'}`}>
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t-2 border-dashed border-[var(--line-dim)]"
          >
            <button
              onClick={handleInject}
              disabled={isInjecting}
              className="w-full brutal-card flex items-center justify-center gap-2 bg-[var(--bg-surface)] text-[var(--go)] border-[2px] border-[var(--go)] px-4 py-3 ui-mono text-xs font-bold tracking-[0.1em] uppercase hover:bg-[var(--go)] hover:text-black transition-colors"
            >
              <Activity size={16} />
              {isInjecting ? 'Recalculating...' : 'Re-Evaluate with Pivots'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Market Analytics Graphs                                           */
/* ================================================================== */
function MarketAnalytics({ result }) {
  const { retention, heatmap, comparables } = result;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Retention Graph */}
      <div className="border-[2px] border-[var(--line-dim)] p-4 bg-[var(--bg-elevated)]">
        <h3 className="ui-mono text-[10px] uppercase text-[var(--text-muted)] mb-4 tracking-[0.15em] flex items-center gap-2">
          <Activity size={14} /> D1-D30 Retention Projection
        </h3>
        <div className="h-24 w-full flex items-end gap-1 border-b-[2px] border-l-[2px] border-[var(--line-dim)] p-2">
          {(retention || [100, 80, 65, 55, 45, 40, 35, 30]).map((val, i) => (
            <div
              key={i}
              className="w-full bg-[var(--go)] opacity-80"
              style={{ height: `${val}%` }}
              title={`Day ${i * 4}: ${val}%`}
            />
          ))}
        </div>
      </div>

      {/* Target Audience Heatmap */}
      <div className="border-[2px] border-[var(--line-dim)] p-4 bg-[var(--bg-elevated)]">
        <h3 className="ui-mono text-[10px] uppercase text-[var(--text-muted)] mb-4 tracking-[0.15em] flex items-center gap-2">
          <Users size={14} /> Audience Heatmap
        </h3>
        <div className="space-y-2">
          {(heatmap || [{ audience: 'Core Genre Fans', match: 'High' }, { audience: 'Casual Gamers', match: 'Low' }]).map((h, i) => (
            <div key={i} className="flex justify-between items-center text-xs ui-mono border-b border-[var(--line-dim)] pb-1">
              <span>{h.audience}</span>
              <span className={h.match === 'High' ? 'text-[var(--go)]' : 'text-[var(--nogo)]'}>
                {h.match} MATCH
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparables */}
      <div className="col-span-1 md:col-span-2 border-[2px] border-[var(--line-dim)] p-4 bg-[var(--bg-elevated)] flex flex-col md:flex-row gap-4">
        <div className="flex-1">
           <h3 className="ui-mono text-[10px] uppercase text-[var(--go)] mb-2 tracking-[0.15em]">Market Success Match</h3>
           <p className="text-sm font-bold">{comparables?.success || 'Risk of Rain 2'}</p>
        </div>
        <div className="w-px bg-[var(--line-dim)] hidden md:block" />
        <div className="flex-1">
           <h3 className="ui-mono text-[10px] uppercase text-[var(--nogo)] mb-2 tracking-[0.15em]">Market Failure Match</h3>
           <p className="text-sm font-bold">{comparables?.failure || 'LawBreakers'}</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Result Cards                                                      */
/* ================================================================== */
function ResultCards({ result, onReEvaluate }) {
  const reduce = useReducedMotion();
  const { verdict, confidence_score, justification, strategic_pivots, delta, sub_scores } = result;
  const isGo = verdict === 'GO';
  const tone = isGo ? 'go' : 'nogo';
  const accent = isGo ? 'var(--go)' : 'var(--nogo)';

  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rX = useSpring(useTransform(mvY, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 22 });
  const rY = useSpring(useTransform(mvX, [-0.5, 0.5], [-7, 7]), { stiffness: 220, damping: 22 });

  return (
    <div className="space-y-6" style={{ perspective: 900 }}>
      {/* Verdict Card */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE }}
        onMouseMove={(e) => {
          if (reduce) return;
          const rect = e.currentTarget.getBoundingClientRect();
          mvX.set((e.clientX - rect.left) / rect.width - 0.5);
          mvY.set((e.clientY - rect.top) / rect.height - 0.5);
        }}
        onMouseLeave={() => { mvX.set(0); mvY.set(0); }}
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
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Verdict Transmission</span>
          <span className="ui-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: accent }}>
            <span className="pulse-dot" style={{ background: accent }} />
            {isGo ? 'Signal: Positive' : 'Signal: Negative'}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {isGo ? <CheckCircle2 size={56} strokeWidth={2} style={{ color: accent }} /> : <XCircle size={56} strokeWidth={2} style={{ color: accent }} />}
          <h2 className="neon-text text-7xl md:text-8xl font-bold tracking-tighter leading-none" style={{ color: accent }}>
            <GlitchText text={verdict} />
          </h2>
        </div>

        <div className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Market Confidence</span>
            <div className="text-right">
              <span className="ui-mono text-3xl font-bold flex items-baseline gap-1">
                <SlotDigits value={confidence_score} reduce={reduce} color={accent} />
                <span className="text-sm text-[var(--text-muted)]">/100</span>
              </span>
              {/* DELTA INDICATOR */}
              {delta && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`text-xs ui-mono font-bold mt-1 ${delta > 0 ? 'text-[var(--go)]' : 'text-[var(--nogo)]'}`}>
                  {delta > 0 ? `▲ +${delta} PTS` : `▼ ${delta} PTS`}
                </motion.div>
              )}
            </div>
          </div>
          <SignalMeter score={confidence_score} tone={tone} />
          
          {/* SUB SCORES */}
          <div className="mt-4 flex flex-wrap gap-4 border-t-[1px] border-[var(--line-dim)] pt-4">
             {(sub_scores || [{name: 'Core Loop', score: confidence_score + 2}, {name: 'Monetization', score: confidence_score - 5}]).map((sub, i) => (
               <div key={i} className="flex flex-col">
                  <span className="ui-mono text-[9px] uppercase text-[var(--text-muted)] tracking-[0.1em]">{sub.name}</span>
                  <span className="ui-mono text-sm font-bold">{sub.score}/100</span>
               </div>
             ))}
          </div>
        </div>

        <div className="pt-5 pl-4 border-t-[2px] border-[var(--line-dim)]" style={{ borderLeft: `3px solid ${accent}`, background: 'rgba(0,0,0,0.22)' }}>
          <WordStagger text={justification} className="text-base md:text-lg leading-relaxed text-[var(--text-primary)] py-3 pr-2" delay={reduce ? 0 : 0.35} />
        </div>
      </motion.div>

      {/* Analytics Card */}
      <motion.div
         initial={reduce ? false : { opacity: 0, y: 24 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: 0.1 }}
         className="brutal-card border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6"
         style={{ boxShadow: '6px 6px 0 0 var(--line)' }}
      >
        <MarketAnalytics result={result} />
      </motion.div>

      {/* Strategic Pivot Card */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.6, ease: EASE, delay: reduce ? 0 : 0.2 }}
        style={{ boxShadow: '6px 6px 0 0 var(--line)' }}
        className="brutal-card relative border-[3px] border-[var(--line)] bg-[var(--bg-surface)] p-6 md:p-8 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="ui-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Strategic Pivots</span>
          <span className="ui-mono text-xs px-2 py-1 border-[2px] border-[var(--line)]">{strategic_pivots?.length || 0}</span>
        </div>
        <PivotChecklist pivots={strategic_pivots || []} reduce={reduce} onReEvaluate={onReEvaluate} />
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                         */
/* ================================================================== */
export default function Page() {
  const reduce = useReducedMotion();
  const [pitch, setPitch] = useState('');
  const [entries, setEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  const [theme, setTheme] = useState('default');
  const [isTearing, setIsTearing] = useState(false);
  
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const flashedIdRef = useRef(null);

  // Theme Parsing Hook
  useEffect(() => {
    const text = pitch.toLowerCase();
    if (text.includes('cyberpunk') || text.includes('neon') || text.includes('synth')) {
      setTheme('cyberpunk');
    } else if (text.includes('cozy') || text.includes('farm') || text.includes('wholesome')) {
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
    if (entries.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [entries.length, entries]);

  useEffect(() => {
    const last = entries[entries.length - 1];
    if (last && last.status === 'done' && flashedIdRef.current !== last.id && !reduce) {
      flashedIdRef.current = last.id;
      // Trigger CRT Screen Tear before flash
      setIsTearing(true);
      setTimeout(() => {
        setIsTearing(false);
        setFlash(last.result.verdict === 'GO' ? 'go' : 'nogo');
        setTimeout(() => setFlash(null), 700);
      }, 200);
    }
  }, [entries, reduce]);

  const lastEntry = entries[entries.length - 1];
  const mode = !lastEntry ? 'idle' : lastEntry.status === 'loading' ? 'loading' : lastEntry.status === 'done' ? (lastEntry.result.verdict === 'GO' ? 'go' : 'nogo') : 'idle';

  // FIXED ASYNC FUNCTION
  const handleReEvaluate = async (selectedPivots) => {
    if (!lastEntry || isSubmitting) return;
    const appendedPitch = `${lastEntry.pitch}\n\n[Applied Strategic Pivots]:\n${selectedPivots.join('\n')}`;
    const id = Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setEntries((prev) => [...prev, { id, pitch: appendedPitch, time, status: 'loading' }]);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: appendedPitch }),
      });
      if (!res.ok) throw new Error(`Evaluation engine returned ${res.status}`);
      let data = await res.json();
      
      // Calculate mock delta if valid previous score exists
      const prevScore = lastEntry.result?.confidence_score || 50;
      data.delta = data.confidence_score ? data.confidence_score - prevScore : 12; // fallback delta
      
      setEntries((prev) => prev.map((en) => (en.id === id ? { ...en, status: 'done', result: data } : en)));
    } catch (err) {
      setEntries((prev) => prev.map((en) => en.id === id ? { ...en, status: 'error', error: err.message } : en));
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = pitch.trim();
    if (!trimmed || isSubmitting) return;

    const id = Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setEntries((prev) => [...prev, { id, pitch: trimmed, time, status: 'loading' }]);
    setPitch('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: trimmed }),
      });
      if (!res.ok) throw new Error(`Engine returned ${res.status}`);
      let data = await res.json();
      setEntries((prev) => prev.map((en) => (en.id === id ? { ...en, status: 'done', result: data } : en)));
    } catch (err) {
      setEntries((prev) => prev.map((en) => en.id === id ? { ...en, status: 'error', error: err.message } : en));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`ui-display min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] relative theme-${theme} ${isTearing ? 'crt-tear' : ''}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        /* Default Theme Variables */
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

        /* Cyberpunk Theme Overrides */
        .theme-cyberpunk {
          --bg-void: #090212;
          --bg-surface: #150826;
          --bg-elevated: #1e0b38;
          --line: #05d9e8;
          --line-dim: #451b6b;
          --go: #05d9e8;
          --nogo: #ff2b6d;
          --signal: #b800ff;
        }

        /* Cozy Theme Overrides */
        .theme-cozy {
          --bg-void: #1a120c;
          --bg-surface: #2b1f16;
          --bg-elevated: #3d2c20;
          --line: #ffb703;
          --line-dim: #5c442c;
          --go: #ffb703;
          --nogo: #fb8500;
          --signal: #8ecae6;
        }

        .ui-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .ui-mono { font-family: 'JetBrains Mono', monospace; }

        .crt-tear {
          animation: crtTear 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes crtTear {
          0% { transform: skewX(0deg) translateY(0); filter: blur(0); }
          20% { transform: skewX(-5deg) translateY(4px); filter: blur(2px); }
          40% { transform: skewX(8deg) translateY(-2px); filter: blur(1px); }
          60% { transform: skewX(-3deg) translateY(2px); filter: blur(3px); }
          80% { transform: skewX(2deg) translateY(-1px); filter: blur(0); }
          100% { transform: skewX(0deg) translateY(0); filter: blur(0); }
        }

        .shimmer-bar {
          position: relative; overflow: hidden; background: var(--bg-elevated); border: 1px solid var(--line-dim);
        }
        .shimmer-bar::after {
          content: ''; position: absolute; inset: 0; transform: translateX(100%);
          background: linear-gradient(90deg, transparent 0%, rgba(242, 240, 230, 0.18) 50%, transparent 100%);
          animation: shimmerSweep 1.5s ease-in-out infinite;
        }
        @keyframes shimmerSweep { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }

        .led-dot { animation: blink 1.6s steps(2, start) infinite; }
        .scan-dot { width: 6px; height: 6px; background: var(--signal); box-shadow: 0 0 8px 1px var(--signal); animation: blink 0.9s steps(2, start) infinite; }
        @keyframes blink { 50% { opacity: 0.2; } }

        .pulse-dot { width: 8px; height: 8px; display: inline-block; animation: pulseDot 1.4s ease-in-out infinite; }
        @keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

        .neon-text { text-shadow: 0 0 18px currentColor, 0 0 48px currentColor; }

        .brutal-card { transition: transform 0.15s cubic-bezier(0.33, 1, 0.68, 1), box-shadow 0.15s cubic-bezier(0.33, 1, 0.68, 1); }
        .brutal-card:hover { transform: translateY(-4px); }
        .brutal-card:active { transform: translateY(4px); box-shadow: none !important; }
        
        .sheen {
          position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(242, 240, 230, 0.06) 50%, transparent 60%);
          transform: translateX(-140%); transition: transform 0.8s cubic-bezier(0.33, 1, 0.68, 1); pointer-events: none;
        }
        .brutal-card:hover .sheen { transform: translateX(140%); }

        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-track { display: inline-flex; animation: tickerScroll 24s linear infinite; }
        .ticker-item { padding: 0 3rem; }
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      <LivingGrid mode={mode} reduce={reduce} theme={theme} />
      <HudFrame />

      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: flash === 'go' ? `radial-gradient(circle at 50% 28%, var(--go), transparent 60%)` : `radial-gradient(circle at 50% 28%, var(--nogo), transparent 60%)`,
              opacity: 0.35
            }}
          />
        )}
      </AnimatePresence>

      <header className="relative z-10 border-b-[3px] border-[var(--line)] px-6 py-8 md:px-12 md:py-10 transition-colors duration-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="led-dot h-2.5 w-2.5 bg-[var(--go)]" aria-hidden="true" />
          <span className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">System Online — Ready</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none text-[var(--line)]">GREENLIGHT</h1>
      </header>

      <DataTicker entries={entries} mode={mode} reduce={reduce} />

      <main className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14">
        <form onSubmit={handleSubmit} className="mb-14">
          <label htmlFor="pitch-input" className="block mb-3 ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Pitch your concept, mechanics, and genre.
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <textarea
              id="pitch-input" ref={textareaRef} value={pitch} onChange={(e) => setPitch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              rows={1} placeholder="e.g. A roguelike deckbuilder set in a cyberpunk city..."
              className="flex-1 resize-none bg-[var(--bg-surface)] border-[3px] border-[var(--line)] px-4 py-4 text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--go)] transition-colors duration-150"
              style={{ maxHeight: '240px' }}
            />
            <button
              type="submit" disabled={!pitch.trim() || isSubmitting}
              className="brutal-card shrink-0 flex items-center justify-center gap-2 bg-[var(--go)] text-[var(--bg-void)] border-[3px] border-[var(--line)] px-6 py-4 ui-mono text-sm font-bold tracking-[0.15em] uppercase disabled:opacity-40"
              style={{ boxShadow: '4px 4px 0 0 var(--line)' }}
            >
              <Send size={16} strokeWidth={2.5} /> Evaluate
            </button>
          </div>
        </form>

        {entries.length === 0 ? (
          <div className="border-[3px] border-dashed border-[var(--line-dim)] p-10 flex flex-col items-center text-center gap-3">
            <Terminal size={28} className="text-[var(--text-muted)]" />
            <p className="ui-mono text-xs tracking-[0.2em] text-[var(--text-muted)] uppercase">Awaiting Transmission</p>
          </div>
        ) : (
          <div className="space-y-16">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-6">
                <div className="flex items-start gap-3 ui-mono text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                  <ChevronRight size={16} className="mt-0.5 shrink-0 text-[var(--go)]" />
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase mb-1 opacity-60">{entry.time}</p>
                    <p className="leading-relaxed">{entry.pitch}</p>
                  </div>
                </div>
                {entry.status === 'loading' && <div className="p-8 border-[3px] border-[var(--line)] bg-[var(--bg-surface)]"><div className="shimmer-bar h-6 w-1/2 mb-4"></div><div className="shimmer-bar h-4 w-full"></div></div>}
                {entry.status === 'error' && (
                  <div className="border-[3px] border-[var(--nogo)] bg-[var(--bg-surface)] p-6 flex gap-3"><AlertTriangle className="text-[var(--nogo)]" size={20} /><p>{entry.error}</p></div>
                )}
                {entry.status === 'done' && <ResultCards result={entry.result} onReEvaluate={handleReEvaluate} />}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </main>
    </div>
  );
}
