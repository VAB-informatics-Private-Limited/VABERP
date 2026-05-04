'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  IconArrowRight, IconArrowLeft, IconCheck, IconChevronRight,
} from '@tabler/icons-react';
import {
  getModuleBySlug, MODULES,
  type FlowChart as FlowChartT, type FlowNode, type FlowSide,
} from '../data';

/* ─── Palette ──────────────────────────────────────────── */
const NAVY      = '#1E3A5F';
const CREAM     = '#faf9f5';
const CREAM_ALT = '#f4f3ee';
const MUTED     = '#334155';
const SUBTLE    = '#475569';
const BORDER    = '#ececec';

/* ─── Flowchart styling tokens ─────────────────────────── */
const NODE_STYLE: Record<FlowNode['type'], { w: number; h: number; bg: string; border: string; text: string }> = {
  start:    { w: 130, h: 48, bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
  process:  { w: 130, h: 48, bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
  pipeline: { w: 130, h: 48, bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  decision: { w: 110, h: 72, bg: '#cffafe', border: '#06b6d4', text: '#155e75' },
  success:  { w: 130, h: 48, bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  fail:     { w: 130, h: 48, bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
};

const LEGEND: { type: FlowNode['type']; label: string }[] = [
  { type: 'start',    label: 'Start' },
  { type: 'process',  label: 'Process' },
  { type: 'pipeline', label: 'Pipeline' },
  { type: 'decision', label: 'Decision' },
  { type: 'success',  label: 'End' },
  { type: 'fail',     label: 'Alt / Fail' },
];

export default function ModulePage({ params }: { params: { slug: string } }) {
  const mod = getModuleBySlug(params.slug);
  if (!mod) notFound();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: CREAM, color: NAVY }}>
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 backdrop-blur-md"
        style={{ background: 'rgba(250,249,245,0.85)', borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 md:px-10 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2 sm:gap-2.5" style={{ textDecoration: 'none' }}>
            <img src="/logo-icon.png" alt="VAB" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            <span className="font-semibold text-[14px] sm:text-[15px] tracking-tight" style={{ color: NAVY }}>
              VAB <span className="font-normal" style={{ color: MUTED }}>Informatics</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/landing#system-components"
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: MUTED, textDecoration: 'none' }}
            >
              <IconArrowLeft size={14} /> All modules
            </Link>
            <Link href="/login" className="text-[13px] sm:text-[13.5px] font-medium" style={{ color: NAVY, textDecoration: 'none' }}>
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-semibold text-white transition-transform hover:scale-105"
              style={{ background: NAVY, textDecoration: 'none' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero — 2-col with image on the side ───────────── */}
      <section className="pt-20 sm:pt-24 md:pt-28 pb-10 md:pb-14 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-center">
          {/* Left — text */}
          <div>
            <Link
              href="/landing#system-components"
              className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.22em] mb-4"
              style={{ color: SUBTLE, textDecoration: 'none' }}
            >
              <IconArrowLeft size={12} /> SYSTEM COMPONENTS
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: mod.iconBg, color: mod.iconColor, border: `1px solid ${BORDER}` }}
              >
                {mod.icon}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="font-semibold tracking-tight leading-[1.1]"
                style={{ color: NAVY, fontSize: 'clamp(24px, 3.2vw, 34px)', letterSpacing: '-0.02em' }}
              >
                {mod.title}
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-[14px] sm:text-[15px] font-medium leading-relaxed mb-4"
              style={{ color: NAVY }}
            >
              {mod.tagline}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-[13.5px] sm:text-[14px] leading-relaxed"
              style={{ color: MUTED }}
            >
              {mod.overview.purpose}
            </motion.p>

            {/* Quick-fact chips */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-5 flex flex-wrap gap-2"
            >
              <Chip label={`${mod.workflow.length} steps`} />
              <Chip label={`${mod.features.length} features`} />
              <Chip label={`${mod.integrations.length} integrations`} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 flex flex-wrap gap-2.5"
            >
              <Link href="/landing#system-components" style={{ textDecoration: 'none' }}>
                <button
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:bg-white"
                  style={{ background: 'transparent', color: NAVY, border: `1px solid ${BORDER}` }}
                >
                  <IconArrowLeft size={13} /> All modules
                </button>
              </Link>
            </motion.div>
          </div>

          {/* Right — compact image card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative w-full max-w-sm mx-auto lg:max-w-none lg:ml-auto"
          >
            <div
              className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-slate-200"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <img
                src={mod.imageUrl}
                alt={mod.imageAlt}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Flow diagram — centerpiece ─────────────────────── */}
      <section className="py-10 md:py-12 px-4 sm:px-6 md:px-10" style={{ background: CREAM_ALT }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <p className="text-[10.5px] font-semibold tracking-[0.22em] mb-1.5" style={{ color: SUBTLE }}>
                THE FLOW
              </p>
              <h2
                className="font-semibold tracking-tight leading-[1.2]"
                style={{ color: NAVY, fontSize: 'clamp(18px, 2.2vw, 24px)', letterSpacing: '-0.02em' }}
              >
                How the work moves through the system
              </h2>
            </div>
            {/* Inline legend chips */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {LEGEND.map((l) => {
                const s = NODE_STYLE[l.type];
                return (
                  <div key={l.type} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{
                        background: s.bg,
                        border: `1.5px solid ${s.border}`,
                        transform: l.type === 'decision' ? 'rotate(45deg)' : 'none',
                      }}
                    />
                    <span className="text-[10.5px] font-semibold" style={{ color: SUBTLE }}>
                      {l.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-2xl p-4 sm:p-5 bg-white overflow-x-auto"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="min-w-[720px]">
              <Flowchart chart={mod.flowchart} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2-column: Steps | Features ─────────────────────── */}
      <section className="py-10 md:py-14 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Steps */}
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.22em] mb-2" style={{ color: SUBTLE }}>
              STEP BY STEP
            </p>
            <h2
              className="font-semibold tracking-tight leading-[1.2] mb-5"
              style={{ color: NAVY, fontSize: 'clamp(18px, 2.2vw, 24px)', letterSpacing: '-0.02em' }}
            >
              Same flow, in plain language
            </h2>
            <ol className="space-y-3.5">
              {mod.workflow.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="flex gap-3"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums flex-shrink-0 mt-0.5"
                    style={{ background: NAVY, color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: MUTED }}>
                    {step}
                  </p>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Features */}
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.22em] mb-2" style={{ color: SUBTLE }}>
              WHAT YOU GET
            </p>
            <h2
              className="font-semibold tracking-tight leading-[1.2] mb-5"
              style={{ color: NAVY, fontSize: 'clamp(18px, 2.2vw, 24px)', letterSpacing: '-0.02em' }}
            >
              Capabilities that ship with the module
            </h2>
            <div className="space-y-3">
              {mod.features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex gap-3 p-3.5 rounded-xl bg-white"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: CREAM_ALT, color: NAVY }}
                  >
                    <IconCheck size={13} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-semibold mb-0.5" style={{ color: NAVY }}>
                      {f.title}
                    </h3>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
                      {f.impact}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations strip ─────────────────────────────── */}
      <section className="py-8 md:py-10 px-4 sm:px-6 md:px-10" style={{ background: CREAM_ALT }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-[10.5px] font-semibold tracking-[0.22em] mb-3" style={{ color: SUBTLE }}>
            CONNECTS WITH
          </p>
          <div className="flex flex-wrap gap-2">
            {mod.integrations.map((int, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white"
                style={{ color: NAVY, border: `1px solid ${BORDER}` }}
                title={int.note}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      int.direction === 'in' ? '#16a34a' :
                      int.direction === 'out' ? '#3b82f6' :
                      '#7c3aed',
                  }}
                />
                {int.module}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA + Adjacent modules in one tight block ───── */}
      <section className="py-12 md:py-14 px-4 sm:px-6 md:px-10" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2
              className="font-semibold tracking-tight leading-[1.15] text-white"
              style={{ fontSize: 'clamp(20px, 2.6vw, 28px)', letterSpacing: '-0.02em' }}
            >
              Run {mod.title} alongside the rest of the platform.
            </h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-slate-900 transition-all hover:-translate-y-0.5"
                  style={{ background: '#fff' }}
                >
                  Register Enquiry <IconArrowRight size={13} />
                </button>
              </Link>
              <Link href="/landing#system-components" style={{ textDecoration: 'none' }}>
                <button
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:bg-white/10"
                  style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                >
                  <IconArrowLeft size={13} /> All modules
                </button>
              </Link>
            </div>
          </div>

          <p className="text-[10.5px] font-semibold tracking-[0.22em] mb-3 text-center" style={{ color: '#94a3b8' }}>
            EXPLORE OTHER MODULES
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULES.filter((m) => m.slug !== mod.slug).slice(0, 4).map((m) => (
              <Link
                key={m.slug}
                href={`/landing/modules/${m.slug}`}
                className="group block p-3.5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#bfdbfe' }}
                    >
                      {m.icon}
                    </div>
                    <span className="font-semibold text-[12.5px] text-white truncate">{m.title}</span>
                  </div>
                  <IconChevronRight size={14} className="transition-transform group-hover:translate-x-0.5 flex-shrink-0" color="#94a3b8" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="py-6 px-4 sm:px-6 md:px-10" style={{ background: CREAM_ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img src="/logo-icon.png" alt="VAB" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-[12.5px] sm:text-[13px] tracking-tight" style={{ color: NAVY }}>
              VAB Informatics
            </span>
          </div>
          <p className="text-[10.5px] sm:text-[11px]" style={{ color: SUBTLE }}>
            © 2026 VAB Informatics
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Chip helper ──────────────────────────────────────── */
function Chip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ background: '#fff', color: NAVY, border: `1px solid ${BORDER}` }}
    >
      {label}
    </span>
  );
}

/* ─── SVG flowchart ────────────────────────────────────── */

function Flowchart({ chart }: { chart: FlowChartT }) {
  const map = new Map(chart.nodes.map((n) => [n.id, n] as const));

  return (
    <svg
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      style={{ display: 'block' }}
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <polygon points="0,0 10,5 0,10" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Edges first so nodes paint on top */}
      {chart.edges.map((e, i) => {
        const from = map.get(e.from);
        const to = map.get(e.to);
        if (!from || !to) return null;

        const fromSide = e.fromSide ?? autoSide(from, to);
        const toSide = e.toSide ?? oppositeSide(fromSide);
        const a = anchor(from, fromSide);
        const b = anchor(to, toSide);
        const path = orthogonalPath(a, b, fromSide, toSide);
        const lpos = labelPos(a, b, fromSide);

        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
            />
            {e.label && (
              <g>
                <rect
                  x={lpos.x - 14}
                  y={lpos.y - 8}
                  width="28"
                  height="16"
                  rx="3"
                  fill="#fff"
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                />
                <text
                  x={lpos.x}
                  y={lpos.y + 1}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#475569"
                >
                  {e.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {chart.nodes.map((n) => {
        const s = NODE_STYLE[n.type];
        const w = n.w ?? s.w;
        const h = n.h ?? s.h;
        const cx = n.x + w / 2;
        const cy = n.y + h / 2;
        const lines = wrapLabel(n.label, n.type === 'decision' ? 11 : 17);

        if (n.type === 'decision') {
          const points = `${cx},${n.y} ${n.x + w},${cy} ${cx},${n.y + h} ${n.x},${cy}`;
          return (
            <g key={n.id}>
              <polygon points={points} fill={s.bg} stroke={s.border} strokeWidth="1.5" />
              <text
                x={cx}
                y={cy}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={s.text}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={cx} dy={i === 0 ? -((lines.length - 1) * 5) : 11}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        }

        return (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={w}
              height={h}
              rx="6"
              fill={s.bg}
              stroke={s.border}
              strokeWidth="1.5"
            />
            <text
              x={cx}
              y={cy}
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={s.text}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={cx} dy={i === 0 ? -((lines.length - 1) * 6) : 13}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Flowchart geometry helpers ───────────────────────── */

function nodeBox(n: FlowNode): { x: number; y: number; w: number; h: number } {
  const s = NODE_STYLE[n.type];
  return { x: n.x, y: n.y, w: n.w ?? s.w, h: n.h ?? s.h };
}

function anchor(n: FlowNode, side: FlowSide): { x: number; y: number } {
  const b = nodeBox(n);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  switch (side) {
    case 'top':    return { x: cx, y: b.y };
    case 'right':  return { x: b.x + b.w, y: cy };
    case 'bottom': return { x: cx, y: b.y + b.h };
    case 'left':   return { x: b.x, y: cy };
  }
}

function autoSide(from: FlowNode, to: FlowNode): FlowSide {
  const a = nodeBox(from);
  const c = nodeBox(to);
  const fromCx = a.x + a.w / 2;
  const fromCy = a.y + a.h / 2;
  const toCx = c.x + c.w / 2;
  const toCy = c.y + c.h / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function oppositeSide(s: FlowSide): FlowSide {
  if (s === 'top') return 'bottom';
  if (s === 'bottom') return 'top';
  if (s === 'left') return 'right';
  return 'left';
}

function orthogonalPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  fromSide: FlowSide,
  toSide: FlowSide,
): string {
  const sameRow = Math.abs(a.y - b.y) < 1;
  const sameCol = Math.abs(a.x - b.x) < 1;

  if ((fromSide === 'right' || fromSide === 'left') && sameRow) {
    return `M${a.x},${a.y} L${b.x},${b.y}`;
  }
  if ((fromSide === 'top' || fromSide === 'bottom') && sameCol) {
    return `M${a.x},${a.y} L${b.x},${b.y}`;
  }

  if (fromSide === 'right' || fromSide === 'left') {
    const midX = (a.x + b.x) / 2;
    return `M${a.x},${a.y} L${midX},${a.y} L${midX},${b.y} L${b.x},${b.y}`;
  } else {
    const midY = (a.y + b.y) / 2;
    return `M${a.x},${a.y} L${a.x},${midY} L${b.x},${midY} L${b.x},${b.y}`;
  }
}

function labelPos(
  a: { x: number; y: number },
  b: { x: number; y: number },
  fromSide: FlowSide,
): { x: number; y: number } {
  if (fromSide === 'bottom' || fromSide === 'top') {
    return { x: a.x + 22, y: (a.y + b.y) / 2 };
  }
  return { x: (a.x + b.x) / 2, y: a.y - 12 };
}

function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
