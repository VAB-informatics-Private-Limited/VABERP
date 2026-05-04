'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconUsers, IconFileText, IconActivity, IconBox,
  IconShoppingCart, IconChartLine, IconHeadset, IconAdjustments,
  IconArrowRight, IconWorld, IconDeviceMobile, IconShieldCheck,
  IconRefresh, IconSettings, IconChartPie, IconBuildingWarehouse,
} from '@tabler/icons-react';

/* ─── Palette ────────────
──────────────────────────────────────────────── */
const NAVY        = '#1E3A5F';
const NAVY_DEEP   = '#142a47';
const NAVY_SOFT   = '#2a4d7a';
const CREAM       = '#faf9f5';
const CREAM_ALT   = '#f4f3ee';
const MUTED       = '#334155';
const SUBTLE      = '#475569';
const BORDER      = '#ececec';

/* ─── Stats data ───────────────────────────────────────────────────────── */
const heroStats = [
  { label: 'EFFICIENCY GAIN',  value: '+42.8%' },
  { label: 'PROCUREMENT LAG',  value: '-18.4m' },
  { label: 'ACTIVE NODES',     value: '1,204'  },
];

/* ─── Modules ──────────────────────────────────────────────────────────── */
const modules = [
  { slug: 'crm-enquiries',       title: 'CRM & Enquiries',     icon: <IconUsers size={20} />,        body: 'Unified lead tracking with prioritization for high-value manufacturing contracts.' },
  { slug: 'quotation-builder',   title: 'Quotation Builder',   icon: <IconFileText size={20} />,     body: 'Dynamic pricing that accounts for material volatility and labor overhead.' },
  { slug: 'job-cards',           title: 'Job Cards',           icon: <IconActivity size={20} />,     body: 'Digital job cards with real-time station tracking and bottleneck detection.' },
  { slug: 'inventory-management', title: 'Inventory Mgmt',     icon: <IconBox size={20} />,          body: 'Precision SKU tracking with reorder points and multi-warehouse sync.' },
  { slug: 'procurement',         title: 'Procurement',         icon: <IconShoppingCart size={20} />, body: 'Automated PO generation and vendor performance analytics with audit trails.' },
  { slug: 'reports-analytics',   title: 'Reports & Analytics', icon: <IconChartLine size={20} />,    body: 'Predictive yield modeling and financial forecasting from your live data.' },
  { slug: 'client-portal',       title: 'Client Portal',       icon: <IconHeadset size={20} />,      body: 'White-labeled portal for clients to track orders and download documentation.' },
  { slug: 'control-logic',       title: 'Control Logic',       icon: <IconAdjustments size={20} />,  body: 'Granular permissions and custom workflow triggers for unique shop floor rules.' },
];

/* ─── Counter ──────────────────────────────────────────────────────────── */
function Counter({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        obs.disconnect();
        const t0 = performance.now();
        const dur = 1400;
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          setVal((1 - Math.pow(1 - p, 3)) * to);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>;
}

/* ─── Rotating dashboard slideshow ─────────────────────────────────────── */
type SlideStat = { label: string; value: string; icon: React.ReactNode };
type Slide = {
  eyebrow: string;
  title: string;
  chart: 'bar' | 'donut' | 'line';
  stats: [SlideStat, SlideStat];
};

const SLIDES: Slide[] = [
  {
    eyebrow: 'MANUFACTURING FLUX',
    title: 'Precision Analytics',
    chart: 'bar',
    stats: [
      { label: 'ENERGY',     value: '452 kW/h', icon: <IconSettings size={13} color="#60a5fa" /> },
      { label: 'CYCLE TIME', value: '14.2s',    icon: <IconRefresh  size={13} color="#60a5fa" /> },
    ],
  },
  {
    eyebrow: 'INVENTORY ALLOCATION',
    title: 'Stock Distribution',
    chart: 'donut',
    stats: [
      { label: 'WAREHOUSES', value: '8',     icon: <IconBuildingWarehouse size={13} color="#60a5fa" /> },
      { label: 'SKUs',       value: '1,204', icon: <IconBox size={13} color="#60a5fa" /> },
    ],
  },
  {
    eyebrow: 'PRODUCTION TREND',
    title: 'Output Velocity',
    chart: 'line',
    stats: [
      { label: 'UNITS / HR', value: '312',   icon: <IconActivity   size={13} color="#60a5fa" /> },
      { label: 'EFFICIENCY', value: '94.7%', icon: <IconChartLine  size={13} color="#60a5fa" /> },
    ],
  },
];

const SLIDE_INTERVAL_MS = 5000;

function BarChart() {
  const bars = [60, 75, 95, 55, 88, 70, 35];
  return (
    <div className="flex items-end justify-between gap-2 h-32 sm:h-36">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.7, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 rounded-md"
          style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' }}
        />
      ))}
    </div>
  );
}

function DonutChart() {
  const C = 2 * Math.PI * 35; // circumference for r=35
  const slices = [
    { pct: 0.45, color: '#3b82f6', label: 'Raw' },
    { pct: 0.30, color: '#60a5fa', label: 'WIP' },
    { pct: 0.25, color: '#93c5fd', label: 'Finished' },
  ];
  let cumulative = 0;
  return (
    <div className="h-32 sm:h-36 flex items-center justify-center gap-6">
      <svg viewBox="0 0 100 100" className="h-full" style={{ overflow: 'visible' }}>
        <circle cx="50" cy="50" r="35" fill="none" stroke="#0f1f3a" strokeWidth="14" />
        {slices.map((s, i) => {
          const arc = s.pct * C;
          const startAngle = -90 + (cumulative / C) * 360;
          cumulative += arc;
          return (
            <motion.circle
              key={i}
              cx="50" cy="50" r="35"
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeLinecap="butt"
              transform={`rotate(${startAngle} 50 50)`}
              strokeDasharray={`${arc} ${C}`}
              initial={{ strokeDashoffset: arc }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
        <motion.text
          x="50" y="48"
          textAnchor="middle"
          fill="#fff"
          fontSize="13"
          fontWeight="700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >100%</motion.text>
        <motion.text
          x="50" y="60"
          textAnchor="middle"
          fill="#7aa3d6"
          fontSize="6"
          letterSpacing="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >TRACKED</motion.text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.12 }}
            className="flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-[10.5px] sm:text-[11px] text-slate-300 font-medium">
              {s.label} <span className="text-slate-500">{Math.round(s.pct * 100)}%</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LineChart() {
  const points = [
    [0, 78], [33, 64], [66, 70], [100, 48], [133, 52], [166, 30], [200, 18],
  ];
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const areaPath = `${linePath} L200,100 L0,100 Z`;
  return (
    <div className="h-32 sm:h-36 w-full">
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        <motion.path
          d={areaPath}
          fill="url(#line-grad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />
        <motion.path
          d={linePath}
          stroke="#60a5fa"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          vectorEffect="non-scaling-stroke"
        />
        {points.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r="2.4"
            fill="#fff"
            stroke="#60a5fa"
            strokeWidth="1.2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.6 + i * 0.08 }}
          />
        ))}
      </svg>
    </div>
  );
}

function DashboardSlideshow() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[idx];

  return (
    <div
      className="relative rounded-2xl p-5 sm:p-6 max-w-md mx-auto lg:mx-0 lg:max-w-none w-full overflow-hidden"
      style={{ background: NAVY_DEEP, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <div className="min-h-[44px] flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hdr-${idx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.18em]" style={{ color: '#60a5fa' }}>
                {slide.eyebrow}
              </p>
              <h3 className="mt-1 sm:mt-1.5 text-[16px] sm:text-[18px] font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>
                {slide.title}
              </h3>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex gap-1.5 mt-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Show slide ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 14 : 6,
                height: 6,
                background: i === idx ? '#60a5fa' : '#334155',
                cursor: 'pointer',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 sm:mt-7 relative" style={{ minHeight: 130 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`chart-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {slide.chart === 'bar'   && <BarChart />}
            {slide.chart === 'donut' && <DonutChart />}
            {slide.chart === 'line'  && <LineChart />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 grid grid-cols-2 gap-3 sm:gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`stats-${idx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="contents"
          >
            {slide.stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: NAVY_SOFT }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[8.5px] sm:text-[9px] font-semibold tracking-[0.16em]" style={{ color: '#94a3b8' }}>{s.label}</p>
                  <p className="text-[12px] sm:text-[13px] font-semibold text-white">{s.value}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: CREAM, color: NAVY }}>
      <style jsx global>{`
        .module-card .module-icon { background: ${CREAM_ALT}; color: ${NAVY}; }
        .module-card:hover .module-icon { background: ${NAVY}; color: #fff; }
        body { font-feature-settings: "ss01", "cv11"; }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 backdrop-blur-md"
        style={{ background: 'rgba(250,249,245,0.85)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 md:px-10 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2 sm:gap-2.5" style={{ textDecoration: 'none' }}>
            <img src="/logo-icon.png" alt="VAB" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            <span className="font-semibold text-[14px] sm:text-[15px] tracking-tight" style={{ color: NAVY }}>
              VAB <span className="font-normal" style={{ color: MUTED }}>Informatics</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-[13px] sm:text-[13.5px] font-medium" style={{ color: NAVY, textDecoration: 'none' }}>
              Login
            </Link>
            <Link href="/register" className="inline-flex items-center px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-semibold text-white transition-transform hover:scale-105"
              style={{ background: NAVY, textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-20 sm:pt-24 md:pt-28 pb-16 md:pb-20 px-4 sm:px-6 md:px-10">
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 xl:gap-20 items-center">
          {/* Left */}
          <div className="relative z-10 text-center lg:text-left">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] mb-3 sm:mb-4" style={{ color: SUBTLE }}>
              ARCHITECTURAL INTELLIGENCE
            </p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="font-semibold tracking-tight leading-[1.1]"
              style={{ color: NAVY, fontSize: 'clamp(26px, 4.2vw, 48px)', letterSpacing: '-0.02em' }}
            >
              Where Manufacturing Meets
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Precision, Intelligence, and Control.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] md:text-[16px] leading-relaxed max-w-xl mx-auto lg:mx-0"
              style={{ color: MUTED }}
            >
              Orchestrate your entire factory floor with surgical precision and real-time data transparency — from lead capture to product dispatch, in one unified platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-6 sm:mt-7 flex flex-wrap justify-center lg:justify-start gap-2.5 sm:gap-3"
            >
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-[13px] sm:text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: NAVY }}>
                  Get started <IconArrowRight size={14} />
                </button>
              </Link>
            </motion.div>

            {/* Hero stats */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-8 sm:mt-10 md:mt-12 pt-5 sm:pt-6 grid grid-cols-3 gap-3 sm:gap-5 max-w-md mx-auto lg:mx-0"
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
              {heroStats.map((s) => (
                <div key={s.label}>
                  <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.16em]" style={{ color: SUBTLE }}>{s.label}</p>
                  <p className="mt-1 sm:mt-1.5 text-[16px] sm:text-[19px] md:text-[22px] font-semibold tabular-nums" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — image card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="relative w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto lg:max-w-none lg:ml-auto"
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-slate-100"
              style={{ border: `1px solid ${BORDER}` }}>
              <img
                src="/hero-team.jpg"
                alt="Manufacturing team on the shop floor"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Surgical Modules ────────────────────────────────────── */}
      <section id="system-components" className="relative py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-10 scroll-mt-20" style={{ background: CREAM_ALT }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="mb-10 md:mb-12 lg:mb-14 max-w-2xl text-center mx-auto lg:text-left lg:mx-0"
          >
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] mb-3 sm:mb-4" style={{ color: SUBTLE }}>
              SYSTEM COMPONENTS
            </p>
            <h2 className="font-semibold tracking-tight leading-[1.15]" style={{ color: NAVY, fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.02em' }}>
              Every tool your business could need, in one place.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-start">
            {modules.map((m, i) => (
              <Link
                key={m.slug}
                href={`/landing/modules/${m.slug}`}
                style={{ textDecoration: 'none' }}
                className="block"
              >
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: (i % 4) * 0.04 }}
                  className="module-card group relative bg-white rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <div className="module-icon w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-4 sm:mb-5 transition-colors duration-300">
                    {m.icon}
                  </div>
                  <h3 className="text-[14px] sm:text-[15px] font-semibold mb-1.5 sm:mb-2" style={{ color: NAVY }}>{m.title}</h3>
                  <p className="text-[12.5px] sm:text-[13.5px] leading-relaxed mb-4" style={{ color: MUTED }}>{m.body}</p>
                  {/* Sits right under the body (not pinned) — no empty middle */}
                  <div
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold tracking-wide transition-transform group-hover:translate-x-0.5"
                    style={{ color: NAVY }}
                  >
                    Learn more <IconArrowRight size={12} />
                  </div>
                  <div className="absolute left-0 right-0 bottom-0 h-[2px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    style={{ background: NAVY }} />
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Neural Intelligence Dashboard (navy) ────────────────── */}
      <section className="relative py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-10 overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
          {/* Left */}
          <div className="text-center lg:text-left">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] mb-3 sm:mb-4" style={{ color: '#7aa3d6' }}>
              COMMAND INTERFACE
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
              className="font-semibold tracking-tight leading-[1.15] text-white"
              style={{ fontSize: 'clamp(24px, 3.4vw, 40px)', letterSpacing: '-0.02em' }}
            >
              The neural intelligence dashboard.
            </motion.h2>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] leading-relaxed max-w-lg mx-auto lg:mx-0" style={{ color: '#cbd5e1' }}>
              A high-velocity command interface for CEOs and Factory Managers who demand absolute visibility over every micron of production.
            </p>

            <div className="mt-6 sm:mt-8 lg:mt-10 grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto lg:mx-0">
              <div className="rounded-xl p-4 sm:p-5" style={{ background: NAVY_SOFT, border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[20px] sm:text-[24px] md:text-[28px] font-semibold text-white tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  <Counter to={0.12} decimals={2} suffix="ms" />
                </p>
                <p className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-semibold tracking-[0.16em]" style={{ color: '#94a3b8' }}>DATA LATENCY</p>
              </div>
              <div className="rounded-xl p-4 sm:p-5" style={{ background: NAVY_SOFT, border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[20px] sm:text-[24px] md:text-[28px] font-semibold text-white tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  <Counter to={99.9} decimals={1} suffix="%" />
                </p>
                <p className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-semibold tracking-[0.16em]" style={{ color: '#94a3b8' }}>UPTIME</p>
              </div>
            </div>
          </div>

          {/* Right — rotating dashboard slideshow */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full"
          >
            <DashboardSlideshow />
          </motion.div>
        </div>
      </section>

      {/* ── Built for the Modern Indian Workforce ───────────────── */}
      <section className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden aspect-[5/4] bg-slate-100 max-w-md mx-auto lg:mx-0 lg:max-w-none w-full"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <img
              src="/workforce-tech.png"
              alt="Engineer monitoring robotic production line"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center lg:text-left"
          >
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] mb-3 sm:mb-4" style={{ color: SUBTLE }}>
              HUMAN-CENTRIC DESIGN
            </p>
            <h2 className="font-semibold tracking-tight leading-[1.15]" style={{ color: NAVY, fontSize: 'clamp(22px, 2.8vw, 34px)', letterSpacing: '-0.02em' }}>
              Built for the modern Indian workforce.
            </h2>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] leading-relaxed" style={{ color: MUTED }}>
              VAB Enterprise Resource Planning isn&apos;t just a software tool — it&apos;s a productivity multiplier. Designed for high-stress manufacturing environments, your team in Bengaluru, Pune, or Chennai can make split-second decisions backed by architectural-grade data.
            </p>

            <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6 max-w-md mx-auto lg:mx-0">
              {[
                { icon: <IconWorld size={18} />,        title: 'Multi-regional sync',       body: 'Connect diverse factory locations into one singular source of truth.' },
                { icon: <IconDeviceMobile size={18} />, title: 'Shop floor mobility',       body: 'Full-fidelity experience on tablets and ruggedized industrial devices.' },
                { icon: <IconShieldCheck size={18} />,  title: 'Enterprise-grade security', body: 'Role-based access and end-to-end audit trails on every transaction.' },
              ].map((f) => (
                <div key={f.title} className="text-left">
                  {/* Row 1: icon + title — vertically centered together */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: CREAM_ALT, color: NAVY }}
                    >
                      {f.icon}
                    </div>
                    <h4
                      className="text-[15px] sm:text-[16px] font-semibold leading-none"
                      style={{ color: NAVY }}
                    >
                      {f.title}
                    </h4>
                  </div>
                  {/* Row 2: body — left edge aligns with title text (icon 36px + gap 12px = 48px) */}
                  <p
                    className="mt-2 text-[13px] sm:text-[13.5px] leading-relaxed"
                    style={{ color: MUTED, paddingLeft: 48 }}
                  >
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-10" style={{ background: CREAM_ALT }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-semibold tracking-tight leading-[1.15]" style={{ color: NAVY, fontSize: 'clamp(24px, 3.2vw, 40px)', letterSpacing: '-0.02em' }}>
            Ready to redefine your production?
          </h2>
          <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] leading-relaxed max-w-lg mx-auto" style={{ color: MUTED }}>
            Join leading manufacturers who have upgraded their factory intelligence with VAB Enterprise Resource Planning
          </p>
          <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-[13px] sm:text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: NAVY }}>
                Schedule a demo <IconArrowRight size={14} />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-6 sm:py-7 px-4 sm:px-6 md:px-10" style={{ background: CREAM_ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img src="/logo-icon.png" alt="VAB" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-[12.5px] sm:text-[13px] tracking-tight" style={{ color: NAVY }}>
              VAB Informatics
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] font-semibold tracking-[0.18em]">
            {['PRIVACY', 'TERMS', 'DOCS', 'SUPPORT'].map((l) => (
              <a key={l} href="#" className="transition-colors" style={{ color: SUBTLE, textDecoration: 'none' }}>
                {l}
              </a>
            ))}
          </div>
          <p className="text-[10.5px] sm:text-[11px]" style={{ color: SUBTLE }}>
            © 2026 VAB Informatics
          </p>
        </div>
      </footer>

    </div>
  );
}
